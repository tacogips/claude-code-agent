/**
 * CLI entry point for claude-code-agent.
 *
 * Provides command-line interface with subcommands for session, group, bookmark,
 * and token management. Uses commander for argument parsing with global options
 * for output formatting.
 *
 * @module cli/main
 */
import { Command } from "commander";
/**
 * Create and configure CLI with all commands and global options.
 *
 * Sets up command structure with:
 * - Global options (--format, --help, --version)
 * - Subcommands for session, group, bookmark, token, and local GraphQL queries
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
export declare function createCli(): Command;
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
export declare function main(): Promise<void>;
//# sourceMappingURL=main.d.ts.map