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
export declare function createAuthStatsCommand(): Command;
//# sourceMappingURL=stats.d.ts.map