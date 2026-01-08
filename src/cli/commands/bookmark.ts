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
import type { ClaudeCodeAgent } from "../../sdk/agent";
import type { BookmarkType } from "../../sdk/bookmarks/types";
import { formatTable, formatJson, printError, printSuccess } from "../output";

/**
 * Global CLI options passed from parent command.
 */
interface GlobalOptions {
  readonly format: "table" | "json";
}

/**
 * Register all bookmark-related subcommands on the program.
 *
 * Attaches bookmark add, list, search, show, and delete subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns ClaudeCodeAgent instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerBookmarkCommands(program, async () => {
 *   const container = createContainer();
 *   return ClaudeCodeAgent.create(container);
 * });
 * ```
 */
export function registerBookmarkCommands(
  program: Command,
  getAgent: () => Promise<ClaudeCodeAgent>,
): void {
  const bookmarkCmd = program
    .command("bookmark")
    .description("Manage session bookmarks");

  // bookmark add
  bookmarkCmd
    .command("add")
    .description("Create a new bookmark")
    .requiredOption("--session <id>", "Session ID")
    .option("--message <id>", "Message ID (for message-type bookmark)")
    .option("--from <id>", "Range start message ID (for range-type bookmark)")
    .option("--to <id>", "Range end message ID (for range-type bookmark)")
    .requiredOption("--name <name>", "Bookmark name")
    .option("--description <text>", "Description")
    .option("--tags <tags>", "Comma-separated tags")
    .action(
      async (options: {
        session: string;
        message?: string;
        from?: string;
        to?: string;
        name: string;
        description?: string;
        tags?: string;
      }) => {
        try {
          const agent = await getAgent();

          // Determine bookmark type based on provided options
          let type: BookmarkType;
          if (options.message !== undefined) {
            type = "message";
            if (options.from !== undefined || options.to !== undefined) {
              printError(
                "Cannot specify both --message and --from/--to options",
              );
              process.exit(2);
            }
          } else if (options.from !== undefined && options.to !== undefined) {
            type = "range";
          } else if (options.from !== undefined || options.to !== undefined) {
            printError("Range bookmarks require both --from and --to options");
            process.exit(2);
          } else {
            type = "session";
          }

          // Parse tags
          const tags =
            options.tags !== undefined
              ? options.tags.split(",").map((t) => t.trim())
              : undefined;

          // Create bookmark
          const bookmark = await agent.bookmarks.add({
            type,
            sessionId: options.session,
            messageId: options.message,
            fromMessageId: options.from,
            toMessageId: options.to,
            name: options.name,
            description: options.description,
            tags,
          });

          printSuccess(`Bookmark created: ${bookmark.id}`);

          const globalOpts = program.opts() as GlobalOptions;
          if (globalOpts.format === "json") {
            console.log(formatJson(bookmark));
          } else {
            console.log(
              formatTable(
                [bookmark as unknown as Record<string, unknown>],
                [
                  { key: "id", header: "ID" },
                  { key: "type", header: "Type" },
                  { key: "name", header: "Name" },
                  { key: "sessionId", header: "Session ID" },
                ],
              ),
            );
          }
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

  // bookmark list
  bookmarkCmd
    .command("list")
    .description("List all bookmarks")
    .option("--tag <tag>", "Filter by tag")
    .action(async (options: { tag?: string }) => {
      try {
        const agent = await getAgent();
        const globalOpts = program.opts() as GlobalOptions;

        // List bookmarks with optional tag filter
        const filter =
          options.tag !== undefined ? { tags: [options.tag] } : undefined;
        const bookmarks = await agent.bookmarks.list(filter);

        if (bookmarks.length === 0) {
          console.log("No bookmarks found");
          return;
        }

        if (globalOpts.format === "json") {
          console.log(formatJson(bookmarks));
        } else {
          console.log(
            formatTable(
              bookmarks as unknown as readonly Record<string, unknown>[],
              [
                { key: "id", header: "ID", width: 36 },
                { key: "type", header: "Type", width: 10 },
                { key: "name", header: "Name", width: 30 },
                {
                  key: "tags",
                  header: "Tags",
                  format: (value) => {
                    if (Array.isArray(value)) {
                      return value.join(", ");
                    }
                    return "";
                  },
                },
                { key: "createdAt", header: "Created", width: 20 },
              ],
            ),
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // bookmark search
  bookmarkCmd
    .command("search <query>")
    .description("Search bookmarks by query")
    .option("--metadata-only", "Search metadata only (not content)")
    .action(async (query: string, options: { metadataOnly?: boolean }) => {
      try {
        const agent = await getAgent();
        const globalOpts = program.opts() as GlobalOptions;

        // Search bookmarks
        const results = await agent.bookmarks.search(query, {
          metadataOnly: options.metadataOnly,
        });

        if (results.length === 0) {
          console.log("No bookmarks found");
          return;
        }

        if (globalOpts.format === "json") {
          console.log(formatJson(results));
        } else {
          // Format search results as table
          const tableData = results.map((result) => ({
            id: result.bookmark.id,
            name: result.bookmark.name,
            type: result.bookmark.type,
            matchType: result.matchType,
            score: result.relevanceScore.toFixed(2),
            context: result.matchContext ?? "",
          }));

          console.log(
            formatTable(tableData, [
              { key: "id", header: "ID", width: 36 },
              { key: "name", header: "Name", width: 30 },
              { key: "type", header: "Type", width: 10 },
              { key: "matchType", header: "Match", width: 10 },
              { key: "score", header: "Score", width: 6, align: "right" },
              { key: "context", header: "Context", width: 40 },
            ]),
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // bookmark show
  bookmarkCmd
    .command("show <bookmark-id>")
    .description("Show bookmark details")
    .action(async (bookmarkId: string) => {
      try {
        const agent = await getAgent();
        const globalOpts = program.opts() as GlobalOptions;

        // Get bookmark
        const bookmark = await agent.bookmarks.get(bookmarkId);

        if (bookmark === null) {
          printError(`Bookmark not found: ${bookmarkId}`);
          process.exit(1);
        }

        if (globalOpts.format === "json") {
          console.log(formatJson(bookmark));
        } else {
          // Format bookmark details
          console.log(`ID: ${bookmark.id}`);
          console.log(`Type: ${bookmark.type}`);
          console.log(`Name: ${bookmark.name}`);
          console.log(`Session ID: ${bookmark.sessionId}`);

          if (bookmark.messageId !== undefined) {
            console.log(`Message ID: ${bookmark.messageId}`);
          }

          if (bookmark.messageRange !== undefined) {
            console.log(
              `Message Range: ${bookmark.messageRange.fromMessageId} -> ${bookmark.messageRange.toMessageId}`,
            );
          }

          if (bookmark.description !== undefined) {
            console.log(`Description: ${bookmark.description}`);
          }

          if (bookmark.tags.length > 0) {
            console.log(`Tags: ${bookmark.tags.join(", ")}`);
          }

          console.log(`Created: ${bookmark.createdAt}`);
          console.log(`Updated: ${bookmark.updatedAt}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // bookmark delete
  bookmarkCmd
    .command("delete <bookmark-id>")
    .description("Delete a bookmark")
    .action(async (bookmarkId: string) => {
      try {
        const agent = await getAgent();

        // Delete bookmark
        const deleted = await agent.bookmarks.delete(bookmarkId);

        if (!deleted) {
          printError(`Bookmark not found: ${bookmarkId}`);
          process.exit(1);
        }

        printSuccess(`Bookmark deleted: ${bookmarkId}`);
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
