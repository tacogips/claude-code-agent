/**
 * Crash Recovery for Command Queues.
 *
 * Provides functionality to detect and recover from stale running queues
 * after application restart or crash.
 *
 * @module sdk/queue/recovery
 */
import type { Container } from "../../container";
import type { QueueManager } from "./manager";
/**
 * Result of crash recovery operation.
 */
export interface RecoveryResult {
    /** Number of stale queues found */
    readonly staleQueuesFound: number;
    /** Number of queues successfully recovered */
    readonly queuesRecovered: number;
    /** List of recovered queue IDs */
    readonly recoveredQueueIds: readonly string[];
}
/**
 * Queue Recovery handler for detecting and recovering stale running queues.
 *
 * On startup, scans for queues with 'running' status and checks if
 * their associated Claude Code processes are still alive. If not,
 * marks them as 'paused' for manual recovery.
 *
 * @example
 * ```typescript
 * const recovery = new QueueRecovery(container, manager);
 *
 * // Run recovery on startup
 * const result = await recovery.recoverStaleQueues();
 * console.log(`Recovered ${result.queuesRecovered} stale queues`);
 * ```
 */
export declare class QueueRecovery {
    private readonly container;
    private readonly manager;
    /**
     * Create a new QueueRecovery instance.
     *
     * @param container - Dependency injection container
     * @param manager - Queue manager for data access
     */
    constructor(container: Container, manager: QueueManager);
    /**
     * Scan for and recover stale running queues.
     *
     * Finds all queues with status 'running', checks if their processes
     * are still alive, and marks stale ones as 'paused'.
     *
     * @returns Recovery result summary
     *
     * @example
     * ```typescript
     * const result = await recovery.recoverStaleQueues();
     * console.log(`Found: ${result.staleQueuesFound}`);
     * console.log(`Recovered: ${result.queuesRecovered}`);
     * ```
     */
    recoverStaleQueues(): Promise<RecoveryResult>;
    /**
     * Mark a queue as paused.
     *
     * Updates the queue status to 'paused' and sets the updatedAt timestamp.
     * This allows the queue to be manually resumed later.
     *
     * @param queue - Queue to mark as paused
     */
    private markAsPaused;
}
//# sourceMappingURL=recovery.d.ts.map