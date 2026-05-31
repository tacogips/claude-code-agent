/**
 * Token management subcommands for the CLI.
 *
 * Provides commands for creating, listing, revoking, and rotating API tokens.
 * Token commands work directly with TokenManager.
 *
 * @module cli/commands/token
 */
import type { Command } from "commander";
/**
 * Register all token management subcommands on the program.
 *
 * Attaches token create, list, revoke, and rotate subcommands to the CLI.
 * All commands work directly with TokenManager without requiring SDK agent.
 *
 * @param program - Commander program instance to attach commands to
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerTokenCommands(program);
 * ```
 */
export declare function registerTokenCommands(program: Command): void;
//# sourceMappingURL=token.d.ts.map