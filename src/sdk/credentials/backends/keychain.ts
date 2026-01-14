/**
 * macOS Keychain Credential Backend
 *
 * Reads and writes Claude Code OAuth credentials from macOS Keychain using the `security` command.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { Result, ok, err } from "../../../result";
import type { ClaudeCredentials } from "../types";
import { CredentialError } from "../errors";
import type { CredentialBackend } from "./file";
import { isValidCredentials } from "./type-guards";

const execAsync = promisify(exec);

/**
 * Escape shell argument for safe command execution
 * Prevents shell injection by properly escaping single quotes
 */
function escapeShellArg(arg: string): string {
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

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

  async write(
    credentials: ClaudeCredentials,
  ): Promise<Result<void, CredentialError>> {
    try {
      // Convert credentials to JSON string
      const jsonData = JSON.stringify(credentials);

      // Delete existing entry first (if exists)
      const deleteResult = await this.delete();
      if (deleteResult.isErr()) {
        // If delete failed for a reason other than "not found", return error
        const deleteError = deleteResult.error;
        if (deleteError.code !== "NOT_AUTHENTICATED") {
          return err(deleteError);
        }
        // If NOT_AUTHENTICATED, it means no existing entry - proceed with write
      }

      // Add new keychain entry with escaped JSON data
      // -U flag updates if exists (but we delete first for safety)
      await execAsync(
        `security add-generic-password -s "${this.service}" -a "${this.account}" -w ${escapeShellArg(jsonData)} -U`,
      );

      return ok(undefined);
    } catch (error) {
      // Handle exec errors
      if (isExecError(error)) {
        const stderr = error.stderr ?? "";

        // Check for permission denied
        if (
          stderr.includes("User interaction is not allowed") ||
          stderr.includes("access denied")
        ) {
          return err(CredentialError.keychainDenied());
        }

        // Generic write error
        return err(
          CredentialError.writeFailed(
            this.getLocation(),
            `Keychain write error: ${error.message}`,
          ),
        );
      }

      // Unknown error
      return err(
        CredentialError.writeFailed(
          this.getLocation(),
          `Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }

  async delete(): Promise<Result<void, CredentialError>> {
    try {
      // Delete keychain entry
      await execAsync(
        `security delete-generic-password -s "${this.service}" -a "${this.account}"`,
      );

      return ok(undefined);
    } catch (error) {
      // Handle exec errors
      if (isExecError(error)) {
        const stderr = error.stderr ?? "";

        // Check for "not found" error - this is OK (idempotent)
        if (stderr.includes("could not be found")) {
          return ok(undefined);
        }

        // Check for permission denied
        if (
          stderr.includes("User interaction is not allowed") ||
          stderr.includes("access denied")
        ) {
          return err(CredentialError.keychainDenied());
        }

        // Generic delete error
        return err(
          CredentialError.deleteFailed(
            this.getLocation(),
            `Keychain delete error: ${error.message}`,
          ),
        );
      }

      // Unknown error
      return err(
        CredentialError.deleteFailed(
          this.getLocation(),
          `Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }

  async isWritable(): Promise<boolean> {
    // Keychain is always writable if user has access
    // We consider it writable by default on macOS
    return true;
  }

  getLocation(): string {
    return `macOS Keychain (service: ${this.service}, account: ${this.account})`;
  }
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
