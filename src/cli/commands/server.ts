/**
 * Server subcommands for the CLI.
 *
 * Provides commands for managing the browser viewer server, which offers read-only
 * access to Claude Code sessions and transcripts.
 *
 * @module cli/commands/server
 */

import type { Command } from "commander";
import type { SdkManager } from "../../sdk/agent";
import { printError } from "../output";

/**
 * Register all server-related subcommands on the program.
 *
 * Attaches server start command to the CLI. Server provides local browser viewer
 * for viewing sessions in real-time.
 *
 * @param program - Commander program instance to attach commands to
 * @param _getAgent - Factory function that creates/returns SdkManager instance (unused in placeholders)
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerServerCommands(program, async () => {
 *   const container = createContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export function registerServerCommands(
  program: Command,
  _getAgent: () => Promise<SdkManager>,
): void {
  const serverCmd = program
    .command("server")
    .description("Manage viewer server (read-only, local)");

  // server start
  serverCmd
    .command("start")
    .description("Start browser viewer server")
    .option("--port <port>", "Server port", "3000")
    .option("--no-open", "Don't auto-open browser")
    .action(async (options: { port: string; open: boolean }) => {
      try {
        printError("server start: Not yet implemented");
        printError("Placeholder for starting the browser viewer server");
        printError(`Port: ${options.port}`);
        printError(`Auto-open browser: ${options.open}`);
        process.exit(1);
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
