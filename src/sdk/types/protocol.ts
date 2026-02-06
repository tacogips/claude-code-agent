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
export type OutgoingControlRequestSubtype =
  | "initialize"
  | "interrupt"
  | "set_permission_mode"
  | "set_model";

/**
 * Types of incoming control requests (CLI to SDK).
 */
export type IncomingControlRequestSubtype =
  | "mcp_message"
  | "can_use_tool"
  | "hook_callback";

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
export type OutgoingRequestPayload =
  | InitializeRequest
  | InterruptRequest
  | SetPermissionModeRequest
  | SetModelRequest;

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
export type IncomingRequestPayload =
  | McpMessageRequest
  | CanUseToolRequest
  | HookCallbackRequest;

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
export type MessageType =
  | "user"
  | "assistant"
  | "system"
  | "result"
  | "control_request"
  | "control_response";

/**
 * Type guard for JsonRpcMessage.
 */
export function isJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  // Check required jsonrpc field
  if (candidate["jsonrpc"] !== "2.0") {
    return false;
  }

  // Check optional id field
  if (candidate["id"] !== undefined) {
    const id = candidate["id"];
    if (typeof id !== "string" && typeof id !== "number") {
      return false;
    }
  }

  // Check optional method field
  if (
    candidate["method"] !== undefined &&
    typeof candidate["method"] !== "string"
  ) {
    return false;
  }

  // Check optional params field
  if (candidate["params"] !== undefined) {
    if (
      typeof candidate["params"] !== "object" ||
      candidate["params"] === null
    ) {
      return false;
    }
  }

  // Check optional result field
  if (candidate["result"] !== undefined) {
    if (
      typeof candidate["result"] !== "object" ||
      candidate["result"] === null
    ) {
      return false;
    }
  }

  // Check optional error field
  if (candidate["error"] !== undefined) {
    const error = candidate["error"];
    if (typeof error !== "object" || error === null) {
      return false;
    }

    const errorObj = error as Record<string, unknown>;
    if (
      typeof errorObj["code"] !== "number" ||
      typeof errorObj["message"] !== "string"
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for OutgoingControlRequest.
 */
export function isOutgoingControlRequest(
  value: unknown,
): value is OutgoingControlRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate["type"] !== "control_request") {
    return false;
  }

  if (typeof candidate["request_id"] !== "string") {
    return false;
  }

  if (
    typeof candidate["request"] !== "object" ||
    candidate["request"] === null
  ) {
    return false;
  }

  const request = candidate["request"] as Record<string, unknown>;
  const subtype = request["subtype"];

  return (
    subtype === "initialize" ||
    subtype === "interrupt" ||
    subtype === "set_permission_mode" ||
    subtype === "set_model"
  );
}

/**
 * Type guard for IncomingControlRequest.
 */
export function isIncomingControlRequest(
  value: unknown,
): value is IncomingControlRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate["type"] !== "control_request") {
    return false;
  }

  if (typeof candidate["request_id"] !== "string") {
    return false;
  }

  if (
    typeof candidate["request"] !== "object" ||
    candidate["request"] === null
  ) {
    return false;
  }

  const request = candidate["request"] as Record<string, unknown>;
  const subtype = request["subtype"];

  return (
    subtype === "mcp_message" ||
    subtype === "can_use_tool" ||
    subtype === "hook_callback"
  );
}

/**
 * Type guard for ControlResponse.
 */
export function isControlResponse(value: unknown): value is ControlResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate["type"] !== "control_response") {
    return false;
  }

  if (
    typeof candidate["response"] !== "object" ||
    candidate["response"] === null
  ) {
    return false;
  }

  const response = candidate["response"] as Record<string, unknown>;
  const subtype = response["subtype"];

  return subtype === "success" || subtype === "error";
}

/**
 * Type guard for McpMessageRequest.
 */
export function isMcpMessageRequest(
  value: unknown,
): value is McpMessageRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate["subtype"] !== "mcp_message") {
    return false;
  }

  if (typeof candidate["server_name"] !== "string") {
    return false;
  }

  if (
    typeof candidate["message"] !== "object" ||
    candidate["message"] === null
  ) {
    return false;
  }

  return isJsonRpcMessage(candidate["message"]);
}

/**
 * Type guard for SuccessResponse.
 */
export function isSuccessResponse(value: unknown): value is SuccessResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate["subtype"] === "success" &&
    typeof candidate["request_id"] === "string" &&
    typeof candidate["response"] === "object" &&
    candidate["response"] !== null
  );
}

/**
 * Type guard for ErrorResponse.
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate["subtype"] === "error" &&
    typeof candidate["request_id"] === "string" &&
    typeof candidate["error"] === "string"
  );
}
