/**
 * Session types for Claude Code.
 *
 * A session represents a single Claude Code interaction,
 * containing the full conversation history, task state,
 * and metadata.
 *
 * @module types/session
 */

import type { Message } from "./message";
import type { Task } from "./task";

/**
 * The lifecycle status of a session.
 */
export type SessionStatus = "active" | "paused" | "completed" | "failed";

/**
 * Token usage tracking for a session.
 */
export interface TokenUsage {
  /** Number of input tokens consumed */
  readonly input: number;
  /** Number of output tokens generated */
  readonly output: number;
  /** Number of cache read tokens */
  readonly cacheRead?: number | undefined;
  /** Number of cache write tokens */
  readonly cacheWrite?: number | undefined;
}

/**
 * Represents a Claude Code session with full message history.
 *
 * This is the complete session object including all messages
 * and tasks. For storage and listing, use SessionMetadata.
 */
export interface Session {
  /** Unique session identifier */
  readonly id: string;
  /** Project directory path */
  readonly projectPath: string;
  /** Current session status */
  readonly status: SessionStatus;
  /** ISO timestamp when session was created */
  readonly createdAt: string;
  /** ISO timestamp when session was last updated */
  readonly updatedAt: string;
  /** Messages in this session */
  readonly messages: readonly Message[];
  /** Active tasks tracked via TodoWrite */
  readonly tasks: readonly Task[];
  /** Token usage for this session */
  readonly tokenUsage?: TokenUsage | undefined;
  /** Total cost in USD for this session */
  readonly costUsd?: number | undefined;
}

/**
 * Session metadata for storage and listing.
 *
 * This is a lightweight version of Session without
 * the full message and task arrays, suitable for
 * indexes and list views.
 */
export interface SessionMetadata {
  /** Unique session identifier */
  readonly id: string;
  /** Project directory path */
  readonly projectPath: string;
  /** Current session status */
  readonly status: SessionStatus;
  /** ISO timestamp when session was created */
  readonly createdAt: string;
  /** ISO timestamp when session was last updated */
  readonly updatedAt: string;
  /** Total number of messages in session */
  readonly messageCount: number;
  /** Total token usage */
  readonly tokenUsage?: TokenUsage | undefined;
  /** Total cost in USD */
  readonly costUsd?: number | undefined;
}

/**
 * Create metadata from a full session object.
 *
 * @param session - Full session to extract metadata from
 * @returns Session metadata
 */
export function toSessionMetadata(session: Session): SessionMetadata {
  return {
    id: session.id,
    projectPath: session.projectPath,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    tokenUsage: session.tokenUsage,
    costUsd: session.costUsd,
  };
}

/**
 * Check if a session is in a terminal state.
 *
 * @param status - Session status to check
 * @returns True if session is completed or failed
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return status === "completed" || status === "failed";
}

/**
 * Check if a session can be resumed.
 *
 * @param status - Session status to check
 * @returns True if session can be resumed
 */
export function canResume(status: SessionStatus): boolean {
  return status === "paused";
}
