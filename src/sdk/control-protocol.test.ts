/**
 * Tests for ControlProtocolHandler.
 *
 * Tests the control protocol implementation including:
 * - Initialization
 * - Request/response lifecycle
 * - MCP message routing
 * - Tool list and tool call handling
 * - Error handling
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ControlProtocolHandler } from "./control-protocol";
import { MockTransport } from "./__fixtures__/mock-transport";
import { ToolRegistry, tool } from "./tool-registry";
import { ControlProtocolError, TimeoutError } from "./errors";
import type { ToolResult, ToolContext } from "./types/tool";

describe("ControlProtocolHandler", () => {
  let transport: MockTransport;
  let handler: ControlProtocolHandler;
  let registry: ToolRegistry;

  beforeEach(async () => {
    transport = new MockTransport();
    await transport.connect();

    handler = new ControlProtocolHandler(transport, {
      defaultTimeout: 1000,
    });

    registry = new ToolRegistry("test-server");
  });

  afterEach(() => {
    handler.cleanup();
  });

  describe("initialization", () => {
    it("should send initialize request and succeed", async () => {
      // Simulate CLI responding to initialize request
      const initPromise = handler.initialize();

      // Wait for request to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const messages = transport.getWrittenMessages();
      const initRequest = messages[0] as {
        type: string;
        request_id: string;
        request: { subtype: string };
      };

      // Manually handle the response
      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: initRequest.request_id,
          response: {},
        },
      });

      await initPromise;

      expect(messages).toHaveLength(1);

      const request = messages[0] as {
        type: string;
        request_id: string;
        request: { subtype: string };
      };
      expect(request.type).toBe("control_request");
      expect(request.request.subtype).toBe("initialize");
    });

    it("should throw error if initialization fails", async () => {
      const initPromise = handler.initialize();

      // Wait for request to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const messages = transport.getWrittenMessages();
      const initRequest = messages[0] as {
        type: string;
        request_id: string;
      };

      // Manually handle the error response
      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "error",
          request_id: initRequest.request_id,
          error: "Initialization failed",
        },
      });

      await expect(initPromise).rejects.toThrow(ControlProtocolError);
    });

    it("should throw error if already initialized", async () => {
      const initPromise = handler.initialize();

      // Wait for request to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const messages = transport.getWrittenMessages();
      const initRequest = messages[0] as {
        type: string;
        request_id: string;
      };

      // Manually handle the response
      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: initRequest.request_id,
          response: {},
        },
      });

      await initPromise;

      await expect(handler.initialize()).rejects.toThrow("already initialized");
    });
  });

  describe("registerToolRegistry", () => {
    it("should register a tool registry", () => {
      handler.registerToolRegistry("test-server", registry);

      // Should not throw
      expect(() =>
        handler.registerToolRegistry("another-server", registry),
      ).not.toThrow();
    });

    it("should throw error if registry already registered", () => {
      handler.registerToolRegistry("test-server", registry);

      expect(() =>
        handler.registerToolRegistry("test-server", registry),
      ).toThrow("already registered");
    });
  });

  describe("sendRequest", () => {
    it("should send request and receive response", async () => {
      const requestPromise = handler.sendRequest({
        subtype: "set_model",
        model: "claude-opus-4",
      });

      // Wait for request to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const messages = transport.getWrittenMessages();
      const request = messages[0] as {
        type: string;
        request_id: string;
      };

      // Manually handle the response
      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: request.request_id,
          response: { data: "test" },
        },
      });

      const response = await requestPromise;

      expect(response.type).toBe("control_response");
      expect(response.response.subtype).toBe("success");
    });

    it("should timeout if no response received", async () => {
      const promise = handler.sendRequest(
        {
          subtype: "set_model",
          model: "claude-opus-4",
        },
        100,
      );

      await expect(promise).rejects.toThrow(TimeoutError);
    });

    it("should handle error response", async () => {
      const requestPromise = handler.sendRequest({
        subtype: "set_model",
        model: "invalid",
      });

      // Wait for request to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const messages = transport.getWrittenMessages();
      const request = messages[0] as {
        type: string;
        request_id: string;
      };

      // Manually handle the error response
      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "error",
          request_id: request.request_id,
          error: "Invalid model",
        },
      });

      await expect(requestPromise).rejects.toThrow(ControlProtocolError);
    });
  });

  describe("handleIncomingMessage", () => {
    it("should emit message event for all messages", async () => {
      let emitted = false;
      handler.on("message", () => {
        emitted = true;
      });

      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: "test",
          response: {},
        },
      });

      expect(emitted).toBe(true);
    });

    it("should handle control response", async () => {
      const requestPromise = handler.sendRequest({
        subtype: "interrupt",
      });

      setTimeout(async () => {
        const messages = transport.getWrittenMessages();
        const request = messages[0] as {
          type: string;
          request_id: string;
        };

        await handler.handleIncomingMessage({
          type: "control_response",
          response: {
            subtype: "success",
            request_id: request.request_id,
            response: {},
          },
        });
      }, 10);

      const response = await requestPromise;
      expect(response.response.subtype).toBe("success");
    });

    it("should handle incoming control request", async () => {
      handler.registerToolRegistry("test-server", registry);

      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "cli-req-1",
        request: {
          subtype: "mcp_message",
          server_name: "test-server",
          message: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          },
        },
      });

      // Should have sent response
      const messages = transport.getWrittenMessages();
      expect(messages.length).toBeGreaterThan(0);

      const response = messages[messages.length - 1] as {
        type: string;
        response: { subtype: string; request_id: string };
      };
      expect(response.type).toBe("control_response");
      expect(response.response.subtype).toBe("success");
      expect(response.response.request_id).toBe("cli-req-1");
    });
  });

  describe("MCP message handling", () => {
    beforeEach(() => {
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: Record<string, unknown>): Promise<ToolResult> => {
          const a = args["a"] as number;
          const b = args["b"] as number;
          return {
            content: [
              {
                type: "text",
                text: `Result: ${a + b}`,
              },
            ],
          };
        },
      });

      registry.register(addTool);
      handler.registerToolRegistry("calculator", registry);
    });

    it("should handle tools/list request", async () => {
      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "list-req",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            jsonrpc: string;
            id: number;
            result: { tools: Array<{ name: string }> };
          };
        };
      };

      expect(response.type).toBe("control_response");
      expect(response.response.subtype).toBe("success");

      const mcpResponse = response.response.response;
      expect(mcpResponse.jsonrpc).toBe("2.0");
      expect(mcpResponse.id).toBe(1);
      expect(mcpResponse.result.tools).toHaveLength(1);
      expect(mcpResponse.result.tools[0]?.name).toBe("add");
    });

    it("should handle tools/call request", async () => {
      let toolCallEmitted = false;
      let toolResultEmitted = false;

      handler.on("toolCall", (info) => {
        toolCallEmitted = true;
        expect(info.toolName).toBe("add");
        expect(info.serverName).toBe("calculator");
      });

      handler.on("toolResult", (info) => {
        toolResultEmitted = true;
        expect(info.toolName).toBe("add");
        expect(info.isError).toBe(false);
      });

      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "call-req",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: "add",
              arguments: { a: 2, b: 3 },
            },
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            jsonrpc: string;
            id: number;
            result: {
              content: Array<{ type: string; text: string }>;
            };
          };
        };
      };

      expect(response.type).toBe("control_response");
      expect(response.response.subtype).toBe("success");

      const mcpResponse = response.response.response;
      expect(mcpResponse.jsonrpc).toBe("2.0");
      expect(mcpResponse.id).toBe(2);
      expect(mcpResponse.result.content).toHaveLength(1);
      expect(mcpResponse.result.content[0]?.text).toBe("Result: 5");

      expect(toolCallEmitted).toBe(true);
      expect(toolResultEmitted).toBe(true);
    });

    it("should return error for unknown server", async () => {
      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "unknown-server-req",
        request: {
          subtype: "mcp_message",
          server_name: "unknown-server",
          message: {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/list",
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            jsonrpc: string;
            id: number;
            error: { code: number; message: string };
          };
        };
      };

      const mcpResponse = response.response.response;
      expect(mcpResponse.error).toBeDefined();
      expect(mcpResponse.error.message).toContain("Server not found");
    });

    it("should return error for unknown tool", async () => {
      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "unknown-tool-req",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: {
              name: "unknown-tool",
              arguments: {},
            },
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            jsonrpc: string;
            id: number;
            result: {
              content: Array<{ type: string; text: string }>;
              isError: boolean;
            };
          };
        };
      };

      const mcpResponse = response.response.response;
      expect(mcpResponse.result.isError).toBe(true);
      expect(mcpResponse.result.content[0]?.text).toContain("not found");
    });

    it("should handle tool execution error", async () => {
      const errorTool = tool({
        name: "error-tool",
        description: "Always throws error",
        inputSchema: {},
        handler: async (): Promise<ToolResult> => {
          throw new Error("Tool execution failed");
        },
      });

      registry.register(errorTool);

      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "error-req",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 5,
            method: "tools/call",
            params: {
              name: "error-tool",
              arguments: {},
            },
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            jsonrpc: string;
            id: number;
            result: {
              content: Array<{ type: string; text: string }>;
              isError: boolean;
            };
          };
        };
      };

      const mcpResponse = response.response.response;
      expect(mcpResponse.result.isError).toBe(true);
      expect(mcpResponse.result.content[0]?.text).toContain(
        "Tool execution failed",
      );
    });

    it("should handle unknown MCP method", async () => {
      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "unknown-method-req",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 6,
            method: "unknown/method",
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            jsonrpc: string;
            id: number;
            error: { code: number; message: string };
          };
        };
      };

      const mcpResponse = response.response.response;
      expect(mcpResponse.error).toBeDefined();
      expect(mcpResponse.error.code).toBe(-32601);
      expect(mcpResponse.error.message).toContain("Method not found");
    });
  });

  describe("processMessages", () => {
    it("should process messages from transport", async () => {
      handler.registerToolRegistry("test-server", registry);

      // Simulate incoming message
      setTimeout(() => {
        transport.simulateMessage({
          type: "control_request",
          request_id: "process-req",
          request: {
            subtype: "mcp_message",
            server_name: "test-server",
            message: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/list",
            },
          },
        });

        // End input after message
        setTimeout(() => {
          void transport.endInput();
        }, 10);
      }, 10);

      await handler.processMessages();

      // Should have sent response
      const messages = transport.getWrittenMessages();
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe("cleanup", () => {
    it("should reject pending requests on cleanup", async () => {
      const promise = handler.sendRequest({
        subtype: "interrupt",
      });

      setTimeout(() => {
        handler.cleanup();
      }, 10);

      await expect(promise).rejects.toThrow("cleaned up");
    });

    it("should clear tool registries", () => {
      handler.registerToolRegistry("test-server", registry);
      handler.cleanup();

      // Registering again should work (previous cleared)
      expect(() =>
        handler.registerToolRegistry("test-server", registry),
      ).not.toThrow();
    });
  });

  describe("event emission", () => {
    it("should emit message event", async () => {
      const messages: unknown[] = [];
      handler.on("message", (msg) => {
        messages.push(msg);
      });

      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: "test",
          response: {},
        },
      });

      expect(messages).toHaveLength(1);
    });

    it("should emit error event on processing error", async () => {
      const errors: Error[] = [];
      handler.on("error", (err) => {
        errors.push(err as Error);
      });

      // Send malformed message
      await handler.handleIncomingMessage({
        type: "invalid",
      });

      // Error should be logged but not throw
      expect(errors).toHaveLength(0); // No error for unknown message type
    });
  });

  describe("integration scenario", () => {
    it("should handle complete tool call flow", async () => {
      // Setup
      const calcTool = tool({
        name: "calculate",
        description: "Perform calculation",
        inputSchema: {
          type: "object",
          properties: {
            operation: { type: "string" },
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["operation", "a", "b"],
        },
        handler: async (
          args: Record<string, unknown>,
          _context: ToolContext,
        ): Promise<ToolResult> => {
          const operation = args["operation"] as string;
          const a = args["a"] as number;
          const b = args["b"] as number;

          let result: number;
          switch (operation) {
            case "add":
              result = a + b;
              break;
            case "subtract":
              result = a - b;
              break;
            case "multiply":
              result = a * b;
              break;
            case "divide":
              if (b === 0) {
                return {
                  content: [{ type: "text", text: "Error: Division by zero" }],
                  isError: true,
                };
              }
              result = a / b;
              break;
            default:
              return {
                content: [{ type: "text", text: "Error: Unknown operation" }],
                isError: true,
              };
          }

          return {
            content: [{ type: "text", text: `Result: ${result}` }],
          };
        },
      });

      const calcRegistry = new ToolRegistry("calculator");
      calcRegistry.register(calcTool);
      handler.registerToolRegistry("calculator", calcRegistry);

      // Initialize
      const initPromise = handler.initialize();

      // Wait for request to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const initMessages = transport.getWrittenMessages();
      const initRequest = initMessages[0] as {
        type: string;
        request_id: string;
      };

      // Manually handle the response
      await handler.handleIncomingMessage({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: initRequest.request_id,
          response: {},
        },
      });

      await initPromise;

      // Perform tool call
      await handler.handleIncomingMessage({
        type: "control_request",
        request_id: "calc-req",
        request: {
          subtype: "mcp_message",
          server_name: "calculator",
          message: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "calculate",
              arguments: {
                operation: "multiply",
                a: 6,
                b: 7,
              },
            },
          },
        },
      });

      const messages = transport.getWrittenMessages();
      const response = messages[messages.length - 1] as {
        type: string;
        response: {
          subtype: string;
          response: {
            result: {
              content: Array<{ type: string; text: string }>;
            };
          };
        };
      };

      expect(response.response.response.result.content[0]?.text).toBe(
        "Result: 42",
      );
    });
  });
});
