/**
 * File-based implementation of QueueRepository.
 *
 * Stores command queues as JSON files in ~/.local/claude-code-agent/metadata/queues/
 * Each queue is stored in a separate file named {queue-id}.json
 *
 * Uses file locking to prevent race conditions in concurrent access scenarios.
 *
 * @module repository/file/queue-repository
 */
import type { Container } from "../../container";
import type { CommandQueue, QueueCommand, QueueFilter, QueueRepository, QueueSort, QueueStatus, UpdateCommandOptions } from "../queue-repository";
import { BaseFileRepository } from "./base-repository";
/**
 * File-based implementation of QueueRepository.
 *
 * Stores each queue as a JSON file in the metadata directory.
 * Provides persistent storage for command queues across process restarts.
 * Uses file locking to ensure safe concurrent access.
 */
export declare class FileQueueRepository extends BaseFileRepository<CommandQueue> implements QueueRepository {
    private readonly baseDir;
    /**
     * Create a new FileQueueRepository.
     *
     * @param container - Dependency injection container
     * @param dataDir - Base data directory (default: ~/.local/claude-code-agent)
     */
    constructor(container: Container, dataDir?: string);
    /**
     * Get the file path for a queue.
     *
     * @param id - Queue ID
     * @returns Absolute path to the queue JSON file
     */
    private getQueuePath;
    /**
     * Read a queue from its JSON file.
     *
     * @param id - Queue ID
     * @returns Queue if file exists, null otherwise
     */
    private readQueue;
    private updateQueue;
    /**
     * List all queue files in the directory.
     *
     * @returns Array of queue IDs
     */
    private listQueueIds;
    /**
     * Read all queues from disk.
     *
     * @returns Array of all queues
     */
    private readAllQueues;
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
     * Uses exclusive lock to prevent concurrent modifications.
     *
     * @param queue - Queue to save
     */
    save(queue: CommandQueue): Promise<void>;
    /**
     * Delete a queue by ID.
     *
     * Uses exclusive lock to prevent concurrent access during deletion.
     *
     * @param id - Queue ID to delete
     * @returns True if queue was deleted, false if not found
     */
    delete(id: string): Promise<boolean>;
    /**
     * Add a command to a queue.
     *
     * Uses exclusive lock to prevent race conditions in read-modify-write.
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
     * Uses exclusive lock to prevent race conditions in read-modify-write.
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
     * Uses exclusive lock to prevent race conditions in read-modify-write.
     *
     * @param queueId - Queue ID
     * @param commandIndex - Index of command to remove
     * @returns True if command was removed, false if not found
     */
    removeCommand(queueId: string, commandIndex: number): Promise<boolean>;
    /**
     * Reorder a command in a queue.
     *
     * Uses exclusive lock to prevent race conditions in read-modify-write.
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
     * Apply filter criteria to queue array.
     */
    private applyFilter;
    /**
     * Apply sort options to queue array.
     */
    private applySort;
}
//# sourceMappingURL=queue-repository.d.ts.map