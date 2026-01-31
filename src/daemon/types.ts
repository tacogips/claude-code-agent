/**
 * Core type definitions for daemon server
 *
 * Defines configuration, status, and authentication types for the HTTP daemon server.
 */

/**
 * Permission identifiers for API token access control
 *
 * Permissions follow the pattern: <resource>:<action>
 * Wildcard (*) grants all actions for a resource
 */
export type Permission =
  | "session:create"
  | "session:read"
  | "session:cancel"
  | "group:create"
  | "group:run"
  | "queue:*"
  | "bookmark:*";

/**
 * Daemon server configuration
 *
 * Defines how the HTTP server should be configured and run.
 */
export interface DaemonConfig {
  /**
   * Bind address for the HTTP server
   * @default "0.0.0.0" - Listens on all interfaces
   */
  readonly host: string;

  /**
   * Port number for the HTTP server
   * @default 8443
   */
  readonly port: number;

  /**
   * Path to the API tokens JSON file
   *
   * This file stores hashed tokens with their metadata.
   */
  readonly authTokenFile: string;

  /**
   * Path to TLS certificate file (optional)
   *
   * If provided with tlsKey, enables HTTPS.
   */
  readonly tlsCert?: string;

  /**
   * Path to TLS private key file (optional)
   *
   * If provided with tlsCert, enables HTTPS.
   */
  readonly tlsKey?: string;

  /**
   * Whether to include browser viewer routes
   *
   * When true, serves the web UI for viewing sessions.
   */
  readonly withViewer: boolean;
}

/**
 * Current daemon server status
 *
 * Provides runtime information about the daemon server.
 */
export interface DaemonStatus {
  /**
   * Whether the server is currently running
   */
  readonly running: boolean;

  /**
   * Host address the server is bound to
   */
  readonly host: string;

  /**
   * Port number the server is listening on
   */
  readonly port: number;

  /**
   * Server uptime in milliseconds
   */
  readonly uptime: number;

  /**
   * Number of active connections
   */
  readonly connections: number;
}

/**
 * Options for creating a new API token
 */
export interface CreateTokenOptions {
  /**
   * Human-readable name for the token
   *
   * Used for identification and management.
   */
  readonly name: string;

  /**
   * Permissions granted to this token
   *
   * Controls which API endpoints the token can access.
   */
  readonly permissions: readonly Permission[];

  /**
   * Token expiration duration (optional)
   *
   * Format: <number><unit> (e.g., '365d', '1y', '30d')
   * If not provided, token never expires.
   */
  readonly expiresIn?: string;
}

/**
 * Stored API token data
 *
 * Represents a token in the token storage file.
 * The actual token string is never stored - only its hash.
 */
export interface ApiToken {
  /**
   * Token identifier (the prefix portion after 'cca_')
   *
   * Used for referencing tokens in management commands.
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * SHA-256 hash of the full token string
   *
   * Format: "sha256:<hex>"
   * Used for validation without storing the plaintext token.
   */
  readonly hash: string;

  /**
   * Permissions granted to this token
   */
  readonly permissions: readonly Permission[];

  /**
   * Token creation timestamp (ISO 8601 format)
   */
  readonly createdAt: string;

  /**
   * Token expiration timestamp (ISO 8601 format, optional)
   *
   * If undefined, the token never expires.
   */
  readonly expiresAt?: string;

  /**
   * Last time the token was used (ISO 8601 format, optional)
   *
   * Updated on each successful authentication.
   */
  readonly lastUsedAt?: string;
}
