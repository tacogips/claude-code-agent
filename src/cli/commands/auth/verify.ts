/**
 * CLI Auth Verify Command
 *
 * Verifies that stored credentials are valid and not expired.
 * Displays detailed information about credential status.
 *
 * @module cli/commands/auth/verify
 */

import type { Command } from "commander";
import { CredentialManager } from "../../../sdk/credentials";
import { formatRelativeTime } from "./utils";

/**
 * Create auth verify command that checks credential validity.
 *
 * Displays:
 * - Status (VALID/EXPIRED/NOT_FOUND)
 * - Token expiration time
 * - Subscription type
 * - Granted scopes
 *
 * Exit codes:
 * - 0: Credentials are valid
 * - 1: Credentials are expired or not found
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * claude-code-agent auth verify
 * # Output:
 * # CREDENTIAL VERIFICATION
 * # -----------------------------------------------------------
 * # Status:           VALID
 * # Token Expires:    2026-01-15 12:32:16 (23 hours from now)
 * # Subscription:     max
 * # Scopes:           user:inference, user:profile, user:sessions:claude_code
 * #
 * # Credentials are valid and can be used for Claude Code execution.
 * ```
 */
export function createAuthVerifyCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("verify")
    .description("Verify stored credentials are valid")
    .action(async () => {
      const manager = new CredentialManager();

      // Get credentials
      const credentials = await manager.getCredentials();

      console.log("");
      console.log("CREDENTIAL VERIFICATION");
      console.log("-----------------------------------------------------------");

      if (credentials === null) {
        console.log("Status:           NOT_FOUND");
        console.log("");
        console.log("No credentials found.");
        console.log("To authenticate, run: claude /login");
        process.exit(1);
      }

      const status = credentials.isExpired ? "EXPIRED" : "VALID";

      console.log(`Status:           ${status}`);
      console.log(
        `Token Expires:    ${credentials.expiresAt.toISOString()} (${formatRelativeTime(credentials.expiresAt)})`,
      );
      console.log(`Subscription:     ${credentials.subscriptionType}`);
      console.log(`Scopes:           ${credentials.scopes.join(", ")}`);
      console.log(`Rate Limit Tier:  ${credentials.rateLimitTier}`);
      console.log(`Storage:          ${manager.getStorageLocation()}`);
      console.log("");

      if (credentials.isExpired) {
        console.log("Credentials are expired.");
        console.log("To re-authenticate, run: claude /login");
        process.exit(1);
      }

      console.log("Credentials are valid and can be used for Claude Code execution.");
    });
}
