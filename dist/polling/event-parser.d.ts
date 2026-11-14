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
import type { MonitorEvent } from "./output";
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
export declare class EventParser {
    /**
     * Map of active tool calls by tool name for duration calculation.
     * Key: tool name, Value: start timestamp
     */
    private activeToolCalls;
    /**
     * Session ID for the current session being parsed.
     */
    private sessionId;
    /**
     * Create a new event parser.
     *
     * @param _eventEmitter - Event emitter for publishing parsed events (reserved for future use)
     * @param sessionId - Session ID for events (default: "unknown")
     */
    constructor(_eventEmitter: EventEmitter, sessionId?: string);
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
    parseEvents(events: readonly TranscriptEvent[]): readonly MonitorEvent[];
    /**
     * Parse a single transcript event into a monitor event.
     *
     * @param event - Transcript event to parse
     * @returns Monitor event or null if not a monitored event type
     */
    private parseEvent;
    /**
     * Parse tool_use event into ToolStartEvent.
     *
     * Extracts tool name and tracks the start time for duration calculation.
     *
     * @param event - Transcript event with type "tool_use"
     * @returns ToolStartEvent or null if event structure is invalid
     */
    private parseToolUse;
    /**
     * Parse tool_result event into ToolEndEvent.
     *
     * Calculates duration from tracked start time if available.
     *
     * @param event - Transcript event with type "tool_result"
     * @returns ToolEndEvent or null if event structure is invalid
     */
    private parseToolResult;
    /**
     * Parse task event into SubagentStartEvent or SubagentEndEvent.
     *
     * Task events represent Claude Code subagent (Task tool) invocations.
     * Uses event content to determine if this is a start or end event.
     *
     * @param event - Transcript event with type "task"
     * @returns SubagentStartEvent, SubagentEndEvent, or null if invalid
     */
    private parseSubagent;
    /**
     * Parse user or assistant message event into MessageEvent.
     *
     * Extracts message content from user and assistant transcript entries.
     *
     * @param event - Transcript event with type "user" or "assistant"
     * @returns MessageEvent or null if event structure is invalid
     */
    private parseMessage;
    /**
     * Parse TodoWrite event into TaskUpdateEvent.
     *
     * TodoWrite events represent task list updates in Claude Code sessions.
     *
     * @param event - Transcript event with type "todo_write"
     * @returns TaskUpdateEvent or null if event structure is invalid
     */
    private parseTaskUpdate;
    /**
     * Reset parser state.
     *
     * Clears all tracked active tool calls and resets the session ID.
     * Use this when starting to parse a new session.
     *
     * @param sessionId - Optional new session ID (default: "unknown")
     */
    reset(sessionId?: string): void;
}
//# sourceMappingURL=event-parser.d.ts.map