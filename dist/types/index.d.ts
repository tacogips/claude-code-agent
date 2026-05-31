/**
 * Core type definitions for claude-code-agent.
 *
 * @module types
 */
export type { Session, SessionMetadata, SessionStatus, TokenUsage, } from "./session";
export { toSessionMetadata, isTerminalStatus, canResume } from "./session";
export type { Message, MessageRole, ToolCall, ToolResult, MessageKind, } from "./message";
export { hasToolCalls, hasToolResults, isAssistantToolUseMessage, isUserToolResultMessage, getMessageKind, isToolRelatedMessage, } from "./message";
export type { Task, TaskStatus, TaskProgress } from "./task";
export { calculateTaskProgress } from "./task";
export type { AgentConfig, LoggingConfig, SessionExecutionConfig, } from "./config";
export { getDefaultConfig, mergeConfig } from "./config";
export type { ActivityStatus, ActivityEntry, ActivityStore } from "./activity";
export { isActiveStatus, isWaitingStatus } from "./activity";
//# sourceMappingURL=index.d.ts.map