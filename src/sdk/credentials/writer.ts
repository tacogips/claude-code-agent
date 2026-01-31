/**
 * Credential Writer for OAuth Token Management
 *
 * Provides write operations for Claude Code OAuth credentials.
 * Supports writing credentials to platform-specific storage (file or keychain).
 */

import { Result, err } from "../../result";
import {
  type CredentialBackend,
  createCredentialBackend,
} from "./backends/index";
import { FileCredentialBackend } from "./backends/file";
import { type OAuthTokensInput, validateCredentialsInput } from "./validation";
import type { ClaudeCredentials } from "./types";
import { CredentialError } from "./errors";

/**
 * Options for configuring CredentialWriter
 */
export interface CredentialWriterOptions {
  /**
   * Custom config directory path (default: ~/.claude)
   */
  configDir?: string;

  /**
   * Platform override for testing
   * Auto-detected if not provided
   */
  platform?: "linux" | "macos" | "windows";
}

/**
 * CredentialWriter provides write operations for Claude Code credentials.
 *
 * Supports:
 * - Writing OAuth tokens to platform-specific storage
 * - Deleting existing credentials
 * - Checking write permissions
 * - Querying storage location
 *
 * Platform-specific backends:
 * - macOS: KeychainCredentialBackend
 * - Linux: FileCredentialBackend (~/.claude/.credentials.json)
 * - Windows: FileCredentialBackend (~/.claude/.credentials.json)
 *
 * @example
 * ```typescript
 * const writer = new CredentialWriter();
 *
 * const credentials: OAuthTokensInput = {
 *   accessToken: "sk-ant-oat01-...",
 *   refreshToken: "sk-ant-ort01-...",
 *   expiresAt: Date.now() + 86400000,
 *   scopes: ["user:inference", "user:profile"],
 *   subscriptionType: "max",
 *   rateLimitTier: "default_claude_max_20x"
 * };
 *
 * const result = await writer.writeCredentials(credentials);
 * if (result.isOk()) {
 *   console.log("Credentials written successfully");
 * }
 * ```
 */
export class CredentialWriter {
  private readonly backend: CredentialBackend;

  constructor(options?: CredentialWriterOptions) {
    // If custom configDir is provided, use FileCredentialBackend with custom path
    if (options?.configDir !== undefined) {
      const credentialsPath = `${options.configDir}/.credentials.json`;
      this.backend = new FileCredentialBackend(credentialsPath);
    } else {
      // Otherwise, use platform-appropriate backend
      this.backend = createCredentialBackend(options?.platform);
    }
  }

  /**
   * Write OAuth credentials to platform-specific storage.
   *
   * Validates input before writing. If validation fails, returns error
   * without attempting to write.
   *
   * On success, overwrites existing credentials if present.
   *
   * @param input - OAuth tokens and metadata to write
   * @returns Result<void, CredentialError>
   *
   * @example
   * ```typescript
   * const result = await writer.writeCredentials({
   *   accessToken: "sk-ant-oat01-...",
   *   refreshToken: "sk-ant-ort01-...",
   *   expiresAt: 1768332736724,
   *   scopes: ["user:inference"],
   *   subscriptionType: "max",
   *   rateLimitTier: "default_claude_max_20x"
   * });
   *
   * if (result.isErr()) {
   *   console.error("Write failed:", result.error.message);
   * }
   * ```
   */
  async writeCredentials(
    input: OAuthTokensInput,
  ): Promise<Result<void, CredentialError>> {
    // Validate input first
    const validationResult = validateCredentialsInput(input);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    // Transform OAuthTokensInput to ClaudeCredentials format
    const credentials: ClaudeCredentials = {
      claudeAiOauth: validationResult.value,
    };

    // Delegate to backend
    return this.backend.write(credentials);
  }

  /**
   * Delete existing credentials from storage.
   *
   * Safe to call even if no credentials exist.
   * Idempotent operation.
   *
   * @returns Result<void, CredentialError>
   *
   * @example
   * ```typescript
   * const result = await writer.deleteCredentials();
   * if (result.isOk()) {
   *   console.log("Credentials deleted successfully");
   * }
   * ```
   */
  async deleteCredentials(): Promise<Result<void, CredentialError>> {
    return this.backend.delete();
  }

  /**
   * Check if the credentials storage location is writable.
   *
   * Useful for pre-flight checks before attempting to write credentials.
   *
   * @returns Promise<boolean> - true if storage is writable
   *
   * @example
   * ```typescript
   * if (await writer.isWritable()) {
   *   await writer.writeCredentials(credentials);
   * } else {
   *   console.error("Storage location is not writable");
   * }
   * ```
   */
  async isWritable(): Promise<boolean> {
    return this.backend.isWritable();
  }

  /**
   * Get the credentials storage location.
   *
   * Returns:
   * - File path for file-based backends
   * - Keychain service/account description for macOS keychain backend
   *
   * @returns Storage location string
   *
   * @example
   * ```typescript
   * console.log(`Credentials stored at: ${writer.getStorageLocation()}`);
   * // Linux: "/home/user/.claude/.credentials.json"
   * // macOS: "macOS Keychain (service: claude-code, account: credentials)"
   * ```
   */
  getStorageLocation(): string {
    return this.backend.getLocation();
  }
}
