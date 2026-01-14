/**
 * CLI Auth Command Group
 *
 * Manages authentication and displays account information.
 * Provides subcommands for viewing account details, usage statistics,
 * authentication status, token information, and credential management.
 *
 * @module cli/commands/auth
 */

import type { Command } from "commander";
import { createAuthInfoCommand } from "./info";
import { createAuthStatsCommand } from "./stats";
import { createAuthStatusCommand } from "./status";
import { createAuthTokenCommand } from "./token";
import { createAuthExportCommand } from "./export";
import { createAuthImportCommand } from "./import";
import { createAuthDeleteCommand } from "./delete";
import { createAuthVerifyCommand } from "./verify";

/**
 * Create the auth command group.
 *
 * Provides access to authentication-related commands:
 * - `info`: Display account information
 * - `stats`: Show usage statistics
 * - `status`: Check authentication status
 * - `token`: Display token information
 * - `export`: Export credentials for transfer
 * - `import`: Import credentials from file or options
 * - `delete`: Delete stored credentials
 * - `verify`: Verify credential validity
 *
 * All commands read from Claude Code's credentials stored in
 * ~/.claude/.credentials.json (Linux/Windows) or Keychain (macOS).
 *
 * @returns Commander Command instance with registered subcommands
 *
 * @example
 * ```bash
 * # Show help for auth commands
 * claude-code-agent auth --help
 *
 * # Check authentication status
 * claude-code-agent auth status
 *
 * # Display account information
 * claude-code-agent auth info
 *
 * # Show usage statistics
 * claude-code-agent auth stats
 *
 * # Display token information
 * claude-code-agent auth token
 *
 * # Export credentials
 * claude-code-agent auth export --output credentials.json
 *
 * # Import credentials
 * claude-code-agent auth import credentials.json
 *
 * # Verify credentials
 * claude-code-agent auth verify
 *
 * # Delete credentials
 * claude-code-agent auth delete
 * ```
 */
export function createAuthCommand(): Command {
  const { Command } = require("commander");

  return new Command("auth")
    .description("Manage authentication and view account info")
    // Existing commands
    .addCommand(createAuthInfoCommand())
    .addCommand(createAuthStatsCommand())
    .addCommand(createAuthStatusCommand())
    .addCommand(createAuthTokenCommand())
    // New credential management commands
    .addCommand(createAuthExportCommand())
    .addCommand(createAuthImportCommand())
    .addCommand(createAuthDeleteCommand())
    .addCommand(createAuthVerifyCommand());
}
