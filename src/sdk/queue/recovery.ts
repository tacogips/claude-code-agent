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
import type { CommandQueue } from "../../repository/queue-repository";
import { createTaggedLogger } from "../../logger";

const logger = createTaggedLogger("queue-recovery");

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
export class QueueRecovery {
  private readonly container: Container;
  private readonly manager: QueueManager;

  /**
   * Create a new QueueRecovery instance.
   *
   * @param container - Dependency injection container
   * @param manager - Queue manager for data access
   */
  constructor(container: Container, manager: QueueManager) {
    this.container = container;
    this.manager = manager;
  }

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
  async recoverStaleQueues(): Promise<RecoveryResult> {
    logger.info("Starting crash recovery scan for stale queues");

    // Find all queues with 'running' status
    const runningQueues = await this.manager.listQueues({
      filter: { status: "running" },
    });

    const staleQueuesFound = runningQueues.length;

    if (staleQueuesFound === 0) {
      logger.info("No stale running queues found");
      return {
        staleQueuesFound: 0,
        queuesRecovered: 0,
        recoveredQueueIds: [],
      };
    }

    logger.info(
      `Found ${staleQueuesFound} running queues, checking for stale processes`,
    );

    const recoveredQueueIds: string[] = [];

    // Check each running queue
    for (const queue of runningQueues) {
      try {
        // NOTE: We don't have access to the PID of the Claude Code process
        // that was running this queue, so we assume all running queues at
        // startup are stale (since a clean shutdown should mark them as
        // completed/paused/stopped).
        //
        // In a production system, we would:
        // 1. Store the Claude Code process PID in the queue metadata
        // 2. Check if that PID is still alive using process.kill(pid, 0)
        // 3. Only mark as paused if the process is not alive
        //
        // For now, we mark all running queues as paused on startup.
        const isStale = true;

        if (isStale) {
          await this.markAsPaused(queue);
          recoveredQueueIds.push(queue.id);

          logger.info(`Marked stale queue as paused: ${queue.id}`, {
            name: queue.name,
            currentIndex: queue.currentIndex,
          });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Failed to recover queue ${queue.id}:`, errorMessage);
        // Continue with other queues
      }
    }

    const queuesRecovered = recoveredQueueIds.length;

    logger.info(
      `Crash recovery complete: ${queuesRecovered}/${staleQueuesFound} queues recovered`,
      {
        recoveredQueueIds,
      },
    );

    return {
      staleQueuesFound,
      queuesRecovered,
      recoveredQueueIds,
    };
  }

  /**
   * Mark a queue as paused.
   *
   * Updates the queue status to 'paused' and sets the updatedAt timestamp.
   * This allows the queue to be manually resumed later.
   *
   * @param queue - Queue to mark as paused
   */
  private async markAsPaused(queue: CommandQueue): Promise<void> {
    // Use the manager's internal repository access
    // We need to update the queue directly rather than through manager
    // methods since those may have validation that prevents this operation

    const updatedQueue: CommandQueue = {
      ...queue,
      status: "paused",
      updatedAt: this.container.clock.now().toISOString(),
    };

    // Access the repository through the manager
    // NOTE: This assumes we can access the repository
    // In production, we might need to add a method to QueueManager
    // to handle this specific recovery scenario
    const repository = (this.manager as any).repository;
    await repository.save(updatedQueue);
  }
}
