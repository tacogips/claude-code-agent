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
export declare class ProgressAggregator {
    private readonly sessionProgress;
    private readonly groupStartTime?;
    constructor(groupStartTime?: number | undefined);
    /**
     * Update progress for a specific session.
     */
    updateSession(progress: SessionProgress): void;
    /**
     * Remove a session from tracking.
     */
    removeSession(sessionId: string): void;
    /**
     * Compute aggregated group progress.
     */
    computeProgress(group: SessionGroup): GroupProgress;
    /**
     * Clear all session progress.
     */
    clear(): void;
    /**
     * Get progress for a specific session.
     */
    getSessionProgress(sessionId: string): SessionProgress | undefined;
    /**
     * Get all session progress entries.
     */
    getAllSessions(): readonly SessionProgress[];
}
/**
 * Create initial session progress from a GroupSession.
 */
export declare function createSessionProgress(session: GroupSession): SessionProgress;
/**
 * Calculate budget usage percentage.
 */
export declare function calculateBudgetUsage(currentCost: number, maxBudget: number): number;
/**
 * Check if budget warning threshold is reached.
 */
export declare function isBudgetWarning(currentCost: number, maxBudget: number, warningThreshold: number): boolean;
/**
 * Check if budget is exceeded.
 */
export declare function isBudgetExceeded(currentCost: number, maxBudget: number): boolean;
//# sourceMappingURL=progress.d.ts.map