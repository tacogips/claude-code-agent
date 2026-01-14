/**
 * Stats Reader for ~/.claude/stats-cache.json
 *
 * Reads and transforms usage statistics from Claude Code's stats cache.
 */

import { readFile } from "fs/promises";
import { Result, ok, err } from "../../result";
import type {
  RawStatsCache,
  UsageStats,
  ModelUsage,
  RawModelUsage,
} from "./stats-types";
import { CredentialError } from "./errors";

/**
 * Reader for Claude Code usage statistics
 */
export class StatsReader {
  constructor(private readonly path: string = getDefaultStatsPath()) {}

  /**
   * Read and parse usage statistics from stats-cache.json
   * Returns null if stats file doesn't exist (user hasn't used Claude Code yet)
   */
  async getStats(): Promise<Result<UsageStats | null, CredentialError>> {
    try {
      const content = await readFile(this.path, "utf-8");
      const raw = JSON.parse(content) as unknown;

      if (!isRawStatsCache(raw)) {
        return err(CredentialError.invalidFormat("stats-cache.json"));
      }

      const stats = this.transformToUsageStats(raw);
      return ok(stats);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        // Stats file doesn't exist - user hasn't used Claude Code yet
        return ok(null);
      }
      if (isNodeError(error) && error.code === "EACCES") {
        return err(CredentialError.permissionDenied(this.path));
      }
      if (error instanceof SyntaxError) {
        return err(
          CredentialError.invalidFormat("Invalid JSON in stats-cache.json"),
        );
      }
      return err(
        CredentialError.invalidFormat(`Failed to read stats: ${String(error)}`),
      );
    }
  }

  /**
   * Transform raw stats cache to typed UsageStats
   */
  private transformToUsageStats(raw: RawStatsCache): UsageStats {
    return {
      totalSessions: raw.totalSessions,
      totalMessages: raw.totalMessages,
      firstSessionDate: new Date(raw.firstSessionDate),
      lastComputedDate: new Date(raw.lastComputedDate),
      modelUsage: this.transformModelUsage(raw.modelUsage),
      dailyActivity: raw.dailyActivity.map((activity) => ({
        date: new Date(activity.date),
        messageCount: activity.messageCount,
        sessionCount: activity.sessionCount,
        toolCallCount: activity.toolCallCount,
      })),
      dailyTokens: raw.dailyOutputTokens.map((daily) => {
        const tokensByModel = new Map<string, number>(
          Object.entries(daily.tokensByModel),
        );
        const totalTokens = Array.from(tokensByModel.values()).reduce(
          (sum, tokens) => sum + tokens,
          0,
        );
        return {
          date: new Date(daily.date),
          tokensByModel,
          totalTokens,
        };
      }),
      longestSession: {
        sessionId: raw.longestSession.sessionId,
        durationMs: raw.longestSession.duration,
        messageCount: raw.longestSession.messageCount,
        timestamp: new Date(raw.longestSession.timestamp),
      },
      peakHour: this.findPeakHour(raw.hourCounts),
    };
  }

  /**
   * Transform raw model usage Record to Map with calculated totals
   */
  private transformModelUsage(
    raw: Record<string, RawModelUsage>,
  ): Map<string, ModelUsage> {
    const map = new Map<string, ModelUsage>();

    for (const [model, usage] of Object.entries(raw)) {
      const totalTokens =
        usage.inputTokens +
        usage.outputTokens +
        usage.cacheReadInputTokens +
        usage.cacheCreationInputTokens;

      map.set(model, {
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadInputTokens,
        cacheWriteTokens: usage.cacheCreationInputTokens,
        totalTokens,
      });
    }

    return map;
  }

  /**
   * Find the hour (0-23) with most activity
   */
  private findPeakHour(hourCounts: Record<string, number>): number {
    let peakHour = 0;
    let maxCount = 0;

    for (const [hourStr, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hourStr, 10);
      }
    }

    return peakHour;
  }
}

/**
 * Get default path to stats-cache.json
 */
export function getDefaultStatsPath(): string {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude/stats-cache.json`;
}

/**
 * Type guard for RawStatsCache
 */
function isRawStatsCache(value: unknown): value is RawStatsCache {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj["version"] === "number" &&
    typeof obj["lastComputedDate"] === "string" &&
    Array.isArray(obj["dailyActivity"]) &&
    Array.isArray(obj["dailyOutputTokens"]) &&
    typeof obj["modelUsage"] === "object" &&
    obj["modelUsage"] !== null &&
    typeof obj["totalSessions"] === "number" &&
    typeof obj["totalMessages"] === "number" &&
    typeof obj["longestSession"] === "object" &&
    obj["longestSession"] !== null &&
    typeof obj["firstSessionDate"] === "string" &&
    typeof obj["hourCounts"] === "object" &&
    obj["hourCounts"] !== null
  );
}

/**
 * Type guard for Node.js error with code property
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}
