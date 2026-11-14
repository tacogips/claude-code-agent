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
import type { ToolRegistry } from "./tool-registry";
import type { OutgoingRequestPayload, ControlResponse } from "./types/protocol";
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
export declare class ControlProtocolHandler extends EventEmitter {
    private readonly transport;
    private readonly toolRegistries;
    private readonly pendingRequests;
    private readonly defaultTimeout;
    private requestIdCounter;
    private initialized;
    /**
     * Create a new control protocol handler.
     *
     * @param transport - Transport to use for CLI communication
     * @param options - Configuration options
     */
    constructor(transport: Transport, options?: ControlProtocolHandlerOptions);
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
    registerToolRegistry(serverName: string, registry: ToolRegistry): void;
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
    initialize(): Promise<void>;
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
    sendRequest(request: OutgoingRequestPayload, timeout?: number): Promise<ControlResponse>;
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
    handleIncomingMessage(msg: unknown): Promise<void>;
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
    processMessages(): Promise<void>;
    /**
     * Clean up resources.
     *
     * @example
     * ```typescript
     * handler.cleanup();
     * await transport.close();
     * ```
     */
    cleanup(): void;
    /**
     * Generate unique request ID.
     *
     * @returns Unique request ID string
     */
    private generateRequestId;
    /**
     * Handle incoming control response.
     * Matches response to pending request and resolves/rejects promise.
     *
     * @param response - Control response from CLI
     */
    private handleControlResponse;
    /**
     * Handle incoming control request from CLI.
     * Routes to appropriate handler based on request subtype.
     *
     * @param request - Incoming control request
     */
    private handleIncomingControlRequest;
    /**
     * Handle MCP message from CLI.
     * Routes to tools/list or tools/call handlers.
     *
     * @param serverName - MCP server name
     * @param message - JSON-RPC message
     * @returns JSON-RPC response
     * @throws {ControlProtocolError} If server not found or message invalid
     */
    private handleMcpMessage;
    /**
     * Handle tools/list request.
     * Returns list of tools from registry.
     *
     * @param serverName - MCP server name
     * @param message - JSON-RPC message
     * @returns JSON-RPC response with tool list
     */
    private handleToolsListRequest;
    /**
     * Handle tools/call request.
     * Executes tool handler and returns result.
     *
     * @param serverName - MCP server name
     * @param message - JSON-RPC message
     * @returns JSON-RPC response with tool result
     */
    private handleToolsCallRequest;
    /**
     * Send control response to CLI.
     *
     * @param requestId - Request ID to respond to
     * @param response - Response payload
     */
    private sendControlResponse;
    /**
     * Send error response to CLI.
     *
     * @param requestId - Request ID to respond to
     * @param error - Error message
     */
    private sendErrorResponse;
}
//# sourceMappingURL=control-protocol.d.ts.map