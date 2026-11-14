/**
 * API token type definitions.
 *
 * These types support local token management and optional permission checks for
 * programmatic GraphQL execution. They do not imply an HTTP server runtime.
 */

export const VALID_PERMISSIONS = [
  "session:create",
  "session:read",
  "session:cancel",
  "group:create",
  "group:run",
  "queue:*",
  "bookmark:*",
] as const;

const VALID_PERMISSION_SET = new Set<string>(VALID_PERMISSIONS);

/**
 * Permission identifiers for API token access control.
 *
 * Permissions follow the pattern: <resource>:<action>.
 * Wildcard (*) grants all actions for a resource.
 */
export type Permission = (typeof VALID_PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return VALID_PERMISSION_SET.has(value);
}

/**
 * Options for creating a new API token.
 */
export interface CreateTokenOptions {
  /**
   * Human-readable name for the token.
   */
  readonly name: string;

  /**
   * Permissions granted to this token.
   */
  readonly permissions: readonly Permission[];

  /**
   * Token expiration duration.
   *
   * Format: <number><unit> (e.g. "365d", "1y", "30d").
   * If not provided, token never expires.
   */
  readonly expiresIn?: string;
}

/**
 * Stored API token data.
 *
 * The actual token string is never stored, only its hash.
 */
export interface ApiToken {
  /**
   * Token identifier, derived from the generated token prefix.
   */
  readonly id: string;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * SHA-256 hash of the full token string.
   *
   * Format: "sha256:<hex>".
   */
  readonly hash: string;

  /**
   * Permissions granted to this token.
   */
  readonly permissions: readonly Permission[];

  /**
   * Token creation timestamp in ISO 8601 format.
   */
  readonly createdAt: string;

  /**
   * Token expiration timestamp in ISO 8601 format.
   */
  readonly expiresAt?: string;

  /**
   * Last successful validation timestamp in ISO 8601 format.
   */
  readonly lastUsedAt?: string;
}
