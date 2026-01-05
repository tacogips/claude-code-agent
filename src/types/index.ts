/**
 * Core type definitions for claude-code-agent.
 *
 * @module types
 */

// Session types
export type {
  Session,
  SessionMetadata,
  SessionStatus,
  TokenUsage,
} from "./session";
export { toSessionMetadata, isTerminalStatus, canResume } from "./session";

// Message types
export type { Message, MessageRole, ToolCall, ToolResult } from "./message";
export { hasToolCalls, hasToolResults } from "./message";

// Task types
export type { Task, TaskStatus, TaskProgress } from "./task";
export { calculateTaskProgress } from "./task";

// Config types
export type {
  AgentConfig,
  LoggingConfig,
  SessionExecutionConfig,
  DaemonConfig,
  ViewerConfig,
} from "./config";
export { getDefaultConfig, mergeConfig } from "./config";
