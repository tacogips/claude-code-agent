/**
 * CLI Auth Import Command
 *
 * Imports credentials from file, stdin, or individual options.
 * Allows transferring authentication between machines.
 *
 * WARNING: Only import credentials from trusted sources.
 *
 * @module cli/commands/auth/import
 */

import type { Command } from "commander";
import {
  CredentialManager,
  type OAuthTokensInput,
  type SubscriptionType,
} from "../../../sdk/credentials";
import * as fs from "node:fs/promises";
import * as readline from "node:readline";
import { formatRelativeTime } from "./utils";

/**
 * Command options for auth import
 */
interface ImportOptions {
  stdin?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string;
  subscriptionType?: string;
  rateLimitTier?: string;
  force?: boolean;
}

/**
 * Read all data from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

/**
 * Create auth import command that imports credentials from various sources.
 *
 * Arguments:
 * - [file]: Input file path (optional)
 *
 * Options:
 * - --stdin: Read from stdin
 * - --access-token: Access token for manual entry
 * - --refresh-token: Refresh token
 * - --expires-at: Expiration timestamp (ms)
 * - --scopes: Comma-separated scopes
 * - --subscription-type: Subscription type
 * - --rate-limit-tier: Rate limit tier
 * - --force: Skip confirmation for overwrite
 *
 * Exit codes:
 * - 0: Import successful
 * - 1: Import failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Import from file
 * claude-code-agent auth import credentials.json
 *
 * # Import from stdin
 * cat credentials.json | claude-code-agent auth import --stdin
 *
 * # Import with individual options
 * claude-code-agent auth import --access-token "sk-ant-oat01-..." \
 *   --refresh-token "sk-ant-ort01-..." --expires-at 1768332736724 \
 *   --scopes "user:inference,user:profile" --subscription-type max \
 *   --rate-limit-tier default_claude_max_20x
 * ```
 */
export function createAuthImportCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("import")
    .description("Import credentials from file or stdin")
    .argument("[file]", "Input file path")
    .option("--stdin", "Read from stdin")
    .option("--access-token <token>", "Access token (for manual entry)")
    .option("--refresh-token <token>", "Refresh token")
    .option("--expires-at <timestamp>", "Expiration timestamp (ms)")
    .option("--scopes <scopes>", "Comma-separated scopes")
    .option("--subscription-type <type>", "Subscription type")
    .option("--rate-limit-tier <tier>", "Rate limit tier")
    .option("--force", "Skip confirmation for overwrite")
    .action(async (file: string | undefined, options: ImportOptions) => {
      const manager = new CredentialManager();

      // Check for existing credentials
      const existingCreds = await manager.getCredentials();
      if (existingCreds !== null && options.force !== true) {
        console.log("Existing credentials detected.");
        console.log(`  Subscription: ${existingCreds.subscriptionType}`);
        console.log(`  Expires: ${existingCreds.expiresAt.toISOString()}`);
        console.log("");

        const confirmed = await promptConfirmation(
          "Overwrite existing credentials? (yes/no): ",
        );
        if (!confirmed) {
          console.log("Import cancelled.");
          process.exit(0);
        }
      }

      let importData: unknown;

      // Determine input source
      if (options.accessToken !== undefined) {
        // Manual entry via options
        if (
          options.refreshToken === undefined ||
          options.expiresAt === undefined ||
          options.scopes === undefined ||
          options.subscriptionType === undefined ||
          options.rateLimitTier === undefined
        ) {
          console.error(
            "Error: When using --access-token, all credential options are required:",
          );
          console.error(
            "  --refresh-token, --expires-at, --scopes, --subscription-type, --rate-limit-tier",
          );
          process.exit(1);
        }

        const credentials: OAuthTokensInput = {
          accessToken: options.accessToken,
          refreshToken: options.refreshToken,
          expiresAt: parseInt(options.expiresAt, 10),
          scopes: options.scopes.split(",").map((s) => s.trim()),
          subscriptionType: options.subscriptionType as SubscriptionType,
          rateLimitTier: options.rateLimitTier,
        };

        // Import directly (not as CredentialsExport format)
        const result = await manager.writeCredentials(credentials);
        if (result.isErr()) {
          console.error("Import failed:", result.error.message);
          process.exit(1);
        }

        displaySuccess(manager, credentials);
        return;
      } else if (options.stdin === true) {
        // Read from stdin
        try {
          const content = await readStdin();
          importData = JSON.parse(content);
        } catch (error) {
          console.error(
            "Failed to parse stdin as JSON:",
            error instanceof Error ? error.message : String(error),
          );
          process.exit(1);
        }
      } else if (file !== undefined) {
        // Read from file
        try {
          const content = await fs.readFile(file, "utf8");
          importData = JSON.parse(content);
        } catch (error) {
          console.error(
            "Failed to read file:",
            error instanceof Error ? error.message : String(error),
          );
          process.exit(1);
        }
      } else {
        console.error(
          "Error: Provide a file path, use --stdin, or specify credential options.",
        );
        console.error("Run: claude-code-agent auth import --help");
        process.exit(1);
      }

      // Import from JSON data (CredentialsExport format)
      const result = await manager.importCredentials(importData);
      if (result.isErr()) {
        console.error("Import failed:", result.error.message);
        process.exit(1);
      }

      // Get the imported credentials for display
      const imported = await manager.getCredentials();
      if (imported !== null) {
        displaySuccessFromResult(manager, imported);
      }
    });
}

/**
 * Display success message for imported credentials
 */
function displaySuccess(
  manager: CredentialManager,
  credentials: OAuthTokensInput,
): void {
  const expiresAt = new Date(credentials.expiresAt);

  console.log("");
  console.log("CREDENTIAL IMPORT");
  console.log("-----------------------------------------------------------");
  console.log(`Status:           SUCCESS`);
  console.log(`Storage Location: ${manager.getStorageLocation()}`);
  console.log(
    `Token Expiry:     ${expiresAt.toISOString()} (${formatRelativeTime(expiresAt)})`,
  );
  console.log(`Subscription:     ${credentials.subscriptionType}`);
  console.log("");
  console.log("WARNING: These credentials provide full account access.");
  console.log("         Do not share the exported file.");
}

/**
 * Display success message from OAuthCredentialsResult
 */
function displaySuccessFromResult(
  manager: CredentialManager,
  credentials: { expiresAt: Date; subscriptionType: string },
): void {
  console.log("");
  console.log("CREDENTIAL IMPORT");
  console.log("-----------------------------------------------------------");
  console.log(`Status:           SUCCESS`);
  console.log(`Storage Location: ${manager.getStorageLocation()}`);
  console.log(
    `Token Expiry:     ${credentials.expiresAt.toISOString()} (${formatRelativeTime(credentials.expiresAt)})`,
  );
  console.log(`Subscription:     ${credentials.subscriptionType}`);
  console.log("");
  console.log("WARNING: These credentials provide full account access.");
  console.log("         Do not share the exported file.");
}
