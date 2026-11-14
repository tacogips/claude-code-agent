/**
 * Queue Runner for executing Command Queue commands sequentially.
 *
 * Provides methods for running queues, managing execution state (pause/resume/stop),
 * and tracking session continuity across commands.
 *
 * @module sdk/queue/runner
 */

import type { Container } from "../../container";
import type { EventEmitter } from "../events/emitter";
import type { QueueManager } from "./manager";
import type {
  QueueRepository,
  CommandQueue,
} from "../../repository/queue-repository";
import type { ManagedProcess } from "../../interfaces/process-manager";
import { createTaggedLogger } from "../../logger";
import { QueueUpdater } from "./runner-updaters";
import { captureClaudeSessionId } from "./session-capture";
import type { RunOptions, QueueResult } from "./runner-types";

const logger = createTaggedLogger("queue-runner");

// Re-export types for backward compatibility
export type { RunOptions, QueueResult } from "./runner-types";

/**
 * Queue Runner for executing Command Queue commands sequentially.
 *
 * Manages the execution lifecycle of command queues including:
 * - Sequential command execution
 * - Session mode logic (continue vs new session)
 * - Pause/resume/stop controls
 * - Stats tracking and event emission
 *
 * @example
 * ```typescript
 * const runner = new QueueRunner(container, manager, eventEmitter);
 *
 * // Run a queue
 * const result = await runner.run(queueId, {
 *   onCommandStart: (cmd) => console.log(`Starting: ${cmd.prompt}`),
 *   onCommandComplete: (cmd) => console.log(`Completed: ${cmd.prompt}`),
 * });
 *
 * // Pause execution
 * await runner.pause(queueId);
 *
 * // Resume execution
 * await runner.resume(queueId);
 * ```
 */
export class QueueRunner {
  private readonly container: Container;
  private readonly manager: QueueManager;
  private readonly eventEmitter: EventEmitter;
  private readonly updater: QueueUpdater;

  /** Map of queue IDs to currently running processes */
  private readonly runningProcesses: Map<string, ManagedProcess> = new Map();

  /** Map of queue IDs to pause requests */
  private readonly pauseRequested: Map<string, boolean> = new Map();

  /** Map of queue IDs to stop requests */
  private readonly stopRequested: Map<string, boolean> = new Map();

  /**
   * Create a new QueueRunner.
   *
   * @param container - Dependency injection container
   * @param repository - Queue repository for data access
   * @param manager - Queue manager for data access
   * @param eventEmitter - Event emitter for queue events
   */
  constructor(
    container: Container,
    repository: QueueRepository,
    manager: QueueManager,
    eventEmitter: EventEmitter,
  ) {
    this.container = container;
    this.manager = manager;
    this.eventEmitter = eventEmitter;
    this.updater = new QueueUpdater(container, repository);
  }

  /**
   * Run a queue, executing all pending commands sequentially.
   *
   * Executes commands in order, respecting session modes and handling
   * errors according to the queue's stopOnError configuration.
   *
   * @param queueId - Queue ID to run
   * @param options - Optional run options with callbacks
   * @returns Result of queue execution
   * @throws Error if queue not found or in invalid state
   *
   * @example
   * ```typescript
   * const result = await runner.run(queueId);
   * console.log(`Completed: ${result.completedCommands}`);
   * ```
   */
  async run(queueId: string, options?: RunOptions): Promise<QueueResult> {
    let queue = await this.manager.getQueue(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "pending" && queue.status !== "paused") {
      throw new Error(`Cannot run queue in ${queue.status} status`);
    }

    // Clear any previous pause/stop requests
    this.pauseRequested.delete(queueId);
    this.stopRequested.delete(queueId);

    // Update queue status to running
    await this.updater.updateQueueStatus(queueId, "running");

    const startTime = this.container.clock.now().getTime();

    // Emit queue_started event
    this.eventEmitter.emit("queue_started", {
      type: "queue_started",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      totalCommands: queue.commands.length,
    });

    logger.info(`Starting queue ${queueId}`, {
      totalCommands: queue.commands.length,
      currentIndex: queue.currentIndex,
    });

    let completedCommands = 0;
    let failedCommands = 0;
    let skippedCommands = 0;
    let totalCostUsd = 0;

    // Execute commands from currentIndex
    for (let i = queue.currentIndex; i < queue.commands.length; i++) {
      // Check for pause request
      if (this.pauseRequested.get(queueId) === true) {
        logger.info(`Pause requested for queue ${queueId}`);
        await this.updater.updateQueueStatus(queueId, "paused");
        this.pauseRequested.delete(queueId);

        const endTime = this.container.clock.now().getTime();
        const durationMs = endTime - startTime;

        this.eventEmitter.emit("queue_paused", {
          type: "queue_paused",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          currentCommandIndex: i,
        });

        return {
          status: "paused",
          completedCommands,
          failedCommands,
          skippedCommands,
          totalCostUsd,
          totalDurationMs: durationMs,
        };
      }

      // Check for stop request
      if (this.stopRequested.get(queueId) === true) {
        logger.info(`Stop requested for queue ${queueId}`);

        // Mark remaining commands as skipped
        const updatedQueue = await this.manager.getQueue(queueId);
        if (updatedQueue !== null) {
          for (let j = i; j < updatedQueue.commands.length; j++) {
            const cmd = updatedQueue.commands[j];
            if (cmd !== undefined && cmd.status === "pending") {
              await this.updater.updateCommandStatus(queueId, j, "skipped");
              skippedCommands++;
            }
          }
        }

        await this.updater.updateQueueStatus(queueId, "stopped");
        this.stopRequested.delete(queueId);

        const endTime = this.container.clock.now().getTime();
        const durationMs = endTime - startTime;

        this.eventEmitter.emit("queue_stopped", {
          type: "queue_stopped",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          completedCommands,
          totalCommands: queue.commands.length,
        });

        return {
          status: "stopped",
          completedCommands,
          failedCommands,
          skippedCommands,
          totalCostUsd,
          totalDurationMs: durationMs,
        };
      }

      const command = queue.commands[i];
      if (command === undefined) {
        logger.warn(`Command at index ${i} not found in queue ${queueId}`);
        continue;
      }

      // Skip already completed/failed/skipped commands
      if (command.status !== "pending") {
        if (command.status === "completed") {
          completedCommands++;
          totalCostUsd += command.costUsd ?? 0;
        } else if (command.status === "failed") {
          failedCommands++;
        } else if (command.status === "skipped") {
          skippedCommands++;
        }
        continue;
      }

      // Execute the command
      try {
        options?.onCommandStart?.(command);

        await this.executeCommand(queueId, i, queue);

        // Refresh queue to get updated command
        const updatedQueue = await this.manager.getQueue(queueId);
        if (updatedQueue === null) {
          throw new Error(`Queue ${queueId} not found after command execution`);
        }

        const updatedCommand = updatedQueue.commands[i];
        if (updatedCommand === undefined) {
          throw new Error(`Command at index ${i} not found after execution`);
        }

        if (updatedCommand.status === "completed") {
          completedCommands++;
          totalCostUsd += updatedCommand.costUsd ?? 0;
          options?.onCommandComplete?.(updatedCommand);
        } else if (updatedCommand.status === "failed") {
          failedCommands++;
          const error = updatedCommand.error ?? "Unknown error";
          options?.onCommandFail?.(updatedCommand, error);

          // Check stopOnError config
          const freshQueue = await this.manager.getQueue(queueId);
          if (freshQueue === null) {
            throw new Error(`Queue ${queueId} not found`);
          }

          // Note: Queue config is not yet implemented in manager
          // For now, default to stopOnError=true
          const stopOnError = true; // TODO: Use queue.config.stopOnError

          if (stopOnError) {
            logger.info(`Stopping queue ${queueId} due to command failure`);
            await this.updater.updateQueueStatus(queueId, "failed");

            // Mark remaining commands as skipped
            for (let j = i + 1; j < freshQueue.commands.length; j++) {
              await this.updater.updateCommandStatus(queueId, j, "skipped");
              skippedCommands++;
            }

            const endTime = this.container.clock.now().getTime();
            const durationMs = endTime - startTime;

            this.eventEmitter.emit("queue_failed", {
              type: "queue_failed",
              timestamp: this.container.clock.now().toISOString(),
              queueId,
              failedCommandIndex: i,
              error,
            });

            return {
              status: "failed",
              completedCommands,
              failedCommands,
              skippedCommands,
              totalCostUsd,
              totalDurationMs: durationMs,
            };
          }
        }

        // Update currentIndex to next command
        await this.updater.updateQueueCurrentIndex(queueId, i + 1);

        // Update queue reference for next iteration
        const nextQueue = await this.manager.getQueue(queueId);
        if (nextQueue !== null) {
          queue = nextQueue;
        }
      } catch (error: unknown) {
        logger.error(`Error executing command in queue ${queueId}:`, error);
        failedCommands++;

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.updater.updateCommandError(queueId, i, errorMessage);

        options?.onCommandFail?.(command, errorMessage);

        // Stop on error
        await this.updater.updateQueueStatus(queueId, "failed");

        // Mark remaining commands as skipped
        for (let j = i + 1; j < queue.commands.length; j++) {
          await this.updater.updateCommandStatus(queueId, j, "skipped");
          skippedCommands++;
        }

        const endTime = this.container.clock.now().getTime();
        const durationMs = endTime - startTime;

        this.eventEmitter.emit("queue_failed", {
          type: "queue_failed",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          failedCommandIndex: i,
          error: errorMessage,
        });

        return {
          status: "failed",
          completedCommands,
          failedCommands,
          skippedCommands,
          totalCostUsd,
          totalDurationMs: durationMs,
        };
      }
    }

    // All commands completed
    await this.updater.updateQueueStatus(queueId, "completed");

    const endTime = this.container.clock.now().getTime();
    const durationMs = endTime - startTime;

    this.eventEmitter.emit("queue_completed", {
      type: "queue_completed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      completedCommands,
      failedCommands,
      totalCostUsd,
      totalDurationMs: durationMs,
    });

    logger.info(`Queue ${queueId} completed`, {
      completedCommands,
      failedCommands,
      totalCostUsd,
      durationMs,
    });

    return {
      status: "completed",
      completedCommands,
      failedCommands,
      skippedCommands,
      totalCostUsd,
      totalDurationMs: durationMs,
    };
  }

  /**
   * Pause a running queue.
   *
   * Sends SIGTERM to the current Claude Code process and marks
   * the queue as paused. The queue can be resumed later.
   *
   * @param queueId - Queue ID to pause
   * @throws Error if queue not found or not running
   *
   * @example
   * ```typescript
   * await runner.pause(queueId);
   * ```
   */
  async pause(queueId: string): Promise<void> {
    const queue = await this.manager.getQueue(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "running") {
      throw new Error(`Cannot pause queue in ${queue.status} status`);
    }

    // Set pause flag
    this.pauseRequested.set(queueId, true);

    // Kill current process if running
    const process = this.runningProcesses.get(queueId);
    if (process !== undefined) {
      logger.info(
        `Sending SIGTERM to process ${process.pid} for queue ${queueId}`,
      );
      process.kill("SIGTERM");
      this.runningProcesses.delete(queueId);
    }

    logger.info(`Pause requested for queue ${queueId}`);
  }

  /**
   * Resume a paused queue.
   *
   * Continues execution from the current command, using --resume flag
   * to continue the Claude Code session.
   *
   * @param queueId - Queue ID to resume
   * @returns Result of queue execution
   * @throws Error if queue not found or not paused
   *
   * @example
   * ```typescript
   * const result = await runner.resume(queueId);
   * ```
   */
  async resume(queueId: string): Promise<QueueResult> {
    const queue = await this.manager.getQueue(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "paused") {
      throw new Error(`Cannot resume queue in ${queue.status} status`);
    }

    logger.info(`Resuming queue ${queueId} from command ${queue.currentIndex}`);

    this.eventEmitter.emit("queue_resumed", {
      type: "queue_resumed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      fromCommandIndex: queue.currentIndex,
    });

    // Resume execution
    return this.run(queueId);
  }

  /**
   * Stop a running queue.
   *
   * Terminates execution and marks remaining commands as skipped.
   * The queue cannot be resumed after stopping.
   *
   * @param queueId - Queue ID to stop
   * @throws Error if queue not found or not running/paused
   *
   * @example
   * ```typescript
   * await runner.stop(queueId);
   * ```
   */
  async stop(queueId: string): Promise<void> {
    const queue = await this.manager.getQueue(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.status !== "running" && queue.status !== "paused") {
      throw new Error(`Cannot stop queue in ${queue.status} status`);
    }

    // Set stop flag
    this.stopRequested.set(queueId, true);

    // Kill current process if running
    const process = this.runningProcesses.get(queueId);
    if (process !== undefined) {
      logger.info(
        `Sending SIGTERM to process ${process.pid} for queue ${queueId}`,
      );
      process.kill("SIGTERM");
      this.runningProcesses.delete(queueId);
    }

    logger.info(`Stop requested for queue ${queueId}`);
  }

  /**
   * Execute a single command within a queue.
   *
   * Spawns Claude Code process with appropriate flags based on session mode.
   * Captures session ID from output and updates command state.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to execute
   * @param queue - Current queue state
   */
  private async executeCommand(
    queueId: string,
    commandIndex: number,
    queue: CommandQueue,
  ): Promise<void> {
    const command = queue.commands[commandIndex];
    if (command === undefined) {
      throw new Error(`Command at index ${commandIndex} not found`);
    }

    const shouldStartNewSession = this.shouldStartNewSession(
      queue,
      commandIndex,
    );

    // Update command status to running
    await this.updater.updateCommandStatus(queueId, commandIndex, "running");

    const commandStartTime = this.container.clock.now().getTime();

    // Emit command_started event
    this.eventEmitter.emit("command_started", {
      type: "command_started",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex,
      prompt: command.prompt,
      sessionMode: command.sessionMode,
      isNewSession: shouldStartNewSession,
    });

    logger.info(`Executing command ${commandIndex} in queue ${queueId}`, {
      commandId: command.id,
      sessionMode: command.sessionMode,
      isNewSession: shouldStartNewSession,
    });

    // Build Claude Code arguments
    // TODO: [Future Enhancement] Process Pool per Working Directory
    // Currently, each prompt spawns a new Claude Code process that exits after completion.
    // A process pool mechanism could improve performance by:
    // 1. Pre-creating default_n processes per working directory on first request
    // 2. After prompt completion, execute /clear to reset context and return process to pool
    // 3. Reuse pooled processes for subsequent prompts (extend_n more if pool exhausted)
    // 4. Support removing all processes for a specific working directory
    //
    // Challenges identified:
    // - Claude Code's -p mode is single-prompt: process exits after completion
    // - No built-in support for receiving multiple prompts via stdin in one process
    // - Session ID is returned by Claude Code, not externally specifiable
    // - Would require Claude Code CLI changes to support long-lived interactive mode
    //
    // Current --resume approach provides session context continuity (not process reuse).
    // See: design-docs/reference-claude-code-internals.md for CLI options.
    const args: string[] = ["-p", "--output-format", "stream-json"];

    // Append additional CLI arguments from queue configuration
    if (
      queue.additionalArgs !== undefined &&
      queue.additionalArgs.length > 0
    ) {
      args.push(...queue.additionalArgs);
    }

    // Add --resume flag if continuing session
    if (!shouldStartNewSession) {
      args.push("--resume");
    }

    args.push(command.prompt);

    // Spawn Claude Code process
    const process = this.container.processManager.spawn("claude", args, {
      cwd: queue.projectPath,
    });

    this.runningProcesses.set(queueId, process);

    try {
      // Capture session ID from stdout
      const sessionId = await captureClaudeSessionId(
        process.stdout,
        this.container.clock,
      );

      // Update queue's current session ID if new session
      if (shouldStartNewSession) {
        await this.updater.updateQueueSessionId(queueId, sessionId);
      }

      // Update command's session ID
      await this.updater.updateCommandSessionId(
        queueId,
        commandIndex,
        sessionId,
      );

      // Wait for process to complete
      const exitCode = await process.exitCode;

      this.runningProcesses.delete(queueId);

      const commandEndTime = this.container.clock.now().getTime();
      const durationMs = commandEndTime - commandStartTime;

      if (exitCode === 0) {
        // Command succeeded
        await this.updater.updateCommandStatus(
          queueId,
          commandIndex,
          "completed",
        );
        await this.updater.updateCommandCompletedAt(queueId, commandIndex);

        // TODO: Extract cost from Claude Code output
        const costUsd = 0;
        await this.updater.updateCommandCost(queueId, commandIndex, costUsd);

        this.eventEmitter.emit("command_completed", {
          type: "command_completed",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          commandId: command.id,
          commandIndex,
          costUsd,
          claudeSessionId: sessionId,
          durationMs,
        });

        logger.info(`Command ${commandIndex} completed in queue ${queueId}`, {
          commandId: command.id,
          durationMs,
        });
      } else {
        // Command failed
        const errorMessage = `Claude Code exited with code ${exitCode ?? "unknown"}`;
        await this.updater.updateCommandStatus(queueId, commandIndex, "failed");
        await this.updater.updateCommandError(
          queueId,
          commandIndex,
          errorMessage,
        );

        this.eventEmitter.emit("command_failed", {
          type: "command_failed",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          commandId: command.id,
          commandIndex,
          error: errorMessage,
          durationMs,
        });

        logger.error(`Command ${commandIndex} failed in queue ${queueId}`, {
          commandId: command.id,
          exitCode,
          durationMs,
        });
      }
    } catch (error: unknown) {
      this.runningProcesses.delete(queueId);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.updater.updateCommandStatus(queueId, commandIndex, "failed");
      await this.updater.updateCommandError(
        queueId,
        commandIndex,
        errorMessage,
      );

      const commandEndTime = this.container.clock.now().getTime();
      const durationMs = commandEndTime - commandStartTime;

      this.eventEmitter.emit("command_failed", {
        type: "command_failed",
        timestamp: this.container.clock.now().toISOString(),
        queueId,
        commandId: command.id,
        commandIndex,
        error: errorMessage,
        durationMs,
      });

      throw error;
    }
  }

  /**
   * Determine whether to start a new session for a command.
   *
   * A new session is started if:
   * - This is the first command (index 0)
   * - The command's sessionMode is 'new'
   *
   * @param queue - Current queue state
   * @param commandIndex - Index of command to check
   * @returns True if a new session should be started
   */
  private shouldStartNewSession(
    queue: CommandQueue,
    commandIndex: number,
  ): boolean {
    if (commandIndex === 0) {
      return true;
    }

    const command = queue.commands[commandIndex];
    if (command === undefined) {
      return false;
    }

    return command.sessionMode === "new";
  }
}
