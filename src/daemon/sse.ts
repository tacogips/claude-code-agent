/**
 * Server-Sent Events (SSE) streaming implementation.
 *
 * Provides real-time event streaming to clients using SSE protocol.
 * Filters events based on resource IDs (session/group/queue) and event types.
 *
 * @module daemon/sse
 */

import type { EventEmitter, Subscription } from "../sdk/events/emitter";
import type { EventType, SdkEvent } from "../sdk/events/types";
import type { EventFilter } from "./sse-types";

/**
 * Manages an individual SSE connection.
 *
 * Subscribes to the EventEmitter, filters events based on the provided filter,
 * formats events in SSE format, and handles connection lifecycle.
 */
export class SSEConnection {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private subscriptions: Subscription[] = [];
  private closed = false;
  private readonly encoder = new TextEncoder();

  /**
   * Create a new SSE connection.
   *
   * @param eventEmitter - Event emitter to subscribe to
   * @param filter - Filter for selecting events to stream
   */
  constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly filter: EventFilter,
  ) {}

  /**
   * Initialize the connection with a stream controller.
   *
   * This should be called from within the ReadableStream constructor.
   *
   * @param controller - Stream controller for writing data
   */
  initialize(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.controller = controller;

    // Subscribe to all event types
    const eventTypes: EventType[] = [
      "session_started",
      "session_ended",
      "message_received",
      "tool_started",
      "tool_completed",
      "tasks_updated",
      "group_created",
      "group_started",
      "group_completed",
      "group_paused",
      "group_resumed",
      "group_failed",
      "group_session_started",
      "group_session_completed",
      "group_session_failed",
      "budget_warning",
      "budget_exceeded",
      "dependency_waiting",
      "dependency_resolved",
      "session_progress",
      "group_progress",
      "queue_created",
      "queue_started",
      "queue_completed",
      "queue_paused",
      "queue_resumed",
      "queue_stopped",
      "queue_failed",
      "command_started",
      "command_completed",
      "command_failed",
      "command_added",
      "command_updated",
      "command_removed",
      "command_reordered",
      "command_mode_changed",
    ];

    // Subscribe to all event types and track subscriptions
    for (const eventType of eventTypes) {
      const subscription = this.eventEmitter.on(eventType, (event) => {
        this.handleEvent(event);
      });
      this.subscriptions.push(subscription);
    }
  }

  /**
   * Handle an event from the emitter.
   *
   * Filters the event and sends it if it matches the filter criteria.
   *
   * @param event - Event to handle
   */
  private handleEvent(event: SdkEvent): void {
    if (this.closed) {
      return;
    }

    if (this.matchesFilter(event)) {
      this.send(event);
    }
  }

  /**
   * Check if an event matches the filter criteria.
   *
   * @param event - Event to check
   * @returns true if the event matches the filter
   */
  private matchesFilter(event: SdkEvent): boolean {
    // Check sessionId filter
    if (this.filter.sessionId !== undefined) {
      const eventWithSessionId = event as { sessionId?: string };
      if (eventWithSessionId.sessionId !== this.filter.sessionId) {
        return false;
      }
    }

    // Check groupId filter
    if (this.filter.groupId !== undefined) {
      const eventWithGroupId = event as { groupId?: string };
      if (eventWithGroupId.groupId !== this.filter.groupId) {
        return false;
      }
    }

    // Check queueId filter
    if (this.filter.queueId !== undefined) {
      const eventWithQueueId = event as { queueId?: string };
      if (eventWithQueueId.queueId !== this.filter.queueId) {
        return false;
      }
    }

    // Check eventTypes filter
    if (
      this.filter.eventTypes !== undefined &&
      this.filter.eventTypes.length > 0
    ) {
      const eventType = event.type as EventType;
      if (!this.filter.eventTypes.includes(eventType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send an event to the client.
   *
   * Formats the event in SSE format and enqueues it to the stream.
   *
   * @param event - Event to send
   */
  send(event: SdkEvent): void {
    if (this.closed || this.controller === null) {
      return;
    }

    try {
      const formatted = this.formatSSE(event);
      const encoded = this.encoder.encode(formatted);
      this.controller.enqueue(encoded);
    } catch (error: unknown) {
      // If enqueue fails, the client likely disconnected
      this.close();
    }
  }

  /**
   * Format an event in SSE format.
   *
   * SSE format: data: JSON\n\n
   *
   * @param data - Data to format
   * @returns Formatted SSE string
   */
  private formatSSE(data: object): string {
    const json = JSON.stringify(data);
    return `data: ${json}\n\n`;
  }

  /**
   * Close the connection and cleanup resources.
   *
   * Unsubscribes from the event emitter and closes the stream controller.
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Unsubscribe from all events
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];

    // Close the stream controller
    if (this.controller !== null) {
      try {
        this.controller.close();
      } catch {
        // Ignore errors when closing (stream may already be closed)
      }
      this.controller = null;
    }
  }
}

/**
 * Create an SSE stream Response.
 *
 * Creates a Response object with appropriate SSE headers that streams
 * filtered events from the event emitter to the client.
 *
 * @param eventEmitter - Event emitter to subscribe to
 * @param filter - Filter for selecting events to stream
 * @returns Response object with SSE stream
 *
 * @example
 * ```typescript
 * // Stream all events for a specific session
 * const response = createSSEStream(emitter, {
 *   sessionId: "abc123"
 * });
 *
 * // Stream specific event types for a group
 * const response = createSSEStream(emitter, {
 *   groupId: "group-1",
 *   eventTypes: ["group_session_started", "group_session_completed"]
 * });
 * ```
 */
export function createSSEStream(
  eventEmitter: EventEmitter,
  filter: EventFilter,
): Response {
  const connection = new SSEConnection(eventEmitter, filter);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Initialize the connection with the controller
      connection.initialize(controller);
    },
    cancel() {
      // Client disconnected, cleanup
      connection.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
