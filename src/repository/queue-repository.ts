/**
 * Command Queue Repository interface.
 *
 * Defines the data access contract for command queue storage and retrieval.
 *
 * @module repository/queue-repository
 */

/**
 * Command queue status.
 */
export type QueueStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "stopped";

/**
 * Session mode for a command.
 */
export type SessionMode = "continue" | "new";

/**
 * Command status within a queue.
 */
export type CommandStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * A command in a queue.
 */
export interface QueueCommand {
  /** Unique command identifier within the queue */
  readonly id: string;
  /** Prompt text for this command */
  readonly prompt: string;
  /** Session mode: continue existing or start new */
  readonly sessionMode: SessionMode;
  /** Current status */
  readonly status: CommandStatus;
  /** Claude Code session ID if running/completed */
  readonly sessionId?: string | undefined;
  /** Cost in USD */
  readonly costUsd?: number | undefined;
  /** ISO timestamp when started */
  readonly startedAt?: string | undefined;
  /** ISO timestamp when completed */
  readonly completedAt?: string | undefined;
  /** Error message if failed */
  readonly error?: string | undefined;
}

/**
 * Represents a command queue for sequential prompt execution.
 */
export interface CommandQueue {
  /** Unique queue identifier (slug) */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Project path for this queue */
  readonly projectPath: string;
  /** Current queue status */
  readonly status: QueueStatus;
  /** Commands in execution order */
  readonly commands: readonly QueueCommand[];
  /** Index of currently executing command (or next to execute) */
  readonly currentIndex: number;
  /** Current Claude Code session ID (if active) */
  readonly currentSessionId?: string | undefined;
  /** Total cost so far in USD */
  readonly totalCostUsd: number;
  /** ISO timestamp when created */
  readonly createdAt: string;
  /** ISO timestamp when last updated */
  readonly updatedAt: string;
  /** ISO timestamp when started */
  readonly startedAt?: string | undefined;
  /** ISO timestamp when completed */
  readonly completedAt?: string | undefined;
}

/**
 * Filter criteria for listing queues.
 */
export interface QueueFilter {
  /** Filter by project path */
  readonly projectPath?: string | undefined;
  /** Filter by status */
  readonly status?: QueueStatus | undefined;
  /** Filter by name (partial match) */
  readonly nameContains?: string | undefined;
  /** Filter queues created after this date */
  readonly since?: Date | undefined;
  /** Maximum number of results to return */
  readonly limit?: number | undefined;
  /** Number of results to skip (for pagination) */
  readonly offset?: number | undefined;
}

/**
 * Sort options for queue listing.
 */
export interface QueueSort {
  /** Field to sort by */
  readonly field: "name" | "createdAt" | "updatedAt" | "totalCostUsd";
  /** Sort direction */
  readonly direction: "asc" | "desc";
}

/**
 * Options for updating a command.
 */
export interface UpdateCommandOptions {
  /** New prompt text */
  readonly prompt?: string | undefined;
  /** New session mode */
  readonly sessionMode?: SessionMode | undefined;
}

/**
 * Repository interface for command queue data access.
 *
 * Provides CRUD operations for queue storage with
 * command management capabilities.
 */
export interface QueueRepository {
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
  list(
    filter?: QueueFilter,
    sort?: QueueSort,
  ): Promise<readonly CommandQueue[]>;

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

  /**
   * Add a command to a queue.
   *
   * @param queueId - Queue ID
   * @param command - Command to add
   * @param position - Insert position (default: end)
   * @returns True if command was added, false if queue not found
   */
  addCommand(
    queueId: string,
    command: Omit<QueueCommand, "id" | "status">,
    position?: number,
  ): Promise<boolean>;

  /**
   * Update a command in a queue.
   *
   * @param queueId - Queue ID
   * @param commandIndex - Index of command to update
   * @param updates - Command updates
   * @returns True if command was updated, false if not found
   */
  updateCommand(
    queueId: string,
    commandIndex: number,
    updates: UpdateCommandOptions,
  ): Promise<boolean>;

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
  reorderCommand(
    queueId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<boolean>;

  /**
   * Count queues matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching queues
   */
  count(filter?: QueueFilter): Promise<number>;
}
