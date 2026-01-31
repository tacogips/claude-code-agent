/**
 * JSON Stream Output for CLI
 *
 * This module provides JSON stream output for monitoring events.
 * Events are written as one JSON object per line (JSONL format).
 */

/**
 * MonitorEvent Types
 *
 * These types represent high-level monitoring events extracted from
 * transcript entries. They are defined here to avoid circular dependencies
 * with event-parser.ts (which will be implemented in TASK-003).
 */

/**
 * Tool start event
 */
export interface ToolStartEvent {
  readonly type: "tool_start";
  readonly sessionId: string;
  readonly tool: string;
  readonly timestamp: string;
}

/**
 * Tool end event
 */
export interface ToolEndEvent {
  readonly type: "tool_end";
  readonly sessionId: string;
  readonly tool: string;
  readonly duration: number;
  readonly timestamp: string;
}

/**
 * Subagent start event
 */
export interface SubagentStartEvent {
  readonly type: "subagent_start";
  readonly sessionId: string;
  readonly agentId: string;
  readonly agentType: string;
  readonly description: string;
  readonly timestamp: string;
}

/**
 * Subagent end event
 */
export interface SubagentEndEvent {
  readonly type: "subagent_end";
  readonly sessionId: string;
  readonly agentId: string;
  readonly status: "completed" | "failed";
  readonly timestamp: string;
}

/**
 * Message event
 */
export interface MessageEvent {
  readonly type: "message";
  readonly sessionId: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: string;
}

/**
 * Task state
 */
export interface TaskState {
  readonly summary: string;
  readonly status: "running" | "completed" | "error";
}

/**
 * Task update event
 */
export interface TaskUpdateEvent {
  readonly type: "task_update";
  readonly sessionId: string;
  readonly tasks: readonly TaskState[];
  readonly timestamp: string;
}

/**
 * Session end event
 */
export interface SessionEndEvent {
  readonly type: "session_end";
  readonly sessionId: string;
  readonly status: "completed" | "error";
  readonly timestamp: string;
}

/**
 * Union of all monitor events
 */
export type MonitorEvent =
  | ToolStartEvent
  | ToolEndEvent
  | SubagentStartEvent
  | SubagentEndEvent
  | MessageEvent
  | TaskUpdateEvent
  | SessionEndEvent;

/**
 * JSON stream output for CLI monitoring
 *
 * Outputs monitor events as JSON lines (JSONL format) to a writable stream.
 * Each event is written as a single line with no pretty-printing.
 *
 * @example
 * ```typescript
 * const output = new JsonStreamOutput(process.stdout);
 * output.write({
 *   type: "tool_start",
 *   sessionId: "session-123",
 *   tool: "Task",
 *   timestamp: "2026-01-06T10:00:00.000Z"
 * });
 * output.close();
 * ```
 */
export class JsonStreamOutput {
  private readonly stream: NodeJS.WritableStream;
  private closed = false;

  /**
   * Create a new JSON stream output
   *
   * @param outputStream - Writable stream for output (e.g., process.stdout)
   */
  constructor(outputStream: NodeJS.WritableStream) {
    this.stream = outputStream;
  }

  /**
   * Write a monitor event as a JSON line
   *
   * The event is serialized to JSON and written with a newline.
   * If the stream is closed, this method does nothing.
   *
   * @param event - Monitor event to write
   */
  write(event: MonitorEvent): void {
    if (this.closed) {
      return;
    }

    const json = JSON.stringify(event);
    this.stream.write(`${json}\n`);
  }

  /**
   * Close the output stream
   *
   * Flushes any buffered content and marks the stream as closed.
   * Subsequent calls to write() will be ignored.
   *
   * Note: This does NOT close the underlying stream (e.g., stdout).
   * It only marks this output as closed to prevent further writes.
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Flush any buffered content
    // Note: We don't close the underlying stream (e.g., stdout)
    // because it may be used by other parts of the application
    if (typeof this.stream.write === "function") {
      // Force flush by writing empty string
      this.stream.write("");
    }
  }

  /**
   * Check if the output stream is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}
