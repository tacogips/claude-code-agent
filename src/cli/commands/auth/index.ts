/**
 * CLI Auth Command Group
 *
 * Manages authentication and displays account information.
 * Provides subcommands for viewing account details, usage statistics,
 * authentication status, and token information.
 *
 * @module cli/commands/auth
 */

import type { Command } from "commander";
import { createAuthInfoCommand } from "./info";
import { createAuthStatsCommand } from "./stats";
import { createAuthStatusCommand } from "./status";
import { createAuthTokenCommand } from "./token";

/**
 * Create the auth command group.
 *
 * Provides access to authentication-related commands:
 * - `info`: Display account information
 * - `stats`: Show usage statistics
 * - `status`: Check authentication status
 * - `token`: Display token information
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
 * ```
 */
export function createAuthCommand(): Command {
  const { Command } = require("commander");

  return new Command("auth")
    .description("Manage authentication and view account info")
    .addCommand(createAuthInfoCommand())
    .addCommand(createAuthStatsCommand())
    .addCommand(createAuthStatusCommand())
    .addCommand(createAuthTokenCommand());
}
