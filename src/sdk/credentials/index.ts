/**
 * Claude Code Credentials SDK
 *
 * Public API for reading and writing authentication credentials, account information,
 * and usage statistics from Claude Code's local storage.
 *
 * @module sdk/credentials
 *
 * @example
 * ```typescript
 * import { CredentialReader, CredentialWriter, CredentialManager } from '@sdk/credentials';
 *
 * // Read-only access
 * const reader = new CredentialReader();
 * if (await reader.isAuthenticated()) {
 *   const creds = await reader.getCredentials();
 *   console.log('Subscription:', creds?.subscriptionType);
 * }
 *
 * // Write access (for credential import/export)
 * const writer = new CredentialWriter();
 * await writer.writeCredentials({
 *   accessToken: "sk-ant-oat01-...",
 *   refreshToken: "sk-ant-ort01-...",
 *   expiresAt: Date.now() + 86400000,
 *   scopes: ["user:inference"],
 *   subscriptionType: "max",
 *   rateLimitTier: "default"
 * });
 *
 * // Combined read/write with export/import helpers
 * const manager = new CredentialManager();
 * const exportResult = await manager.exportCredentials();
 * await manager.importCredentials(exportData);
 * ```
 */

// Main API - Reader
export { CredentialReader, type CredentialReaderOptions } from "./reader";

// Main API - Writer
export { CredentialWriter, type CredentialWriterOptions } from "./writer";

// Main API - Manager (combined read/write)
export { CredentialManager, type CredentialManagerOptions } from "./manager";

// Credential types
export type {
  OAuthCredentialsResult,
  AccountInfo,
  OrganizationInfo,
  SubscriptionType,
} from "./types";

// Input/Export types for writing
export type { OAuthTokensInput, CredentialsExport } from "./validation";
export { validateCredentialsInput, validateCredentialsExport } from "./validation";

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
