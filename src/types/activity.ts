/**
 * Activity status types for Claude Code sessions.
 *
 * Activity status represents real-time session state,
 * indicating whether a session is actively working,
 * waiting for user input, or idle.
 *
 * @module types/activity
 */

/**
 * Real-time activity status of a Claude Code session.
 *
 * - `working`: Session is actively executing tasks
 * - `waiting_user_response`: Session is waiting for user input
 * - `idle`: Session has stopped or is inactive
 */
export type ActivityStatus = "working" | "waiting_user_response" | "idle";

/**
 * Activity entry stored for a session.
 *
 * Represents the current activity state of a session,
 * including its status, location, and last update time.
 *
 * @example Example data
 * ```json
 * {
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "status": "working",
 *   "projectPath": "/home/user/projects/my-app",
 *   "lastUpdated": "2026-01-31T10:30:00.000Z"
 * }
 * ```
 */
export interface ActivityEntry {
  /** Unique session identifier */
  readonly sessionId: string;
  /** Current activity status */
  readonly status: ActivityStatus;
  /** Project directory path */
  readonly projectPath: string;
  /** ISO timestamp when status was last updated */
  readonly lastUpdated: string;
}

/**
 * Activity store format for persistent storage.
 *
 * Stores activity entries keyed by session ID, with
 * the session ID omitted from the entry itself to
 * avoid redundancy.
 *
 * @example Example data
 * ```json
 * {
 *   "version": "1.0",
 *   "sessions": {
 *     "0dc4ee1f-2e78-462f-a400-16d14ab6a418": {
 *       "status": "working",
 *       "projectPath": "/home/user/projects/my-app",
 *       "lastUpdated": "2026-01-31T10:30:00.000Z"
 *     },
 *     "f4a72b3d-9c1e-4d5a-b6e7-8f9a0b1c2d3e": {
 *       "status": "idle",
 *       "projectPath": "/home/user/projects/other-app",
 *       "lastUpdated": "2026-01-31T09:15:00.000Z"
 *     }
 *   }
 * }
 * ```
 */
export interface ActivityStore {
  /** Schema version for backwards compatibility */
  readonly version: "1.0";
  /** Activity entries keyed by session ID */
  readonly sessions: Record<string, Omit<ActivityEntry, "sessionId">>;
}

/**
 * Check if status indicates active work.
 *
 * @param status - Activity status to check
 * @returns True if session is actively working
 *
 * @example
 * ```typescript
 * isActiveStatus("working"); // true
 * isActiveStatus("waiting_user_response"); // false
 * isActiveStatus("idle"); // false
 * ```
 */
export function isActiveStatus(status: ActivityStatus): boolean {
  return status === "working";
}

/**
 * Check if status indicates waiting for user.
 *
 * @param status - Activity status to check
 * @returns True if session is waiting for user response
 *
 * @example
 * ```typescript
 * isWaitingStatus("waiting_user_response"); // true
 * isWaitingStatus("working"); // false
 * isWaitingStatus("idle"); // false
 * ```
 */
export function isWaitingStatus(status: ActivityStatus): boolean {
  return status === "waiting_user_response";
}
