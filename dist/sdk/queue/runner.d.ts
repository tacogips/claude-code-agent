/**
 * Queue Runner for executing Command Queue commands sequentially.
 *
 * Provides methods for running queues, managing execution state (pause/resume/stop),
 * and tracking session continuity across commands.
 *
 * @module sdk/queue/runner
 */
import type { Container } from "../../container";
import type { EventEmitter } from "../events/emitter";
import type { QueueManager } from "./manager";
import type { QueueRepository } from "../../repository/queue-repository";
import type { RunOptions, QueueResult } from "./runner-types";
export type { RunOptions, QueueResult } from "./runner-types";
/**
 * Queue Runner for executing Command Queue commands sequentially.
 *
 * Manages the execution lifecycle of command queues including:
 * - Sequential command execution
 * - Session mode logic (continue vs new session)
 * - Pause/resume/stop controls
 * - Stats tracking and event emission
 *
 * @example
 * ```typescript
 * const runner = new QueueRunner(container, manager, eventEmitter);
 *
 * // Run a queue
 * const result = await runner.run(queueId, {
 *   onCommandStart: (cmd) => console.log(`Starting: ${cmd.prompt}`),
 *   onCommandComplete: (cmd) => console.log(`Completed: ${cmd.prompt}`),
 * });
 *
 * // Pause execution
 * await runner.pause(queueId);
 *
 * // Resume execution
 * await runner.resume(queueId);
 * ```
 */
export declare class QueueRunner {
    private readonly container;
    private readonly manager;
    private readonly eventEmitter;
    private readonly updater;
    /** Map of queue IDs to currently running processes */
    private readonly runningProcesses;
    /** Map of queue IDs to pause requests */
    private readonly pauseRequested;
    /** Map of queue IDs to stop requests */
    private readonly stopRequested;
    /**
     * Create a new QueueRunner.
     *
     * @param container - Dependency injection container
     * @param repository - Queue repository for data access
     * @param manager - Queue manager for data access
     * @param eventEmitter - Event emitter for queue events
     */
    constructor(container: Container, repository: QueueRepository, manager: QueueManager, eventEmitter: EventEmitter);
    /**
     * Run a queue, executing all pending commands sequentially.
     *
     * Executes commands in order, respecting session modes and handling
     * errors according to the queue's stopOnError configuration.
     *
     * @param queueId - Queue ID to run
     * @param options - Optional run options with callbacks
     * @returns Result of queue execution
     * @throws Error if queue not found or in invalid state
     *
     * @example
     * ```typescript
     * const result = await runner.run(queueId);
     * console.log(`Completed: ${result.completedCommands}`);
     * ```
     */
    run(queueId: string, options?: RunOptions): Promise<QueueResult>;
    /**
     * Pause a running queue.
     *
     * Sends SIGTERM to the current Claude Code process and marks
     * the queue as paused. The queue can be resumed later.
     *
     * @param queueId - Queue ID to pause
     * @throws Error if queue not found or not running
     *
     * @example
     * ```typescript
     * await runner.pause(queueId);
     * ```
     */
    pause(queueId: string): Promise<void>;
    /**
     * Resume a paused queue.
     *
     * Continues execution from the current command, using --resume flag
     * to continue the Claude Code session.
     *
     * @param queueId - Queue ID to resume
     * @returns Result of queue execution
     * @throws Error if queue not found or not paused
     *
     * @example
     * ```typescript
     * const result = await runner.resume(queueId);
     * ```
     */
    resume(queueId: string): Promise<QueueResult>;
    /**
     * Stop a running queue.
     *
     * Terminates execution and marks remaining commands as skipped.
     * The queue cannot be resumed after stopping.
     *
     * @param queueId - Queue ID to stop
     * @throws Error if queue not found or not running/paused
     *
     * @example
     * ```typescript
     * await runner.stop(queueId);
     * ```
     */
    stop(queueId: string): Promise<void>;
    /**
     * Execute a single command within a queue.
     *
     * Spawns Claude Code process with appropriate flags based on session mode.
     * Captures session ID from output and updates command state.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to execute
     * @param queue - Current queue state
     */
    private executeCommand;
    /**
     * Determine whether to start a new session for a command.
     *
     * A new session is started if:
     * - This is the first command (index 0)
     * - The command's sessionMode is 'new'
     *
     * @param queue - Current queue state
     * @param commandIndex - Index of command to check
     * @returns True if a new session should be started
     */
    private shouldStartNewSession;
}
//# sourceMappingURL=runner.d.ts.map