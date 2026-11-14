import { describe, test, expect } from "vitest";
import {
  isJsonRpcMessage,
  isOutgoingControlRequest,
  isIncomingControlRequest,
  isControlResponse,
  isMcpMessageRequest,
  isSuccessResponse,
  isErrorResponse,
  type JsonRpcMessage,
  type OutgoingControlRequest,
  type IncomingControlRequest,
  type ControlResponse,
  type McpMessageRequest,
} from "./protocol";

describe("Protocol Type Guards", () => {
  describe("isJsonRpcMessage", () => {
    test("should accept valid JSON-RPC message with method", () => {
      const message: JsonRpcMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "add", arguments: { a: 1, b: 2 } },
      };

      expect(isJsonRpcMessage(message)).toBe(true);
    });

    test("should accept valid JSON-RPC message with result", () => {
      const message: JsonRpcMessage = {
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: "Success" }] },
      };

      expect(isJsonRpcMessage(message)).toBe(true);
    });

    test("should accept valid JSON-RPC message with error", () => {
      const message: JsonRpcMessage = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: { details: "Missing method" },
        },
      };

      expect(isJsonRpcMessage(message)).toBe(true);
    });

    test("should accept JSON-RPC message with string id", () => {
      const message: JsonRpcMessage = {
        jsonrpc: "2.0",
        id: "req-123",
        method: "test",
      };

      expect(isJsonRpcMessage(message)).toBe(true);
    });

    test("should accept JSON-RPC message without id (notification)", () => {
      const message: JsonRpcMessage = {
        jsonrpc: "2.0",
        method: "notification",
      };

      expect(isJsonRpcMessage(message)).toBe(true);
    });

    test("should reject non-object values", () => {
      expect(isJsonRpcMessage(null)).toBe(false);
      expect(isJsonRpcMessage(undefined)).toBe(false);
      expect(isJsonRpcMessage("string")).toBe(false);
      expect(isJsonRpcMessage(123)).toBe(false);
      expect(isJsonRpcMessage([])).toBe(false);
    });

    test("should reject message without jsonrpc field", () => {
      expect(isJsonRpcMessage({ id: 1, method: "test" })).toBe(false);
    });

    test("should reject message with wrong jsonrpc version", () => {
      expect(isJsonRpcMessage({ jsonrpc: "1.0", method: "test" })).toBe(false);
    });

    test("should reject message with invalid id type", () => {
      expect(isJsonRpcMessage({ jsonrpc: "2.0", id: true })).toBe(false);
      expect(isJsonRpcMessage({ jsonrpc: "2.0", id: {} })).toBe(false);
    });

    test("should reject message with invalid method type", () => {
      expect(isJsonRpcMessage({ jsonrpc: "2.0", method: 123 })).toBe(false);
    });

    test("should reject message with invalid params type", () => {
      expect(isJsonRpcMessage({ jsonrpc: "2.0", params: "invalid" })).toBe(
        false,
      );
      expect(isJsonRpcMessage({ jsonrpc: "2.0", params: null })).toBe(false);
    });

    test("should reject message with invalid result type", () => {
      expect(isJsonRpcMessage({ jsonrpc: "2.0", result: "invalid" })).toBe(
        false,
      );
      expect(isJsonRpcMessage({ jsonrpc: "2.0", result: null })).toBe(false);
    });

    test("should reject message with invalid error structure", () => {
      expect(isJsonRpcMessage({ jsonrpc: "2.0", error: "invalid" })).toBe(
        false,
      );
      expect(isJsonRpcMessage({ jsonrpc: "2.0", error: null })).toBe(false);
      expect(
        isJsonRpcMessage({
          jsonrpc: "2.0",
          error: { code: "string", message: "error" },
        }),
      ).toBe(false);
      expect(isJsonRpcMessage({ jsonrpc: "2.0", error: { code: 1 } })).toBe(
        false,
      );
    });
  });

  describe("isOutgoingControlRequest", () => {
    test("should accept valid initialize request", () => {
      const request: OutgoingControlRequest = {
        type: "control_request",
        request_id: "req-1",
        request: {
          subtype: "initialize",
          hooks: { PreToolUse: [] },
        },
      };

      expect(isOutgoingControlRequest(request)).toBe(true);
    });

    test("should accept valid interrupt request", () => {
      const request: OutgoingControlRequest = {
        type: "control_request",
        request_id: "req-2",
        request: {
          subtype: "interrupt",
        },
      };

      expect(isOutgoingControlRequest(request)).toBe(true);
    });

    test("should accept valid set_permission_mode request", () => {
      const request: OutgoingControlRequest = {
        type: "control_request",
        request_id: "req-3",
        request: {
          subtype: "set_permission_mode",
          mode: "acceptEdits",
        },
      };

      expect(isOutgoingControlRequest(request)).toBe(true);
    });

    test("should accept valid set_model request", () => {
      const request: OutgoingControlRequest = {
        type: "control_request",
        request_id: "req-4",
        request: {
          subtype: "set_model",
          model: "claude-opus-4-5",
        },
      };

      expect(isOutgoingControlRequest(request)).toBe(true);
    });

    test("should reject invalid request types", () => {
      expect(isOutgoingControlRequest(null)).toBe(false);
      expect(isOutgoingControlRequest({})).toBe(false);
      expect(
        isOutgoingControlRequest({
          type: "wrong_type",
          request_id: "req-1",
          request: { subtype: "initialize" },
        }),
      ).toBe(false);
    });

    test("should reject request with missing fields", () => {
      expect(
        isOutgoingControlRequest({
          type: "control_request",
          request: { subtype: "initialize" },
        }),
      ).toBe(false);
      expect(
        isOutgoingControlRequest({
          type: "control_request",
          request_id: "req-1",
        }),
      ).toBe(false);
    });

    test("should reject request with invalid subtype", () => {
      expect(
        isOutgoingControlRequest({
          type: "control_request",
          request_id: "req-1",
          request: { subtype: "invalid_subtype" },
        }),
      ).toBe(false);
      expect(
        isOutgoingControlRequest({
          type: "control_request",
          request_id: "req-1",
          request: { subtype: "mcp_message" }, // Incoming subtype
        }),
      ).toBe(false);
    });
  });

  describe("isIncomingControlRequest", () => {
    test("should accept valid mcp_message request", () => {
      const request: IncomingControlRequest = {
        type: "control_request",
        request_id: "req-1",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "add" },
          },
        },
      };

      expect(isIncomingControlRequest(request)).toBe(true);
    });

    test("should accept valid can_use_tool request", () => {
      const request: IncomingControlRequest = {
        type: "control_request",
        request_id: "req-2",
        request: {
          subtype: "can_use_tool",
          tool_name: "Bash",
          input: { command: "ls" },
          suggestions: [],
        },
      };

      expect(isIncomingControlRequest(request)).toBe(true);
    });

    test("should accept valid hook_callback request", () => {
      const request: IncomingControlRequest = {
        type: "control_request",
        request_id: "req-3",
        request: {
          subtype: "hook_callback",
          callback_id: "hook-1",
          input: { data: "test" },
          tool_use_id: "tool-123",
        },
      };

      expect(isIncomingControlRequest(request)).toBe(true);
    });

    test("should reject invalid request types", () => {
      expect(isIncomingControlRequest(null)).toBe(false);
      expect(isIncomingControlRequest({})).toBe(false);
    });

    test("should reject request with outgoing subtypes", () => {
      expect(
        isIncomingControlRequest({
          type: "control_request",
          request_id: "req-1",
          request: { subtype: "initialize" }, // Outgoing subtype
        }),
      ).toBe(false);
    });
  });

  describe("isControlResponse", () => {
    test("should accept valid success response", () => {
      const response: ControlResponse = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: "req-1",
          response: { mcp_response: { jsonrpc: "2.0", id: 1, result: {} } },
        },
      };

      expect(isControlResponse(response)).toBe(true);
    });

    test("should accept valid error response", () => {
      const response: ControlResponse = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: "req-1",
          error: "Tool not found",
        },
      };

      expect(isControlResponse(response)).toBe(true);
    });

    test("should reject invalid response types", () => {
      expect(isControlResponse(null)).toBe(false);
      expect(isControlResponse({})).toBe(false);
      expect(
        isControlResponse({
          type: "wrong_type",
          response: { subtype: "success", request_id: "req-1", response: {} },
        }),
      ).toBe(false);
    });

    test("should reject response with invalid subtype", () => {
      expect(
        isControlResponse({
          type: "control_response",
          response: { subtype: "invalid", request_id: "req-1" },
        }),
      ).toBe(false);
    });
  });

  describe("isMcpMessageRequest", () => {
    test("should accept valid mcp_message request payload", () => {
      const request: McpMessageRequest = {
        subtype: "mcp_message",
        server_name: "calculator",
        message: {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "add", arguments: { a: 1, b: 2 } },
        },
      };

      expect(isMcpMessageRequest(request)).toBe(true);
    });

    test("should reject invalid mcp_message request", () => {
      expect(isMcpMessageRequest(null)).toBe(false);
      expect(isMcpMessageRequest({})).toBe(false);
      expect(
        isMcpMessageRequest({
          subtype: "mcp_message",
          server_name: "test",
          message: "invalid", // Not a JsonRpcMessage
        }),
      ).toBe(false);
      expect(
        isMcpMessageRequest({
          subtype: "mcp_message",
          message: { jsonrpc: "2.0" }, // Missing server_name
        }),
      ).toBe(false);
    });
  });

  describe("isSuccessResponse", () => {
    test("should accept valid success response", () => {
      expect(
        isSuccessResponse({
          subtype: "success",
          request_id: "req-1",
          response: { data: "result" },
        }),
      ).toBe(true);
    });

    test("should reject invalid success response", () => {
      expect(isSuccessResponse(null)).toBe(false);
      expect(isSuccessResponse({ subtype: "success" })).toBe(false);
      expect(
        isSuccessResponse({
          subtype: "success",
          request_id: "req-1",
          response: null, // null not allowed
        }),
      ).toBe(false);
    });
  });

  describe("isErrorResponse", () => {
    test("should accept valid error response", () => {
      expect(
        isErrorResponse({
          subtype: "error",
          request_id: "req-1",
          error: "Something went wrong",
        }),
      ).toBe(true);
    });

    test("should reject invalid error response", () => {
      expect(isErrorResponse(null)).toBe(false);
      expect(isErrorResponse({ subtype: "error" })).toBe(false);
      expect(
        isErrorResponse({
          subtype: "error",
          request_id: "req-1",
          error: 123, // Must be string
        }),
      ).toBe(false);
    });
  });
});
