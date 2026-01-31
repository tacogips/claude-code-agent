/**
 * Credential Manager - Combined Read/Write Interface
 *
 * Provides unified access to both reading and writing Claude Code credentials.
 * Combines CredentialReader and CredentialWriter for complete credential management.
 */

import { Result, ok, err } from "../../result";
import { CredentialReader, type CredentialReaderOptions } from "./reader";
import { CredentialWriter, type CredentialWriterOptions } from "./writer";
import {
  type OAuthTokensInput,
  type CredentialsExport,
  validateCredentialsExport,
} from "./validation";
import type {
  OAuthCredentialsResult,
  AccountInfo,
  SubscriptionType,
} from "./types";
import type { UsageStats } from "./stats-types";
import { CredentialError } from "./errors";

/**
 * Options for configuring CredentialManager
 */
export interface CredentialManagerOptions {
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
 * CredentialManager provides a unified interface for both reading and writing
 * Claude Code credentials.
 *
 * This class combines CredentialReader and CredentialWriter to provide:
 * - Read operations: getCredentials, getAccount, getStats, isAuthenticated
 * - Write operations: writeCredentials, deleteCredentials
 * - Export/Import helpers for credential transfer between machines
 *
 * @example
 * ```typescript
 * const manager = new CredentialManager();
 *
 * // Export credentials from source machine
 * const exportResult = await manager.exportCredentials();
 * if (exportResult.isOk()) {
 *   // Transfer exportResult.value to another machine
 * }
 *
 * // Import credentials on target machine
 * const importResult = await manager.importCredentials(exportData);
 * if (importResult.isOk()) {
 *   console.log("Credentials imported successfully");
 * }
 * ```
 */
export class CredentialManager {
  private readonly reader: CredentialReader;
  private readonly writer: CredentialWriter;

  constructor(options?: CredentialManagerOptions) {
    // Build options objects with only defined properties
    // This is required for exactOptionalPropertyTypes compliance
    const readerOptions: CredentialReaderOptions = {};
    const writerOptions: CredentialWriterOptions = {};

    if (options?.configDir !== undefined) {
      readerOptions.configDir = options.configDir;
      writerOptions.configDir = options.configDir;
    }

    if (options?.platform !== undefined) {
      readerOptions.platform = options.platform;
      writerOptions.platform = options.platform;
    }

    this.reader = new CredentialReader(readerOptions);
    this.writer = new CredentialWriter(writerOptions);
  }

  // =====================================
  // Read Operations (delegate to reader)
  // =====================================

  /**
   * Get OAuth credentials from backend storage.
   *
   * Returns null if user is not authenticated or credentials are invalid.
   *
   * @returns OAuthCredentialsResult with computed isExpired, or null
   */
  async getCredentials(): Promise<OAuthCredentialsResult | null> {
    return this.reader.getCredentials();
  }

  /**
   * Get account information from config file.
   *
   * Returns null if user is not authenticated or config doesn't exist.
   *
   * @returns AccountInfo or null
   */
  async getAccount(): Promise<AccountInfo | null> {
    return this.reader.getAccount();
  }

  /**
   * Get usage statistics from stats cache.
   *
   * Returns null if stats file doesn't exist.
   *
   * @returns UsageStats or null
   */
  async getStats(): Promise<UsageStats | null> {
    return this.reader.getStats();
  }

  /**
   * Check if user is authenticated with valid (non-expired) credentials.
   *
   * @returns true if authenticated with valid token
   */
  async isAuthenticated(): Promise<boolean> {
    return this.reader.isAuthenticated();
  }

  /**
   * Get subscription type from credentials.
   *
   * Returns null if not authenticated.
   *
   * @returns SubscriptionType or null
   */
  async getSubscriptionType(): Promise<SubscriptionType | null> {
    return this.reader.getSubscriptionType();
  }

  // =====================================
  // Write Operations (delegate to writer)
  // =====================================

  /**
   * Write OAuth credentials to platform-specific storage.
   *
   * Validates input before writing. Overwrites existing credentials.
   *
   * @param input - OAuth tokens and metadata to write
   * @returns Result<void, CredentialError>
   */
  async writeCredentials(
    input: OAuthTokensInput,
  ): Promise<Result<void, CredentialError>> {
    return this.writer.writeCredentials(input);
  }

  /**
   * Delete existing credentials from storage.
   *
   * Safe to call even if no credentials exist (idempotent).
   *
   * @returns Result<void, CredentialError>
   */
  async deleteCredentials(): Promise<Result<void, CredentialError>> {
    return this.writer.deleteCredentials();
  }

  /**
   * Check if the credentials storage location is writable.
   *
   * @returns true if storage is writable
   */
  async isWritable(): Promise<boolean> {
    return this.writer.isWritable();
  }

  /**
   * Get the credentials storage location.
   *
   * @returns Storage location string
   */
  getStorageLocation(): string {
    return this.writer.getStorageLocation();
  }

  // =====================================
  // Export/Import Helpers
  // =====================================

  /**
   * Export credentials in a portable format.
   *
   * Creates a CredentialsExport object that can be transferred to another
   * machine and imported using importCredentials().
   *
   * WARNING: The exported data contains sensitive tokens.
   * Handle with care and delete after import.
   *
   * @returns Result with CredentialsExport or error
   *
   * @example
   * ```typescript
   * const result = await manager.exportCredentials();
   * if (result.isOk()) {
   *   const exportData = JSON.stringify(result.value, null, 2);
   *   // Save to file or transfer securely
   * }
   * ```
   */
  async exportCredentials(): Promise<
    Result<CredentialsExport, CredentialError>
  > {
    const credentials = await this.getCredentials();

    if (credentials === null) {
      return err(CredentialError.notAuthenticated());
    }

    // Transform OAuthCredentialsResult to OAuthTokensInput format
    const exported: CredentialsExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      credentials: {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt.getTime(),
        scopes: [...credentials.scopes],
        subscriptionType: credentials.subscriptionType,
        rateLimitTier: credentials.rateLimitTier,
      },
    };

    return ok(exported);
  }

  /**
   * Import credentials from a CredentialsExport object.
   *
   * Validates the export format and credentials before writing.
   * Overwrites existing credentials if present.
   *
   * WARNING: This writes sensitive tokens to storage.
   * Only import credentials from trusted sources.
   *
   * @param data - CredentialsExport object (or unknown for validation)
   * @returns Result<void, CredentialError>
   *
   * @example
   * ```typescript
   * // From JSON string
   * const exportData = JSON.parse(fileContents);
   * const result = await manager.importCredentials(exportData);
   *
   * if (result.isOk()) {
   *   console.log("Import successful");
   * } else {
   *   console.error("Import failed:", result.error.message);
   * }
   * ```
   */
  async importCredentials(
    data: unknown,
  ): Promise<Result<void, CredentialError>> {
    // Validate export format
    const validationResult = validateCredentialsExport(data);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    // Write the validated credentials
    return this.writeCredentials(validationResult.value.credentials);
  }
}
