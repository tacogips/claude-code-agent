/**
 * Mock transport for unit testing.
 *
 * Simulates CLI communication without spawning subprocess.
 * Provides methods to inject simulated messages from the "CLI"
 * and retrieve messages sent by the SDK.
 *
 * @module sdk/__fixtures__/mock-transport
 */

/**
 * Abstract transport interface for CLI communication.
 *
 * Defines the contract for all transport implementations
 * (subprocess, mock, etc.)
 */
export interface Transport {
  /**
   * Connect to the transport.
   *
   * For subprocess: spawns CLI process.
   * For mock: initializes internal state.
   */
  connect(): Promise<void>;

  /**
   * Write data to the transport.
   *
   * @param data - JSON string to send
   */
  write(data: string): Promise<void>;

  /**
   * Read messages from the transport as async iterable.
   *
   * @yields Parsed JSON objects from the transport
   */
  readMessages(): AsyncIterable<object>;

  /**
   * Signal end of input.
   *
   * For subprocess: closes stdin.
   * For mock: signals no more messages will be read.
   */
  endInput(): Promise<void>;

  /**
   * Close the transport and clean up resources.
   */
  close(): Promise<void>;
}

/**
 * Options for configuring MockTransport behavior.
 */
export interface MockTransportOptions {
  /**
   * Automatically connect on construction.
   * @default false
   */
  autoConnect?: boolean;

  /**
   * Delay in milliseconds before yielding each message.
   * Simulates realistic timing for async operations.
   * @default 0
   */
  messageDelay?: number;

  /**
   * Pre-configured responses to simulate from CLI.
   * These messages will be yielded by readMessages() in order.
   */
  simulatedResponses?: readonly object[];
}

/**
 * Mock transport for unit testing.
 *
 * Simulates CLI communication without spawning subprocess.
 * Messages can be injected via simulateMessage() to simulate
 * CLI responses, and messages written by SDK are tracked via
 * getWrittenMessages().
 *
 * @example
 * ```typescript
 * const transport = new MockTransport();
 * await transport.connect();
 *
 * // Simulate CLI sending a message
 * transport.simulateMessage({ type: 'assistant', content: 'Hello' });
 *
 * // Read message from CLI
 * for await (const msg of transport.readMessages()) {
 *   console.log(msg); // { type: 'assistant', content: 'Hello' }
 *   break;
 * }
 *
 * // Write message to CLI
 * await transport.write(JSON.stringify({ type: 'user', content: 'Hi' }));
 *
 * // Check what SDK sent
 * const sent = transport.getWrittenMessages();
 * console.log(sent); // [{ type: 'user', content: 'Hi' }]
 * ```
 */
export class MockTransport implements Transport {
  private connected: boolean = false;
  private closed: boolean = false;
  private messageQueue: object[] = [];
  private writtenMessages: object[] = [];
  private options: Required<MockTransportOptions>;
  private messageResolver: ((value: object) => void) | null = null;
  private inputEnded: boolean = false;

  /**
   * Create a new mock transport.
   *
   * @param options - Configuration options
   */
  constructor(options?: MockTransportOptions) {
    this.options = {
      autoConnect: options?.autoConnect ?? false,
      messageDelay: options?.messageDelay ?? 0,
      simulatedResponses: options?.simulatedResponses ?? [],
    };

    // Enqueue pre-configured responses
    if (this.options.simulatedResponses.length > 0) {
      this.messageQueue.push(...this.options.simulatedResponses);
    }

    // Auto-connect if requested
    if (this.options.autoConnect) {
      void this.connect();
    }
  }

  /**
   * Connect to the mock transport.
   *
   * Marks the transport as connected.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error("Transport already connected");
    }
    if (this.closed) {
      throw new Error("Cannot connect to closed transport");
    }
    this.connected = true;
  }

  /**
   * Write data to the mock transport.
   *
   * Parses JSON and stores in writtenMessages array.
   *
   * @param data - JSON string to write
   * @throws Error if not connected or closed
   */
  async write(data: string): Promise<void> {
    if (this.closed) {
      throw new Error("Transport closed");
    }
    if (!this.connected) {
      throw new Error("Transport not connected");
    }

    try {
      const message = JSON.parse(data) as object;
      this.writtenMessages.push(message);
    } catch (error: unknown) {
      throw new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Read messages from the mock transport as async iterable.
   *
   * Yields messages from the message queue. If queue is empty,
   * waits for new messages to be added via simulateMessage().
   *
   * @yields Parsed JSON objects from the queue
   */
  async *readMessages(): AsyncIterable<object> {
    if (!this.connected) {
      throw new Error("Transport not connected");
    }

    while (!this.closed) {
      // If we have messages in queue, yield them
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message === undefined) continue;

        // Apply message delay if configured
        if (this.options.messageDelay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.messageDelay),
          );
        }

        yield message;
        continue;
      }

      // If input ended and no more messages, stop
      if (this.inputEnded) {
        break;
      }

      // No messages in queue - wait for new message to be injected
      await new Promise<object>((resolve) => {
        this.messageResolver = resolve;
      });

      // After resolve, check for injected message
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message === undefined) continue;

        if (this.options.messageDelay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.messageDelay),
          );
        }

        yield message;
      }
    }
  }

  /**
   * Signal end of input.
   *
   * Marks that no more messages will be read from the transport.
   */
  async endInput(): Promise<void> {
    if (!this.connected) {
      throw new Error("Transport not connected");
    }
    this.inputEnded = true;

    // Resolve pending message resolver if any
    if (this.messageResolver !== null) {
      this.messageResolver({});
      this.messageResolver = null;
    }
  }

  /**
   * Close the mock transport.
   *
   * Cleans up resources and marks transport as closed.
   */
  async close(): Promise<void> {
    if (!this.connected) {
      return; // Already closed or never connected
    }

    this.closed = true;
    this.connected = false;

    // Resolve any pending message resolver
    if (this.messageResolver !== null) {
      this.messageResolver({});
      this.messageResolver = null;
    }

    // Clear queues
    this.messageQueue = [];
  }

  // Test helper methods

  /**
   * Simulate a message from the CLI.
   *
   * Injects a message into the queue as if it came from the CLI.
   * This message will be yielded by readMessages().
   *
   * @param msg - Message object to inject
   */
  simulateMessage(msg: object): void {
    if (this.closed) {
      throw new Error("Cannot simulate message on closed transport");
    }

    this.messageQueue.push(msg);

    // If there's a waiting resolver, wake it up
    if (this.messageResolver !== null) {
      this.messageResolver(msg);
      this.messageResolver = null;
    }
  }

  /**
   * Simulate a tool call from Claude.
   *
   * Generates a control_request with mcp_message subtype
   * that requests tool execution.
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @param serverName - MCP server name
   */
  simulateToolCall(
    name: string,
    args: object,
    serverName: string = "sdk-tools",
  ): void {
    const toolCallMessage = {
      type: "control_request",
      request_id: `req-${Date.now()}`,
      request: {
        subtype: "mcp_message",
        server_name: serverName,
        message: {
          jsonrpc: "2.0",
          id: `call-${Date.now()}`,
          method: "tools/call",
          params: {
            name,
            arguments: args,
          },
        },
      },
    };

    this.simulateMessage(toolCallMessage);
  }

  /**
   * Get all messages written by the SDK to the transport.
   *
   * @returns Array of messages sent via write()
   */
  getWrittenMessages(): readonly object[] {
    return [...this.writtenMessages];
  }

  /**
   * Check if transport is connected.
   *
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if transport is closed.
   *
   * @returns True if closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Clear written messages array.
   *
   * Useful for resetting state between test cases.
   */
  clearWrittenMessages(): void {
    this.writtenMessages = [];
  }

  /**
   * Get current message queue size.
   *
   * @returns Number of messages waiting to be read
   */
  getQueueSize(): number {
    return this.messageQueue.length;
  }
}
