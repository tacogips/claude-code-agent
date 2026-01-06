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
import type {
  QueueRepository,
  QueueFilter,
  QueueSort,
  CommandQueue,
  QueueCommand,
  UpdateCommandOptions,
} from "../../repository/queue-repository";
import type { SessionMode } from "./types";
import { createTaggedLogger } from "../../logger";

const logger = createTaggedLogger("queue-manager");

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
export class QueueManager {
  private readonly container: Container;
  private readonly repository: QueueRepository;
  private readonly eventEmitter: EventEmitter;

  /**
   * Create a new QueueManager.
   *
   * @param container - Dependency injection container
   * @param repository - Queue repository for data access
   * @param eventEmitter - Event emitter for queue events
   */
  constructor(
    container: Container,
    repository: QueueRepository,
    eventEmitter: EventEmitter,
  ) {
    this.container = container;
    this.repository = repository;
    this.eventEmitter = eventEmitter;
  }

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
  async createQueue(options: CreateQueueOptions): Promise<CommandQueue> {
    const now = this.container.clock.now();
    const timestamp = now.toISOString();

    // Generate queue ID: YYYYMMDD-HHMMSS-{slug}
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ""); // HHMMSS
    const slug = this.generateSlug(options.name ?? "queue");
    const queueId = `${dateStr}-${timeStr}-${slug}`;

    const queue: CommandQueue = {
      id: queueId,
      name: options.name ?? `Queue ${dateStr}-${timeStr}`,
      projectPath: options.projectPath,
      status: "pending",
      currentSessionId: undefined,
      currentIndex: 0,
      commands: [],
      totalCostUsd: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: undefined,
      completedAt: undefined,
    };

    await this.repository.save(queue);

    logger.info(`Created queue ${queueId}`, {
      name: queue.name,
      projectPath: queue.projectPath,
    });

    this.eventEmitter.emit("queue_created", {
      type: "queue_created",
      timestamp,
      queueId: queue.id,
      name: queue.name,
      projectPath: queue.projectPath,
    });

    return queue;
  }

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
  async getQueue(queueId: string): Promise<CommandQueue | null> {
    return this.repository.findById(queueId);
  }

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
  async listQueues(
    options?: ListQueuesOptions,
  ): Promise<readonly CommandQueue[]> {
    return this.repository.list(options?.filter, options?.sort);
  }

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
  async deleteQueue(queueId: string, force = false): Promise<boolean> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      return false;
    }

    // Prevent deletion of running queues unless force=true
    if (queue.status === "running" && !force) {
      throw new Error(
        `Cannot delete running queue ${queueId}. Use force=true to override.`,
      );
    }

    const deleted = await this.repository.delete(queueId);

    if (deleted) {
      logger.info(`Deleted queue ${queueId}`, { force });
    }

    return deleted;
  }

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
  async addCommand(
    queueId: string,
    options: AddCommandOptions,
  ): Promise<QueueCommand> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    // Only allow adding commands to pending or paused queues
    if (queue.status !== "pending" && queue.status !== "paused") {
      throw new Error(`Cannot add commands to queue in ${queue.status} status`);
    }

    const now = this.container.clock.now().toISOString();

    const command: Omit<QueueCommand, "id" | "status"> = {
      prompt: options.prompt,
      sessionMode: options.sessionMode ?? "continue",
      sessionId: undefined,
      costUsd: undefined,
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
    };

    const position = options.position ?? queue.commands.length;
    const added = await this.repository.addCommand(queueId, command, position);

    if (!added) {
      throw new Error(`Failed to add command to queue ${queueId}`);
    }

    // Retrieve the updated queue to get the added command with its ID
    const updatedQueue = await this.repository.findById(queueId);
    if (updatedQueue === null) {
      throw new Error(`Queue ${queueId} not found after adding command`);
    }

    const addedCommand = updatedQueue.commands[position];
    if (addedCommand === undefined) {
      throw new Error(`Command not found at position ${position}`);
    }

    logger.info(`Added command to queue ${queueId}`, {
      commandId: addedCommand.id,
      position,
      sessionMode: options.sessionMode ?? "continue",
    });

    this.eventEmitter.emit("command_added", {
      type: "command_added",
      timestamp: now,
      queueId,
      commandId: addedCommand.id,
      commandIndex: position,
      sessionMode: options.sessionMode ?? "continue",
    });

    return addedCommand;
  }

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
  async updateCommand(
    queueId: string,
    index: number,
    updates: UpdateCommandOptions,
  ): Promise<QueueCommand> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "pending" && queue.status !== "paused") {
      throw new Error(
        `Cannot update commands in queue with ${queue.status} status`,
      );
    }

    const command = queue.commands[index];
    if (command === undefined) {
      throw new Error(
        `Command at index ${index} not found in queue ${queueId}`,
      );
    }

    const updated = await this.repository.updateCommand(
      queueId,
      index,
      updates,
    );
    if (!updated) {
      throw new Error(`Failed to update command at index ${index}`);
    }

    // Retrieve the updated command
    const updatedQueue = await this.repository.findById(queueId);
    if (updatedQueue === null) {
      throw new Error(`Queue ${queueId} not found after update`);
    }

    const updatedCommand = updatedQueue.commands[index];
    if (updatedCommand === undefined) {
      throw new Error(`Command at index ${index} not found after update`);
    }

    logger.info(`Updated command in queue ${queueId}`, {
      commandId: command.id,
      index,
      updates,
    });

    this.eventEmitter.emit("command_updated", {
      type: "command_updated",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex: index,
    });

    return updatedCommand;
  }

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
  async removeCommand(queueId: string, index: number): Promise<void> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "pending" && queue.status !== "paused") {
      throw new Error(
        `Cannot remove commands from queue with ${queue.status} status`,
      );
    }

    const command = queue.commands[index];
    if (command === undefined) {
      throw new Error(
        `Command at index ${index} not found in queue ${queueId}`,
      );
    }

    const removed = await this.repository.removeCommand(queueId, index);
    if (!removed) {
      throw new Error(
        `Failed to remove command at index ${index} from queue ${queueId}`,
      );
    }

    logger.info(`Removed command from queue ${queueId}`, {
      commandId: command.id,
      index,
    });

    this.eventEmitter.emit("command_removed", {
      type: "command_removed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex: index,
    });
  }

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
  async reorderCommand(
    queueId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<void> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "pending" && queue.status !== "paused") {
      throw new Error(
        `Cannot reorder commands in queue with ${queue.status} status`,
      );
    }

    const command = queue.commands[fromIndex];
    if (command === undefined) {
      throw new Error(
        `Command at index ${fromIndex} not found in queue ${queueId}`,
      );
    }

    const reordered = await this.repository.reorderCommand(
      queueId,
      fromIndex,
      toIndex,
    );
    if (!reordered) {
      throw new Error(
        `Failed to reorder command in queue ${queueId} from ${fromIndex} to ${toIndex}`,
      );
    }

    logger.info(`Reordered command in queue ${queueId}`, {
      commandId: command.id,
      fromIndex,
      toIndex,
    });

    this.eventEmitter.emit("command_reordered", {
      type: "command_reordered",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      fromIndex,
      toIndex,
    });
  }

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
  async toggleSessionMode(
    queueId: string,
    index: number,
  ): Promise<QueueCommand> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "pending" && queue.status !== "paused") {
      throw new Error(
        `Cannot toggle session mode in queue with ${queue.status} status`,
      );
    }

    const command = queue.commands[index];
    if (command === undefined) {
      throw new Error(
        `Command at index ${index} not found in queue ${queueId}`,
      );
    }

    const newMode: SessionMode =
      command.sessionMode === "continue" ? "new" : "continue";

    const updated = await this.updateCommand(queueId, index, {
      sessionMode: newMode,
    });

    logger.info(`Toggled session mode in queue ${queueId}`, {
      commandId: command.id,
      index,
      oldMode: command.sessionMode,
      newMode,
    });

    this.eventEmitter.emit("command_mode_changed", {
      type: "command_mode_changed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex: index,
      sessionMode: newMode,
    });

    return updated;
  }

  /**
   * Generate a URL-safe slug from a name.
   *
   * Converts spaces and special characters to hyphens and lowercases.
   *
   * @param name - Name to slugify
   * @returns URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20);
  }
}
