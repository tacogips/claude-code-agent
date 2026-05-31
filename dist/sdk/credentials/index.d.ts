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
export { CredentialReader, type CredentialReaderOptions } from "./reader";
export { CredentialWriter, type CredentialWriterOptions } from "./writer";
export { CredentialManager, type CredentialManagerOptions } from "./manager";
export type { OAuthCredentialsResult, AccountInfo, OrganizationInfo, SubscriptionType, } from "./types";
export type { OAuthTokensInput, CredentialsExport } from "./validation";
export { validateCredentialsInput, validateCredentialsExport, } from "./validation";
export type { UsageStats, ModelUsage, DailyActivity, DailyTokens, LongestSession, } from "./stats-types";
export { CredentialError, type CredentialErrorCode } from "./errors";
//# sourceMappingURL=index.d.ts.map