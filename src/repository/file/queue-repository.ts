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

import * as path from "node:path";
import { nanoid } from "nanoid";
import type { Container } from "../../container";
import type {
  CommandQueue,
  QueueCommand,
  QueueFilter,
  QueueRepository,
  QueueSort,
  QueueStatus,
  UpdateCommandOptions,
} from "../queue-repository";
import { FileLockServiceImpl } from "../../services/file-lock";
import { AtomicWriter } from "../../services/atomic-writer";

/**
 * File-based implementation of QueueRepository.
 *
 * Stores each queue as a JSON file in the metadata directory.
 * Provides persistent storage for command queues across process restarts.
 * Uses file locking to ensure safe concurrent access.
 */
export class FileQueueRepository implements QueueRepository {
  private readonly container: Container;
  private readonly baseDir: string;
  private readonly lockService: FileLockServiceImpl;
  private readonly atomicWriter: AtomicWriter;

  /**
   * Create a new FileQueueRepository.
   *
   * @param container - Dependency injection container
   * @param dataDir - Base data directory (default: ~/.local/claude-code-agent)
   */
  constructor(container: Container, dataDir?: string) {
    this.container = container;
    const home = process.env["HOME"] ?? "/tmp";
    const xdgDataHome = process.env["XDG_DATA_HOME"];
    const defaultDataDir = xdgDataHome
      ? path.join(xdgDataHome, "claude-code-agent")
      : path.join(home, ".local", "claude-code-agent");
    this.baseDir = path.join(dataDir ?? defaultDataDir, "metadata", "queues");
    this.lockService = new FileLockServiceImpl(
      container.fileSystem,
      container.clock,
    );
    this.atomicWriter = new AtomicWriter(container.fileSystem);
  }

  /**
   * Get the file path for a queue.
   *
   * @param id - Queue ID
   * @returns Absolute path to the queue JSON file
   */
  private getQueuePath(id: string): string {
    return path.join(this.baseDir, `${id}.json`);
  }

  /**
   * Ensure the queues directory exists.
   */
  private async ensureDirectory(): Promise<void> {
    const exists = await this.container.fileSystem.exists(this.baseDir);
    if (!exists) {
      await this.container.fileSystem.mkdir(this.baseDir, { recursive: true });
    }
  }

  /**
   * Read a queue from its JSON file.
   *
   * @param id - Queue ID
   * @returns Queue if file exists, null otherwise
   */
  private async readQueue(id: string): Promise<CommandQueue | null> {
    const queuePath = this.getQueuePath(id);
    const exists = await this.container.fileSystem.exists(queuePath);
    if (!exists) {
      return null;
    }

    try {
      const content = await this.container.fileSystem.readFile(queuePath);
      return JSON.parse(content) as CommandQueue;
    } catch {
      return null;
    }
  }

  /**
   * List all queue files in the directory.
   *
   * @returns Array of queue IDs
   */
  private async listQueueIds(): Promise<readonly string[]> {
    const exists = await this.container.fileSystem.exists(this.baseDir);
    if (!exists) {
      return [];
    }

    const entries = await this.container.fileSystem.readDir(this.baseDir);
    return entries
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5)); // Remove .json extension
  }

  /**
   * Read all queues from disk.
   *
   * @returns Array of all queues
   */
  private async readAllQueues(): Promise<readonly CommandQueue[]> {
    const queueIds = await this.listQueueIds();
    const queues: CommandQueue[] = [];

    for (const id of queueIds) {
      const queue = await this.readQueue(id);
      if (queue !== null) {
        queues.push(queue);
      }
    }

    return queues;
  }

  /**
   * Find a queue by its ID.
   *
   * @param id - Queue ID
   * @returns Queue if found, null otherwise
   */
  async findById(id: string): Promise<CommandQueue | null> {
    return this.readQueue(id);
  }

  /**
   * Find queues by project path.
   *
   * @param projectPath - Project directory path
   * @returns Array of queues for the project
   */
  async findByProject(projectPath: string): Promise<readonly CommandQueue[]> {
    const allQueues = await this.readAllQueues();
    return allQueues.filter((queue) => queue.projectPath === projectPath);
  }

  /**
   * Find queues by status.
   *
   * @param status - Status to filter by
   * @returns Array of queues with the status
   */
  async findByStatus(status: QueueStatus): Promise<readonly CommandQueue[]> {
    const allQueues = await this.readAllQueues();
    return allQueues.filter((queue) => queue.status === status);
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
    let results = await this.readAllQueues();

    // Apply filters
    if (filter !== undefined) {
      results = this.applyFilter([...results], filter);
    }

    // Apply sorting
    if (sort !== undefined) {
      results = this.applySort([...results], sort);
    }

    return results;
  }

  /**
   * Save a queue.
   *
   * Creates a new queue or updates an existing one.
   * Uses exclusive lock to prevent concurrent modifications.
   *
   * @param queue - Queue to save
   */
  async save(queue: CommandQueue): Promise<void> {
    const queuePath = this.getQueuePath(queue.id);
    await this.lockService.withLock(queuePath, async () => {
      await this.ensureDirectory();
      await this.atomicWriter.writeJson(queuePath, queue);
    });
  }

  /**
   * Delete a queue by ID.
   *
   * Uses exclusive lock to prevent concurrent access during deletion.
   *
   * @param id - Queue ID to delete
   * @returns True if queue was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const queuePath = this.getQueuePath(id);
    return this.lockService.withLock(queuePath, async () => {
      const exists = await this.container.fileSystem.exists(queuePath);
      if (!exists) {
        return false;
      }

      await this.container.fileSystem.rm(queuePath);
      return true;
    });
  }

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
  async addCommand(
    queueId: string,
    command: Omit<QueueCommand, "id" | "status">,
    position?: number,
  ): Promise<boolean> {
    const queuePath = this.getQueuePath(queueId);
    return this.lockService.withLock(queuePath, async () => {
      const queue = await this.readQueue(queueId);
      if (queue === null) {
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

      await this.atomicWriter.writeJson(queuePath, updatedQueue);
      return true;
    });
  }

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
  async updateCommand(
    queueId: string,
    commandIndex: number,
    updates: UpdateCommandOptions,
  ): Promise<boolean> {
    const queuePath = this.getQueuePath(queueId);
    return this.lockService.withLock(queuePath, async () => {
      const queue = await this.readQueue(queueId);
      if (queue === null) {
        return false;
      }

      if (commandIndex < 0 || commandIndex >= queue.commands.length) {
        return false;
      }

      const currentCommand = queue.commands[commandIndex];
      if (currentCommand === undefined) {
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

      await this.atomicWriter.writeJson(queuePath, updatedQueue);
      return true;
    });
  }

  /**
   * Remove a command from a queue.
   *
   * Uses exclusive lock to prevent race conditions in read-modify-write.
   *
   * @param queueId - Queue ID
   * @param commandIndex - Index of command to remove
   * @returns True if command was removed, false if not found
   */
  async removeCommand(queueId: string, commandIndex: number): Promise<boolean> {
    const queuePath = this.getQueuePath(queueId);
    return this.lockService.withLock(queuePath, async () => {
      const queue = await this.readQueue(queueId);
      if (queue === null) {
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

      await this.atomicWriter.writeJson(queuePath, updatedQueue);
      return true;
    });
  }

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
  async reorderCommand(
    queueId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<boolean> {
    const queuePath = this.getQueuePath(queueId);
    return this.lockService.withLock(queuePath, async () => {
      const queue = await this.readQueue(queueId);
      if (queue === null) {
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
      if (movedCommand === undefined) {
        return false;
      }
      commands.splice(toIndex, 0, movedCommand);

      const updatedQueue: CommandQueue = {
        ...queue,
        commands,
        updatedAt: new Date().toISOString(),
      };

      await this.atomicWriter.writeJson(queuePath, updatedQueue);
      return true;
    });
  }

  /**
   * Count queues matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching queues
   */
  async count(filter?: QueueFilter): Promise<number> {
    if (filter === undefined) {
      const queueIds = await this.listQueueIds();
      return queueIds.length;
    }

    const allQueues = await this.readAllQueues();
    const filtered = this.applyFilter([...allQueues], filter);
    return filtered.length;
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
