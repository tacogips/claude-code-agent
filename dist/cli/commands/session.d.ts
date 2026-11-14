/**
 * Session subcommands for the CLI.
 *
 * Provides commands for managing Claude Code sessions, including run, add to group,
 * show session details, watch session progress, and list sessions.
 *
 * @module cli/commands/session
 */
import type { Command } from "commander";
import type { SdkManager, SessionRunner, SessionRunnerOptions } from "../../sdk/agent";
type SessionRunnerFactory = (options?: SessionRunnerOptions) => SessionRunner;
/**
 * Register all session-related subcommands on the program.
 *
 * Attaches session run, add, show, watch, and list subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns SdkManager instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerSessionCommands(program, async () => {
 *   const container = createProductionContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export declare function registerSessionCommands(program: Command, getAgent: () => Promise<SdkManager>, createSessionRunner?: SessionRunnerFactory): void;
export {};
//# sourceMappingURL=session.d.ts.map