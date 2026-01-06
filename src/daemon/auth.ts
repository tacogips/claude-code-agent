/**
 * Authentication and token management for daemon server.
 *
 * Provides TokenManager for API key authentication and middleware
 * for Elysia HTTP server to validate Bearer tokens.
 *
 * @module daemon/auth
 */

import type { Container } from "../container";
import type {
  ApiToken,
  CreateTokenOptions,
  Permission,
} from "./types";

/**
 * Token storage file format.
 *
 * Internal structure for JSON token storage.
 */
interface TokenStorage {
  readonly tokens: ApiToken[];
}

/**
 * Parse duration string to milliseconds.
 *
 * Supports formats: 365d, 1y, 30d, 7w, 24h
 *
 * @param duration - Duration string (e.g., '365d')
 * @returns Milliseconds
 * @throws Error if format is invalid
 */
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
    m: 60 * 1000,          // minutes
    h: 60 * 60 * 1000,     // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
    y: 365 * 24 * 60 * 60 * 1000, // years
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Unknown duration unit: ${unit}`);
  }

  return amount * multiplier;
}

/**
 * Manager for API token operations.
 *
 * Handles token creation, validation, revocation, and rotation.
 * Stores tokens in JSON format with SHA-256 hashes for security.
 */
export class TokenManager {
  private tokens: ApiToken[] = [];
  private readonly tokenFilePath: string;
  private readonly container: Container;

  /**
   * Create a new TokenManager.
   *
   * @param container - Dependency injection container
   * @param tokenFilePath - Path to JSON token storage file
   */
  constructor(container: Container, tokenFilePath: string) {
    this.container = container;
    this.tokenFilePath = tokenFilePath;
  }

  /**
   * Initialize the token manager by loading tokens from file.
   *
   * Should be called before using other methods.
   * Creates the token file if it doesn't exist.
   */
  async initialize(): Promise<void> {
    await this.loadTokens();
  }

  /**
   * Generate a random token string with cca_ prefix.
   *
   * Format: cca_<base64url-encoded-32-bytes>
   *
   * @returns Full token string
   */
  private generateToken(): string {
    // Generate 32 random bytes
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    // Convert to base64url encoding (URL-safe)
    const base64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return `cca_${base64}`;
  }

  /**
   * Hash a token using SHA-256.
   *
   * @param token - Full token string
   * @returns Hash in format "sha256:<hex>"
   */
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

  /**
   * Load tokens from storage file.
   *
   * Creates an empty token file if it doesn't exist.
   */
  private async loadTokens(): Promise<void> {
    const { fileSystem } = this.container;

    const exists = await fileSystem.exists(this.tokenFilePath);
    if (!exists) {
      // Create empty token file
      const emptyStorage: TokenStorage = { tokens: [] };
      await fileSystem.writeFile(
        this.tokenFilePath,
        JSON.stringify(emptyStorage, null, 2)
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
        `Failed to load tokens from ${this.tokenFilePath}: ${error}`
      );
    }
  }

  /**
   * Save tokens to storage file.
   */
  private async saveTokens(): Promise<void> {
    const { fileSystem } = this.container;
    const storage: TokenStorage = { tokens: this.tokens };

    try {
      await fileSystem.writeFile(
        this.tokenFilePath,
        JSON.stringify(storage, null, 2)
      );
    } catch (error) {
      throw new Error(
        `Failed to save tokens to ${this.tokenFilePath}: ${error}`
      );
    }
  }

  /**
   * Create a new API token.
   *
   * Generates a random token, hashes it, and stores the metadata.
   * Returns the full token string (only time it's available).
   *
   * @param options - Token creation options
   * @returns Full token string (cca_...)
   */
  async createToken(options: CreateTokenOptions): Promise<string> {
    const fullToken = this.generateToken();
    const hash = await this.hashToken(fullToken);

    // Extract short ID from token (first 8 chars after cca_ prefix)
    // Format: cca_<base64> -> ID is first 8 chars of base64
    const tokenId = fullToken.slice(4, 12); // Skip "cca_" and take 8 chars

    const now = new Date().toISOString();

    let token: ApiToken;
    if (options.expiresIn !== undefined) {
      const durationMs = parseDuration(options.expiresIn);
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      token = {
        id: tokenId,
        name: options.name,
        hash,
        permissions: options.permissions,
        createdAt: now,
        expiresAt,
      };
    } else {
      token = {
        id: tokenId,
        name: options.name,
        hash,
        permissions: options.permissions,
        createdAt: now,
      };
    }

    this.tokens.push(token);
    await this.saveTokens();

    return fullToken;
  }

  /**
   * Validate a token and return its metadata if valid.
   *
   * Checks:
   * - Token hash matches stored hash
   * - Token is not expired
   *
   * Updates lastUsedAt on successful validation.
   *
   * @param token - Full token string
   * @returns Token metadata if valid, null otherwise
   */
  async validateToken(token: string): Promise<ApiToken | null> {
    const hash = await this.hashToken(token);

    // Find token by hash
    const tokenIndex = this.tokens.findIndex((t) => t.hash === hash);
    if (tokenIndex === -1) {
      return null;
    }

    const storedToken = this.tokens[tokenIndex];
    if (storedToken === undefined) {
      return null;
    }

    // Check expiration
    if (storedToken.expiresAt !== undefined) {
      const now = new Date();
      const expiresAt = new Date(storedToken.expiresAt);
      if (now > expiresAt) {
        return null; // Token expired
      }
    }

    // Update lastUsedAt
    const updatedToken: ApiToken = {
      ...storedToken,
      lastUsedAt: new Date().toISOString(),
    };

    this.tokens[tokenIndex] = updatedToken;
    await this.saveTokens();

    return updatedToken;
  }

  /**
   * List all tokens (without secret data).
   *
   * Returns token metadata for management purposes.
   *
   * @returns Array of token metadata
   */
  async listTokens(): Promise<readonly ApiToken[]> {
    return [...this.tokens];
  }

  /**
   * Revoke a token by ID.
   *
   * Removes the token from storage.
   *
   * @param tokenId - Token ID to revoke
   * @throws Error if token not found
   */
  async revokeToken(tokenId: string): Promise<void> {
    const initialLength = this.tokens.length;
    this.tokens = this.tokens.filter((t) => t.id !== tokenId);

    if (this.tokens.length === initialLength) {
      throw new Error(`Token not found: ${tokenId}`);
    }

    await this.saveTokens();
  }

  /**
   * Rotate a token by creating a new one and revoking the old.
   *
   * Creates a new token with the same permissions and name,
   * then revokes the old token.
   *
   * @param tokenId - Token ID to rotate
   * @returns New token string
   * @throws Error if token not found
   */
  async rotateToken(tokenId: string): Promise<string> {
    const oldToken = this.tokens.find((t) => t.id === tokenId);
    if (oldToken === undefined) {
      throw new Error(`Token not found: ${tokenId}`);
    }

    // Create new token with same permissions (no expiration)
    const newToken = await this.createToken({
      name: oldToken.name,
      permissions: oldToken.permissions,
    });

    // Revoke old token
    await this.revokeToken(tokenId);

    return newToken;
  }

  /**
   * Check if a token has a specific permission.
   *
   * Supports wildcard permissions (e.g., "queue:*" grants all queue operations).
   *
   * @param token - Token to check
   * @param permission - Required permission
   * @returns True if token has permission
   */
  hasPermission(token: ApiToken, permission: Permission): boolean {
    // Check for exact permission match
    if (token.permissions.includes(permission)) {
      return true;
    }

    // Check for wildcard permissions
    // e.g., "queue:*" should grant "queue:read", "queue:write", etc.
    const [resource] = permission.split(":");
    if (resource === undefined) {
      return false;
    }

    const wildcardPermission = `${resource}:*` as Permission;
    return token.permissions.includes(wildcardPermission);
  }
}

/**
 * Extended context interface for Elysia with authenticated token.
 *
 * Augments Elysia context with token data after successful authentication.
 */
export interface AuthContext {
  readonly token: ApiToken;
}

/**
 * Authentication middleware for Elysia.
 *
 * Validates Bearer token from Authorization header and attaches
 * token data to request context.
 *
 * Returns 401 for missing/invalid tokens.
 * Returns 403 for insufficient permissions (if permission check is used).
 *
 * @param tokenManager - TokenManager instance
 * @returns Elysia middleware plugin
 */
export function authMiddleware(tokenManager: TokenManager) {
  return async (context: {
    readonly request: Request;
    readonly set: { status?: number };
    readonly token?: ApiToken;
  }): Promise<ApiToken | { readonly error: string; readonly status: number }> => {
    const authHeader = context.request.headers.get("Authorization");

    // Check for Authorization header
    if (authHeader === null) {
      context.set.status = 401;
      return {
        error: "Missing Authorization header",
        status: 401,
      };
    }

    // Parse Bearer token format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      context.set.status = 401;
      return {
        error: "Invalid Authorization header format. Expected: Bearer <token>",
        status: 401,
      };
    }

    const token = parts[1];
    if (token === undefined) {
      context.set.status = 401;
      return {
        error: "Missing token in Authorization header",
        status: 401,
      };
    }

    // Validate token
    const validatedToken = await tokenManager.validateToken(token);
    if (validatedToken === null) {
      context.set.status = 401;
      return {
        error: "Invalid or expired token",
        status: 401,
      };
    }

    // Token is valid, return it to be attached to context
    return validatedToken;
  };
}

/**
 * Permission check middleware factory.
 *
 * Creates a middleware that checks if the authenticated token
 * has the required permission. Must be used after authMiddleware.
 *
 * @param tokenManager - TokenManager instance
 * @param requiredPermission - Permission to check
 * @returns Middleware function
 */
export function requirePermission(
  tokenManager: TokenManager,
  requiredPermission: Permission
) {
  return (context: {
    readonly token: ApiToken;
    readonly set: { status?: number };
  }): { readonly error: string; readonly status: number } | void => {
    if (!tokenManager.hasPermission(context.token, requiredPermission)) {
      context.set.status = 403;
      return {
        error: `Insufficient permissions. Required: ${requiredPermission}`,
        status: 403,
      };
    }
    // Permission granted, continue to route handler
  };
}
