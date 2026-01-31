/**
 * CLI Auth Status Command
 *
 * Checks and displays current authentication status with Claude Code.
 * Shows whether credentials are valid, expired, or missing, along with
 * subscription type and expiration time.
 *
 * @module cli/commands/auth/status
 */

import type { Command } from "commander";
import { CredentialReader } from "../../../sdk/credentials";

/**
 * Create auth status command that checks authentication status
 *
 * Displays:
 * - Authentication status (VALID/EXPIRED/NOT_AUTHENTICATED)
 * - Subscription type
 * - Expiration time
 *
 * Exit codes:
 * - 0: Authenticated (valid or expired)
 * - 1: Not authenticated
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * claude-code-agent auth status
 * # Output:
 * # Authentication Status: VALID
 * # Subscription: pro
 * # Expires: 2026-02-15T10:30:00.000Z
 * ```
 */
export function createAuthStatusCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("status")
    .description("Check authentication status")
    .action(async () => {
      const reader = new CredentialReader();
      const creds = await reader.getCredentials();

      if (!creds) {
        console.log("Authentication Status: NOT AUTHENTICATED");
        console.log("Run: claude /login");
        process.exit(1);
      }

      const status = creds.isExpired ? "EXPIRED" : "VALID";
      console.log(`Authentication Status: ${status}`);
      console.log(`Subscription: ${creds.subscriptionType}`);
      console.log(`Expires: ${creds.expiresAt.toISOString()}`);
    });
}
