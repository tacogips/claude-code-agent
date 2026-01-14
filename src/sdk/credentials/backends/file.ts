/**
 * File-based Credential Backend for Linux
 *
 * Reads Claude Code OAuth credentials from ~/.claude/.credentials.json
 */

import { readFile } from "fs/promises";
import { Result, ok, err } from "../../../result";
import type { ClaudeCredentials } from "../types";
import { CredentialError } from "../errors";

/**
 * Generic credential backend interface
 */
export interface CredentialBackend {
  read(): Promise<Result<ClaudeCredentials, CredentialError>>;
}

/**
 * File-based credential backend for Linux systems
 */
export class FileCredentialBackend implements CredentialBackend {
  constructor(private readonly path: string) {}

  async read(): Promise<Result<ClaudeCredentials, CredentialError>> {
    try {
      // Read file contents
      const fileContent = await readFile(this.path, "utf-8");

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(fileContent);
      } catch (parseError) {
        return err(
          CredentialError.invalidFormat(
            `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
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
      // Handle file system errors
      if (isNodeError(error)) {
        switch (error.code) {
          case "ENOENT":
            return err(CredentialError.fileNotFound(this.path));
          case "EACCES":
            return err(CredentialError.permissionDenied(this.path));
          default:
            return err(
              CredentialError.invalidFormat(
                `File system error: ${error.message}`,
              ),
            );
        }
      }

      return err(
        CredentialError.invalidFormat(
          `Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }
}

/**
 * Get default credentials file path
 */
export function getDefaultCredentialsPath(): string {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude/.credentials.json`;
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
 * Type guard for Node.js error with code property
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  );
}
