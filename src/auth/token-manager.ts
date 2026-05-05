/**
 * Local API token management.
 *
 * Stores token metadata in JSON format with SHA-256 hashes. The plaintext token
 * is returned only at creation or rotation time.
 */

import type { Container } from "../container";
import { AtomicWriter } from "../services/atomic-writer";
import { FileLockServiceImpl } from "../services/file-lock";
import type { ApiToken, CreateTokenOptions, Permission } from "./types";

interface TokenStorage {
  readonly tokens: ApiToken[];
}

function parseDuration(duration: string): number {
  const match = /^(\d+)([dwyhm])$/.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const amountStr = match[1];
  const unit = match[2];

  if (amountStr === undefined || unit === undefined) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const amount = parseInt(amountStr, 10);
  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Unknown duration unit: ${unit}`);
  }

  return amount * multiplier;
}

export class TokenManager {
  private tokens: ApiToken[] = [];
  private readonly lockService: FileLockServiceImpl;
  private readonly atomicWriter: AtomicWriter;
  private operationChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly container: Container,
    private readonly tokenFilePath: string,
  ) {
    this.lockService = new FileLockServiceImpl(
      container.fileSystem,
      container.clock,
    );
    this.atomicWriter = new AtomicWriter(container.fileSystem);
  }

  async initialize(): Promise<void> {
    await this.loadTokens();
  }

  async createToken(options: CreateTokenOptions): Promise<string> {
    return this.runSerialized(async () =>
      this.lockService.withLock(this.tokenFilePath, async () => {
        await this.loadTokens();

        const fullToken = this.generateToken();
        const hash = await this.hashToken(fullToken);
        const tokenId = fullToken.slice(4, 12);
        const now = this.container.clock.timestamp();

        const token: ApiToken =
          options.expiresIn === undefined
            ? {
                id: tokenId,
                name: options.name,
                hash,
                permissions: options.permissions,
                createdAt: now,
              }
            : {
                id: tokenId,
                name: options.name,
                hash,
                permissions: options.permissions,
                createdAt: now,
                expiresAt: new Date(
                  this.container.clock.now().getTime() +
                    parseDuration(options.expiresIn),
                ).toISOString(),
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
          this.container.clock.now() > new Date(storedToken.expiresAt)
        ) {
          return null;
        }

        const updatedToken: ApiToken = {
          ...storedToken,
          lastUsedAt: this.container.clock.timestamp(),
        };

        this.tokens[tokenIndex] = updatedToken;
        await this.saveTokens();

        return updatedToken;
      }),
    );
  }

  async listTokens(): Promise<readonly ApiToken[]> {
    return [...this.tokens];
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
          permissions: oldToken.permissions,
          createdAt: this.container.clock.timestamp(),
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

    return token.permissions.includes(`${resource}:*` as Permission);
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
      await fileSystem.writeFile(
        this.tokenFilePath,
        JSON.stringify({ tokens: [] satisfies ApiToken[] }, null, 2),
      );
      this.tokens = [];
      return;
    }

    try {
      const content = await fileSystem.readFile(this.tokenFilePath);
      const storage = JSON.parse(content) as TokenStorage;
      this.tokens = storage.tokens;
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
