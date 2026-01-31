/**
 * WebSocket handler for real-time session and queue updates.
 *
 * Provides WebSocket endpoint at /ws for browser clients to receive
 * real-time updates about session progress, new messages, and queue changes.
 * Uses the SDK EventEmitter to forward relevant events to subscribed clients.
 *
 * @module viewer/browser/routes/ws
 */

import type { Elysia } from "elysia";
import type { ServerWebSocket } from "bun";
import type { EventEmitter } from "../../../sdk/events";
import type { EventType, EventMap } from "../../../sdk/events/types";
import { createTaggedLogger } from "../../../logger";

const logger = createTaggedLogger("ws");

/**
 * Message sent from client to server.
 */
type ClientMessage = SubscribeMessage | UnsubscribeMessage;

/**
 * Client subscribes to a session or queue.
 */
interface SubscribeMessage {
  readonly type: "subscribe";
  readonly sessionId: string;
}

/**
 * Client unsubscribes from a session or queue.
 */
interface UnsubscribeMessage {
  readonly type: "unsubscribe";
  readonly sessionId: string;
}

/**
 * Message sent from server to client.
 */
type ServerMessage =
  | SessionUpdateMessage
  | NewMessageMessage
  | SessionEndMessage
  | QueueUpdateMessage
  | ErrorMessage;

/**
 * Session data updated (status, cost, etc.).
 */
interface SessionUpdateMessage {
  readonly type: "session_update";
  readonly sessionId: string;
  readonly payload: unknown;
}

/**
 * New message received in session.
 */
interface NewMessageMessage {
  readonly type: "new_message";
  readonly sessionId: string;
  readonly payload: unknown;
}

/**
 * Session ended.
 */
interface SessionEndMessage {
  readonly type: "session_end";
  readonly sessionId: string;
}

/**
 * Queue data updated.
 */
interface QueueUpdateMessage {
  readonly type: "queue_update";
  readonly queueId: string;
  readonly payload: unknown;
}

/**
 * Error message from server.
 */
interface ErrorMessage {
  readonly type: "error";
  readonly message: string;
}

/**
 * Elysia WebSocket handler context.
 */
interface WSContext {
  readonly data: {
    readonly subscriptions: Set<string>;
  };
  readonly raw: ServerWebSocket<unknown>;
  send(data: string | ArrayBufferView | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
}

/**
 * Setup WebSocket handler for real-time updates.
 *
 * Configures a WebSocket endpoint at /ws that allows clients to:
 * - Subscribe to session updates
 * - Unsubscribe from session updates
 * - Receive real-time notifications about session/queue changes
 *
 * The handler listens to SDK events and forwards them to subscribed clients.
 *
 * @param app - Elysia application instance
 * @param eventEmitter - SDK event emitter to listen for events
 *
 * @example
 * ```typescript
 * const app = new Elysia();
 * const sdk = await ClaudeCodeAgent.create(container);
 * setupWebSocket(app, sdk.events);
 * ```
 */
export function setupWebSocket(app: Elysia, eventEmitter: EventEmitter): void {
  // Track all active connections
  const connections = new Set<WSContext>();

  /**
   * Broadcast a message to all connections subscribed to a session.
   *
   * @param sessionId - Session ID to broadcast to
   * @param message - Message to send
   */
  function broadcastToSession(sessionId: string, message: ServerMessage): void {
    let sentCount = 0;

    for (const ws of connections) {
      if (ws.data.subscriptions.has(sessionId)) {
        try {
          ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to send message to client: ${errorMessage}`);
        }
      }
    }

    if (sentCount > 0) {
      logger.debug(
        `Broadcast ${message.type} to ${sentCount} client(s) for session ${sessionId}`,
      );
    }
  }

  /**
   * Send error message to a specific client.
   *
   * @param ws - WebSocket connection
   * @param errorMsg - Error message text
   */
  function sendError(ws: WSContext, errorMsg: string): void {
    const message: ErrorMessage = {
      type: "error",
      message: errorMsg,
    };

    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to send error to client: ${errorMessage}`);
    }
  }

  // Setup event listeners for SDK events

  /**
   * Handle session_started event.
   */
  eventEmitter.on("session_started", (event) => {
    const message: SessionUpdateMessage = {
      type: "session_update",
      sessionId: event.sessionId,
      payload: event,
    };
    broadcastToSession(event.sessionId, message);
  });

  /**
   * Handle session_ended event.
   */
  eventEmitter.on("session_ended", (event) => {
    const endMessage: SessionEndMessage = {
      type: "session_end",
      sessionId: event.sessionId,
    };
    broadcastToSession(event.sessionId, endMessage);

    // Also send session update with final status
    const updateMessage: SessionUpdateMessage = {
      type: "session_update",
      sessionId: event.sessionId,
      payload: event,
    };
    broadcastToSession(event.sessionId, updateMessage);
  });

  /**
   * Handle message_received event.
   */
  eventEmitter.on("message_received", (event) => {
    const message: NewMessageMessage = {
      type: "new_message",
      sessionId: event.sessionId,
      payload: event,
    };
    broadcastToSession(event.sessionId, message);
  });

  /**
   * Handle tool_started event.
   */
  eventEmitter.on("tool_started", (event) => {
    const message: SessionUpdateMessage = {
      type: "session_update",
      sessionId: event.sessionId,
      payload: event,
    };
    broadcastToSession(event.sessionId, message);
  });

  /**
   * Handle tool_completed event.
   */
  eventEmitter.on("tool_completed", (event) => {
    const message: SessionUpdateMessage = {
      type: "session_update",
      sessionId: event.sessionId,
      payload: event,
    };
    broadcastToSession(event.sessionId, message);
  });

  /**
   * Handle tasks_updated event.
   */
  eventEmitter.on("tasks_updated", (event) => {
    const message: SessionUpdateMessage = {
      type: "session_update",
      sessionId: event.sessionId,
      payload: event,
    };
    broadcastToSession(event.sessionId, message);
  });

  /**
   * Handle queue events.
   *
   * For queue events, we broadcast to all clients subscribed to any
   * session in that queue (future enhancement: queue-level subscriptions).
   */
  const queueEventTypes: EventType[] = [
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
  ];

  for (const eventType of queueEventTypes) {
    eventEmitter.on(eventType, (event: EventMap[typeof eventType]) => {
      // Queue events have queueId property
      const queueId = "queueId" in event ? (event.queueId as string) : "";

      if (queueId !== "") {
        const message: QueueUpdateMessage = {
          type: "queue_update",
          queueId,
          payload: event,
        };

        // Broadcast to all connected clients
        // (Future: track queue subscriptions separately)
        for (const ws of connections) {
          try {
            ws.send(JSON.stringify(message));
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            logger.warn(
              `Failed to send queue update to client: ${errorMessage}`,
            );
          }
        }
      }
    });
  }

  // Setup WebSocket route
  app.ws("/ws", {
    /**
     * Handle new WebSocket connection.
     */
    open(ws) {
      // Cast to our context type
      const wsContext = ws as unknown as WSContext;
      // Initialize connection data (mutable mutation required for Elysia)
      (wsContext.data as { subscriptions: Set<string> }).subscriptions =
        new Set<string>();
      connections.add(wsContext);

      logger.info(`WebSocket client connected (total: ${connections.size})`);
    },

    /**
     * Handle incoming message from client.
     */
    message(ws, message) {
      const wsContext = ws as unknown as WSContext;

      try {
        // Parse message
        const messageStr =
          typeof message === "string" ? message : String(message);
        const clientMsg = JSON.parse(messageStr) as ClientMessage;

        // Handle subscribe/unsubscribe
        if (clientMsg.type === "subscribe") {
          wsContext.data.subscriptions.add(clientMsg.sessionId);
          logger.debug(
            `Client subscribed to session ${clientMsg.sessionId} (total subscriptions: ${wsContext.data.subscriptions.size})`,
          );
        } else if (clientMsg.type === "unsubscribe") {
          wsContext.data.subscriptions.delete(clientMsg.sessionId);
          logger.debug(
            `Client unsubscribed from session ${clientMsg.sessionId} (remaining: ${wsContext.data.subscriptions.size})`,
          );
        } else {
          sendError(
            wsContext,
            `Unknown message type: ${(clientMsg as { type?: string }).type ?? "undefined"}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to parse client message: ${errorMessage}`);
        sendError(wsContext, "Invalid message format");
      }
    },

    /**
     * Handle WebSocket connection close.
     */
    close(ws) {
      const wsContext = ws as unknown as WSContext;
      // Clean up subscriptions
      connections.delete(wsContext);

      logger.info(
        `WebSocket client disconnected (remaining: ${connections.size})`,
      );
    },
  });

  logger.debug("WebSocket handler configured at /ws");
}
