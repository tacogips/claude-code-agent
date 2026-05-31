/**
 * CredentialReader Class
 *
 * Main orchestrator for reading Claude Code authentication credentials,
 * account information, and usage statistics.
 */
import { type Platform } from "./backends";
import type { OAuthCredentialsResult, AccountInfo, SubscriptionType } from "./types";
import type { UsageStats } from "./stats-types";
/**
 * Options for CredentialReader constructor
 */
export interface CredentialReaderOptions {
    /**
     * Custom config directory (default: ~/.claude)
     */
    configDir?: string;
    /**
     * Platform override for backend selection (auto-detected if not provided)
     */
    platform?: Platform;
}
/**
 * Main credential reader that orchestrates all credential-related operations
 *
 * Integrates:
 * - Credential backends (file, keychain) for OAuth tokens
 * - Config reader for account information
 * - Stats reader for usage statistics
 *
 * @example
 * ```typescript
 * const reader = new CredentialReader();
 * const creds = await reader.getCredentials();
 * if (creds && !creds.isExpired) {
 *   console.log('Authenticated as:', creds.accessToken);
 * }
 * ```
 */
export declare class CredentialReader {
    private readonly backend;
    private readonly configReader;
    private readonly statsReader;
    constructor(options?: CredentialReaderOptions);
    /**
     * Get OAuth credentials from backend storage
     *
     * Returns null if:
     * - Credentials file doesn't exist (user not authenticated)
     * - Credentials are invalid/corrupted
     *
     * The returned result includes an `isExpired` property computed from `expiresAt`.
     *
     * @returns OAuthCredentialsResult with computed isExpired, or null if not found
     */
    getCredentials(): Promise<OAuthCredentialsResult | null>;
    /**
     * Get account information from config file
     *
     * Returns null if user is not authenticated or config file doesn't exist.
     *
     * @returns AccountInfo or null
     */
    getAccount(): Promise<AccountInfo | null>;
    /**
     * Get usage statistics from stats cache
     *
     * Returns null if stats file doesn't exist (user hasn't used Claude Code yet).
     *
     * @returns UsageStats or null
     */
    getStats(): Promise<UsageStats | null>;
    /**
     * Check if user is authenticated with valid credentials
     *
     * Returns true if:
     * - Credentials exist
     * - Credentials are not expired
     *
     * @returns true if authenticated with valid token
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Get subscription type from credentials
     *
     * Returns null if not authenticated.
     *
     * @returns SubscriptionType or null
     */
    getSubscriptionType(): Promise<SubscriptionType | null>;
    /**
     * Transform ClaudeCredentials to OAuthCredentialsResult with computed properties
     */
    private transformCredentials;
}
//# sourceMappingURL=reader.d.ts.map