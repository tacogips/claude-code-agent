/**
 * Types for Queue Runner.
 *
 * @module sdk/queue/runner-types
 */

import type {
  QueueCommand,
  QueueStatus,
} from "../../repository/queue-repository";

/**
 * Options for running a queue.
 */
export interface RunOptions {
  /**
   * Callback invoked when a command starts.
   */
  readonly onCommandStart?: ((command: QueueCommand) => void) | undefined;

  /**
   * Callback invoked when a command completes successfully.
   */
  readonly onCommandComplete?: ((command: QueueCommand) => void) | undefined;

  /**
   * Callback invoked when a command fails.
   */
  readonly onCommandFail?:
    | ((command: QueueCommand, error: string) => void)
    | undefined;
}

/**
 * Result of queue execution.
 */
export interface QueueResult {
  /** Final queue status */
  readonly status: QueueStatus;
  /** Number of commands completed */
  readonly completedCommands: number;
  /** Number of commands failed */
  readonly failedCommands: number;
  /** Number of commands skipped */
  readonly skippedCommands: number;
  /** Total cost in USD */
  readonly totalCostUsd: number;
  /** Total duration in milliseconds */
  readonly totalDurationMs: number;
}
