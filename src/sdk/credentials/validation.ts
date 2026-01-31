/**
 * Credential Input Validation
 *
 * Provides types and validation functions for OAuth credentials input.
 * Used for importing and writing credentials across machines.
 */

import { Result, ok, err } from "../../result";
import { CredentialError } from "./errors";
import type { SubscriptionType } from "./types";

/**
 * Input for writing credentials - mirrors raw token structure
 */
export interface OAuthTokensInput {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  scopes: string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
}

/**
 * Convenience type for import/export
 */
export interface CredentialsExport {
  version: 1;
  exportedAt: string; // ISO date
  credentials: OAuthTokensInput;
}

/**
 * Valid subscription types
 */
const VALID_SUBSCRIPTION_TYPES: readonly SubscriptionType[] = [
  "max",
  "pro",
  "free",
  "enterprise",
  "unknown",
] as const;

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
export function validateCredentialsInput(
  input: unknown,
): Result<OAuthTokensInput, CredentialError> {
  // Validate structure exists
  if (typeof input !== "object" || input === null) {
    return err(
      CredentialError.invalidFormat(
        "Input must be an object, got null or non-object",
      ),
    );
  }

  const obj = input as Record<string, unknown>;

  // Validate access token
  if (typeof obj["accessToken"] !== "string") {
    return err(CredentialError.invalidFormat("accessToken must be a string"));
  }

  // Lenient validation: accept sk-ant-oat01-* or sk-ant-* prefixes
  if (
    !obj["accessToken"].startsWith("sk-ant-oat01-") &&
    !obj["accessToken"].startsWith("sk-ant-")
  ) {
    return err(
      CredentialError.invalidFormat(
        'accessToken must start with "sk-ant-oat01-" or "sk-ant-"',
      ),
    );
  }

  // Validate refresh token
  if (typeof obj["refreshToken"] !== "string") {
    return err(CredentialError.invalidFormat("refreshToken must be a string"));
  }

  // Lenient validation: accept sk-ant-ort01-* or sk-ant-* prefixes
  if (
    !obj["refreshToken"].startsWith("sk-ant-ort01-") &&
    !obj["refreshToken"].startsWith("sk-ant-")
  ) {
    return err(
      CredentialError.invalidFormat(
        'refreshToken must start with "sk-ant-ort01-" or "sk-ant-"',
      ),
    );
  }

  // Validate expiration
  if (typeof obj["expiresAt"] !== "number") {
    return err(
      CredentialError.invalidFormat(
        "expiresAt must be a number (Unix timestamp in milliseconds)",
      ),
    );
  }

  if (obj["expiresAt"] <= Date.now()) {
    return err(
      CredentialError.invalidFormat(
        "Token is expired or has invalid expiration timestamp",
      ),
    );
  }

  // Validate scopes
  if (!Array.isArray(obj["scopes"])) {
    return err(CredentialError.invalidFormat("scopes must be an array"));
  }

  if (obj["scopes"].length === 0) {
    return err(
      CredentialError.invalidFormat("scopes must be a non-empty array"),
    );
  }

  // Validate all scope items are strings
  if (!obj["scopes"].every((scope) => typeof scope === "string")) {
    return err(CredentialError.invalidFormat("all scopes must be strings"));
  }

  // Validate subscription type
  if (typeof obj["subscriptionType"] !== "string") {
    return err(
      CredentialError.invalidFormat("subscriptionType must be a string"),
    );
  }

  if (
    !VALID_SUBSCRIPTION_TYPES.includes(
      obj["subscriptionType"] as SubscriptionType,
    )
  ) {
    return err(
      CredentialError.invalidFormat(
        `subscriptionType must be one of: ${VALID_SUBSCRIPTION_TYPES.join(", ")}`,
      ),
    );
  }

  // Validate rate limit tier
  if (typeof obj["rateLimitTier"] !== "string") {
    return err(CredentialError.invalidFormat("rateLimitTier must be a string"));
  }

  if (obj["rateLimitTier"].length === 0) {
    return err(
      CredentialError.invalidFormat("rateLimitTier must be a non-empty string"),
    );
  }

  // All validations passed - construct validated object
  return ok({
    accessToken: obj["accessToken"],
    refreshToken: obj["refreshToken"],
    expiresAt: obj["expiresAt"],
    scopes: obj["scopes"] as string[],
    subscriptionType: obj["subscriptionType"] as SubscriptionType,
    rateLimitTier: obj["rateLimitTier"],
  });
}

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
export function validateCredentialsExport(
  input: unknown,
): Result<CredentialsExport, CredentialError> {
  // Validate structure exists
  if (typeof input !== "object" || input === null) {
    return err(
      CredentialError.invalidFormat(
        "Export must be an object, got null or non-object",
      ),
    );
  }

  const obj = input as Record<string, unknown>;

  // Validate version
  if (obj["version"] !== 1) {
    return err(
      CredentialError.invalidFormat(
        `Export version must be 1, got ${String(obj["version"])}`,
      ),
    );
  }

  // Validate exportedAt
  if (typeof obj["exportedAt"] !== "string") {
    return err(CredentialError.invalidFormat("exportedAt must be a string"));
  }

  // Validate credentials field
  if (typeof obj["credentials"] !== "object" || obj["credentials"] === null) {
    return err(
      CredentialError.invalidFormat("Export must contain credentials object"),
    );
  }

  // Validate credentials using validateCredentialsInput
  const credentialsResult = validateCredentialsInput(obj["credentials"]);
  if (credentialsResult.isErr()) {
    return err(credentialsResult.error);
  }

  // All validations passed
  return ok({
    version: 1,
    exportedAt: obj["exportedAt"],
    credentials: credentialsResult.value,
  });
}
