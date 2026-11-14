/**
 * Control Protocol Types
 *
 * Type definitions for the bidirectional control protocol between SDK and Claude Code CLI.
 * Uses JSON-RPC 2.0 for message structure.
 */
/**
 * JSON-RPC 2.0 message structure.
 */
export interface JsonRpcMessage {
    readonly jsonrpc: "2.0";
    readonly id?: string | number;
    readonly method?: string;
    readonly params?: object;
    readonly result?: object;
    readonly error?: {
        readonly code: number;
        readonly message: string;
        readonly data?: unknown;
    };
}
/**
 * Types of outgoing control requests (SDK to CLI).
 */
export type OutgoingControlRequestSubtype = "initialize" | "interrupt" | "set_permission_mode" | "set_model";
/**
 * Types of incoming control requests (CLI to SDK).
 */
export type IncomingControlRequestSubtype = "mcp_message" | "can_use_tool" | "hook_callback";
/**
 * Initialize request (SDK to CLI).
 */
export interface InitializeRequest {
    readonly subtype: "initialize";
    readonly hooks?: object;
}
/**
 * Interrupt request (SDK to CLI).
 */
export interface InterruptRequest {
    readonly subtype: "interrupt";
}
/**
 * Set permission mode request (SDK to CLI).
 */
export interface SetPermissionModeRequest {
    readonly subtype: "set_permission_mode";
    readonly mode: string;
}
/**
 * Set model request (SDK to CLI).
 */
export interface SetModelRequest {
    readonly subtype: "set_model";
    readonly model: string | null;
}
/**
 * Union of all outgoing request types.
 */
export type OutgoingRequestPayload = InitializeRequest | InterruptRequest | SetPermissionModeRequest | SetModelRequest;
/**
 * MCP message request (CLI to SDK for tool calls).
 */
export interface McpMessageRequest {
    readonly subtype: "mcp_message";
    readonly server_name: string;
    readonly message: JsonRpcMessage;
}
/**
 * Can use tool request (CLI asking for permission).
 */
export interface CanUseToolRequest {
    readonly subtype: "can_use_tool";
    readonly tool_name: string;
    readonly input: object;
    readonly suggestions: readonly object[];
}
/**
 * Hook callback request (CLI to SDK).
 */
export interface HookCallbackRequest {
    readonly subtype: "hook_callback";
    readonly callback_id: string;
    readonly input: object;
    readonly tool_use_id?: string;
}
/**
 * Union of all incoming request types.
 */
export type IncomingRequestPayload = McpMessageRequest | CanUseToolRequest | HookCallbackRequest;
/**
 * Outgoing control request from SDK to CLI.
 */
export interface OutgoingControlRequest {
    readonly type: "control_request";
    readonly request_id: string;
    readonly request: OutgoingRequestPayload;
}
/**
 * Incoming control request from CLI to SDK.
 */
export interface IncomingControlRequest {
    readonly type: "control_request";
    readonly request_id: string;
    readonly request: IncomingRequestPayload;
}
/**
 * Success response.
 */
export interface SuccessResponse {
    readonly subtype: "success";
    readonly request_id: string;
    readonly response: object;
}
/**
 * Error response.
 */
export interface ErrorResponse {
    readonly subtype: "error";
    readonly request_id: string;
    readonly error: string;
}
/**
 * Union of response types.
 */
export type ResponsePayload = SuccessResponse | ErrorResponse;
/**
 * Control response.
 */
export interface ControlResponse {
    readonly type: "control_response";
    readonly response: ResponsePayload;
}
/**
 * Message types from CLI.
 */
export type MessageType = "user" | "assistant" | "system" | "result" | "control_request" | "control_response";
/**
 * Type guard for JsonRpcMessage.
 */
export declare function isJsonRpcMessage(value: unknown): value is JsonRpcMessage;
/**
 * Type guard for OutgoingControlRequest.
 */
export declare function isOutgoingControlRequest(value: unknown): value is OutgoingControlRequest;
/**
 * Type guard for IncomingControlRequest.
 */
export declare function isIncomingControlRequest(value: unknown): value is IncomingControlRequest;
/**
 * Type guard for ControlResponse.
 */
export declare function isControlResponse(value: unknown): value is ControlResponse;
/**
 * Type guard for McpMessageRequest.
 */
export declare function isMcpMessageRequest(value: unknown): value is McpMessageRequest;
/**
 * Type guard for SuccessResponse.
 */
export declare function isSuccessResponse(value: unknown): value is SuccessResponse;
/**
 * Type guard for ErrorResponse.
 */
export declare function isErrorResponse(value: unknown): value is ErrorResponse;
//# sourceMappingURL=protocol.d.ts.map