/**
 * Queue and Command Update Methods for Queue Runner.
 *
 * Provides methods for updating queue and command states with
 * a generic update pattern to eliminate code duplication.
 *
 * @module sdk/queue/runner-updaters
 */
import type { Container } from "../../container";
import type { QueueRepository, QueueStatus, CommandStatus } from "../../repository/queue-repository";
/**
 * Queue and Command Updater for managing repository updates.
 *
 * Encapsulates all queue and command update operations with
 * a generic update pattern to reduce code duplication.
 */
export declare class QueueUpdater {
    private readonly container;
    private readonly repository;
    /**
     * Create a new QueueUpdater.
     *
     * @param container - Dependency injection container
     * @param repository - Queue repository for data access
     */
    constructor(container: Container, repository: QueueRepository);
    /**
     * Generic queue update method.
     *
     * Fetches queue, applies updater function, adds timestamp, and saves.
     *
     * @param queueId - Queue ID to update
     * @param updater - Function that transforms the queue
     */
    private updateQueue;
    /**
     * Generic command update method.
     *
     * Fetches queue, updates specific command, and saves queue.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to update
     * @param updater - Function that transforms the command
     */
    private updateCommand;
    /**
     * Update queue status in repository.
     *
     * @param queueId - Queue ID to update
     * @param status - New queue status
     */
    updateQueueStatus(queueId: string, status: QueueStatus): Promise<void>;
    /**
     * Update queue current session ID.
     *
     * @param queueId - Queue ID to update
     * @param sessionId - New session ID
     */
    updateQueueSessionId(queueId: string, sessionId: string): Promise<void>;
    /**
     * Update queue current command index.
     *
     * @param queueId - Queue ID to update
     * @param index - New command index
     */
    updateQueueCurrentIndex(queueId: string, index: number): Promise<void>;
    /**
     * Update command status.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to update
     * @param status - New command status
     */
    updateCommandStatus(queueId: string, commandIndex: number, status: CommandStatus): Promise<void>;
    /**
     * Update command session ID.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to update
     * @param sessionId - New session ID
     */
    updateCommandSessionId(queueId: string, commandIndex: number, sessionId: string): Promise<void>;
    /**
     * Update command cost.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to update
     * @param costUsd - Cost in USD
     */
    updateCommandCost(queueId: string, commandIndex: number, costUsd: number): Promise<void>;
    /**
     * Update command completedAt timestamp.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to update
     */
    updateCommandCompletedAt(queueId: string, commandIndex: number): Promise<void>;
    /**
     * Update command error message.
     *
     * @param queueId - Queue ID containing the command
     * @param commandIndex - Index of command to update
     * @param error - Error message
     */
    updateCommandError(queueId: string, commandIndex: number, error: string): Promise<void>;
}
//# sourceMappingURL=runner-updaters.d.ts.map