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
