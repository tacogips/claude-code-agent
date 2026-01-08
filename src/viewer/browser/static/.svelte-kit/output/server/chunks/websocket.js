class WebSocketClient {
  ws = null;
  url;
  subscriptions = /* @__PURE__ */ new Set();
  messageHandlers = [];
  stateChangeHandlers = [];
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;
  reconnectDelayMs = 1e3;
  maxReconnectDelayMs = 3e4;
  reconnectTimeoutId = null;
  connectionState = "disconnected";
  shouldReconnect = true;
  /**
   * Create a WebSocket client.
   *
   * @param url - WebSocket URL (defaults to ws://hostname/ws)
   */
  constructor(url) {
    if (url !== void 0) {
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
  get state() {
    return this.connectionState;
  }
  /**
   * Connect to WebSocket server.
   */
  connect() {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    this.setConnectionState(
      this.reconnectAttempts > 0 ? "reconnecting" : "connecting"
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
  onOpen() {
    console.log("WebSocket connected");
    this.reconnectAttempts = 0;
    this.setConnectionState("connected");
    for (const sessionId of this.subscriptions) {
      this.sendMessage({ type: "subscribe", sessionId });
    }
  }
  /**
   * Handle incoming message from WebSocket.
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(String(event.data));
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
  onClose() {
    console.log("WebSocket disconnected");
    this.setConnectionState("disconnected");
    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }
  /**
   * Handle connection error.
   */
  onError(error) {
    console.error("WebSocket error:", error);
  }
  /**
   * Schedule reconnection with exponential backoff.
   */
  scheduleReconnect() {
    if (!this.shouldReconnect) {
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) reached`
      );
      this.setConnectionState("disconnected");
      return;
    }
    const delay = Math.min(
      this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelayMs
    );
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`
    );
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  /**
   * Send message to server.
   */
  sendMessage(message) {
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
  setConnectionState(state) {
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
  subscribe(sessionId) {
    this.subscriptions.add(sessionId);
    this.sendMessage({ type: "subscribe", sessionId });
  }
  /**
   * Unsubscribe from session updates.
   *
   * @param sessionId - Session ID to unsubscribe from
   */
  unsubscribe(sessionId) {
    this.subscriptions.delete(sessionId);
    this.sendMessage({ type: "unsubscribe", sessionId });
  }
  /**
   * Register a message handler.
   *
   * @param handler - Function to call on each message
   * @returns Cleanup function to remove handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
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
  onStateChange(handler) {
    this.stateChangeHandlers.push(handler);
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
  close() {
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
const ws = new WebSocketClient();
export {
  ws as w
};
