/**
 * Bookmark subcommands for the CLI.
 *
 * Provides commands for managing bookmarks including add, list, search,
 * show, and delete operations. Bookmarks enable users to mark important
 * sessions, messages, or message ranges for later retrieval.
 *
 * @module cli/commands/bookmark
 */
import type { Command } from "commander";
import type { SdkManager } from "../../sdk/agent";
/**
 * Register all bookmark-related subcommands on the program.
 *
 * Attaches bookmark add, list, search, show, and delete subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns SdkManager instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerBookmarkCommands(program, async () => {
 *   const container = createProductionContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export declare function registerBookmarkCommands(program: Command, getAgent: () => Promise<SdkManager>): void;
//# sourceMappingURL=bookmark.d.ts.map