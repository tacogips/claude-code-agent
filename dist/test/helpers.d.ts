/**
 * Test helper utilities.
 *
 * Provides helper functions for creating test data and fixtures.
 *
 * @module test/helpers
 */
import type { Session, SessionStatus } from "../types/session";
import type { Message, MessageRole } from "../types/message";
import type { Task, TaskStatus } from "../types/task";
/**
 * Options for creating a mock session.
 */
export interface MockSessionOptions {
    /** Session ID (default: "test-session-1") */
    readonly id?: string;
    /** Project path (default: "/test/project") */
    readonly projectPath?: string;
    /** Session status (default: "active") */
    readonly status?: SessionStatus;
    /** ISO timestamp when session was created (default: current time) */
    readonly createdAt?: string;
    /** ISO timestamp when session was last updated (default: current time) */
    readonly updatedAt?: string;
    /** Messages in this session (default: empty array) */
    readonly messages?: readonly Message[];
    /** Active tasks (default: empty array) */
    readonly tasks?: readonly Task[];
}
/**
 * Options for creating a mock message.
 */
export interface MockMessageOptions {
    /** Message ID (default: auto-generated) */
    readonly id?: string;
    /** Message role (default: "user") */
    readonly role?: MessageRole;
    /** Message content (default: "Test message") */
    readonly content?: string;
    /** ISO timestamp (default: current time) */
    readonly timestamp?: string;
}
/**
 * Options for creating a mock task.
 */
export interface MockTaskOptions {
    /** Task content/description (default: "Test task") */
    readonly content?: string;
    /** Task status (default: "pending") */
    readonly status?: TaskStatus;
    /** Active form description (default: status-based) */
    readonly activeForm?: string;
}
/**
 * Create a mock session for testing.
 *
 * Provides a valid Session object with sensible defaults.
 * All fields can be customized via options.
 *
 * @param options - Optional session configuration
 * @returns Mock session object
 *
 * @example
 * ```typescript
 * const session = createMockSession({
 *   id: "my-session",
 *   status: "completed",
 *   messages: [createMockMessage()],
 * });
 * ```
 */
export declare function createMockSession(options?: MockSessionOptions): Session;
/**
 * Create a mock message for testing.
 *
 * Provides a valid Message object with sensible defaults.
 * Each call auto-increments the message ID.
 *
 * @param options - Optional message configuration
 * @returns Mock message object
 *
 * @example
 * ```typescript
 * const userMsg = createMockMessage({
 *   role: "user",
 *   content: "Hello",
 * });
 * const assistantMsg = createMockMessage({
 *   role: "assistant",
 *   content: "Hi there!",
 * });
 * ```
 */
export declare function createMockMessage(options?: MockMessageOptions): Message;
/**
 * Create a mock task for testing.
 *
 * Provides a valid Task object with sensible defaults.
 *
 * @param options - Optional task configuration
 * @returns Mock task object
 *
 * @example
 * ```typescript
 * const task = createMockTask({
 *   content: "Implement feature X",
 *   status: "in_progress",
 * });
 * ```
 */
export declare function createMockTask(options?: MockTaskOptions): Task;
/**
 * Reset helper counters.
 *
 * Resets the auto-increment counter for messages.
 * Useful to call in beforeEach() hooks to ensure predictable IDs.
 *
 * @example
 * ```typescript
 * import { beforeEach } from "vitest";
 * import { resetHelperCounters } from "./helpers";
 *
 * beforeEach(() => {
 *   resetHelperCounters();
 * });
 * ```
 */
export declare function resetHelperCounters(): void;
//# sourceMappingURL=helpers.d.ts.map