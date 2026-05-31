/**
 * Credential Manager - Combined Read/Write Interface
 *
 * Provides unified access to both reading and writing Claude Code credentials.
 * Combines CredentialReader and CredentialWriter for complete credential management.
 */
import { type Result } from "../../result";
import { type OAuthTokensInput, type CredentialsExport } from "./validation";
import type { OAuthCredentialsResult, AccountInfo, SubscriptionType } from "./types";
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
export declare class CredentialManager {
    private readonly reader;
    private readonly writer;
    constructor(options?: CredentialManagerOptions);
    /**
     * Get OAuth credentials from backend storage.
     *
     * Returns null if user is not authenticated or credentials are invalid.
     *
     * @returns OAuthCredentialsResult with computed isExpired, or null
     */
    getCredentials(): Promise<OAuthCredentialsResult | null>;
    /**
     * Get account information from config file.
     *
     * Returns null if user is not authenticated or config doesn't exist.
     *
     * @returns AccountInfo or null
     */
    getAccount(): Promise<AccountInfo | null>;
    /**
     * Get usage statistics from stats cache.
     *
     * Returns null if stats file doesn't exist.
     *
     * @returns UsageStats or null
     */
    getStats(): Promise<UsageStats | null>;
    /**
     * Check if user is authenticated with valid (non-expired) credentials.
     *
     * @returns true if authenticated with valid token
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Get subscription type from credentials.
     *
     * Returns null if not authenticated.
     *
     * @returns SubscriptionType or null
     */
    getSubscriptionType(): Promise<SubscriptionType | null>;
    /**
     * Write OAuth credentials to platform-specific storage.
     *
     * Validates input before writing. Overwrites existing credentials.
     *
     * @param input - OAuth tokens and metadata to write
     * @returns Result<void, CredentialError>
     */
    writeCredentials(input: OAuthTokensInput): Promise<Result<void, CredentialError>>;
    /**
     * Delete existing credentials from storage.
     *
     * Safe to call even if no credentials exist (idempotent).
     *
     * @returns Result<void, CredentialError>
     */
    deleteCredentials(): Promise<Result<void, CredentialError>>;
    /**
     * Check if the credentials storage location is writable.
     *
     * @returns true if storage is writable
     */
    isWritable(): Promise<boolean>;
    /**
     * Get the credentials storage location.
     *
     * @returns Storage location string
     */
    getStorageLocation(): string;
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
    exportCredentials(): Promise<Result<CredentialsExport, CredentialError>>;
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
    importCredentials(data: unknown): Promise<Result<void, CredentialError>>;
}
//# sourceMappingURL=manager.d.ts.map