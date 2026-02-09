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
export type SessionStatus =
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "failed";

/**
 * Token usage tracking for a session.
 *
 * @example Example data
 * ```json
 * {
 *   "input": 1250,
 *   "output": 3420,
 *   "cacheRead": 45000,
 *   "cacheWrite": 12000
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "id": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "projectPath": "/home/user/projects/my-app",
 *   "status": "active",
 *   "createdAt": "2026-01-07T04:49:16.208Z",
 *   "updatedAt": "2026-01-07T05:02:16.550Z",
 *   "messages": [
 *     {
 *       "id": "msg-001",
 *       "role": "user",
 *       "content": "Help me fix the authentication bug",
 *       "timestamp": "2026-01-07T04:49:16.208Z"
 *     },
 *     {
 *       "id": "msg-002",
 *       "role": "assistant",
 *       "content": "I'll help you fix the authentication bug. Let me search for the relevant code.",
 *       "timestamp": "2026-01-07T04:49:22.686Z",
 *       "toolCalls": [
 *         {
 *           "id": "toolu_01X722Re5SMKwP5AnPgc382p",
 *           "name": "Grep",
 *           "input": { "pattern": "authenticate", "output_mode": "content" }
 *         }
 *       ]
 *     }
 *   ],
 *   "tasks": [
 *     {
 *       "id": "task-001",
 *       "content": "Fix authentication bug",
 *       "status": "completed"
 *     }
 *   ],
 *   "tokenUsage": {
 *     "input": 1250,
 *     "output": 3420,
 *     "cacheRead": 45000,
 *     "cacheWrite": 12000
 *   },
 *   "costUsd": 0.0542
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "id": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "projectPath": "/home/user/projects/my-app",
 *   "status": "active",
 *   "createdAt": "2026-01-07T04:49:16.208Z",
 *   "updatedAt": "2026-01-07T05:02:16.550Z",
 *   "messageCount": 118,
 *   "tokenUsage": {
 *     "input": 532,
 *     "output": 5256,
 *     "cacheRead": 2940147,
 *     "cacheWrite": 398213
 *   },
 *   "costUsd": 0.1234
 * }
 * ```
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

/**
 * Check if a session is pending (not yet started).
 *
 * @param status - Session status to check
 * @returns True if session is pending
 */
export function isPending(status: SessionStatus): boolean {
  return status === "pending";
}
