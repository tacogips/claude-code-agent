/**
 * Usage Statistics Types
 *
 * Defines interfaces for Claude Code usage statistics from ~/.claude/stats-cache.json
 */

/**
 * Raw stats cache structure as stored in stats-cache.json
 */
export interface RawStatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: RawDailyActivity[];
  dailyOutputTokens: RawDailyTokens[];
  modelUsage: Record<string, RawModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: RawLongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

/**
 * Raw daily activity from stats cache
 */
export interface RawDailyActivity {
  date: string; // ISO date string "2025-12-10"
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

/**
 * Raw daily token data from stats cache
 */
export interface RawDailyTokens {
  date: string; // ISO date string
  tokensByModel: Record<string, number>;
}

/**
 * Raw model usage from stats cache
 */
export interface RawModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests?: number;
  costUSD?: number;
  contextWindow?: number;
}

/**
 * Raw longest session data from stats cache
 */
export interface RawLongestSession {
  sessionId: string;
  duration: number; // milliseconds
  messageCount: number;
  timestamp: string; // ISO date string
}

/**
 * Public API type for usage statistics with parsed dates and Maps
 */
export interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: Date;
  lastComputedDate: Date;
  modelUsage: Map<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  dailyTokens: DailyTokens[];
  longestSession: LongestSession;
  peakHour: number; // Hour with most activity (0-23)
}

/**
 * Model usage statistics for a specific model
 */
export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

/**
 * Daily activity statistics
 */
export interface DailyActivity {
  date: Date;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

/**
 * Daily token usage by model
 */
export interface DailyTokens {
  date: Date;
  tokensByModel: Map<string, number>;
  totalTokens: number;
}

/**
 * Longest session information
 */
export interface LongestSession {
  sessionId: string;
  durationMs: number;
  messageCount: number;
  timestamp: Date;
}
