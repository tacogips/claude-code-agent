/**
 * In-memory implementation of QueueRepository.
 *
 * Provides in-memory storage for command queues using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/queue-repository
 */
import type { CommandQueue, QueueCommand, QueueFilter, QueueRepository, QueueSort, QueueStatus, UpdateCommandOptions } from "../queue-repository";
/**
 * In-memory implementation of QueueRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export declare class InMemoryQueueRepository implements QueueRepository {
    private readonly queues;
    /**
     * Find a queue by its ID.
     *
     * @param id - Queue ID
     * @returns Queue if found, null otherwise
     */
    findById(id: string): Promise<CommandQueue | null>;
    /**
     * Find queues by project path.
     *
     * @param projectPath - Project directory path
     * @returns Array of queues for the project
     */
    findByProject(projectPath: string): Promise<readonly CommandQueue[]>;
    /**
     * Find queues by status.
     *
     * @param status - Status to filter by
     * @returns Array of queues with the status
     */
    findByStatus(status: QueueStatus): Promise<readonly CommandQueue[]>;
    /**
     * List queues with optional filtering and sorting.
     *
     * @param filter - Filter criteria
     * @param sort - Sort options
     * @returns Array of queues matching the filter
     */
    list(filter?: QueueFilter, sort?: QueueSort): Promise<readonly CommandQueue[]>;
    /**
     * Save a queue.
     *
     * Creates a new queue or updates an existing one.
     *
     * @param queue - Queue to save
     */
    save(queue: CommandQueue): Promise<void>;
    /**
     * Delete a queue by ID.
     *
     * @param id - Queue ID to delete
     * @returns True if queue was deleted, false if not found
     */
    delete(id: string): Promise<boolean>;
    private updateQueue;
    /**
     * Add a command to a queue.
     *
     * @param queueId - Queue ID
     * @param command - Command to add (without id and status)
     * @param position - Insert position (default: end)
     * @returns True if command was added, false if queue not found
     */
    addCommand(queueId: string, command: Omit<QueueCommand, "id" | "status">, position?: number): Promise<boolean>;
    /**
     * Update a command in a queue.
     *
     * @param queueId - Queue ID
     * @param commandIndex - Index of command to update
     * @param updates - Command updates
     * @returns True if command was updated, false if not found
     */
    updateCommand(queueId: string, commandIndex: number, updates: UpdateCommandOptions): Promise<boolean>;
    /**
     * Remove a command from a queue.
     *
     * @param queueId - Queue ID
     * @param commandIndex - Index of command to remove
     * @returns True if command was removed, false if not found
     */
    removeCommand(queueId: string, commandIndex: number): Promise<boolean>;
    /**
     * Reorder a command in a queue.
     *
     * @param queueId - Queue ID
     * @param fromIndex - Current index of command
     * @param toIndex - New index for command
     * @returns True if command was reordered, false if not found
     */
    reorderCommand(queueId: string, fromIndex: number, toIndex: number): Promise<boolean>;
    /**
     * Count queues matching the filter.
     *
     * @param filter - Filter criteria
     * @returns Number of matching queues
     */
    count(filter?: QueueFilter): Promise<number>;
    /**
     * Clear all queues from memory.
     *
     * Useful for test cleanup.
     */
    clear(): void;
    /**
     * Apply filter criteria to queue array.
     */
    private applyFilter;
    /**
     * Apply sort options to queue array.
     */
    private applySort;
}
//# sourceMappingURL=queue-repository.d.ts.map