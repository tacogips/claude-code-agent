/**
 * Type definitions for Command Queue feature.
 *
 * Provides types for queue management, command sequencing,
 * and session mode control.
 *
 * @module sdk/queue/types
 */

/**
 * Queue status representing the current state of a command queue.
 *
 * - `idle`: Queue created but not yet started
 * - `running`: Actively executing commands
 * - `paused`: Paused by user (SIGTERM sent)
 * - `stopped`: Stopped before completion
 * - `completed`: All commands executed successfully
 * - `failed`: A command failed (when stopOnError=true)
 */
export type QueueStatus =
  | "idle"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "failed";

/**
 * Command status representing the current state of a single command.
 *
 * - `pending`: Command not yet executed
 * - `running`: Command currently executing
 * - `completed`: Command executed successfully
 * - `failed`: Command execution failed
 * - `skipped`: Command skipped (e.g., queue stopped)
 */
export type CommandStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Session mode determining how commands relate to Claude Code sessions.
 *
 * - `continue`: Continue in current session using `--resume` flag
 * - `new`: Start a fresh session (no `--resume`)
 */
export type SessionMode = "continue" | "new";

/**
 * Configuration options for queue execution behavior.
 */
export interface QueueConfig {
  /**
   * Whether to stop queue execution when a command fails.
   * Default: true
   */
  readonly stopOnError: boolean;

  /**
   * Optional model override for Claude Code execution.
   * If not specified, uses Claude Code default model.
   */
  readonly model?: string | undefined;
}

/**
 * Statistics tracking queue execution metrics.
 */
export interface QueueStats {
  /** Total number of commands in queue */
  readonly totalCommands: number;

  /** Number of successfully completed commands */
  readonly completedCommands: number;

  /** Number of failed commands */
  readonly failedCommands: number;

  /** Total cost in USD across all commands */
  readonly totalCost: number;

  /** Total tokens consumed */
  readonly totalTokens: {
    readonly input: number;
    readonly output: number;
  };

  /** Total execution duration in milliseconds */
  readonly totalDuration: number;
}

/**
 * A single command within a queue.
 */
export interface QueueCommand {
  /** Unique identifier for this command */
  readonly id: string;

  /** Zero-based index within the queue */
  readonly index: number;

  /** The prompt text to execute */
  readonly prompt: string;

  /**
   * Session mode for this command.
   * - `continue`: Continue in current session (default)
   * - `new`: Start a new session
   */
  readonly sessionMode: SessionMode;

  /** Current execution status */
  readonly status: CommandStatus;

  /**
   * Claude session ID used for this command execution.
   * Set after command starts.
   */
  readonly claudeSessionId?: string | undefined;

  /** ISO timestamp when command was added to queue */
  readonly addedAt: string;

  /** ISO timestamp when command execution started */
  readonly startedAt?: string | undefined;

  /** ISO timestamp when command execution completed */
  readonly completedAt?: string | undefined;

  /** Cost in USD for this command execution */
  readonly cost?: number | undefined;

  /** Token usage for this command */
  readonly tokens?:
    | {
        readonly input: number;
        readonly output: number;
      }
    | undefined;

  /** Error message if command failed */
  readonly error?: string | undefined;
}

/**
 * A command queue managing sequential prompt execution.
 *
 * Queues enable:
 * - Sequential execution of multiple prompts
 * - Flexible session modes (continue or new session)
 * - Pause/resume/stop controls
 * - Cost and token tracking
 */
export interface CommandQueue {
  /**
   * Unique identifier for this queue.
   * Format: YYYYMMDD-HHMMSS-{slug}
   */
  readonly id: string;

  /** Human-readable queue name */
  readonly name: string;

  /** Optional description */
  readonly description?: string | undefined;

  /** Absolute path to the project directory */
  readonly projectPath: string;

  /** Current queue status */
  readonly status: QueueStatus;

  /**
   * Active Claude session ID.
   * Set after first command execution, updated when sessionMode='new'.
   */
  readonly claudeSessionId?: string | undefined;

  /**
   * Index of the currently executing or next-to-execute command.
   * Zero-based.
   */
  readonly currentCommandIndex: number;

  /** List of commands in execution order */
  readonly commands: readonly QueueCommand[];

  /** Queue execution configuration */
  readonly config: QueueConfig;

  /** Execution statistics */
  readonly stats: QueueStats;

  /** ISO timestamp when queue was created */
  readonly createdAt: string;

  /** ISO timestamp when queue was last modified */
  readonly updatedAt: string;
}
