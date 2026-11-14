/**
 * Claude Code Authentication Credential Types
 *
 * Defines interfaces for OAuth tokens, account information, and subscription types
 * from Claude Code's credential storage.
 */

/**
 * Raw credential structure as stored in ~/.claude/.credentials.json (Linux)
 * or macOS Keychain.
 */
export interface ClaudeCredentials {
  claudeAiOauth: OAuthTokens;
}

/**
 * OAuth token structure from credentials storage
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  scopes: string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
}

/**
 * Subscription tier type
 */
export type SubscriptionType =
  | "max"
  | "pro"
  | "free"
  | "enterprise"
  | "unknown";

/**
 * Public API result for OAuth credentials with computed properties
 */
export interface OAuthCredentialsResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: readonly string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
  isExpired: boolean;
}

/**
 * Account information from ~/.claude.json
 */
export interface AccountInfo {
  accountUuid: string;
  emailAddress: string;
  displayName: string;
  organization: OrganizationInfo;
}

/**
 * Organization information
 */
export interface OrganizationInfo {
  uuid: string;
  name: string;
  billingType: string;
  role: string;
}
