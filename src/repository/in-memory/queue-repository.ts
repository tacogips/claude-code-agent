/**
 * In-memory implementation of QueueRepository.
 *
 * Provides in-memory storage for command queues using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/queue-repository
 */

import { nanoid } from "nanoid";
import type {
  CommandQueue,
  QueueCommand,
  QueueFilter,
  QueueRepository,
  QueueSort,
  QueueStatus,
  UpdateCommandOptions,
} from "../queue-repository";

/**
 * In-memory implementation of QueueRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export class InMemoryQueueRepository implements QueueRepository {
  private queues: Map<string, CommandQueue>;

  constructor() {
    this.queues = new Map();
  }

  /**
   * Find a queue by its ID.
   *
   * @param id - Queue ID
   * @returns Queue if found, null otherwise
   */
  async findById(id: string): Promise<CommandQueue | null> {
    return this.queues.get(id) ?? null;
  }

  /**
   * Find queues by project path.
   *
   * @param projectPath - Project directory path
   * @returns Array of queues for the project
   */
  async findByProject(projectPath: string): Promise<readonly CommandQueue[]> {
    return Array.from(this.queues.values()).filter(
      (queue) => queue.projectPath === projectPath,
    );
  }

  /**
   * Find queues by status.
   *
   * @param status - Status to filter by
   * @returns Array of queues with the status
   */
  async findByStatus(status: QueueStatus): Promise<readonly CommandQueue[]> {
    return Array.from(this.queues.values()).filter(
      (queue) => queue.status === status,
    );
  }

  /**
   * List queues with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of queues matching the filter
   */
  async list(
    filter?: QueueFilter,
    sort?: QueueSort,
  ): Promise<readonly CommandQueue[]> {
    let results = Array.from(this.queues.values());

    // Apply filters
    if (filter) {
      results = this.applyFilter(results, filter);
    }

    // Apply sorting
    if (sort) {
      results = this.applySort(results, sort);
    }

    return results;
  }

  /**
   * Save a queue.
   *
   * Creates a new queue or updates an existing one.
   *
   * @param queue - Queue to save
   */
  async save(queue: CommandQueue): Promise<void> {
    this.queues.set(queue.id, queue);
  }

  /**
   * Delete a queue by ID.
   *
   * @param id - Queue ID to delete
   * @returns True if queue was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.queues.delete(id);
  }

  /**
   * Add a command to a queue.
   *
   * @param queueId - Queue ID
   * @param command - Command to add (without id and status)
   * @param position - Insert position (default: end)
   * @returns True if command was added, false if queue not found
   */
  async addCommand(
    queueId: string,
    command: Omit<QueueCommand, "id" | "status">,
    position?: number,
  ): Promise<boolean> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    // Generate command ID
    const commandId = `cmd-${nanoid(12)}`;

    const newCommand: QueueCommand = {
      id: commandId,
      status: "pending",
      ...command,
    };

    const commands = [...queue.commands];
    const insertPos = position ?? commands.length;
    commands.splice(insertPos, 0, newCommand);

    const updatedQueue: CommandQueue = {
      ...queue,
      commands,
      updatedAt: new Date().toISOString(),
    };

    this.queues.set(queueId, updatedQueue);
    return true;
  }

  /**
   * Update a command in a queue.
   *
   * @param queueId - Queue ID
   * @param commandIndex - Index of command to update
   * @param updates - Command updates
   * @returns True if command was updated, false if not found
   */
  async updateCommand(
    queueId: string,
    commandIndex: number,
    updates: UpdateCommandOptions,
  ): Promise<boolean> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    if (commandIndex < 0 || commandIndex >= queue.commands.length) {
      return false;
    }

    const currentCommand = queue.commands[commandIndex];
    if (!currentCommand) {
      return false;
    }

    const updatedCommand: QueueCommand = {
      ...currentCommand,
      ...(updates.prompt !== undefined && { prompt: updates.prompt }),
      ...(updates.sessionMode !== undefined && {
        sessionMode: updates.sessionMode,
      }),
    };

    const commands = [...queue.commands];
    commands[commandIndex] = updatedCommand;

    const updatedQueue: CommandQueue = {
      ...queue,
      commands,
      updatedAt: new Date().toISOString(),
    };

    this.queues.set(queueId, updatedQueue);
    return true;
  }

  /**
   * Remove a command from a queue.
   *
   * @param queueId - Queue ID
   * @param commandIndex - Index of command to remove
   * @returns True if command was removed, false if not found
   */
  async removeCommand(queueId: string, commandIndex: number): Promise<boolean> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    if (commandIndex < 0 || commandIndex >= queue.commands.length) {
      return false;
    }

    const commands = [...queue.commands];
    commands.splice(commandIndex, 1);

    const updatedQueue: CommandQueue = {
      ...queue,
      commands,
      updatedAt: new Date().toISOString(),
    };

    this.queues.set(queueId, updatedQueue);
    return true;
  }

  /**
   * Reorder a command in a queue.
   *
   * @param queueId - Queue ID
   * @param fromIndex - Current index of command
   * @param toIndex - New index for command
   * @returns True if command was reordered, false if not found
   */
  async reorderCommand(
    queueId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<boolean> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    if (
      fromIndex < 0 ||
      fromIndex >= queue.commands.length ||
      toIndex < 0 ||
      toIndex >= queue.commands.length
    ) {
      return false;
    }

    const commands = [...queue.commands];
    const [movedCommand] = commands.splice(fromIndex, 1);
    if (!movedCommand) {
      return false;
    }
    commands.splice(toIndex, 0, movedCommand);

    const updatedQueue: CommandQueue = {
      ...queue,
      commands,
      updatedAt: new Date().toISOString(),
    };

    this.queues.set(queueId, updatedQueue);
    return true;
  }

  /**
   * Count queues matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching queues
   */
  async count(filter?: QueueFilter): Promise<number> {
    if (!filter) {
      return this.queues.size;
    }

    const filtered = this.applyFilter(Array.from(this.queues.values()), filter);
    return filtered.length;
  }

  /**
   * Clear all queues from memory.
   *
   * Useful for test cleanup.
   */
  clear(): void {
    this.queues.clear();
  }

  /**
   * Apply filter criteria to queue array.
   */
  private applyFilter(
    queues: CommandQueue[],
    filter: QueueFilter,
  ): CommandQueue[] {
    let results = queues;

    if (filter.projectPath !== undefined) {
      results = results.filter((q) => q.projectPath === filter.projectPath);
    }

    if (filter.status !== undefined) {
      results = results.filter((q) => q.status === filter.status);
    }

    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((q) =>
        q.name.toLowerCase().includes(searchTerm),
      );
    }

    if (filter.since !== undefined) {
      const sinceTime = filter.since.getTime();
      results = results.filter(
        (q) => new Date(q.createdAt).getTime() >= sinceTime,
      );
    }

    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Apply sort options to queue array.
   */
  private applySort(queues: CommandQueue[], sort: QueueSort): CommandQueue[] {
    const sorted = [...queues];
    const direction = sort.direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sort.field) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          compareValue =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "totalCostUsd":
          compareValue = a.totalCostUsd - b.totalCostUsd;
          break;
      }

      return compareValue * direction;
    });

    return sorted;
  }
}
