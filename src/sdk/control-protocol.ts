/**
 * Control Protocol Handler
 *
 * Manages bidirectional control protocol between SDK and Claude Code CLI.
 * Routes MCP messages to tool handlers and manages request/response lifecycle.
 *
 * @module sdk/control-protocol
 */

import { EventEmitter } from "events";
import type { Transport } from "./transport/transport";
import { ToolRegistry } from "./tool-registry";
import { ControlProtocolError, TimeoutError } from "./errors";
import type {
  JsonRpcMessage,
  OutgoingRequestPayload,
  IncomingControlRequest,
  ControlResponse,
} from "./types/protocol";
import {
  isIncomingControlRequest,
  isControlResponse,
  isMcpMessageRequest,
  isSuccessResponse,
  isErrorResponse,
  isJsonRpcMessage,
} from "./types/protocol";
import type { ToolContext } from "./types/tool";
import { createTaggedLogger } from "../logger";

const logger = createTaggedLogger("control-protocol");

/**
 * Helper to create JsonRpcMessage with proper id handling for exactOptionalPropertyTypes.
 */
function createJsonRpcResponse(
  id: string | number | undefined,
  options:
    | { result: object }
    | { error: { code: number; message: string; data?: unknown } },
): JsonRpcMessage {
  const base: JsonRpcMessage = { jsonrpc: "2.0" as const };
  if (id !== undefined) {
    return { ...base, id, ...options };
  }
  return { ...base, ...options };
}

/**
 * Internal tracking for pending control requests.
 */
interface PendingRequest {
  readonly requestId: string;
  readonly resolve: (response: ControlResponse) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: Timer;
}

/**
 * Tool call information for events.
 */
export interface ToolCallInfo {
  readonly toolUseId: string;
  readonly toolName: string;
  readonly serverName: string;
  readonly arguments: Record<string, unknown>;
}

/**
 * Tool result information for events.
 */
export interface ToolResultInfo {
  readonly toolUseId: string;
  readonly toolName: string;
  readonly result: object;
  readonly isError: boolean;
}

/**
 * Options for ControlProtocolHandler.
 */
export interface ControlProtocolHandlerOptions {
  /** Default timeout for requests in milliseconds (default: 30000) */
  readonly defaultTimeout?: number;
}

/**
 * Handles control protocol between SDK and Claude Code CLI.
 * Routes MCP messages to SDK tool handlers and manages request/response lifecycle.
 *
 * @example
 * ```typescript
 * const transport = new SubprocessTransport({ cliPath: '/usr/local/bin/claude' });
 * const handler = new ControlProtocolHandler(transport);
 *
 * // Register tool registry for a server
 * const registry = new ToolRegistry('calculator');
 * registry.register(addTool);
 * handler.registerToolRegistry('calculator', registry);
 *
 * // Initialize protocol
 * await handler.initialize();
 *
 * // Start processing messages
 * await handler.processMessages();
 * ```
 *
 * @fires message - Emitted when any message is received
 * @fires toolCall - Emitted when Claude calls a tool
 * @fires toolResult - Emitted when a tool returns a result
 * @fires error - Emitted when an error occurs
 */
export class ControlProtocolHandler extends EventEmitter {
  private readonly transport: Transport;
  private readonly toolRegistries = new Map<string, ToolRegistry>();
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly defaultTimeout: number;
  private requestIdCounter: number = 0;
  private initialized: boolean = false;

  /**
   * Create a new control protocol handler.
   *
   * @param transport - Transport to use for CLI communication
   * @param options - Configuration options
   */
  constructor(transport: Transport, options?: ControlProtocolHandlerOptions) {
    super();
    this.transport = transport;
    this.defaultTimeout = options?.defaultTimeout ?? 30000;
  }

  /**
   * Register a tool registry for a server.
   *
   * @param serverName - MCP server name
   * @param registry - Tool registry for this server
   *
   * @example
   * ```typescript
   * const registry = new ToolRegistry('my-server');
   * registry.register(myTool);
   * handler.registerToolRegistry('my-server', registry);
   * ```
   */
  registerToolRegistry(serverName: string, registry: ToolRegistry): void {
    if (this.toolRegistries.has(serverName)) {
      throw new Error(
        `Tool registry for server '${serverName}' is already registered`,
      );
    }
    this.toolRegistries.set(serverName, registry);
    logger.debug(`Registered tool registry for server: ${serverName}`);
  }

  /**
   * Initialize the control protocol.
   * Sends initialize request to CLI and waits for response.
   *
   * @throws {TimeoutError} If initialization times out
   * @throws {ControlProtocolError} If initialization fails
   *
   * @example
   * ```typescript
   * await handler.initialize();
   * console.log('Protocol initialized');
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new ControlProtocolError("Control protocol already initialized");
    }

    logger.debug("Initializing control protocol");
    const response = await this.sendRequest({ subtype: "initialize" });

    if (response.response.subtype === "error") {
      throw new ControlProtocolError(
        `Initialization failed: ${response.response.error}`,
      );
    }

    this.initialized = true;
    logger.info("Control protocol initialized");
  }

  /**
   * Send a control request to CLI and wait for response.
   *
   * @param request - Outgoing control request payload (without type and request_id)
   * @param timeout - Optional timeout in ms (default: defaultTimeout)
   * @returns Response from CLI
   * @throws {TimeoutError} If request times out
   * @throws {ControlProtocolError} If protocol error occurs
   *
   * @example
   * ```typescript
   * const response = await handler.sendRequest({
   *   subtype: 'set_model',
   *   model: 'claude-opus-4'
   * });
   * ```
   */
  async sendRequest(
    request: OutgoingRequestPayload,
    timeout?: number,
  ): Promise<ControlResponse> {
    const requestId = this.generateRequestId();
    const timeoutMs = timeout ?? this.defaultTimeout;

    logger.debug(`Sending request ${requestId}: ${request.subtype}`);

    // Create promise for response
    const responsePromise = new Promise<ControlResponse>((resolve, reject) => {
      // Set timeout
      const timeoutTimer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(
          new TimeoutError(`Control request ${request.subtype}`, timeoutMs),
        );
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(requestId, {
        requestId,
        resolve,
        reject,
        timeout: timeoutTimer,
      });
    });

    // Send request
    const outgoingRequest = {
      type: "control_request" as const,
      request_id: requestId,
      request,
    };

    try {
      await this.transport.write(JSON.stringify(outgoingRequest));
    } catch (error) {
      this.pendingRequests.delete(requestId);
      throw new ControlProtocolError(
        `Failed to send request: ${error instanceof Error ? error.message : String(error)}`,
        requestId,
      );
    }

    return responsePromise;
  }

  /**
   * Handle incoming message from transport.
   * Routes control requests to appropriate handlers.
   * Called by agent when reading messages from transport.
   *
   * @param msg - Message to handle
   *
   * @example
   * ```typescript
   * for await (const msg of transport.readMessages()) {
   *   await handler.handleIncomingMessage(msg);
   * }
   * ```
   */
  async handleIncomingMessage(msg: unknown): Promise<void> {
    try {
      // Emit raw message event
      this.emit("message", msg);

      // Check if it's a control response
      if (isControlResponse(msg)) {
        await this.handleControlResponse(msg);
        return;
      }

      // Check if it's a control request
      if (isIncomingControlRequest(msg)) {
        await this.handleIncomingControlRequest(msg);
        return;
      }

      // Check if it's a session result message (CLI has finished)
      if (
        typeof msg === "object" &&
        msg !== null &&
        "type" in msg &&
        (msg as { type: unknown }).type === "result"
      ) {
        const resultMsg = msg as {
          subtype?: string;
          is_error?: boolean;
          result?: string;
        };
        const success =
          resultMsg.subtype === "success" && resultMsg.is_error !== true;
        this.emit("result", {
          success,
          result: resultMsg.result,
          raw: msg,
        });
        return;
      }

      // Other known message types (system, assistant) are handled via the "message" event
      if (
        typeof msg === "object" &&
        msg !== null &&
        "type" in msg &&
        typeof (msg as { type: unknown }).type === "string"
      ) {
        return;
      }

      // Unknown message type - log warning
      logger.warn("Unknown message type received", { msg });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error handling incoming message", { error: err });
      this.emit("error", err);
    }
  }

  /**
   * Process message stream from transport.
   * Call this to start processing messages from the transport.
   *
   * @example
   * ```typescript
   * // Start processing in background
   * handler.processMessages().catch(err => {
   *   console.error('Message processing failed:', err);
   * });
   * ```
   */
  async processMessages(): Promise<void> {
    logger.debug("Starting message processing");

    try {
      for await (const msg of this.transport.readMessages()) {
        await this.handleIncomingMessage(msg);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Message processing error", { error: err });
      this.emit("error", err);
      throw err;
    }

    logger.debug("Message processing ended");
  }

  /**
   * Clean up resources.
   *
   * @example
   * ```typescript
   * handler.cleanup();
   * await transport.close();
   * ```
   */
  cleanup(): void {
    logger.debug("Cleaning up control protocol handler");

    // Clear all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(
        new ControlProtocolError("Control protocol handler cleaned up"),
      );
    }
    this.pendingRequests.clear();

    // Clear registries
    this.toolRegistries.clear();

    this.initialized = false;
    logger.info("Control protocol handler cleaned up");
  }

  /**
   * Generate unique request ID.
   *
   * @returns Unique request ID string
   */
  private generateRequestId(): string {
    this.requestIdCounter += 1;
    return `sdk-req-${this.requestIdCounter}`;
  }

  /**
   * Handle incoming control response.
   * Matches response to pending request and resolves/rejects promise.
   *
   * @param response - Control response from CLI
   */
  private async handleControlResponse(
    response: ControlResponse,
  ): Promise<void> {
    const requestId = response.response.request_id;
    const pending = this.pendingRequests.get(requestId);

    if (pending === undefined) {
      logger.warn(`Received response for unknown request: ${requestId}`);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    // Resolve or reject based on response type
    if (isSuccessResponse(response.response)) {
      logger.debug(`Request ${requestId} succeeded`);
      pending.resolve(response);
    } else if (isErrorResponse(response.response)) {
      logger.debug(`Request ${requestId} failed: ${response.response.error}`);
      pending.reject(
        new ControlProtocolError(response.response.error, requestId),
      );
    } else {
      pending.reject(
        new ControlProtocolError("Invalid response subtype", requestId),
      );
    }
  }

  /**
   * Handle incoming control request from CLI.
   * Routes to appropriate handler based on request subtype.
   *
   * @param request - Incoming control request
   */
  private async handleIncomingControlRequest(
    request: IncomingControlRequest,
  ): Promise<void> {
    const { request_id, request: payload } = request;

    logger.debug(`Handling incoming request ${request_id}: ${payload.subtype}`);

    try {
      if (isMcpMessageRequest(payload)) {
        const mcpResponse = await this.handleMcpMessage(
          payload.server_name,
          payload.message,
        );
        await this.sendControlResponse(request_id, {
          mcp_response: mcpResponse,
        });
      } else if (payload.subtype === "can_use_tool") {
        // Emit event for permission callback
        // For now, auto-approve all tools
        await this.sendControlResponse(request_id, { allowed: true });
      } else if (payload.subtype === "hook_callback") {
        // Emit event for hook callback
        await this.sendControlResponse(request_id, {});
      } else {
        // Exhaustiveness check - this code should be unreachable
        // TypeScript will error here if a new subtype is added but not handled
        const exhaustiveCheck: never = payload;
        throw new Error(
          `Unknown request subtype: ${(exhaustiveCheck as { subtype: string }).subtype}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error handling request ${request_id}`, { error });
      await this.sendErrorResponse(request_id, errorMessage);
    }
  }

  /**
   * Handle MCP message from CLI.
   * Routes to tools/list or tools/call handlers.
   *
   * @param serverName - MCP server name
   * @param message - JSON-RPC message
   * @returns JSON-RPC response
   * @throws {ControlProtocolError} If server not found or message invalid
   */
  private async handleMcpMessage(
    serverName: string,
    message: JsonRpcMessage,
  ): Promise<JsonRpcMessage> {
    if (!isJsonRpcMessage(message)) {
      throw new ControlProtocolError("Invalid JSON-RPC message");
    }

    const method = message.method;

    if (method === "tools/list") {
      return this.handleToolsListRequest(serverName, message);
    }

    if (method === "tools/call") {
      return this.handleToolsCallRequest(serverName, message);
    }

    // Unknown method
    return createJsonRpcResponse(message.id, {
      error: {
        code: -32601,
        message: `Method not found: ${method ?? "unknown"}`,
      },
    });
  }

  /**
   * Handle tools/list request.
   * Returns list of tools from registry.
   *
   * @param serverName - MCP server name
   * @param message - JSON-RPC message
   * @returns JSON-RPC response with tool list
   */
  private async handleToolsListRequest(
    serverName: string,
    message: JsonRpcMessage,
  ): Promise<JsonRpcMessage> {
    const registry = this.toolRegistries.get(serverName);

    if (registry === undefined) {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32000,
          message: `Server not found: ${serverName}`,
        },
      });
    }

    const tools = registry.getToolListForMcp();

    logger.debug(`Returning ${tools.length} tools for server ${serverName}`);

    return createJsonRpcResponse(message.id, {
      result: { tools },
    });
  }

  /**
   * Handle tools/call request.
   * Executes tool handler and returns result.
   *
   * @param serverName - MCP server name
   * @param message - JSON-RPC message
   * @returns JSON-RPC response with tool result
   */
  private async handleToolsCallRequest(
    serverName: string,
    message: JsonRpcMessage,
  ): Promise<JsonRpcMessage> {
    const registry = this.toolRegistries.get(serverName);

    if (registry === undefined) {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32000,
          message: `Server not found: ${serverName}`,
        },
      });
    }

    const params = message.params as
      | { name: string; arguments: Record<string, unknown> }
      | undefined;

    if (params === undefined || typeof params !== "object") {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32602,
          message: "Invalid params",
        },
      });
    }

    const toolName = params["name"];
    const toolArgs = params["arguments"];

    if (typeof toolName !== "string") {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32602,
          message: "Missing or invalid tool name",
        },
      });
    }

    if (
      typeof toolArgs !== "object" ||
      toolArgs === null ||
      Array.isArray(toolArgs)
    ) {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32602,
          message: "Invalid tool arguments",
        },
      });
    }

    // Emit tool call event
    const toolCallInfo: ToolCallInfo = {
      toolUseId: String(message.id ?? "unknown"),
      toolName,
      serverName,
      arguments: toolArgs,
    };
    this.emit("toolCall", toolCallInfo);

    try {
      // Build tool context
      const context: ToolContext = {
        toolUseId: String(message.id ?? "unknown"),
        sessionId: "unknown", // TODO: Get from agent context
      };

      // Execute tool
      const result = await registry.handleToolCall(toolName, toolArgs, context);

      // Emit tool result event
      const toolResultInfo: ToolResultInfo = {
        toolUseId: context.toolUseId,
        toolName,
        result: { content: result.content },
        isError: result.isError ?? false,
      };
      this.emit("toolResult", toolResultInfo);

      logger.debug(`Tool ${toolName} executed successfully`);

      // Return MCP-compatible result
      const resultPayload: { content: readonly object[]; isError?: boolean } = {
        content: result.content,
      };
      if (result.isError !== undefined) {
        resultPayload.isError = result.isError;
      }
      return createJsonRpcResponse(message.id, { result: resultPayload });
    } catch (error) {
      logger.error(`Tool ${toolName} execution failed`, { error });

      // Emit tool result error event
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const toolResultInfo: ToolResultInfo = {
        toolUseId: String(message.id ?? "unknown"),
        toolName,
        result: { content: [{ type: "text", text: errorMessage }] },
        isError: true,
      };
      this.emit("toolResult", toolResultInfo);

      // Return error as tool result (not JSON-RPC error)
      return createJsonRpcResponse(message.id, {
        result: {
          content: [{ type: "text", text: errorMessage }],
          isError: true,
        },
      });
    }
  }

  /**
   * Send control response to CLI.
   *
   * @param requestId - Request ID to respond to
   * @param response - Response payload
   */
  private async sendControlResponse(
    requestId: string,
    response: object,
  ): Promise<void> {
    const controlResponse = {
      type: "control_response" as const,
      response: {
        subtype: "success" as const,
        request_id: requestId,
        response,
      },
    };

    await this.transport.write(JSON.stringify(controlResponse));
    logger.debug(`Sent success response for request ${requestId}`);
  }

  /**
   * Send error response to CLI.
   *
   * @param requestId - Request ID to respond to
   * @param error - Error message
   */
  private async sendErrorResponse(
    requestId: string,
    error: string,
  ): Promise<void> {
    const controlResponse = {
      type: "control_response" as const,
      response: {
        subtype: "error" as const,
        request_id: requestId,
        error,
      },
    };

    await this.transport.write(JSON.stringify(controlResponse));
    logger.debug(`Sent error response for request ${requestId}: ${error}`);
  }
}
