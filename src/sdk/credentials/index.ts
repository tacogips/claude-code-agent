/**
 * Claude Code Credentials SDK
 *
 * Public API for reading authentication credentials, account information,
 * and usage statistics from Claude Code's local storage.
 *
 * @module sdk/credentials
 *
 * @example
 * ```typescript
 * import { CredentialReader } from '@sdk/credentials';
 *
 * const reader = new CredentialReader();
 *
 * // Check authentication status
 * if (await reader.isAuthenticated()) {
 *   // Get credentials
 *   const creds = await reader.getCredentials();
 *   console.log('Subscription:', creds?.subscriptionType);
 *
 *   // Get account info
 *   const account = await reader.getAccount();
 *   console.log('User:', account?.emailAddress);
 *
 *   // Get usage stats
 *   const stats = await reader.getStats();
 *   console.log('Total sessions:', stats?.totalSessions);
 * }
 * ```
 */

// Main API
export { CredentialReader, type CredentialReaderOptions } from "./reader";

// Credential types
export type {
  OAuthCredentialsResult,
  AccountInfo,
  OrganizationInfo,
  SubscriptionType,
} from "./types";

// Stats types
export type {
  UsageStats,
  ModelUsage,
  DailyActivity,
  DailyTokens,
  LongestSession,
} from "./stats-types";

// Error types
export { CredentialError, type CredentialErrorCode } from "./errors";
