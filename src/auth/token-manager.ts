/**
 * Local API token management.
 *
 * Stores token metadata in JSON format with SHA-256 hashes. The plaintext token
 * is returned only at creation or rotation time.
 */

import type { Container } from "../container";
import type { FileLockService } from "../interfaces/lock";
import type { AtomicWriter } from "../services/atomic-writer";
import { getTokenExpiryTimestamp } from "./duration";
import type { ApiToken, CreateTokenOptions, Permission } from "./types";
import { isPermission } from "./types";

interface TokenStorage {
  readonly tokens: readonly ApiToken[];
}

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export class TokenManager {
  private tokens: ApiToken[] = [];
  private readonly lockService: FileLockService;
  private readonly atomicWriter: AtomicWriter;
  private operationChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly container: Container,
    private readonly tokenFilePath: string,
  ) {
    this.lockService = container.fileLockService;
    this.atomicWriter = container.atomicWriter;
  }

  async initialize(): Promise<void> {
    await this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();
      }),
    );
  }

  async createToken(options: CreateTokenOptions): Promise<string> {
    return this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();

        const fullToken = this.generateToken();
        const hash = await this.hashToken(fullToken);
        const tokenId = fullToken.slice(4, 12);
        const currentTime = this.container.clock.now();
        const createdAt = currentTime.toISOString();

        const token: ApiToken =
          options.expiresIn === undefined
            ? {
                id: tokenId,
                name: options.name,
                hash,
                permissions: [...options.permissions],
                createdAt,
              }
            : {
                id: tokenId,
                name: options.name,
                hash,
                permissions: [...options.permissions],
                createdAt,
                expiresAt: getTokenExpiryTimestamp(
                  options.expiresIn,
                  currentTime,
                ),
              };

        this.tokens.push(token);
        await this.saveTokens();

        return fullToken;
      }),
    );
  }

  async validateToken(token: string): Promise<ApiToken | null> {
    return this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();

        const hash = await this.hashToken(token);
        const tokenIndex = this.tokens.findIndex((t) => t.hash === hash);
        if (tokenIndex === -1) {
          return null;
        }

        const storedToken = this.tokens[tokenIndex];
        if (storedToken === undefined) {
          return null;
        }

        if (
          storedToken.expiresAt !== undefined &&
          this.container.clock.now() >= new Date(storedToken.expiresAt)
        ) {
          return null;
        }

        const updatedToken: ApiToken = {
          ...storedToken,
          lastUsedAt: this.container.clock.timestamp(),
        };

        this.tokens[tokenIndex] = updatedToken;
        await this.saveTokens();

        return cloneToken(updatedToken);
      }),
    );
  }

  async listTokens(): Promise<readonly ApiToken[]> {
    return this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();
        return this.tokens.map(cloneToken);
      }),
    );
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();

        const initialLength = this.tokens.length;
        this.tokens = this.tokens.filter((t) => t.id !== tokenId);

        if (this.tokens.length === initialLength) {
          throw new Error(`Token not found: ${tokenId}`);
        }

        await this.saveTokens();
      }),
    );
  }

  async rotateToken(tokenId: string): Promise<string> {
    return this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();

        const oldToken = this.tokens.find((t) => t.id === tokenId);
        if (oldToken === undefined) {
          throw new Error(`Token not found: ${tokenId}`);
        }

        const fullToken = this.generateToken();
        const newToken: ApiToken = {
          id: fullToken.slice(4, 12),
          name: oldToken.name,
          hash: await this.hashToken(fullToken),
          permissions: [...oldToken.permissions],
          createdAt: this.container.clock.timestamp(),
          ...(oldToken.expiresAt === undefined
            ? {}
            : { expiresAt: oldToken.expiresAt }),
        };

        this.tokens = this.tokens.filter((t) => t.id !== oldToken.id);
        this.tokens.push(newToken);
        await this.saveTokens();

        return fullToken;
      }),
    );
  }

  hasPermission(token: ApiToken, permission: Permission): boolean {
    if (token.permissions.includes(permission)) {
      return true;
    }

    const [resource] = permission.split(":");
    if (resource === undefined) {
      return false;
    }

    const wildcardPermission = `${resource}:*`;
    return (
      isPermission(wildcardPermission) &&
      token.permissions.includes(wildcardPermission)
    );
  }

  private generateToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    const base64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return `cca_${base64}`;
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `sha256:${hashHex}`;
  }

  private async loadTokens(): Promise<void> {
    const { fileSystem } = this.container;

    if (!(await fileSystem.exists(this.tokenFilePath))) {
      this.tokens = [];
      await this.saveTokens();
      return;
    }

    try {
      const content = await fileSystem.readFile(this.tokenFilePath);
      this.tokens = parseTokenStorage(content, this.tokenFilePath);
    } catch (error) {
      throw new Error(
        `Failed to load tokens from ${this.tokenFilePath}: ${error}`,
      );
    }
  }

  private async saveTokens(): Promise<void> {
    try {
      await this.atomicWriter.writeJson(this.tokenFilePath, {
        tokens: this.tokens,
      });
    } catch (error) {
      throw new Error(
        `Failed to save tokens to ${this.tokenFilePath}: ${error}`,
      );
    }
  }

  private async runSerialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operationChain;
    let release: (() => void) | undefined;

    this.operationChain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release?.();
    }
  }
}

function parseTokenStorage(content: string, filePath: string): ApiToken[] {
  const value: unknown = JSON.parse(content);
  if (!isTokenStorage(value)) {
    throw new Error(`Invalid token storage schema in ${filePath}`);
  }
  return value.tokens.map(cloneToken);
}

function isTokenStorage(value: unknown): value is TokenStorage {
  if (!isRecord(value)) {
    return false;
  }

  const tokens = value["tokens"];
  return Array.isArray(tokens) && tokens.every(isApiToken);
}

function isApiToken(value: unknown): value is ApiToken {
  if (!isRecord(value)) {
    return false;
  }

  const permissions = value["permissions"];
  if (!Array.isArray(permissions)) {
    return false;
  }

  return (
    isNonEmptyString(value["id"]) &&
    typeof value["name"] === "string" &&
    isTokenHash(value["hash"]) &&
    permissions.every(
      (permission): permission is Permission =>
        typeof permission === "string" && isPermission(permission),
    ) &&
    isIsoTimestamp(value["createdAt"]) &&
    isOptionalIsoTimestamp(value["expiresAt"]) &&
    isOptionalIsoTimestamp(value["lastUsedAt"])
  );
}

function cloneToken(token: ApiToken): ApiToken {
  return {
    id: token.id,
    name: token.name,
    hash: token.hash,
    permissions: [...token.permissions],
    createdAt: token.createdAt,
    ...(token.expiresAt === undefined ? {} : { expiresAt: token.expiresAt }),
    ...(token.lastUsedAt === undefined ? {} : { lastUsedAt: token.lastUsedAt }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTokenHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isOptionalIsoTimestamp(value: unknown): value is string | undefined {
  return value === undefined || isIsoTimestamp(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  return (
    !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value
  );
}
