/**
 * Queue Manager for Command Queue CRUD operations.
 *
 * Provides methods for creating, reading, updating, and deleting command queues,
 * as well as managing commands within queues.
 *
 * @module sdk/queue/manager
 */
import type { Container } from "../../container";
import type { EventEmitter } from "../events/emitter";
import type { QueueRepository, QueueFilter, QueueSort, CommandQueue, QueueCommand, UpdateCommandOptions } from "../../repository/queue-repository";
import type { SessionMode } from "./types";
/**
 * Options for creating a new command queue.
 */
export interface CreateQueueOptions {
    /** Absolute path to the project directory */
    readonly projectPath: string;
    /** Human-readable queue name (optional, defaults to generated name) */
    readonly name?: string | undefined;
}
/**
 * Options for adding a command to a queue.
 */
export interface AddCommandOptions {
    /** The prompt text to execute */
    readonly prompt: string;
    /** Session mode (default: 'continue') */
    readonly sessionMode?: SessionMode | undefined;
    /** Optional position to insert at (default: end of queue) */
    readonly position?: number | undefined;
}
/**
 * Options for listing queues.
 */
export interface ListQueuesOptions {
    /** Optional filter criteria */
    readonly filter?: QueueFilter | undefined;
    /** Optional sort options */
    readonly sort?: QueueSort | undefined;
}
/**
 * Queue Manager for Command Queue CRUD operations.
 *
 * Manages the lifecycle of command queues including creation,
 * retrieval, deletion, and command management.
 *
 * @example
 * ```typescript
 * const manager = new QueueManager(container, repository, eventEmitter);
 *
 * // Create a new queue
 * const queue = await manager.createQueue({
 *   projectPath: "/path/to/project",
 *   name: "Build and Test",
 * });
 *
 * // Add commands
 * await manager.addCommand(queue.id, {
 *   prompt: "Run all unit tests",
 *   sessionMode: "continue",
 * });
 *
 * // List queues
 * const queues = await manager.listQueues({
 *   filter: { status: "pending" },
 *   sort: { field: "createdAt", direction: "desc" },
 * });
 * ```
 */
export declare class QueueManager {
    private readonly container;
    private readonly repository;
    private readonly eventEmitter;
    /**
     * Create a new QueueManager.
     *
     * @param container - Dependency injection container
     * @param repository - Queue repository for data access
     * @param eventEmitter - Event emitter for queue events
     */
    constructor(container: Container, repository: QueueRepository, eventEmitter: EventEmitter);
    /**
     * Create a new command queue.
     *
     * Generates a unique ID in the format YYYYMMDD-HHMMSS-{slug}
     * and initializes the queue with default values.
     *
     * @param options - Queue creation options
     * @returns The newly created queue
     *
     * @example
     * ```typescript
     * const queue = await manager.createQueue({
     *   projectPath: "/path/to/project",
     *   name: "Build and Test",
     * });
     * ```
     */
    createQueue(options: CreateQueueOptions): Promise<CommandQueue>;
    /**
     * Get a queue by its ID.
     *
     * @param queueId - Queue ID to retrieve
     * @returns Queue if found, null otherwise
     *
     * @example
     * ```typescript
     * const queue = await manager.getQueue("20260106-120000-build-test");
     * if (queue) {
     *   console.log(`Queue: ${queue.name}`);
     * }
     * ```
     */
    getQueue(queueId: string): Promise<CommandQueue | null>;
    /**
     * List queues with optional filtering and sorting.
     *
     * @param options - List options with filter and sort
     * @returns Array of queues matching the criteria
     *
     * @example
     * ```typescript
     * // Get all pending queues sorted by creation time
     * const queues = await manager.listQueues({
     *   filter: { status: "pending" },
     *   sort: { field: "createdAt", direction: "desc" },
     * });
     * ```
     */
    listQueues(options?: ListQueuesOptions): Promise<readonly CommandQueue[]>;
    /**
     * Persist a full queue document (e.g. crash recovery updating status).
     */
    persistQueueSnapshot(queue: CommandQueue): Promise<void>;
    /**
     * Delete a queue by its ID.
     *
     * @param queueId - Queue ID to delete
     * @param force - If true, allows deletion of running queues (default: false)
     * @returns True if queue was deleted, false if not found
     * @throws Error if attempting to delete a running queue without force flag
     *
     * @example
     * ```typescript
     * // Delete a completed queue
     * await manager.deleteQueue("20260106-120000-build-test");
     *
     * // Force delete a running queue
     * await manager.deleteQueue("20260106-120000-build-test", true);
     * ```
     */
    deleteQueue(queueId: string, force?: boolean): Promise<boolean>;
    /**
     * Add a command to a queue.
     *
     * Commands can be inserted at a specific position or appended to the end.
     * Only allowed when queue is in 'pending' or 'paused' status.
     *
     * @param queueId - Queue ID to add command to
     * @param options - Command options
     * @returns The newly added command
     * @throws Error if queue not found or in invalid state
     *
     * @example
     * ```typescript
     * // Add command at end
     * const cmd = await manager.addCommand(queueId, {
     *   prompt: "Run all tests",
     *   sessionMode: "continue",
     * });
     *
     * // Insert at specific position
     * const cmd2 = await manager.addCommand(queueId, {
     *   prompt: "Build project",
     *   sessionMode: "new",
     *   position: 0,
     * });
     * ```
     */
    addCommand(queueId: string, options: AddCommandOptions): Promise<QueueCommand>;
    /**
     * Update a command's properties.
     *
     * Allows updating prompt text and session mode.
     * Only allowed when queue is in 'pending' or 'paused' status.
     *
     * @param queueId - Queue ID containing the command
     * @param index - Zero-based index of the command to update
     * @param updates - Command properties to update
     * @returns The updated command
     * @throws Error if queue or command not found, or in invalid state
     *
     * @example
     * ```typescript
     * const updated = await manager.updateCommand(queueId, 0, {
     *   prompt: "Run unit tests only",
     *   sessionMode: "new",
     * });
     * ```
     */
    updateCommand(queueId: string, index: number, updates: UpdateCommandOptions): Promise<QueueCommand>;
    /**
     * Remove a command from a queue.
     *
     * Removes the command and reindexes remaining commands.
     * Only allowed when queue is in 'pending' or 'paused' status.
     *
     * @param queueId - Queue ID containing the command
     * @param index - Zero-based index of the command to remove
     * @throws Error if queue or command not found, or in invalid state
     *
     * @example
     * ```typescript
     * await manager.removeCommand(queueId, 2);
     * ```
     */
    removeCommand(queueId: string, index: number): Promise<void>;
    /**
     * Reorder a command within a queue.
     *
     * Moves a command from one position to another, updating indices.
     * Only allowed when queue is in 'pending' or 'paused' status.
     *
     * @param queueId - Queue ID containing the command
     * @param fromIndex - Current zero-based index of the command
     * @param toIndex - New zero-based index for the command
     * @throws Error if queue or command not found, or in invalid state
     *
     * @example
     * ```typescript
     * // Move command from position 3 to position 1
     * await manager.reorderCommand(queueId, 3, 1);
     * ```
     */
    reorderCommand(queueId: string, fromIndex: number, toIndex: number): Promise<void>;
    /**
     * Toggle the session mode of a command.
     *
     * Switches between 'continue' and 'new' session modes.
     * Only allowed when queue is in 'pending' or 'paused' status.
     *
     * @param queueId - Queue ID containing the command
     * @param index - Zero-based index of the command
     * @returns The updated command with new session mode
     * @throws Error if queue or command not found, or in invalid state
     *
     * @example
     * ```typescript
     * // Toggle from 'continue' to 'new' or vice versa
     * const updated = await manager.toggleSessionMode(queueId, 2);
     * console.log(`New mode: ${updated.sessionMode}`);
     * ```
     */
    toggleSessionMode(queueId: string, index: number): Promise<QueueCommand>;
    /**
     * Generate a URL-safe slug from a name.
     *
     * Converts spaces and special characters to hyphens and lowercases.
     *
     * @param name - Name to slugify
     * @returns URL-safe slug
     */
    private generateSlug;
}
//# sourceMappingURL=manager.d.ts.map