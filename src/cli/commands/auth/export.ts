/**
 * CLI Auth Export Command
 *
 * Exports credentials to file or stdout for transfer to another machine.
 * Supports JSON (structured) and raw (KEY=VALUE) output formats.
 *
 * WARNING: Exported data contains sensitive tokens.
 * Handle with care and delete after import.
 *
 * @module cli/commands/auth/export
 */

import type { Command } from "commander";
import { CredentialManager } from "../../../sdk/credentials";
import * as fs from "node:fs/promises";

/**
 * Output format for credentials export
 */
type ExportFormat = "json" | "raw";

/**
 * Create auth export command that exports credentials to file or stdout.
 *
 * Options:
 * - --output/-o: Write to file instead of stdout
 * - --format/-f: Output format (json or raw)
 *
 * Exit codes:
 * - 0: Export successful
 * - 1: Not authenticated or export failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Export to stdout as JSON
 * claude-code-agent auth export
 *
 * # Export to file
 * claude-code-agent auth export --output credentials.json
 *
 * # Export in raw KEY=VALUE format
 * claude-code-agent auth export --format raw
 * ```
 */
export function createAuthExportCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("export")
    .description("Export credentials to file or stdout")
    .option("-o, --output <file>", "Output file path (default: stdout)")
    .option("-f, --format <type>", "Output format (json|raw)", "json")
    .action(async (options: { output?: string; format: ExportFormat }) => {
      const manager = new CredentialManager();

      // Export credentials
      const result = await manager.exportCredentials();

      if (result.isErr()) {
        console.error("Export failed:", result.error.message);
        if (result.error.code === "NOT_AUTHENTICATED") {
          console.error("Run: claude /login");
        }
        process.exit(1);
      }

      const exportData = result.value;
      let output: string;

      if (options.format === "raw") {
        // Raw KEY=VALUE format
        const creds = exportData.credentials;
        output = [
          `ACCESS_TOKEN=${creds.accessToken}`,
          `REFRESH_TOKEN=${creds.refreshToken}`,
          `EXPIRES_AT=${creds.expiresAt}`,
          `SCOPES=${creds.scopes.join(",")}`,
          `SUBSCRIPTION_TYPE=${creds.subscriptionType}`,
          `RATE_LIMIT_TIER=${creds.rateLimitTier}`,
        ].join("\n");
      } else {
        // JSON format (default)
        output = JSON.stringify(exportData, null, 2);
      }

      if (options.output !== undefined) {
        // Write to file
        try {
          await fs.writeFile(options.output, output + "\n", { mode: 0o600 });
          console.log(`Credentials exported to: ${options.output}`);
        } catch (error) {
          console.error(
            "Failed to write file:",
            error instanceof Error ? error.message : String(error),
          );
          process.exit(1);
        }
      } else {
        // Write to stdout
        console.log(output);
      }

      // Display security warning
      console.error("");
      console.error("WARNING: This data contains sensitive tokens.");
      console.error("         Handle with care and delete after import.");
      console.error("         Do not share via email or unencrypted channels.");
    });
}
