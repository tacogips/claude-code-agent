/**
 * Polling Module - Real-time Session Monitoring
 *
 * This module provides real-time monitoring capabilities for Claude Code sessions.
 * It integrates file watching, JSONL parsing, event extraction, and state management
 * to provide high-level monitoring APIs.
 *
 * @module polling
 */

// Re-export event parser
export { EventParser } from "./event-parser";

// Re-export state manager and types
export {
  StateManager,
  type SubagentState,
  type SessionState,
} from "./state-manager";

// Re-export session monitors
export { SessionMonitor, GroupMonitor } from "./monitor";

// Re-export output and event types
export {
  JsonStreamOutput,
  type MonitorEvent,
  type ToolStartEvent,
  type ToolEndEvent,
  type SubagentStartEvent,
  type SubagentEndEvent,
  type MessageEvent,
  type TaskState,
  type TaskUpdateEvent,
  type SessionEndEvent,
} from "./output";
