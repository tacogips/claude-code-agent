/**
 * CLI entry point for claude-code-agent.
 *
 * Provides command-line interface with subcommands for session, group, bookmark,
 * and daemon management. Uses commander for argument parsing with global options
 * for output formatting.
 *
 * @module cli/main
 */

import { Command } from "commander";
import { printError } from "./output";
import { registerSessionCommands } from "./commands/session";
import { registerServerCommands } from "./commands/server";
import { registerDaemonCommands } from "./commands/daemon";
import { registerBookmarkCommands } from "./commands/bookmark";
import { registerTokenCommands } from "./commands/token";
import { registerFilesCommands } from "./commands/files";
import { createActivityCommand } from "./commands/activity";
import { registerVersionCommands } from "./commands/version";
import { getPackageVersion } from "./version";
import type { SdkManager } from "../sdk/agent";
import { createProductionContainer } from "../container";

/**
 * Global CLI options available to all subcommands.
 */
interface GlobalOptions {
  /**
   * Output format for data display.
   * - table: Human-readable ASCII table (default)
   * - json: Machine-readable JSON output
   */
  readonly format: "table" | "json";
}

/**
 * Create and configure CLI with all commands and global options.
 *
 * Sets up command structure with:
 * - Global options (--format, --help, --version)
 * - Subcommand placeholders for session, group, bookmark, server, daemon, token
 * - Error handling with proper exit codes
 *
 * @returns Configured Commander program instance
 *
 * @example
 * ```typescript
 * const program = createCli();
 * await program.parseAsync(process.argv);
 * ```
 */
export function createCli(): Command {
  const program = new Command();

  program
    .name("claude-code-agent")
    .description(
      "Monitoring, visualization, and orchestration for Claude Code sessions",
    )
    .version(getPackageVersion(), "-v, --version", "Display version number")
    .option("-f, --format <type>", "Output format (table or json)", "table")
    .helpOption("-h, --help", "Display help for command");

  // Validate --format option
  program.hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts() as GlobalOptions;
    if (opts.format !== "table" && opts.format !== "json") {
      printError(`Invalid format: ${opts.format}. Must be 'table' or 'json'.`);
      process.exit(2);
    }
  });

  // Factory function to create agent instance (lazy initialization)
  const getAgent = async (): Promise<SdkManager> => {
    const { SdkManager } = await import("../sdk/agent");
    const container = createProductionContainer();
    return SdkManager.create(container);
  };

  // Session commands
  registerSessionCommands(program, getAgent);

  // Server commands
  registerServerCommands(program, getAgent);

  // Daemon commands
  registerDaemonCommands(program, getAgent);

  // Bookmark commands
  registerBookmarkCommands(program, getAgent);

  // Token commands
  registerTokenCommands(program);

  // Files commands
  registerFilesCommands(program, getAgent);

  // Activity commands
  program.addCommand(createActivityCommand());

  // Version command
  registerVersionCommands(program, getAgent);

  // Group commands
  // TODO: Implement in cli-group-commands.md plan
  const groupCmd = program
    .command("group")
    .description("Manage session groups");

  groupCmd
    .command("create")
    .description("Create session group")
    .action(() => {
      printError("group create: Not yet implemented");
      process.exit(1);
    });

  groupCmd
    .command("list")
    .description("List session groups")
    .action(() => {
      printError("group list: Not yet implemented");
      process.exit(1);
    });

  groupCmd
    .command("run")
    .description("Run session group")
    .action(() => {
      printError("group run: Not yet implemented");
      process.exit(1);
    });

  groupCmd
    .command("watch")
    .description("Watch group progress")
    .action(() => {
      printError("group watch: Not yet implemented");
      process.exit(1);
    });

  groupCmd
    .command("pause")
    .description("Pause group execution")
    .action(() => {
      printError("group pause: Not yet implemented");
      process.exit(1);
    });

  groupCmd
    .command("resume")
    .description("Resume group execution")
    .action(() => {
      printError("group resume: Not yet implemented");
      process.exit(1);
    });

  return program;
}

/**
 * Main CLI entry point.
 *
 * Parses command-line arguments and executes the appropriate command.
 * Handles errors and sets proper exit codes:
 * - 0: Success
 * - 1: General error
 * - 2: Invalid arguments
 *
 * @returns Promise that resolves when command execution completes
 *
 * @example
 * ```typescript
 * // In bin/claude-code-agent:
 * await main();
 * ```
 */
export async function main(): Promise<void> {
  const program = createCli();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    // Handle errors from command execution
    if (error instanceof Error) {
      printError(error);
    } else {
      printError(String(error));
    }
    process.exit(1);
  }
}
