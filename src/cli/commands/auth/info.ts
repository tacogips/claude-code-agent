/**
 * CLI command for displaying account information.
 *
 * Shows Claude Code account details including email, organization, and billing info.
 * Supports both table and JSON output formats.
 *
 * @module cli/commands/auth/info
 */

import type { Command } from "commander";
import { CredentialReader } from "../../../sdk/credentials";
import { formatTable, formatJson, printError } from "../../output";

/**
 * Command options for auth info command.
 */
interface AuthInfoOptions {
  /**
   * Output format (table or json).
   * @default "table"
   */
  readonly format: "table" | "json";
}

/**
 * Create the auth info command.
 *
 * Displays account information from Claude Code credentials including:
 * - Account UUID
 * - Email address
 * - Display name
 * - Organization details (name, role, billing type)
 *
 * @returns Commander Command instance
 *
 * @example
 * ```bash
 * # Show account info in table format (default)
 * claude-code-agent auth info
 *
 * # Show account info in JSON format
 * claude-code-agent auth info --format json
 * ```
 */
export function createAuthInfoCommand(): Command {
  const { Command } = require("commander");
  const cmd = new Command("info");

  return cmd
    .description("Show account information")
    .option(
      "-f, --format <type>",
      "Output format (table|json)",
      validateFormat,
      "table",
    )
    .action(async (options: AuthInfoOptions) => {
      try {
        const reader = new CredentialReader();
        const account = await reader.getAccount();

        if (account === null) {
          printError("Not authenticated. Run: claude /login");
          process.exit(1);
        }

        if (options.format === "json") {
          console.log(formatJson(account));
        } else {
          // Table format output
          const tableData = [
            { field: "Account UUID", value: account.accountUuid },
            { field: "Email", value: account.emailAddress },
            { field: "Display Name", value: account.displayName },
            { field: "Organization", value: account.organization.name },
            {
              field: "Organization UUID",
              value: account.organization.uuid,
            },
            { field: "Role", value: account.organization.role },
            {
              field: "Billing Type",
              value: account.organization.billingType,
            },
          ];

          const table = formatTable(tableData, [
            { key: "field", header: "Field", width: 20 },
            { key: "value", header: "Value" },
          ]);

          console.log(table);
        }
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });
}

/**
 * Validate format option value.
 *
 * @param value - Format option value from CLI
 * @returns Validated format value
 * @throws {Error} If format is not 'table' or 'json'
 */
function validateFormat(value: string): "table" | "json" {
  if (value !== "table" && value !== "json") {
    throw new Error(`Invalid format: ${value}. Must be 'table' or 'json'.`);
  }
  return value;
}
