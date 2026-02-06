/**
 * SDK type definitions.
 *
 * Public exports for SDK types including tool definitions,
 * MCP server configurations, session state, and control protocol.
 *
 * @module sdk/types
 */

// Tool types
export type {
  JsonSchema,
  SimpleInputSchema,
  SdkTool,
  ToolContext,
  ToolInputSchema,
  ToolResult,
  ToolResultContent,
} from "./tool";

export {
  isJsonSchema,
  isSimpleSchema,
  isToolResult,
  isToolResultContent,
} from "./tool";

// MCP server configuration types
export type {
  McpHttpServerConfig,
  McpSdkServerConfig,
  McpServerConfig,
  McpStdioServerConfig,
} from "./mcp";

export {
  isHttpServer,
  isSdkServer,
  isStdioServer,
  isValidMcpServerConfig,
} from "./mcp";

// Session state types
export type {
  SessionState,
  PendingToolCall,
  PendingPermission,
  SessionStats,
  SessionStateInfo,
} from "./state";

export { isTerminalState, isValidSessionState } from "./state";

// Control protocol types
export type {
  JsonRpcMessage,
  OutgoingControlRequestSubtype,
  IncomingControlRequestSubtype,
  InitializeRequest,
  InterruptRequest,
  SetPermissionModeRequest,
  SetModelRequest,
  OutgoingRequestPayload,
  McpMessageRequest,
  CanUseToolRequest,
  HookCallbackRequest,
  IncomingRequestPayload,
  OutgoingControlRequest,
  IncomingControlRequest,
  SuccessResponse,
  ErrorResponse,
  ResponsePayload,
  ControlResponse,
  MessageType,
} from "./protocol";

export {
  isJsonRpcMessage,
  isOutgoingControlRequest,
  isIncomingControlRequest,
  isControlResponse,
  isMcpMessageRequest,
  isSuccessResponse,
  isErrorResponse,
} from "./protocol";
