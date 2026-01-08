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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { printError } from "./output";

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
 * Read package.json to get version information.
 *
 * @returns Package version string
 */
function getVersion(): string {
  try {
    // Read package.json from project root (two levels up from dist/cli/main.js)
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version: string;
    };
    return packageJson.version;
  } catch (error) {
    // Fallback if package.json cannot be read
    return "unknown";
  }
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
    .version(getVersion(), "-v, --version", "Display version number")
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

  // Session commands
  // TODO: Implement in cli-session-commands.md plan
  const sessionCmd = program
    .command("session")
    .description("Manage Claude Code sessions");

  sessionCmd
    .command("run")
    .description("Run standalone session")
    .action(() => {
      printError("session run: Not yet implemented");
      process.exit(1);
    });

  sessionCmd
    .command("add")
    .description("Add session to group")
    .action(() => {
      printError("session add: Not yet implemented");
      process.exit(1);
    });

  sessionCmd
    .command("show")
    .description("Show session details")
    .action(() => {
      printError("session show: Not yet implemented");
      process.exit(1);
    });

  sessionCmd
    .command("watch")
    .description("Watch session progress")
    .action(() => {
      printError("session watch: Not yet implemented");
      process.exit(1);
    });

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

  // Bookmark commands
  // TODO: Implement in cli-group-commands.md plan
  const bookmarkCmd = program
    .command("bookmark")
    .description("Manage session bookmarks");

  bookmarkCmd
    .command("add")
    .description("Add bookmark")
    .action(() => {
      printError("bookmark add: Not yet implemented");
      process.exit(1);
    });

  bookmarkCmd
    .command("list")
    .description("List bookmarks")
    .action(() => {
      printError("bookmark list: Not yet implemented");
      process.exit(1);
    });

  bookmarkCmd
    .command("search")
    .description("Search bookmarks")
    .action(() => {
      printError("bookmark search: Not yet implemented");
      process.exit(1);
    });

  bookmarkCmd
    .command("show")
    .description("Show bookmark details")
    .action(() => {
      printError("bookmark show: Not yet implemented");
      process.exit(1);
    });

  bookmarkCmd
    .command("delete")
    .description("Delete bookmark")
    .action(() => {
      printError("bookmark delete: Not yet implemented");
      process.exit(1);
    });

  // Server commands
  // TODO: Implement in cli-group-commands.md plan
  const serverCmd = program
    .command("server")
    .description("Manage viewer server (read-only, local)");

  serverCmd
    .command("start")
    .description("Start viewer server")
    .action(() => {
      printError("server start: Not yet implemented");
      process.exit(1);
    });

  // Daemon commands
  // TODO: Implement in cli-group-commands.md plan
  const daemonCmd = program
    .command("daemon")
    .description("Manage daemon (auth required, remote execution)");

  daemonCmd
    .command("start")
    .description("Start daemon")
    .action(() => {
      printError("daemon start: Not yet implemented");
      process.exit(1);
    });

  daemonCmd
    .command("stop")
    .description("Stop daemon")
    .action(() => {
      printError("daemon stop: Not yet implemented");
      process.exit(1);
    });

  daemonCmd
    .command("status")
    .description("Show daemon status")
    .action(() => {
      printError("daemon status: Not yet implemented");
      process.exit(1);
    });

  // Token commands
  // TODO: Implement in cli-group-commands.md plan
  const tokenCmd = program.command("token").description("Manage API tokens");

  tokenCmd
    .command("create")
    .description("Create API token")
    .action(() => {
      printError("token create: Not yet implemented");
      process.exit(1);
    });

  tokenCmd
    .command("list")
    .description("List API tokens")
    .action(() => {
      printError("token list: Not yet implemented");
      process.exit(1);
    });

  tokenCmd
    .command("revoke")
    .description("Revoke API token")
    .action(() => {
      printError("token revoke: Not yet implemented");
      process.exit(1);
    });

  tokenCmd
    .command("rotate")
    .description("Rotate API token")
    .action(() => {
      printError("token rotate: Not yet implemented");
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
