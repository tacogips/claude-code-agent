/**
 * Daemon subcommands for the CLI.
 *
 * Provides commands for managing the daemon server, which offers authenticated
 * HTTP API for remote Claude Code session management and execution.
 *
 * @module cli/commands/daemon
 */

import type { Command } from "commander";
import type { SdkManager } from "../../sdk/agent";
import { printError } from "../output";

/**
 * Register all daemon-related subcommands on the program.
 *
 * Attaches daemon start, stop, and status commands to the CLI. Daemon provides
 * authenticated HTTP API for remote execution.
 *
 * @param program - Commander program instance to attach commands to
 * @param _getAgent - Factory function that creates/returns SdkManager instance (unused in placeholders)
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerDaemonCommands(program, async () => {
 *   const container = createContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export function registerDaemonCommands(
  program: Command,
  _getAgent: () => Promise<SdkManager>,
): void {
  const daemonCmd = program
    .command("daemon")
    .description("Manage daemon (auth required, remote execution)");

  // daemon start
  daemonCmd
    .command("start")
    .description("Start daemon server")
    .option("--host <host>", "Bind address", "0.0.0.0")
    .option("--port <port>", "Server port", "8443")
    .option("--auth-token-file <path>", "Path to tokens.json")
    .option("--tls-cert <path>", "TLS certificate path")
    .option("--tls-key <path>", "TLS private key path")
    .option("--with-viewer", "Include browser viewer")
    .action(
      async (options: {
        host: string;
        port: string;
        authTokenFile?: string;
        tlsCert?: string;
        tlsKey?: string;
        withViewer: boolean;
      }) => {
        try {
          printError("daemon start: Not yet implemented");
          printError("Placeholder for starting the daemon server");
          printError(`Host: ${options.host}`);
          printError(`Port: ${options.port}`);
          if (options.authTokenFile !== undefined) {
            printError(`Auth token file: ${options.authTokenFile}`);
          }
          if (options.tlsCert !== undefined) {
            printError(`TLS cert: ${options.tlsCert}`);
          }
          if (options.tlsKey !== undefined) {
            printError(`TLS key: ${options.tlsKey}`);
          }
          printError(`With viewer: ${options.withViewer}`);
          process.exit(1);
        } catch (error) {
          if (error instanceof Error) {
            printError(error);
          } else {
            printError(String(error));
          }
          process.exit(1);
        }
      },
    );

  // daemon stop
  daemonCmd
    .command("stop")
    .description("Stop running daemon")
    .action(async () => {
      try {
        printError("daemon stop: Not yet implemented");
        printError("Placeholder for stopping the daemon server");
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

  // daemon status
  daemonCmd
    .command("status")
    .description("Show daemon status")
    .action(async () => {
      try {
        const globalOpts = program.opts() as { format: "table" | "json" };

        printError("daemon status: Not yet implemented");
        printError("Placeholder for showing daemon status");
        printError(`Output format: ${globalOpts.format}`);
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
