/**
 * Test fixtures for command queue types.
 *
 * Provides factory functions for creating test queue and command objects
 * with sensible defaults.
 *
 * @module test/fixtures/queue
 */

import type {
  CommandQueue,
  QueueCommand,
  QueueStatus,
  SessionMode,
  CommandStatus,
} from "../../repository/queue-repository";

/**
 * Create a test queue with optional overrides.
 *
 * Provides a valid CommandQueue object with sensible defaults.
 * All fields can be customized via the overrides parameter.
 *
 * @param overrides - Partial queue properties to override defaults
 * @returns Mock command queue object
 *
 * @example
 * ```typescript
 * const queue = createTestQueue({
 *   id: "my-queue",
 *   status: "running",
 *   commands: [createTestQueueCommand()],
 * });
 * ```
 */
export function createTestQueue(
  overrides: Partial<CommandQueue> = {},
): CommandQueue {
  return {
    id: "queue-123",
    projectPath: "/test/project",
    name: "test-queue",
    commands: [],
    status: "pending" as QueueStatus,
    currentIndex: 0,
    totalCostUsd: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Create a test queue command with optional overrides.
 *
 * Provides a valid QueueCommand object with sensible defaults.
 * All fields can be customized via the overrides parameter.
 *
 * @param overrides - Partial command properties to override defaults
 * @returns Mock queue command object
 *
 * @example
 * ```typescript
 * const command = createTestQueueCommand({
 *   prompt: "Run tests",
 *   status: "completed",
 *   sessionId: "sess-123",
 * });
 * ```
 */
export function createTestQueueCommand(
  overrides: Partial<QueueCommand> = {},
): QueueCommand {
  return {
    id: "cmd-1",
    prompt: "Test command",
    sessionMode: "continue" as SessionMode,
    status: "pending" as CommandStatus,
    ...overrides,
  };
}
