/**
 * Queue and Command Update Methods for Queue Runner.
 *
 * Provides methods for updating queue and command states with
 * a generic update pattern to eliminate code duplication.
 *
 * @module sdk/queue/runner-updaters
 */

import type { Container } from "../../container";
import type {
  QueueRepository,
  CommandQueue,
  QueueCommand,
  QueueStatus,
  CommandStatus,
} from "../../repository/queue-repository";

/**
 * Queue and Command Updater for managing repository updates.
 *
 * Encapsulates all queue and command update operations with
 * a generic update pattern to reduce code duplication.
 */
export class QueueUpdater {
  private readonly container: Container;
  private readonly repository: QueueRepository;

  /**
   * Create a new QueueUpdater.
   *
   * @param container - Dependency injection container
   * @param repository - Queue repository for data access
   */
  constructor(container: Container, repository: QueueRepository) {
    this.container = container;
    this.repository = repository;
  }

  /**
   * Generic queue update method.
   *
   * Fetches queue, applies updater function, adds timestamp, and saves.
   *
   * @param queueId - Queue ID to update
   * @param updater - Function that transforms the queue
   */
  private async updateQueue(
    queueId: string,
    updater: (queue: CommandQueue) => CommandQueue,
  ): Promise<void> {
    const queue = await this.repository.findById(queueId);
    if (queue === null) {
      throw new Error(`Queue ${queueId} not found`);
    }

    const updated: CommandQueue = {
      ...updater(queue),
      updatedAt: this.container.clock.now().toISOString(),
    };

    await this.repository.save(updated);
  }

  /**
   * Generic command update method.
   *
   * Fetches queue, updates specific command, and saves queue.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to update
   * @param updater - Function that transforms the command
   */
  private async updateCommand(
    queueId: string,
    commandIndex: number,
    updater: (command: QueueCommand) => QueueCommand,
  ): Promise<void> {
    await this.updateQueue(queueId, (queue) => {
      const command = queue.commands[commandIndex];
      if (command === undefined) {
        throw new Error(`Command at index ${commandIndex} not found`);
      }

      const updatedCommand = updater(command);
      const updatedCommands = [...queue.commands];
      updatedCommands[commandIndex] = updatedCommand;

      return {
        ...queue,
        commands: updatedCommands,
      };
    });
  }

  /**
   * Update queue status in repository.
   *
   * @param queueId - Queue ID to update
   * @param status - New queue status
   */
  async updateQueueStatus(queueId: string, status: QueueStatus): Promise<void> {
    await this.updateQueue(queueId, (queue) => ({
      ...queue,
      status,
      ...(status === "running" && queue.startedAt === undefined
        ? { startedAt: this.container.clock.now().toISOString() }
        : {}),
      ...(status === "completed" || status === "failed" || status === "stopped"
        ? { completedAt: this.container.clock.now().toISOString() }
        : {}),
    }));
  }

  /**
   * Update queue current session ID.
   *
   * @param queueId - Queue ID to update
   * @param sessionId - New session ID
   */
  async updateQueueSessionId(
    queueId: string,
    sessionId: string,
  ): Promise<void> {
    await this.updateQueue(queueId, (queue) => ({
      ...queue,
      currentSessionId: sessionId,
    }));
  }

  /**
   * Update queue current command index.
   *
   * @param queueId - Queue ID to update
   * @param index - New command index
   */
  async updateQueueCurrentIndex(queueId: string, index: number): Promise<void> {
    await this.updateQueue(queueId, (queue) => ({
      ...queue,
      currentIndex: index,
    }));
  }

  /**
   * Update command status.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to update
   * @param status - New command status
   */
  async updateCommandStatus(
    queueId: string,
    commandIndex: number,
    status: CommandStatus,
  ): Promise<void> {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      status,
      ...(status === "running" && command.startedAt === undefined
        ? { startedAt: this.container.clock.now().toISOString() }
        : {}),
    }));
  }

  /**
   * Update command session ID.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to update
   * @param sessionId - New session ID
   */
  async updateCommandSessionId(
    queueId: string,
    commandIndex: number,
    sessionId: string,
  ): Promise<void> {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      sessionId,
    }));
  }

  /**
   * Update command cost.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to update
   * @param costUsd - Cost in USD
   */
  async updateCommandCost(
    queueId: string,
    commandIndex: number,
    costUsd: number,
  ): Promise<void> {
    await this.updateQueue(queueId, (queue) => {
      const command = queue.commands[commandIndex];
      if (command === undefined) {
        throw new Error(`Command at index ${commandIndex} not found`);
      }

      const updatedCommand: QueueCommand = {
        ...command,
        costUsd,
      };

      const updatedCommands = [...queue.commands];
      updatedCommands[commandIndex] = updatedCommand;

      // Also update total cost in queue
      const totalCostUsd = updatedCommands.reduce(
        (sum, cmd) => sum + (cmd.costUsd ?? 0),
        0,
      );

      return {
        ...queue,
        commands: updatedCommands,
        totalCostUsd,
      };
    });
  }

  /**
   * Update command completedAt timestamp.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to update
   */
  async updateCommandCompletedAt(
    queueId: string,
    commandIndex: number,
  ): Promise<void> {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      completedAt: this.container.clock.now().toISOString(),
    }));
  }

  /**
   * Update command error message.
   *
   * @param queueId - Queue ID containing the command
   * @param commandIndex - Index of command to update
   * @param error - Error message
   */
  async updateCommandError(
    queueId: string,
    commandIndex: number,
    error: string,
  ): Promise<void> {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      status: "failed",
      error,
    }));
  }
}
