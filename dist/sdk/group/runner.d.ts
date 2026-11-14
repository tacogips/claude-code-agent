/**
 * Session Group Runner for executing Session Groups with worker pool.
 *
 * Provides concurrent execution of sessions within a group, respecting
 * dependencies and concurrency limits. Uses a worker pool pattern for
 * efficient resource utilization.
 *
 * @module sdk/group/runner
 */
import type { Container } from "../../container";
import type { GroupRepository } from "../../repository/group-repository";
import type { EventEmitter } from "../events/emitter";
import type { SessionGroup } from "./types";
import { type GroupProgress } from "./progress";
import type { RunOptions, PauseReason, RunnerState } from "./runner-types";
export type { RunOptions, PauseReason, RunnerState } from "./runner-types";
/**
 * Group Runner for executing Session Groups.
 *
 * Manages concurrent execution of sessions with dependency ordering,
 * budget enforcement, and progress tracking.
 *
 * @example
 * ```typescript
 * const runner = new GroupRunner(container, repository, emitter);
 *
 * // Run a group
 * await runner.run(group, { maxConcurrent: 3 });
 *
 * // Pause execution
 * await runner.pause("manual");
 *
 * // Resume execution
 * await runner.resume();
 *
 * // Get current progress
 * const progress = runner.getProgress();
 * ```
 */
export declare class GroupRunner {
    private readonly container;
    private readonly eventEmitter;
    private readonly configGenerator;
    private readonly updater;
    /** Current runner state */
    private state;
    /** Group being executed */
    private currentGroup;
    /** Run options - required and non-undefined after initialization */
    private currentOptions;
    /** Active workers */
    private readonly workers;
    /** Dependency graph for execution ordering */
    private dependencyGraph;
    /** Progress aggregator */
    private progressAggregator;
    /** Failure count for error threshold */
    private failureCount;
    /** Budget warning emitted flag */
    private budgetWarningEmitted;
    /** Pause reason (if paused) */
    private pauseReason;
    /** Interrupt signal for execution loop */
    private interruptSignal;
    constructor(container: Container, repository: GroupRepository, eventEmitter: EventEmitter);
    /**
     * Run a session group.
     *
     * Executes all sessions in the group, respecting dependencies and
     * concurrency limits. Returns when all sessions complete or the
     * group is paused/stopped.
     *
     * @param group - Session group to execute
     * @param options - Run options
     */
    run(group: SessionGroup, options?: RunOptions): Promise<void>;
    /**
     * Pause the running group.
     *
     * Sends SIGTERM to all running sessions and blocks pending sessions.
     *
     * @param reason - Reason for pausing
     */
    pause(reason?: PauseReason): Promise<void>;
    /**
     * Resume a paused group.
     *
     * Restarts paused sessions with --resume flag and continues
     * executing pending sessions.
     */
    resume(): Promise<void>;
    /**
     * Stop the running group.
     *
     * Terminates all running sessions and marks the group as failed.
     * Unlike pause, stopped groups cannot be resumed.
     */
    stop(): Promise<void>;
    /**
     * Get current execution progress.
     *
     * @returns Current group progress or null if not running
     */
    getProgress(): GroupProgress | null;
    /**
     * Get current runner state.
     */
    getState(): RunnerState;
    /**
     * Get pause reason (if paused).
     */
    getPauseReason(): PauseReason | null;
    /**
     * Main execution loop.
     *
     * Continuously schedules ready sessions until all complete,
     * the group is paused, or an error threshold is reached.
     */
    private executeLoop;
    /**
     * Start a session execution.
     */
    private startSession;
    /**
     * Wait for any worker to complete or for an interrupt signal.
     */
    private waitForCompletion;
    /**
     * Handle session completion.
     */
    private handleSessionCompletion;
    /**
     * Handle session failure.
     */
    private handleSessionFailure;
    /**
     * Check budget and handle exceeded state.
     *
     * @returns True if budget exceeded and group should stop
     */
    private checkBudget;
    /**
     * Complete the group successfully.
     */
    private completeGroup;
    /**
     * Fail the group.
     */
    private failGroup;
}
//# sourceMappingURL=runner.d.ts.map