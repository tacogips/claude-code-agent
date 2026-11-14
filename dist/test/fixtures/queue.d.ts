/**
 * Test fixtures for command queue types.
 *
 * Provides factory functions for creating test queue and command objects
 * with sensible defaults.
 *
 * @module test/fixtures/queue
 */
import type { CommandQueue, QueueCommand } from "../../repository/queue-repository";
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
export declare function createTestQueue(overrides?: Partial<CommandQueue>): CommandQueue;
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
export declare function createTestQueueCommand(overrides?: Partial<QueueCommand>): QueueCommand;
//# sourceMappingURL=queue.d.ts.map