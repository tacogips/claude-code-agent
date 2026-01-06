/**
 * Session Group progress tracking interfaces and aggregation.
 *
 * Provides real-time progress aggregation across all sessions in a group,
 * including cost tracking, token usage, and execution state.
 *
 * @module sdk/group/progress
 */

import type { SessionStatus, TokenUsage } from "../../types/session";
import type { GroupSession, SessionGroup } from "./types";

/**
 * Progress information for a single session within a group.
 */
export interface SessionProgress {
  /** Session identifier */
  readonly id: string;
  /** Project directory path */
  readonly projectPath: string;
  /** Current session status */
  readonly status: SessionStatus;
  /** Currently executing tool (if any) */
  readonly currentTool?: string | undefined;
  /** Cost in USD */
  readonly cost: number;
  /** Token usage */
  readonly tokens: TokenUsage;
  /** Number of messages in session */
  readonly messageCount: number;
  /** ISO timestamp when started */
  readonly startedAt?: string | undefined;
  /** Duration in milliseconds */
  readonly durationMs?: number | undefined;
}

/**
 * Aggregated progress for an entire session group.
 */
export interface GroupProgress {
  /** Group identifier */
  readonly groupId: string;
  /** Total number of sessions */
  readonly totalSessions: number;
  /** Number of completed sessions */
  readonly completed: number;
  /** Number of currently running sessions */
  readonly running: number;
  /** Number of pending sessions */
  readonly pending: number;
  /** Number of failed sessions */
  readonly failed: number;
  /** Progress for each session */
  readonly sessions: readonly SessionProgress[];
  /** Total cost across all sessions in USD */
  readonly totalCost: number;
  /** Total tokens across all sessions */
  readonly totalTokens: TokenUsage;
  /** Elapsed time since group started (ms) */
  readonly elapsedTime?: number | undefined;
  /** Estimated time remaining (ms) */
  readonly estimatedTimeRemaining?: number | undefined;
}

/**
 * Progress aggregator for session groups.
 *
 * Collects session progress and computes group-level statistics in real-time.
 */
export class ProgressAggregator {
  private readonly sessionProgress: Map<string, SessionProgress>;
  private readonly groupStartTime?: number | undefined;

  constructor(groupStartTime?: number | undefined) {
    this.sessionProgress = new Map();
    this.groupStartTime = groupStartTime;
  }

  /**
   * Update progress for a specific session.
   */
  updateSession(progress: SessionProgress): void {
    this.sessionProgress.set(progress.id, progress);
  }

  /**
   * Remove a session from tracking.
   */
  removeSession(sessionId: string): void {
    this.sessionProgress.delete(sessionId);
  }

  /**
   * Compute aggregated group progress.
   */
  computeProgress(group: SessionGroup): GroupProgress {
    const sessions = Array.from(this.sessionProgress.values());

    // Count sessions by status
    let completed = 0;
    let running = 0;
    let pending = 0;
    let failed = 0;

    for (const session of group.sessions) {
      switch (session.status) {
        case "completed":
          completed++;
          break;
        case "active":
          running++;
          break;
        case "paused":
          pending++;
          break;
        case "failed":
          failed++;
          break;
      }
    }

    // Aggregate cost and tokens
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;

    for (const session of sessions) {
      totalCost += session.cost;
      totalInputTokens += session.tokens.input;
      totalOutputTokens += session.tokens.output;
      totalCacheReadTokens += session.tokens.cacheRead ?? 0;
      totalCacheWriteTokens += session.tokens.cacheWrite ?? 0;
    }

    // Calculate elapsed time
    const elapsedTime =
      this.groupStartTime !== undefined
        ? Date.now() - this.groupStartTime
        : undefined;

    // Estimate time remaining (simple average-based)
    let estimatedTimeRemaining: number | undefined;
    if (completed > 0 && elapsedTime !== undefined) {
      const avgTimePerSession = elapsedTime / completed;
      const remainingSessions = pending + running;
      estimatedTimeRemaining = avgTimePerSession * remainingSessions;
    }

    return {
      groupId: group.id,
      totalSessions: group.sessions.length,
      completed,
      running,
      pending,
      failed,
      sessions,
      totalCost,
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        cacheRead: totalCacheReadTokens > 0 ? totalCacheReadTokens : undefined,
        cacheWrite:
          totalCacheWriteTokens > 0 ? totalCacheWriteTokens : undefined,
      },
      elapsedTime,
      estimatedTimeRemaining,
    };
  }

  /**
   * Clear all session progress.
   */
  clear(): void {
    this.sessionProgress.clear();
  }

  /**
   * Get progress for a specific session.
   */
  getSessionProgress(sessionId: string): SessionProgress | undefined {
    return this.sessionProgress.get(sessionId);
  }

  /**
   * Get all session progress entries.
   */
  getAllSessions(): readonly SessionProgress[] {
    return Array.from(this.sessionProgress.values());
  }
}

/**
 * Create initial session progress from a GroupSession.
 */
export function createSessionProgress(session: GroupSession): SessionProgress {
  const startedAt = session.startedAt;
  const durationMs =
    startedAt !== undefined
      ? Date.now() - new Date(startedAt).getTime()
      : undefined;

  return {
    id: session.id,
    projectPath: session.projectPath,
    status: session.status,
    cost: session.cost ?? 0,
    tokens: session.tokens ?? { input: 0, output: 0 },
    messageCount: 0,
    startedAt,
    durationMs,
  };
}

/**
 * Calculate budget usage percentage.
 */
export function calculateBudgetUsage(
  currentCost: number,
  maxBudget: number,
): number {
  if (maxBudget <= 0) {
    return 0;
  }
  return (currentCost / maxBudget) * 100;
}

/**
 * Check if budget warning threshold is reached.
 */
export function isBudgetWarning(
  currentCost: number,
  maxBudget: number,
  warningThreshold: number,
): boolean {
  return currentCost >= maxBudget * warningThreshold;
}

/**
 * Check if budget is exceeded.
 */
export function isBudgetExceeded(
  currentCost: number,
  maxBudget: number,
): boolean {
  return currentCost >= maxBudget;
}
