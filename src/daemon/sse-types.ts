/**
 * Server-Sent Events (SSE) types for real-time event streaming.
 *
 * Defines types for filtering and managing SSE connections.
 * SSE provides HTTP-based server-to-client push for monitoring
 * session progress, group execution, and queue operations.
 *
 * @module daemon/sse-types
 */

import type { EventType } from "../sdk/events/types";

/**
 * Filter for SSE event streams.
 *
 * Allows filtering events by resource ID (session/group/queue)
 * and/or specific event types. All filter properties are optional;
 * an empty filter matches all events.
 *
 * @example
 * ```typescript
 * // Filter for specific session
 * const filter: EventFilter = {
 *   sessionId: "abc123"
 * };
 *
 * // Filter for specific event types across all sessions
 * const filter: EventFilter = {
 *   eventTypes: ["session_started", "session_ended"]
 * };
 *
 * // Combine filters
 * const filter: EventFilter = {
 *   groupId: "group-1",
 *   eventTypes: ["group_session_started", "group_session_completed"]
 * };
 * ```
 */
export interface EventFilter {
  /**
   * Filter events for a specific session ID.
   *
   * When specified, only events with matching sessionId will be streamed.
   */
  readonly sessionId?: string | undefined;

  /**
   * Filter events for a specific group ID.
   *
   * When specified, only events with matching groupId will be streamed.
   */
  readonly groupId?: string | undefined;

  /**
   * Filter events for a specific queue ID.
   *
   * When specified, only events with matching queueId will be streamed.
   */
  readonly queueId?: string | undefined;

  /**
   * Filter events by type.
   *
   * When specified, only events matching one of these types will be streamed.
   * Event types must be valid EventType values from sdk/events/types.
   *
   * @example
   * ```typescript
   * eventTypes: ["session_started", "session_ended", "tool_completed"]
   * ```
   */
  readonly eventTypes?: readonly EventType[] | undefined;
}
