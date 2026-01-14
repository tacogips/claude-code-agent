/**
 * macOS Keychain Credential Backend
 *
 * Reads Claude Code OAuth credentials from macOS Keychain using the `security` command.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { Result, ok, err } from "../../../result";
import type { ClaudeCredentials } from "../types";
import { CredentialError } from "../errors";
import type { CredentialBackend } from "./file";

const execAsync = promisify(exec);

/**
 * macOS Keychain credential backend
 *
 * Note: The exact service/account names for Claude Code's keychain entries
 * may need adjustment based on actual Claude Code behavior.
 */
export class KeychainCredentialBackend implements CredentialBackend {
  private readonly service = "claude-code";
  private readonly account = "credentials";

  async read(): Promise<Result<ClaudeCredentials, CredentialError>> {
    try {
      // Execute security command to retrieve password (JSON data) from keychain
      const { stdout, stderr } = await execAsync(
        `security find-generic-password -s "${this.service}" -a "${this.account}" -w`,
      );

      // Check for stderr output indicating errors
      if (stderr && stderr.trim().length > 0) {
        // Parse common keychain errors
        if (stderr.includes("could not be found")) {
          return err(CredentialError.notAuthenticated());
        }
        if (
          stderr.includes("User interaction is not allowed") ||
          stderr.includes("The specified item is no longer valid")
        ) {
          return err(CredentialError.keychainDenied());
        }
      }

      // Parse JSON from keychain data
      const keychainData = stdout.trim();
      if (!keychainData) {
        return err(CredentialError.notAuthenticated());
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(keychainData);
      } catch (parseError) {
        return err(
          CredentialError.invalidFormat(
            `Failed to parse JSON from keychain: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          ),
        );
      }

      // Validate structure
      if (!isValidCredentials(parsed)) {
        return err(
          CredentialError.invalidFormat(
            "Missing or invalid claudeAiOauth field",
          ),
        );
      }

      return ok(parsed);
    } catch (error) {
      // Handle exec errors
      if (isExecError(error)) {
        const stderr = error.stderr ?? "";
        const stdout = error.stdout ?? "";

        // Check for "not found" error
        if (
          stderr.includes("could not be found") ||
          stdout.includes("could not be found")
        ) {
          return err(CredentialError.notAuthenticated());
        }

        // Check for permission denied
        if (
          stderr.includes("User interaction is not allowed") ||
          stderr.includes("The specified item is no longer valid") ||
          stderr.includes("access denied")
        ) {
          return err(CredentialError.keychainDenied());
        }

        // Generic keychain error
        return err(
          CredentialError.invalidFormat(
            `Keychain access error: ${error.message}`,
          ),
        );
      }

      // Unknown error
      return err(
        CredentialError.invalidFormat(
          `Unknown error accessing keychain: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }
}

/**
 * Type guard for ClaudeCredentials structure
 */
function isValidCredentials(value: unknown): value is ClaudeCredentials {
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
 * Type guard for exec error with stdout/stderr
 */
interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
  code?: number;
}

function isExecError(error: unknown): error is ExecError {
  return (
    error instanceof Error &&
    ("stdout" in error || "stderr" in error || "code" in error)
  );
}
