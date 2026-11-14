/**
 * Shared Type Guards for Credential Backends
 *
 * Common type guard functions used across file and keychain backends.
 *
 * @module sdk/credentials/backends/type-guards
 */

import type { ClaudeCredentials } from "../types";

/**
 * Type guard for ClaudeCredentials structure
 *
 * Validates that an unknown value conforms to the ClaudeCredentials interface,
 * checking for the presence and correct types of all required fields.
 *
 * @param value - Unknown value to validate
 * @returns True if value is a valid ClaudeCredentials object
 */
export function isValidCredentials(value: unknown): value is ClaudeCredentials {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check claudeAiOauth exists and is an object
  if (
    typeof obj["claudeAiOauth"] !== "object" ||
    obj["claudeAiOauth"] === null
  ) {
    return false;
  }

  const oauth = obj["claudeAiOauth"] as Record<string, unknown>;

  // Validate required fields
  return (
    typeof oauth["accessToken"] === "string" &&
    typeof oauth["refreshToken"] === "string" &&
    typeof oauth["expiresAt"] === "number" &&
    Array.isArray(oauth["scopes"]) &&
    typeof oauth["subscriptionType"] === "string" &&
    typeof oauth["rateLimitTier"] === "string"
  );
}

/**
 * Type guard for Node.js error with code property
 *
 * Validates that an unknown error value is a Node.js ErrnoException
 * with a string error code (e.g., 'ENOENT', 'EACCES').
 *
 * @param error - Unknown error value to validate
 * @returns True if error is a NodeJS.ErrnoException with a code property
 */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  );
}
