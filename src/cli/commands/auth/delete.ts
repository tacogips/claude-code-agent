/**
 * CLI Auth Delete Command
 *
 * Deletes stored credentials from the system.
 * Requires confirmation before deletion (unless --force is used).
 *
 * @module cli/commands/auth/delete
 */

import type { Command } from "commander";
import { CredentialManager } from "../../../sdk/credentials";
import * as readline from "node:readline";

/**
 * Prompt user for confirmation with specific keyword
 */
async function promptDeleteConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Type 'delete' to confirm: ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "delete");
    });
  });
}

/**
 * Create auth delete command that removes stored credentials.
 *
 * Options:
 * - --force: Skip confirmation prompt
 *
 * Exit codes:
 * - 0: Deletion successful or no credentials to delete
 * - 1: Deletion failed or cancelled
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Delete with confirmation
 * claude-code-agent auth delete
 *
 * # Delete without confirmation
 * claude-code-agent auth delete --force
 * ```
 */
export function createAuthDeleteCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("delete")
    .description("Delete stored credentials")
    .option("--force", "Skip confirmation")
    .action(async (options: { force?: boolean }) => {
      const manager = new CredentialManager();

      // Check if credentials exist
      const existingCreds = await manager.getCredentials();
      if (existingCreds === null) {
        console.log("No credentials found. Nothing to delete.");
        process.exit(0);
      }

      // Show what will be deleted
      console.log("Current credentials:");
      console.log(`  Subscription: ${existingCreds.subscriptionType}`);
      console.log(`  Expires: ${existingCreds.expiresAt.toISOString()}`);
      console.log(`  Storage: ${manager.getStorageLocation()}`);
      console.log("");

      // Confirm deletion
      if (options.force !== true) {
        console.log("WARNING: This will delete your Claude Code credentials.");
        console.log("You will need to re-authenticate using 'claude /login'.");
        console.log("");

        const confirmed = await promptDeleteConfirmation();
        if (!confirmed) {
          console.log("Deletion cancelled.");
          process.exit(1);
        }
      }

      // Delete credentials
      const result = await manager.deleteCredentials();
      if (result.isErr()) {
        console.error("Deletion failed:", result.error.message);
        process.exit(1);
      }

      console.log("");
      console.log("Credentials deleted successfully.");
      console.log("To re-authenticate, run: claude /login");
    });
}
