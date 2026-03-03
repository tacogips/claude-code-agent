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
  /** Results from tool executions (typically user tool_result messages) */
  readonly toolResults?: readonly ToolResult[] | undefined;
  /** True when transcript content included at least one tool_use block */
  readonly hasToolUseBlocks?: boolean | undefined;
  /** True when transcript content included at least one tool_result block */
  readonly hasToolResultBlocks?: boolean | undefined;
}

/**
 * Message classification for tool-related transcript entries.
 */
export type MessageKind = "assistant_tool_use" | "user_tool_result" | "other";

function hasToolUsePayload(message: Message): boolean {
  return hasToolCalls(message) || message.hasToolUseBlocks === true;
}

function hasToolResultPayload(message: Message): boolean {
  return hasToolResults(message) || message.hasToolResultBlocks === true;
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

/**
 * Type guard for assistant messages that contain tool calls.
 *
 * @param message - Message to check
 * @returns True if assistant message contains tool calls
 */
export function isAssistantToolUseMessage(
  message: Message,
): message is Message & {
  readonly role: "assistant";
  readonly toolCalls: readonly ToolCall[];
} {
  return message.role === "assistant" && hasToolCalls(message);
}

/**
 * Type guard for user messages that contain tool results.
 *
 * @param message - Message to check
 * @returns True if user message contains tool results
 */
export function isUserToolResultMessage(
  message: Message,
): message is Message & {
  readonly role: "user";
  readonly toolResults: readonly ToolResult[];
} {
  return message.role === "user" && hasToolResults(message);
}

/**
 * Classify message by tool-related role.
 *
 * @param message - Message to classify
 * @returns Message kind
 */
export function getMessageKind(message: Message): MessageKind {
  if (hasToolUsePayload(message)) {
    return "assistant_tool_use";
  }
  if (hasToolResultPayload(message)) {
    return "user_tool_result";
  }
  return "other";
}

/**
 * Check whether message is tool-related (tool_use/tool_result).
 *
 * This check is intentionally payload-based to ensure tool messages are
 * excluded even when role metadata is inconsistent.
 *
 * @param message - Message to check
 * @returns True if message is tool-related
 */
export function isToolRelatedMessage(message: Message): boolean {
  return hasToolUsePayload(message) || hasToolResultPayload(message);
}
