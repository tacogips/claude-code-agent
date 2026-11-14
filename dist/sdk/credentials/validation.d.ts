/**
 * Credential Input Validation
 *
 * Provides types and validation functions for OAuth credentials input.
 * Used for importing and writing credentials across machines.
 */
import { type Result } from "../../result";
import { CredentialError } from "./errors";
import type { SubscriptionType } from "./types";
/**
 * Input for writing credentials - mirrors raw token structure
 */
export interface OAuthTokensInput {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: SubscriptionType;
    rateLimitTier: string;
}
/**
 * Convenience type for import/export
 */
export interface CredentialsExport {
    version: 1;
    exportedAt: string;
    credentials: OAuthTokensInput;
}
/**
 * Validate credentials input structure and values.
 *
 * Performs comprehensive validation including:
 * - Type checking for all fields
 * - Token prefix validation (lenient - accepts sk-ant-* prefixes)
 * - Expiration validation (must be future timestamp)
 * - Scopes validation (non-empty array)
 * - Subscription type validation
 * - Rate limit tier validation
 *
 * @param input - Unknown input to validate
 * @returns Result with validated credentials or error
 */
export declare function validateCredentialsInput(input: unknown): Result<OAuthTokensInput, CredentialError>;
/**
 * Validate credentials export structure.
 *
 * Ensures the export format matches expected structure:
 * - version is 1
 * - exportedAt is a valid ISO date string
 * - credentials passes validateCredentialsInput
 *
 * @param input - Unknown input to validate
 * @returns Result with validated export or error
 */
export declare function validateCredentialsExport(input: unknown): Result<CredentialsExport, CredentialError>;
//# sourceMappingURL=validation.d.ts.map