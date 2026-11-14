/**
 * Files subcommands for the CLI.
 *
 * Provides commands for tracking and querying file modifications from Claude Code sessions.
 * Supports listing files changed in a session, searching for sessions that modified a file,
 * and managing the file change index.
 *
 * @module cli/commands/files
 */

import type { Command } from "commander";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import { FileChangeService } from "../../sdk/file-changes";
import {
  formatTable,
  formatJson,
  printError,
  printSuccess,
  type ColumnDef,
} from "../output";
import type {
  ChangedFilesSummary,
  FileHistory,
  IndexStats,
  ChangedFile,
  FileSessionMatch,
} from "../../sdk/file-changes/types";
import path from "node:path";

/**
 * Global CLI options passed from parent command.
 */
interface GlobalOptions {
  readonly format: "table" | "json";
}

/**
 * Format file operation as human-readable string.
 *
 * @param operation - File operation type
 * @returns Formatted operation string
 */
function formatOperation(
  operation: "created" | "modified" | "deleted",
): string {
  switch (operation) {
    case "created":
      return "Created";
    case "modified":
      return "Modified";
    case "deleted":
      return "Deleted";
    default: {
      const _exhaustive: never = operation;
      throw new Error(`Unknown operation: ${_exhaustive}`);
    }
  }
}

/**
 * Format file size or change count.
 *
 * @param count - Number of changes
 * @returns Formatted count string
 */
function formatChangeCount(count: number): string {
  return String(count);
}

/**
 * Format timestamp as date string.
 *
 * @param timestamp - ISO timestamp
 * @returns Formatted date string
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

/**
 * Filter files by extension.
 *
 * @param files - Array of changed files
 * @param extensions - Comma-separated extensions (e.g., "ts,tsx,json")
 * @returns Filtered files array
 */
function filterByExtension(
  files: readonly ChangedFile[],
  extensions: string,
): readonly ChangedFile[] {
  const extList = extensions
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));

  return files.filter((file) => {
    const fileExt = path.extname(file.path).toLowerCase();
    return extList.includes(fileExt);
  });
}

/**
 * Filter files by directory.
 *
 * @param files - Array of changed files
 * @param directory - Directory path to filter by
 * @returns Filtered files array
 */
function filterByDirectory(
  files: readonly ChangedFile[],
  directory: string,
): readonly ChangedFile[] {
  const normalizedDir = path.normalize(directory);

  return files.filter((file) => {
    const fileDir = path.dirname(file.path);
    return (
      fileDir.startsWith(normalizedDir) || file.path.includes(normalizedDir)
    );
  });
}

/**
 * Output changed files summary in requested format.
 *
 * @param summary - Changed files summary
 * @param format - Output format
 * @param pathsOnly - Output only file paths
 */
function outputFilesSummary(
  summary: ChangedFilesSummary,
  format: "table" | "json" | "paths",
  pathsOnly: boolean,
): void {
  if (pathsOnly || format === "paths") {
    // Output just paths, one per line
    summary.files.forEach((file) => {
      console.log(file.path);
    });
    return;
  }

  if (format === "json") {
    console.log(formatJson(summary));
    return;
  }

  // Table format
  const columns: readonly ColumnDef<ChangedFile>[] = [
    { key: "path", header: "File Path" },
    {
      key: "operation",
      header: "Operation",
      width: 10,
      format: (val) =>
        formatOperation(val as "created" | "modified" | "deleted"),
    },
    {
      key: "changeCount",
      header: "Changes",
      width: 8,
      align: "right",
      format: (val) => formatChangeCount(val as number),
    },
    {
      key: "lastModified",
      header: "Last Modified",
      width: 20,
      format: (val) => formatTimestamp(val as string),
    },
  ];

  console.log(
    formatTable(
      summary.files as unknown as readonly Record<string, unknown>[],
      columns as unknown as readonly ColumnDef<Record<string, unknown>>[],
    ),
  );
  console.log();
  console.log(
    `Total: ${summary.totalFilesChanged} files, ${summary.totalChanges} changes`,
  );
}

/**
 * Output file history in requested format.
 *
 * @param history - File history
 * @param format - Output format
 */
function outputFileHistory(
  history: FileHistory,
  format: "table" | "json",
): void {
  if (format === "json") {
    console.log(formatJson(history));
    return;
  }

  // Table format
  console.log(`File: ${history.path}`);
  console.log(`Total Sessions: ${history.totalSessions}`);
  console.log(`Total Changes: ${history.totalChanges}`);
  console.log();

  if (history.sessions.length === 0) {
    console.log("No sessions found.");
    return;
  }

  const columns: readonly ColumnDef<FileSessionMatch>[] = [
    { key: "sessionId", header: "Session ID", width: 36 },
    {
      key: "changeCount",
      header: "Changes",
      width: 8,
      align: "right",
      format: (val) => formatChangeCount(val as number),
    },
    {
      key: "lastChange",
      header: "Last Change",
      width: 20,
      format: (val) => formatTimestamp(val as string),
    },
    { key: "projectPath", header: "Project" },
  ];

  console.log(
    formatTable(
      history.sessions as unknown as readonly Record<string, unknown>[],
      columns as unknown as readonly ColumnDef<Record<string, unknown>>[],
    ),
  );
}

/**
 * Output index statistics.
 *
 * @param stats - Index statistics
 * @param format - Output format
 */
function outputIndexStats(stats: IndexStats, format: "table" | "json"): void {
  if (format === "json") {
    console.log(formatJson(stats));
    return;
  }

  // Table format
  console.log("File Change Index Statistics");
  console.log("=============================");
  console.log(`Total Sessions: ${stats.totalSessions}`);
  console.log(`Total Files: ${stats.totalFiles}`);
  console.log(`Total Changes: ${stats.totalChanges}`);
  console.log(`Last Indexed: ${formatTimestamp(stats.lastIndexed)}`);
  console.log(`Index Size: ${(stats.indexSize / 1024).toFixed(2)} KB`);
}

/**
 * Register all files-related subcommands on the program.
 *
 * Attaches files list, search, and index subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns ClaudeCodeAgent instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerFilesCommands(program, async () => {
 *   const container = createContainer();
 *   return ClaudeCodeAgent.create(container);
 * });
 * ```
 */
export function registerFilesCommands(
  program: Command,
  getAgent: () => Promise<ClaudeCodeAgent>,
): void {
  const filesCmd = program
    .command("files")
    .description("Track and query file modifications from sessions");

  // files list <session-id>
  filesCmd
    .command("list <session-id>")
    .description("List files changed in a session")
    .option("--show-changes", "Show diff details (not yet implemented)")
    .option("--format <format>", "Output format: table, json, paths", "table")
    .option("--ext <extensions>", "Filter by file extensions (comma-separated)")
    .option("--dir <directory>", "Filter by directory")
    .action(
      async (
        sessionId: string,
        options: {
          showChanges?: boolean;
          format?: string;
          ext?: string;
          dir?: string;
        },
      ) => {
        try {
          const agent = await getAgent();
          const globalOpts = program.opts() as GlobalOptions;

          // Determine output format
          const outputFormat =
            (options.format as "table" | "json" | "paths" | undefined) ??
            globalOpts.format;

          // Validate format
          if (
            outputFormat !== "table" &&
            outputFormat !== "json" &&
            outputFormat !== "paths"
          ) {
            printError(
              `Invalid format: ${outputFormat}. Must be 'table', 'json', or 'paths'.`,
            );
            process.exit(2);
          }

          // Create file change service
          const fileChangeService = new FileChangeService(agent.container);

          // Get changed files
          const summary = await fileChangeService.getSessionChangedFiles(
            sessionId,
            {
              includeContent: options.showChanges === true,
            },
          );

          // Apply filters
          let filteredFiles = summary.files;

          if (options.ext !== undefined) {
            filteredFiles = filterByExtension(filteredFiles, options.ext);
          }

          if (options.dir !== undefined) {
            filteredFiles = filterByDirectory(filteredFiles, options.dir);
          }

          // Create filtered summary
          const filteredSummary: ChangedFilesSummary = {
            ...summary,
            files: filteredFiles,
            totalFilesChanged: filteredFiles.length,
            totalChanges: filteredFiles.reduce(
              (sum, file) => sum + file.changeCount,
              0,
            ),
          };

          // Output results
          outputFilesSummary(filteredSummary, outputFormat, false);
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

  // files search <file-path>
  filesCmd
    .command("search <file-path>")
    .description("Find sessions that modified a file")
    .option("--show-changes", "Show diff details (not yet implemented)")
    .option("--project <path>", "Filter by project path")
    .option("--from <date>", "Filter from date (ISO format: YYYY-MM-DD)")
    .option("--to <date>", "Filter to date (ISO format: YYYY-MM-DD)")
    .option("--format <format>", "Output format: table, json", "table")
    .action(
      async (
        filePath: string,
        options: {
          showChanges?: boolean;
          project?: string;
          from?: string;
          to?: string;
          format?: string;
        },
      ) => {
        try {
          const agent = await getAgent();
          const globalOpts = program.opts() as GlobalOptions;

          // Determine output format
          const outputFormat =
            (options.format as "table" | "json" | undefined) ??
            globalOpts.format;

          // Validate format
          if (outputFormat !== "table" && outputFormat !== "json") {
            printError(
              `Invalid format: ${outputFormat}. Must be 'table' or 'json'.`,
            );
            process.exit(2);
          }

          // Create file change service
          const fileChangeService = new FileChangeService(agent.container);

          // Parse dates if provided
          const fromDate = options.from
            ? new Date(options.from).toISOString()
            : undefined;
          const toDate = options.to
            ? new Date(options.to).toISOString()
            : undefined;

          // Find sessions
          const history = await fileChangeService.findSessionsByFile(filePath, {
            projectPath: options.project,
            fromDate,
            toDate,
            includeContent: options.showChanges === true,
          });

          // Output results
          outputFileHistory(history, outputFormat);
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

  // files index
  filesCmd
    .command("index")
    .description("Manage file change index")
    .option("--build", "Build or rebuild the index")
    .option("--stats", "Show index statistics")
    .option("--project <path>", "Limit to specific project")
    .action(
      async (options: {
        build?: boolean;
        stats?: boolean;
        project?: string;
      }) => {
        try {
          const agent = await getAgent();
          const globalOpts = program.opts() as GlobalOptions;
          const outputFormat = globalOpts.format;

          // Create file change service
          const fileChangeService = new FileChangeService(agent.container);

          // Default to stats if no options specified
          const showStats = options.stats === true || options.build !== true;

          if (options.build === true) {
            printSuccess("Building file change index...");
            const stats = await fileChangeService.buildIndex(options.project);
            printSuccess("Index build complete.");
            outputIndexStats(stats, outputFormat);
          } else if (showStats) {
            const stats = await fileChangeService.getIndexStats();
            outputIndexStats(stats, outputFormat);
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
}
