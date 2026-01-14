/**
 * CredentialReader Class
 *
 * Main orchestrator for reading Claude Code authentication credentials,
 * account information, and usage statistics.
 */

import type { CredentialBackend } from "./backends";
import { createCredentialBackend, type Platform } from "./backends";
import { ConfigReader } from "./config-reader";
import { StatsReader } from "./stats-reader";
import type {
  OAuthCredentialsResult,
  AccountInfo,
  SubscriptionType,
  ClaudeCredentials,
} from "./types";
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
export class CredentialReader {
  private readonly backend: CredentialBackend;
  private readonly configReader: ConfigReader;
  private readonly statsReader: StatsReader;

  constructor(options?: CredentialReaderOptions) {
    // Create backend with optional platform override
    this.backend = createCredentialBackend(options?.platform);

    // Create config reader with optional custom path
    const configPath = options?.configDir
      ? `${options.configDir}/.claude.json`
      : undefined;
    this.configReader = new ConfigReader(configPath);

    // Create stats reader with optional custom path
    const statsPath = options?.configDir
      ? `${options.configDir}/stats-cache.json`
      : undefined;
    this.statsReader = new StatsReader(statsPath);
  }

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
  async getCredentials(): Promise<OAuthCredentialsResult | null> {
    const result = await this.backend.read();

    if (result.isErr()) {
      // For NOT_AUTHENTICATED and FILE_NOT_FOUND errors, return null (valid state)
      const error = result.error;
      if (
        error.code === "NOT_AUTHENTICATED" ||
        error.code === "FILE_NOT_FOUND"
      ) {
        return null;
      }

      // For other errors (permission denied, invalid format), also return null
      // but we could log or expose errors in the future
      return null;
    }

    const credentials = result.value;
    if (!credentials) {
      return null;
    }

    // Transform to OAuthCredentialsResult with computed properties
    return this.transformCredentials(credentials);
  }

  /**
   * Get account information from config file
   *
   * Returns null if user is not authenticated or config file doesn't exist.
   *
   * @returns AccountInfo or null
   */
  async getAccount(): Promise<AccountInfo | null> {
    const result = await this.configReader.getAccount();

    if (result.isErr()) {
      // Return null for errors (user can check isAuthenticated separately)
      return null;
    }

    return result.value;
  }

  /**
   * Get usage statistics from stats cache
   *
   * Returns null if stats file doesn't exist (user hasn't used Claude Code yet).
   *
   * @returns UsageStats or null
   */
  async getStats(): Promise<UsageStats | null> {
    const result = await this.statsReader.getStats();

    if (result.isErr()) {
      // Return null for errors
      return null;
    }

    return result.value;
  }

  /**
   * Check if user is authenticated with valid credentials
   *
   * Returns true if:
   * - Credentials exist
   * - Credentials are not expired
   *
   * @returns true if authenticated with valid token
   */
  async isAuthenticated(): Promise<boolean> {
    const creds = await this.getCredentials();
    return creds !== null && !creds.isExpired;
  }

  /**
   * Get subscription type from credentials
   *
   * Returns null if not authenticated.
   *
   * @returns SubscriptionType or null
   */
  async getSubscriptionType(): Promise<SubscriptionType | null> {
    const creds = await this.getCredentials();
    return creds?.subscriptionType ?? null;
  }

  /**
   * Transform ClaudeCredentials to OAuthCredentialsResult with computed properties
   */
  private transformCredentials(
    credentials: ClaudeCredentials,
  ): OAuthCredentialsResult {
    const oauth = credentials.claudeAiOauth;
    const expiresAt = new Date(oauth.expiresAt);
    const isExpired = expiresAt.getTime() < Date.now();

    return {
      accessToken: oauth.accessToken,
      refreshToken: oauth.refreshToken,
      expiresAt,
      scopes: Object.freeze([...oauth.scopes]) as readonly string[],
      subscriptionType: oauth.subscriptionType,
      rateLimitTier: oauth.rateLimitTier,
      isExpired,
    };
  }
}
