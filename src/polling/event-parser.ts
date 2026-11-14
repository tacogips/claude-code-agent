/**
 * Event Parser for extracting meaningful monitoring events from transcript entries.
 *
 * This module transforms raw Claude Code transcript events into high-level
 * monitoring events suitable for real-time display and state management.
 *
 * @module polling/event-parser
 */

import type { EventEmitter } from "../sdk/events/emitter";
import type { TranscriptEvent } from "./parser";
import type {
  MessageEvent,
  MonitorEvent,
  SubagentEndEvent,
  SubagentStartEvent,
  TaskUpdateEvent,
  ToolEndEvent,
  ToolStartEvent,
} from "./output";

/**
 * Tool call tracking for duration calculation.
 */
interface ToolCall {
  readonly tool: string;
  readonly startTimestamp: string;
}

/**
 * EventParser extracts high-level monitoring events from transcript entries.
 *
 * Parses raw transcript events and transforms them into structured monitoring
 * events. Maintains state for tracking active tool calls to calculate durations.
 *
 * @example
 * ```typescript
 * const emitter = createEventEmitter();
 * const parser = new EventParser(emitter);
 *
 * const events = parser.parseEvents([
 *   { type: "tool_use", content: { name: "Task" }, timestamp: "..." },
 *   { type: "tool_result", content: { name: "Task" }, timestamp: "..." }
 * ]);
 * ```
 */
export class EventParser {
  /**
   * Map of active tool calls by tool name for duration calculation.
   * Key: tool name, Value: start timestamp
   */
  private activeToolCalls: Map<string, ToolCall>;

  /**
   * Session ID for the current session being parsed.
   */
  private sessionId: string;

  /**
   * Create a new event parser.
   *
   * @param _eventEmitter - Event emitter for publishing parsed events (reserved for future use)
   * @param sessionId - Session ID for events (default: "unknown")
   */
  constructor(_eventEmitter: EventEmitter, sessionId = "unknown") {
    this.sessionId = sessionId;
    this.activeToolCalls = new Map();
  }

  /**
   * Parse transcript events into monitor events.
   *
   * Processes an array of raw transcript events and transforms them into
   * high-level monitoring events. Each transcript event may produce zero
   * or one monitor event.
   *
   * @param events - Raw transcript events to parse
   * @returns Array of monitor events
   */
  parseEvents(events: readonly TranscriptEvent[]): readonly MonitorEvent[] {
    const monitorEvents: MonitorEvent[] = [];

    for (const event of events) {
      const monitorEvent = this.parseEvent(event);
      if (monitorEvent !== null) {
        monitorEvents.push(monitorEvent);
      }
    }

    return monitorEvents;
  }

  /**
   * Parse a single transcript event into a monitor event.
   *
   * @param event - Transcript event to parse
   * @returns Monitor event or null if not a monitored event type
   */
  private parseEvent(event: TranscriptEvent): MonitorEvent | null {
    switch (event.type) {
      case "tool_use":
        return this.parseToolUse(event);
      case "tool_result":
        return this.parseToolResult(event);
      case "task":
        return this.parseSubagent(event);
      case "user":
      case "assistant":
        return this.parseMessage(event);
      case "todo_write":
        return this.parseTaskUpdate(event);
      default:
        return null;
    }
  }

  /**
   * Parse tool_use event into ToolStartEvent.
   *
   * Extracts tool name and tracks the start time for duration calculation.
   *
   * @param event - Transcript event with type "tool_use"
   * @returns ToolStartEvent or null if event structure is invalid
   */
  private parseToolUse(event: TranscriptEvent): ToolStartEvent | null {
    // Extract tool name from content
    const raw = event.raw as Record<string, unknown>;
    const content = raw["content"];

    if (
      typeof content !== "object" ||
      content === null ||
      !("name" in content)
    ) {
      return null;
    }

    const toolName = (content as Record<string, unknown>)["name"];
    if (typeof toolName !== "string") {
      return null;
    }

    const timestamp = event.timestamp ?? new Date().toISOString();

    // Track this tool call for duration calculation
    this.activeToolCalls.set(toolName, {
      tool: toolName,
      startTimestamp: timestamp,
    });

    return {
      type: "tool_start",
      sessionId: this.sessionId,
      tool: toolName,
      timestamp,
    };
  }

  /**
   * Parse tool_result event into ToolEndEvent.
   *
   * Calculates duration from tracked start time if available.
   *
   * @param event - Transcript event with type "tool_result"
   * @returns ToolEndEvent or null if event structure is invalid
   */
  private parseToolResult(event: TranscriptEvent): ToolEndEvent | null {
    // Extract tool name from content
    const raw = event.raw as Record<string, unknown>;
    const content = raw["content"];

    if (
      typeof content !== "object" ||
      content === null ||
      !("name" in content)
    ) {
      return null;
    }

    const toolName = (content as Record<string, unknown>)["name"];
    if (typeof toolName !== "string") {
      return null;
    }

    const timestamp = event.timestamp ?? new Date().toISOString();

    // Calculate duration if we have the start time
    let duration = 0;
    const startCall = this.activeToolCalls.get(toolName);
    if (startCall !== undefined) {
      const startTime = new Date(startCall.startTimestamp).getTime();
      const endTime = new Date(timestamp).getTime();
      duration = Math.max(0, endTime - startTime);

      // Remove from active calls
      this.activeToolCalls.delete(toolName);
    }

    return {
      type: "tool_end",
      sessionId: this.sessionId,
      tool: toolName,
      duration,
      timestamp,
    };
  }

  /**
   * Parse task event into SubagentStartEvent or SubagentEndEvent.
   *
   * Task events represent Claude Code subagent (Task tool) invocations.
   * Uses event content to determine if this is a start or end event.
   *
   * @param event - Transcript event with type "task"
   * @returns SubagentStartEvent, SubagentEndEvent, or null if invalid
   */
  private parseSubagent(
    event: TranscriptEvent,
  ): SubagentStartEvent | SubagentEndEvent | null {
    const raw = event.raw as Record<string, unknown>;
    const content = raw["content"];

    if (typeof content !== "object" || content === null) {
      return null;
    }

    const contentObj = content as Record<string, unknown>;
    const timestamp = event.timestamp ?? new Date().toISOString();

    // Check for subagent_type to determine if this is a start event
    if ("subagent_type" in contentObj) {
      const agentType = contentObj["subagent_type"];
      const agentId =
        "task_id" in contentObj && typeof contentObj["task_id"] === "string"
          ? contentObj["task_id"]
          : (event.uuid ?? "unknown");
      const description =
        "prompt" in contentObj && typeof contentObj["prompt"] === "string"
          ? contentObj["prompt"]
          : "";

      if (typeof agentType === "string") {
        return {
          type: "subagent_start",
          sessionId: this.sessionId,
          agentId,
          agentType,
          description,
          timestamp,
        };
      }
    }

    // Check for status to determine if this is an end event
    if ("status" in contentObj) {
      const status = contentObj["status"];
      const agentId =
        "task_id" in contentObj && typeof contentObj["task_id"] === "string"
          ? contentObj["task_id"]
          : (event.uuid ?? "unknown");

      if (status === "completed" || status === "failed") {
        return {
          type: "subagent_end",
          sessionId: this.sessionId,
          agentId,
          status,
          timestamp,
        };
      }
    }

    return null;
  }

  /**
   * Parse user or assistant message event into MessageEvent.
   *
   * Extracts message content from user and assistant transcript entries.
   *
   * @param event - Transcript event with type "user" or "assistant"
   * @returns MessageEvent or null if event structure is invalid
   */
  private parseMessage(event: TranscriptEvent): MessageEvent | null {
    if (event.type !== "user" && event.type !== "assistant") {
      return null;
    }

    const raw = event.raw as Record<string, unknown>;
    const content = raw["content"];

    // Content can be a string or an object with text field
    let messageText = "";

    if (typeof content === "string") {
      messageText = content;
    } else if (typeof content === "object" && content !== null) {
      const contentObj = content as Record<string, unknown>;
      if ("text" in contentObj && typeof contentObj["text"] === "string") {
        messageText = contentObj["text"];
      }
    }

    // Skip empty messages
    if (messageText.trim() === "") {
      return null;
    }

    return {
      type: "message",
      sessionId: this.sessionId,
      role: event.type as "user" | "assistant",
      content: messageText,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
  }

  /**
   * Parse TodoWrite event into TaskUpdateEvent.
   *
   * TodoWrite events represent task list updates in Claude Code sessions.
   *
   * @param event - Transcript event with type "todo_write"
   * @returns TaskUpdateEvent or null if event structure is invalid
   */
  private parseTaskUpdate(event: TranscriptEvent): TaskUpdateEvent | null {
    const raw = event.raw as Record<string, unknown>;
    const content = raw["content"];

    if (typeof content !== "object" || content === null) {
      return null;
    }

    const contentObj = content as Record<string, unknown>;

    // Extract tasks array
    if (!("tasks" in contentObj) || !Array.isArray(contentObj["tasks"])) {
      return null;
    }

    const tasks = contentObj["tasks"]
      .map((task: unknown) => {
        if (typeof task !== "object" || task === null) {
          return null;
        }

        const taskObj = task as Record<string, unknown>;
        const summary =
          "summary" in taskObj && typeof taskObj["summary"] === "string"
            ? taskObj["summary"]
            : "";
        const status =
          "status" in taskObj && typeof taskObj["status"] === "string"
            ? taskObj["status"]
            : "running";

        // Validate status
        if (
          status !== "running" &&
          status !== "completed" &&
          status !== "error"
        ) {
          return null;
        }

        return {
          summary,
          status: status as "running" | "completed" | "error",
        };
      })
      .filter((task): task is NonNullable<typeof task> => task !== null);

    return {
      type: "task_update",
      sessionId: this.sessionId,
      tasks,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
  }

  /**
   * Reset parser state.
   *
   * Clears all tracked active tool calls and resets the session ID.
   * Use this when starting to parse a new session.
   *
   * @param sessionId - Optional new session ID (default: "unknown")
   */
  reset(sessionId = "unknown"): void {
    this.sessionId = sessionId;
    this.activeToolCalls.clear();
  }
}
