/**
 * Session state types for SDK tool execution.
 *
 * Defines session execution states, pending operation tracking,
 * and session statistics for the claude-code-agent SDK.
 *
 * @module sdk/types/state
 */

/**
 * Session execution state.
 *
 * Represents the current lifecycle state of a Claude Code session
 * managed by the SDK.
 *
 * States:
 * - `idle`: Session not yet started
 * - `starting`: Subprocess is being spawned
 * - `running`: Normal execution in progress
 * - `waiting_tool_call`: Waiting for SDK tool handler to return result
 * - `waiting_permission`: Waiting for permission callback decision
 * - `paused`: User-initiated pause
 * - `completed`: Session finished successfully
 * - `failed`: Session finished with error
 * - `cancelled`: User-initiated cancellation
 */
export type SessionState =
  | "idle"
  | "starting"
  | "running"
  | "waiting_tool_call"
  | "waiting_permission"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Information about a pending tool call.
 *
 * Contains details about a tool invocation that is currently
 * being executed by an SDK tool handler.
 *
 * @example Example data
 * ```json
 * {
 *   "toolUseId": "toolu_01ABC123DEF456",
 *   "toolName": "calculator_add",
 *   "serverName": "calculator",
 *   "arguments": { "a": 15, "b": 27 },
 *   "startedAt": "2026-01-10T10:05:00.000Z"
 * }
 * ```
 */
export interface PendingToolCall {
  /** Unique identifier for this tool use instance */
  readonly toolUseId: string;
  /** Name of the tool being called */
  readonly toolName: string;
  /** Name of the MCP server providing the tool */
  readonly serverName: string;
  /** Arguments passed to the tool handler */
  readonly arguments: Record<string, unknown>;
  /** ISO timestamp when the tool call started */
  readonly startedAt: string;
}

/**
 * Information about a pending permission request.
 *
 * Contains details about a permission decision that is awaiting
 * user confirmation via the canUseTool callback.
 *
 * @example Example data
 * ```json
 * {
 *   "requestId": "perm_01XYZ789ABC123",
 *   "toolName": "Bash",
 *   "toolInput": { "command": "rm -rf /tmp/cache" }
 * }
 * ```
 */
export interface PendingPermission {
  /** Unique identifier for this permission request */
  readonly requestId: string;
  /** Name of the tool requiring permission */
  readonly toolName: string;
  /** Input arguments for the tool */
  readonly toolInput: Record<string, unknown>;
}

/**
 * Session statistics.
 *
 * Tracks execution metrics for the session including timing
 * and operation counts.
 *
 * @example Example data
 * ```json
 * {
 *   "startedAt": "2026-01-10T10:00:00.000Z",
 *   "completedAt": "2026-01-10T10:15:30.000Z",
 *   "toolCallCount": 12,
 *   "messageCount": 8
 * }
 * ```
 */
export interface SessionStats {
  /** ISO timestamp when session started */
  readonly startedAt?: string | undefined;
  /** ISO timestamp when session completed */
  readonly completedAt?: string | undefined;
  /** Total number of tool calls made */
  readonly toolCallCount: number;
  /** Total number of messages exchanged */
  readonly messageCount: number;
}

/**
 * Detailed session state with metadata.
 *
 * Provides a complete view of the session's current state
 * including pending operations and execution statistics.
 *
 * @example Running session
 * ```json
 * {
 *   "state": "running",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "stats": {
 *     "startedAt": "2026-01-10T10:00:00.000Z",
 *     "toolCallCount": 3,
 *     "messageCount": 5
 *   }
 * }
 * ```
 *
 * @example Session waiting for tool call
 * ```json
 * {
 *   "state": "waiting_tool_call",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "pendingToolCall": {
 *     "toolUseId": "toolu_01ABC123DEF456",
 *     "toolName": "calculator_add",
 *     "serverName": "calculator",
 *     "arguments": { "a": 15, "b": 27 },
 *     "startedAt": "2026-01-10T10:05:00.000Z"
 *   },
 *   "stats": {
 *     "startedAt": "2026-01-10T10:00:00.000Z",
 *     "toolCallCount": 4,
 *     "messageCount": 6
 *   }
 * }
 * ```
 *
 * @example Completed session
 * ```json
 * {
 *   "state": "completed",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "stats": {
 *     "startedAt": "2026-01-10T10:00:00.000Z",
 *     "completedAt": "2026-01-10T10:15:30.000Z",
 *     "toolCallCount": 12,
 *     "messageCount": 8
 *   }
 * }
 * ```
 */
export interface SessionStateInfo {
  /** Current execution state */
  readonly state: SessionState;
  /** Session identifier */
  readonly sessionId: string;
  /**
   * Information about pending tool call.
   * Present when state is 'waiting_tool_call'.
   */
  readonly pendingToolCall?: PendingToolCall | undefined;
  /**
   * Information about pending permission request.
   * Present when state is 'waiting_permission'.
   */
  readonly pendingPermission?: PendingPermission | undefined;
  /** Session execution statistics */
  readonly stats: SessionStats;
}

/**
 * Check if a session state is terminal.
 *
 * Terminal states are final states where the session has ended
 * and cannot transition to any other state.
 *
 * @param state - Session state to check
 * @returns true if the state is 'completed', 'failed', or 'cancelled'
 *
 * @example
 * ```typescript
 * isTerminalState('completed') // true
 * isTerminalState('running') // false
 * isTerminalState('failed') // true
 * ```
 */
export function isTerminalState(state: SessionState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

/**
 * Type guard to check if a value is a valid SessionState.
 *
 * @param value - Value to check
 * @returns true if value is a valid SessionState
 *
 * @example
 * ```typescript
 * const value: unknown = 'running';
 * if (isValidSessionState(value)) {
 *   // TypeScript knows value is SessionState
 *   console.log(value); // Type: SessionState
 * }
 * ```
 */
export function isValidSessionState(value: unknown): value is SessionState {
  if (typeof value !== "string") {
    return false;
  }

  const validStates: readonly SessionState[] = [
    "idle",
    "starting",
    "running",
    "waiting_tool_call",
    "waiting_permission",
    "paused",
    "completed",
    "failed",
    "cancelled",
  ];

  return validStates.includes(value as SessionState);
}
