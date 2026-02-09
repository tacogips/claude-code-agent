/**
 * Credential Test Fixtures
 *
 * Factory functions for creating test credential data.
 * Provides type-safe test data with override support.
 *
 * @module test/fixtures/credentials
 */

import type {
  OAuthTokensInput,
  OAuthCredentialsResult,
} from "../../sdk/credentials";

/**
 * Create test OAuth tokens input for credential writing.
 *
 * Returns a valid OAuthTokensInput with all required fields.
 * Supports partial overrides for testing specific scenarios.
 *
 * @param overrides - Optional partial overrides for any field
 * @returns A complete OAuthTokensInput object
 *
 * @example
 * ```typescript
 * // Default valid credentials
 * const creds = createTestCredentials();
 *
 * // Override specific fields
 * const expiredCreds = createTestCredentials({
 *   expiresAt: Date.now() - 86400000, // 24 hours ago
 * });
 *
 * // Test different subscription type
 * const proCreds = createTestCredentials({
 *   subscriptionType: "pro",
 * });
 * ```
 */
export function createTestCredentials(
  overrides: Partial<OAuthTokensInput> = {},
): OAuthTokensInput {
  return {
    accessToken: "sk-ant-oat01-test-access-token-12345678",
    refreshToken: "sk-ant-ort01-test-refresh-token-87654321",
    expiresAt: Date.now() + 86400000, // 24 hours from now
    scopes: ["user:inference", "user:profile", "user:sessions:claude_code"],
    subscriptionType: "max",
    rateLimitTier: "default_claude_max_20x",
    ...overrides,
  };
}

/**
 * Create mock OAuth credentials result for testing reader operations.
 *
 * Returns a valid OAuthCredentialsResult with all required fields
 * including the computed isExpired flag.
 *
 * @param overrides - Optional partial overrides for any field
 * @returns A complete OAuthCredentialsResult object
 *
 * @example
 * ```typescript
 * // Default valid credentials
 * const creds = createMockOAuthCredentials();
 *
 * // Expired credentials
 * const expired = createMockOAuthCredentials({
 *   expiresAt: new Date(Date.now() - 86400000),
 *   isExpired: true,
 * });
 * ```
 */
export function createMockOAuthCredentials(
  overrides: Partial<OAuthCredentialsResult> = {},
): OAuthCredentialsResult {
  return {
    accessToken: "sk-ant-oat01-test-access-token",
    refreshToken: "sk-ant-ort01-test-refresh-token",
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    scopes: ["user:inference", "user:profile", "user:sessions:claude_code"],
    subscriptionType: "max",
    rateLimitTier: "default_claude_max_20x",
    isExpired: false,
    ...overrides,
  };
}
