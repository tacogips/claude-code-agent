/**
 * WebSocket client for real-time updates.
 *
 * Provides auto-reconnect functionality and typed message handling.
 *
 * @module lib/websocket
 */

/**
 * Message from client to server.
 */
type ClientMessage = SubscribeMessage | UnsubscribeMessage;

/**
 * Subscribe to session updates.
 */
interface SubscribeMessage {
  readonly type: "subscribe";
  readonly sessionId: string;
}

/**
 * Unsubscribe from session updates.
 */
interface UnsubscribeMessage {
  readonly type: "unsubscribe";
  readonly sessionId: string;
}

/**
 * Message from server to client.
 */
export type ServerMessage =
  | SessionUpdateMessage
  | NewMessageMessage
  | SessionEndMessage
  | QueueUpdateMessage
  | ErrorMessage;

/**
 * Session updated (status, cost, etc.).
 */
export interface SessionUpdateMessage {
  readonly type: "session_update";
  readonly sessionId: string;
  readonly payload: unknown;
}

/**
 * New message received.
 */
export interface NewMessageMessage {
  readonly type: "new_message";
  readonly sessionId: string;
  readonly payload: unknown;
}

/**
 * Session ended.
 */
export interface SessionEndMessage {
  readonly type: "session_end";
  readonly sessionId: string;
}

/**
 * Queue updated.
 */
export interface QueueUpdateMessage {
  readonly type: "queue_update";
  readonly queueId: string;
  readonly payload: unknown;
}

/**
 * Error from server.
 */
export interface ErrorMessage {
  readonly type: "error";
  readonly message: string;
}

/**
 * Connection state.
 */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

/**
 * Message handler function type.
 */
type MessageHandler = (message: ServerMessage) => void;

/**
 * Connection state change handler.
 */
type StateChangeHandler = (state: ConnectionState) => void;

/**
 * WebSocket client with auto-reconnect.
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private subscriptions = new Set<string>();
  private messageHandlers: MessageHandler[] = [];
  private stateChangeHandlers: StateChangeHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelayMs = 1000;
  private maxReconnectDelayMs = 30000;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private connectionState: ConnectionState = "disconnected";
  private shouldReconnect = true;

  /**
   * Create a WebSocket client.
   *
   * @param url - WebSocket URL (defaults to ws://hostname/ws)
   */
  constructor(url?: string) {
    // Default to current hostname
    if (url !== undefined) {
      this.url = url;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      this.url = `${protocol}//${window.location.host}/ws`;
    }

    this.connect();
  }

  /**
   * Get current connection state.
   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Connect to WebSocket server.
   */
  private connect(): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.setConnectionState(
      this.reconnectAttempts > 0 ? "reconnecting" : "connecting",
    );

    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener("open", () => {
        this.onOpen();
      });

      this.ws.addEventListener("message", (event) => {
        this.handleMessage(event);
      });

      this.ws.addEventListener("close", () => {
        this.onClose();
      });

      this.ws.addEventListener("error", (error) => {
        this.onError(error);
      });
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open.
   */
  private onOpen(): void {
    console.log("WebSocket connected");
    this.reconnectAttempts = 0;
    this.setConnectionState("connected");

    // Resubscribe to all sessions
    for (const sessionId of this.subscriptions) {
      this.sendMessage({ type: "subscribe", sessionId });
    }
  }

  /**
   * Handle incoming message from WebSocket.
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(String(event.data)) as ServerMessage;

      // Notify all handlers
      for (const handler of this.messageHandlers) {
        try {
          handler(message);
        } catch (error) {
          console.error("Message handler error:", error);
        }
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle connection close.
   */
  private onClose(): void {
    console.log("WebSocket disconnected");
    this.setConnectionState("disconnected");

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error.
   */
  private onError(error: Event): void {
    console.error("WebSocket error:", error);
  }

  /**
   * Schedule reconnection with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) reached`,
      );
      this.setConnectionState("disconnected");
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelayMs,
    );

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`,
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Send message to server.
   */
  private sendMessage(message: ClientMessage): void {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send message: WebSocket not connected");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  /**
   * Update connection state and notify handlers.
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) {
      return;
    }

    this.connectionState = state;

    for (const handler of this.stateChangeHandlers) {
      try {
        handler(state);
      } catch (error) {
        console.error("State change handler error:", error);
      }
    }
  }

  /**
   * Subscribe to session updates.
   *
   * @param sessionId - Session ID to subscribe to
   */
  subscribe(sessionId: string): void {
    this.subscriptions.add(sessionId);
    this.sendMessage({ type: "subscribe", sessionId });
  }

  /**
   * Unsubscribe from session updates.
   *
   * @param sessionId - Session ID to unsubscribe from
   */
  unsubscribe(sessionId: string): void {
    this.subscriptions.delete(sessionId);
    this.sendMessage({ type: "unsubscribe", sessionId });
  }

  /**
   * Register a message handler.
   *
   * @param handler - Function to call on each message
   * @returns Cleanup function to remove handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);

    // Return cleanup function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index !== -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register a connection state change handler.
   *
   * @param handler - Function to call on state change
   * @returns Cleanup function to remove handler
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.push(handler);

    // Return cleanup function
    return () => {
      const index = this.stateChangeHandlers.indexOf(handler);
      if (index !== -1) {
        this.stateChangeHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Close the WebSocket connection.
   */
  close(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState("disconnected");
  }
}

/**
 * Singleton WebSocket client instance.
 */
export const ws = new WebSocketClient();
