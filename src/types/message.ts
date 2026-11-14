/**
 * Message types for Claude Code sessions.
 *
 * These types represent the structure of messages exchanged
 * during Claude Code sessions, including user messages,
 * assistant responses, and tool interactions.
 *
 * @module types/message
 */

/**
 * The role/sender of a message in a session.
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Represents a tool invocation by the assistant.
 *
 * Tool calls are embedded in assistant messages and represent
 * requests to execute tools like Read, Edit, Bash, etc.
 *
 * @example Example data
 * ```json
 * {
 *   "id": "toolu_01X722Re5SMKwP5AnPgc382p",
 *   "name": "Grep",
 *   "input": {
 *     "pattern": "authenticate",
 *     "output_mode": "content",
 *     "path": "/home/user/project/src"
 *   }
 * }
 * ```
 *
 * @example Edit tool call
 * ```json
 * {
 *   "id": "toolu_01YA3fyEeDsptKYcG9g5zJne",
 *   "name": "Edit",
 *   "input": {
 *     "file_path": "/home/user/project/src/auth.ts",
 *     "old_string": "const token = null;",
 *     "new_string": "const token = generateToken();"
 *   }
 * }
 * ```
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  readonly id: string;
  /** Name of the tool being invoked */
  readonly name: string;
  /** Input parameters for the tool */
  readonly input: Readonly<Record<string, unknown>>;
}

/**
 * Represents the result of a tool execution.
 *
 * Tool results appear after a tool call and contain
 * the output from the tool execution.
 *
 * @example Successful result
 * ```json
 * {
 *   "id": "toolu_01X722Re5SMKwP5AnPgc382p",
 *   "output": "src/auth.ts:42:  const token = authenticate(user);\nsrc/auth.ts:58:  return authenticate(credentials);",
 *   "isError": false
 * }
 * ```
 *
 * @example Error result
 * ```json
 * {
 *   "id": "toolu_01YA3fyEeDsptKYcG9g5zJne",
 *   "output": "<tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>",
 *   "isError": true
 * }
 * ```
 */
export interface ToolResult {
  /** ID matching the corresponding ToolCall */
  readonly id: string;
  /** Output from the tool (may be truncated) */
  readonly output: string;
  /** Whether the tool execution resulted in an error */
  readonly isError: boolean;
}

/**
 * Represents a single message in a session.
 *
 * Messages form the conversation between user and Claude,
 * including tool interactions.
 *
 * @example User message
 * ```json
 * {
 *   "id": "51542349-4761-4e71-aadf-b797f9699b58",
 *   "role": "user",
 *   "content": "Help me fix the authentication bug in src/auth.ts",
 *   "timestamp": "2026-01-07T04:49:16.208Z"
 * }
 * ```
 *
 * @example Assistant message with tool call
 * ```json
 * {
 *   "id": "9cafc746-762e-4cf7-ba06-d4bc2771b65d",
 *   "role": "assistant",
 *   "content": "I'll search for the authentication code to understand the issue.",
 *   "timestamp": "2026-01-07T04:49:24.954Z",
 *   "toolCalls": [
 *     {
 *       "id": "toolu_01X722Re5SMKwP5AnPgc382p",
 *       "name": "Grep",
 *       "input": { "pattern": "authenticate", "output_mode": "content" }
 *     }
 *   ]
 * }
 * ```
 *
 * @example Message with tool results
 * ```json
 * {
 *   "id": "b469248b-bf1b-481e-8ffa-c01cc5aa67cf",
 *   "role": "user",
 *   "content": "",
 *   "timestamp": "2026-01-07T04:49:25.024Z",
 *   "toolResults": [
 *     {
 *       "id": "toolu_01X722Re5SMKwP5AnPgc382p",
 *       "output": "src/auth.ts:42:  const token = authenticate(user);",
 *       "isError": false
 *     }
 *   ]
 * }
 * ```
 */
export interface Message {
  /** Unique message identifier (UUID) */
  readonly id: string;
  /** Who sent this message */
  readonly role: MessageRole;
  /** Text content of the message */
  readonly content: string;
  /** ISO timestamp when message was created */
  readonly timestamp: string;
  /** Tool invocations in this message (assistant only) */
  readonly toolCalls?: readonly ToolCall[] | undefined;
  /** Results from tool executions (system only) */
  readonly toolResults?: readonly ToolResult[] | undefined;
}

/**
 * Type guard to check if a message has tool calls.
 *
 * @param message - Message to check
 * @returns True if message contains tool calls
 */
export function hasToolCalls(
  message: Message,
): message is Message & { readonly toolCalls: readonly ToolCall[] } {
  return (
    message.toolCalls !== undefined &&
    Array.isArray(message.toolCalls) &&
    message.toolCalls.length > 0
  );
}

/**
 * Type guard to check if a message has tool results.
 *
 * @param message - Message to check
 * @returns True if message contains tool results
 */
export function hasToolResults(
  message: Message,
): message is Message & { readonly toolResults: readonly ToolResult[] } {
  return (
    message.toolResults !== undefined &&
    Array.isArray(message.toolResults) &&
    message.toolResults.length > 0
  );
}
