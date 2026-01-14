/**
 * CLI command for displaying usage statistics.
 *
 * Shows Claude Code usage statistics including session counts, model usage,
 * and daily activity. Supports filtering by time period and model, with both
 * table and JSON output formats.
 *
 * @module cli/commands/auth/stats
 */

import type { Command } from "commander";
import { CredentialReader } from "../../../sdk/credentials";
import type { UsageStats, ModelUsage, DailyActivity } from "../../../sdk/credentials";
import { formatTable, formatJson, printError } from "../../output";

/**
 * Command options for auth stats command.
 */
interface AuthStatsOptions {
  /**
   * Output format (table or json).
   * @default "table"
   */
  readonly format: "table" | "json";

  /**
   * Number of days to show statistics for.
   * @default "30"
   */
  readonly period: string;

  /**
   * Filter by specific model name.
   * @default undefined
   */
  readonly model?: string;
}

/**
 * Filtered stats structure for output.
 */
interface FilteredStats {
  readonly totalSessions: number;
  readonly totalMessages: number;
  readonly firstSessionDate: Date;
  readonly lastComputedDate: Date;
  readonly peakHour: number;
  readonly dailyActivity: readonly DailyActivity[];
  readonly modelUsage: ReadonlyMap<string, ModelUsage>;
}

/**
 * Create the auth stats command.
 *
 * Displays usage statistics from Claude Code including:
 * - Total sessions and messages
 * - First session date
 * - Daily activity for the specified period
 * - Model usage (all models or filtered by specific model)
 * - Peak hour of activity
 *
 * @returns Commander Command instance
 *
 * @example
 * ```bash
 * # Show stats for last 30 days in table format (default)
 * claude-code-agent auth stats
 *
 * # Show stats for last 7 days
 * claude-code-agent auth stats --period 7
 *
 * # Show stats for specific model
 * claude-code-agent auth stats --model claude-opus-4-5
 *
 * # Show stats in JSON format
 * claude-code-agent auth stats --format json
 * ```
 */
export function createAuthStatsCommand(): Command {
  const { Command } = require("commander");
  const cmd = new Command("stats");

  return cmd
    .description("Show usage statistics")
    .option(
      "-f, --format <type>",
      "Output format (table|json)",
      validateFormat,
      "table",
    )
    .option("-p, --period <days>", "Show last N days", "30")
    .option("-m, --model <name>", "Filter by model")
    .action(async (options: AuthStatsOptions) => {
      try {
        const reader = new CredentialReader();
        const stats = await reader.getStats();

        if (stats === null) {
          printError("No usage statistics found");
          process.exit(1);
        }

        // Parse period as integer
        const periodDays = parseInt(options.period, 10);
        if (isNaN(periodDays) || periodDays <= 0) {
          printError(`Invalid period: ${options.period}. Must be a positive number.`);
          process.exit(1);
        }

        // Filter stats by period and model
        const filtered = filterStats(stats, periodDays, options.model);

        if (options.format === "json") {
          // Convert Map to object for JSON serialization
          const modelUsageObj = Object.fromEntries(filtered.modelUsage);
          const output = {
            ...filtered,
            modelUsage: modelUsageObj,
          };
          console.log(formatJson(output));
        } else {
          // Table format output
          printTableFormat(filtered, periodDays, options.model);
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
}

/**
 * Filter stats by period and optionally by model.
 *
 * @param stats - Full usage statistics
 * @param periodDays - Number of days to include
 * @param modelFilter - Optional model name to filter by
 * @returns Filtered statistics
 */
function filterStats(
  stats: UsageStats,
  periodDays: number,
  modelFilter?: string,
): FilteredStats {
  // Calculate cutoff date
  const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Filter daily activity by period
  const filteredActivity = stats.dailyActivity.filter(
    (activity) => activity.date >= cutoffDate,
  );

  // Filter model usage by model name if specified
  let filteredModelUsage: Map<string, ModelUsage>;
  if (modelFilter !== undefined) {
    const modelData = stats.modelUsage.get(modelFilter);
    if (modelData !== undefined) {
      filteredModelUsage = new Map([[modelFilter, modelData]]);
    } else {
      filteredModelUsage = new Map();
    }
  } else {
    filteredModelUsage = stats.modelUsage;
  }

  return {
    totalSessions: stats.totalSessions,
    totalMessages: stats.totalMessages,
    firstSessionDate: stats.firstSessionDate,
    lastComputedDate: stats.lastComputedDate,
    peakHour: stats.peakHour,
    dailyActivity: filteredActivity,
    modelUsage: filteredModelUsage,
  };
}

/**
 * Print stats in table format.
 *
 * @param stats - Filtered statistics
 * @param periodDays - Period in days
 * @param modelFilter - Optional model filter
 */
function printTableFormat(
  stats: FilteredStats,
  periodDays: number,
  modelFilter?: string,
): void {
  // Summary section
  console.log("=== USAGE SUMMARY ===");
  const summaryData = [
    { field: "Total Sessions", value: String(stats.totalSessions) },
    { field: "Total Messages", value: String(stats.totalMessages) },
    {
      field: "First Session",
      value: stats.firstSessionDate.toISOString().split("T")[0] ?? "",
    },
    {
      field: "Last Computed",
      value: stats.lastComputedDate.toISOString().split("T")[0] ?? "",
    },
    { field: "Peak Hour", value: `${stats.peakHour}:00` },
  ];

  const summaryTable = formatTable(summaryData, [
    { key: "field", header: "Metric", width: 20 },
    { key: "value", header: "Value" },
  ]);
  console.log(summaryTable);

  // Model usage section
  console.log("\n=== MODEL USAGE ===");
  if (modelFilter !== undefined) {
    console.log(`Filtered by model: ${modelFilter}`);
  }

  if (stats.modelUsage.size === 0) {
    console.log("(no model usage data)");
  } else {
    const modelData = Array.from(stats.modelUsage.entries()).map(
      ([model, usage]) => ({
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens,
        cacheWriteTokens: usage.cacheWriteTokens,
        totalTokens: usage.totalTokens,
      }),
    );

    const modelTable = formatTable(modelData, [
      { key: "model", header: "Model", width: 30 },
      {
        key: "inputTokens",
        header: "Input",
        width: 12,
        align: "right",
        format: (v) => formatNumber(v),
      },
      {
        key: "outputTokens",
        header: "Output",
        width: 12,
        align: "right",
        format: (v) => formatNumber(v),
      },
      {
        key: "cacheReadTokens",
        header: "Cache Read",
        width: 12,
        align: "right",
        format: (v) => formatNumber(v),
      },
      {
        key: "cacheWriteTokens",
        header: "Cache Write",
        width: 12,
        align: "right",
        format: (v) => formatNumber(v),
      },
      {
        key: "totalTokens",
        header: "Total",
        width: 12,
        align: "right",
        format: (v) => formatNumber(v),
      },
    ]);
    console.log(modelTable);
  }

  // Daily activity section
  console.log(`\n=== DAILY ACTIVITY (Last ${periodDays} days) ===`);

  if (stats.dailyActivity.length === 0) {
    console.log("(no activity data for this period)");
  } else {
    const activityData = stats.dailyActivity.map((activity) => ({
      date: activity.date.toISOString().split("T")[0] ?? "",
      sessions: activity.sessionCount,
      messages: activity.messageCount,
      toolCalls: activity.toolCallCount,
    }));

    const activityTable = formatTable(activityData, [
      { key: "date", header: "Date", width: 12 },
      {
        key: "sessions",
        header: "Sessions",
        width: 10,
        align: "right",
      },
      {
        key: "messages",
        header: "Messages",
        width: 10,
        align: "right",
      },
      {
        key: "toolCalls",
        header: "Tool Calls",
        width: 10,
        align: "right",
      },
    ]);
    console.log(activityTable);
  }
}

/**
 * Format a number with thousand separators.
 *
 * @param value - Number value to format
 * @returns Formatted string with commas
 */
function formatNumber(value: unknown): string {
  if (typeof value !== "number") {
    return String(value);
  }
  return value.toLocaleString();
}

/**
 * Validate format option value.
 *
 * @param value - Format option value from CLI
 * @returns Validated format value
 * @throws {Error} If format is not 'table' or 'json'
 */
function validateFormat(value: string): "table" | "json" {
  if (value !== "table" && value !== "json") {
    throw new Error(`Invalid format: ${value}. Must be 'table' or 'json'.`);
  }
  return value;
}
