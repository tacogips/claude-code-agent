/**
 * Config Reader for ~/.claude.json
 *
 * Reads account information from Claude Code's config file.
 */

import { readFile } from "fs/promises";
import { Result, ok, err } from "../../result";
import type { AccountInfo, OrganizationInfo } from "./types";
import { CredentialError } from "./errors";

/**
 * Raw structure of ~/.claude.json oauthAccount section
 */
interface RawOAuthAccount {
  accountUuid: string;
  emailAddress: string;
  displayName: string;
  organizationUuid: string;
  organizationName: string;
  organizationBillingType: string;
  organizationRole: string;
  workspaceRole?: string | null;
  hasExtraUsageEnabled?: boolean;
}

/**
 * Raw structure of ~/.claude.json
 */
interface RawClaudeConfig {
  oauthAccount?: RawOAuthAccount;
  numStartups?: number;
  projects?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Type guard to validate RawOAuthAccount structure
 */
function isValidOAuthAccount(value: unknown): value is RawOAuthAccount {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const account = value as Record<string, unknown>;

  return (
    typeof account["accountUuid"] === "string" &&
    typeof account["emailAddress"] === "string" &&
    typeof account["displayName"] === "string" &&
    typeof account["organizationUuid"] === "string" &&
    typeof account["organizationName"] === "string" &&
    typeof account["organizationBillingType"] === "string" &&
    typeof account["organizationRole"] === "string"
  );
}

/**
 * Type guard to validate RawClaudeConfig structure
 */
function isValidClaudeConfig(value: unknown): value is RawClaudeConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  // oauthAccount is optional
  if (config["oauthAccount"] !== undefined) {
    return isValidOAuthAccount(config["oauthAccount"]);
  }

  return true;
}

/**
 * Transform raw OAuth account to AccountInfo
 */
function transformToAccountInfo(raw: RawOAuthAccount): AccountInfo {
  const organization: OrganizationInfo = {
    uuid: raw.organizationUuid,
    name: raw.organizationName,
    billingType: raw.organizationBillingType,
    role: raw.organizationRole,
  };

  return {
    accountUuid: raw.accountUuid,
    emailAddress: raw.emailAddress,
    displayName: raw.displayName,
    organization,
  };
}

/**
 * Reader for Claude Code config file (~/.claude.json)
 */
export class ConfigReader {
  constructor(private readonly path: string = getDefaultConfigPath()) {}

  /**
   * Get account information from config file.
   *
   * Returns null if config file doesn't exist or oauthAccount is missing
   * (user not authenticated).
   *
   * @returns Result with AccountInfo or null if not authenticated
   */
  async getAccount(): Promise<Result<AccountInfo | null, CredentialError>> {
    try {
      const content = await readFile(this.path, "utf-8");

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (parseError: unknown) {
        return err(
          CredentialError.invalidFormat(
            `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          ),
        );
      }

      // Validate structure
      if (!isValidClaudeConfig(parsed)) {
        return err(
          CredentialError.invalidFormat("Invalid config file structure"),
        );
      }

      // If no oauthAccount, user is not authenticated (not an error)
      if (parsed.oauthAccount === undefined) {
        return ok(null);
      }

      // Transform to AccountInfo
      const accountInfo = transformToAccountInfo(parsed.oauthAccount);
      return ok(accountInfo);
    } catch (error: unknown) {
      // Handle file system errors
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // File not found - user not authenticated (not an error)
        return ok(null);
      }

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EACCES"
      ) {
        return err(CredentialError.permissionDenied(this.path));
      }

      // Unknown error
      return err(
        CredentialError.invalidFormat(
          `Failed to read config: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}

/**
 * Get default config path (~/.claude.json)
 */
export function getDefaultConfigPath(): string {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude.json`;
}
