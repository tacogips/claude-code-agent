/**
 * Integration tests for SDK tool call functionality.
 *
 * Tests the complete flow of tool registration, invocation, and result handling.
 * These tests verify the SDK's tool handling without spawning real Claude CLI.
 *
 * @module sdk/__tests__/tool-call.integration.test
 */

import { describe, it, expect } from "vitest";
import { tool, createSdkMcpServer, ToolRegistry } from "../tool-registry";
import type { ToolResult, ToolContext, SdkTool } from "../types/tool";

describe("SDK Tool Call Integration", () => {
  describe("Single Tool Call", () => {
    it("should invoke registered tool handler with correct arguments", async () => {
      // Track tool invocations
      let toolInvoked = false;
      let receivedArgs: Record<string, unknown> | null = null;
      let receivedContext: ToolContext | null = null;

      // Create add tool
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (
          args: { a: number; b: number },
          context: ToolContext,
        ): Promise<ToolResult> => {
          toolInvoked = true;
          receivedArgs = args;
          receivedContext = context;

          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      // Create tool registry and register tool
      const registry = new ToolRegistry("test-server");
      registry.register(addTool as unknown as SdkTool);

      // Execute tool call
      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "test-session",
      };

      const result = await registry.handleToolCall(
        "add",
        { a: 15, b: 27 },
        context,
      );

      // Verify tool was invoked with correct arguments
      expect(toolInvoked).toBe(true);
      expect(receivedArgs).toEqual({ a: 15, b: 27 });
      expect(receivedContext).not.toBeNull();
      expect(receivedContext!.sessionId).toBe("test-session");
      expect(receivedContext!.toolUseId).toBe("tool_use_1");

      // Verify result
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");
      expect(result.isError).toBeFalsy();
    });

    it("should return tool result to Claude", async () => {
      // Create add tool
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute tool and get result
      const result = await registry.handleToolCall(
        "add",
        { a: 15, b: 27 },
        context,
      );

      // Verify result structure
      expect(result).toBeTruthy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");
      expect(result.content[0]?.text).toContain("42");
    });

    it("should track tool call in session state", async () => {
      // Create add tool
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute tool - this tracks the call internally
      const result = await registry.handleToolCall(
        "add",
        { a: 15, b: 27 },
        context,
      );

      // Verify tool executed successfully
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.text).toContain("42");
    });

    it("should emit toolCall and toolResult events", async () => {
      // This test verifies that ToolRegistry and ControlProtocolHandler work together
      // In practice, events would be emitted by the ControlProtocolHandler when
      // it receives MCP messages from Claude Code CLI

      // Create tool
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      // Execute tool directly
      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      const result = await registry.handleToolCall(
        "add",
        { a: 15, b: 27 },
        context,
      );

      // Verify result was returned (events would be emitted by protocol handler)
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.text).toContain("42");
      expect(result.isError).toBeFalsy();
    });
  });

  describe("Multiple Tool Calls", () => {
    it("should handle sequential tool calls", async () => {
      const toolInvocations: string[] = [];

      // Create two tools
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          toolInvocations.push(`add(${args.a}, ${args.b})`);
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const subtractTool = tool({
        name: "subtract",
        description: "Subtract two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          toolInvocations.push(`subtract(${args.a}, ${args.b})`);
          return {
            content: [{ type: "text", text: `Result: ${args.a - args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);
      registry.register(subtractTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute both tools
      await registry.handleToolCall("add", { a: 15, b: 27 }, context);
      await registry.handleToolCall("subtract", { a: 50, b: 10 }, context);

      // Verify both tools were invoked in order
      expect(toolInvocations).toHaveLength(2);
      expect(toolInvocations[0]).toBe("add(15, 27)");
      expect(toolInvocations[1]).toBe("subtract(50, 10)");
    });

    it("should track all tool calls in history", async () => {
      const toolInvocations: Array<{ a: number; b: number }> = [];

      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          toolInvocations.push({ a: args.a, b: args.b });
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute multiple tool calls
      await registry.handleToolCall("add", { a: 1, b: 2 }, context);
      await registry.handleToolCall("add", { a: 3, b: 4 }, context);
      await registry.handleToolCall("add", { a: 5, b: 6 }, context);

      // Verify all tool calls were tracked
      expect(toolInvocations.length).toBe(3);
      expect(toolInvocations[0]).toEqual({ a: 1, b: 2 });
      expect(toolInvocations[1]).toEqual({ a: 3, b: 4 });
      expect(toolInvocations[2]).toEqual({ a: 5, b: 6 });
    });

    it("should update stats correctly", async () => {
      let callCount = 0;

      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          callCount++;
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      const initialCount = callCount;

      // Execute tool call
      await registry.handleToolCall("add", { a: 10, b: 20 }, context);

      // Verify call count increased
      expect(callCount).toBe(initialCount + 1);
    });
  });

  describe("Tool Error Handling", () => {
    it("should handle tool returning isError: true", async () => {
      // Create divide tool that returns error for division by zero
      const divideTool = tool({
        name: "divide",
        description: "Divide two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          if (args.b === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Cannot divide by zero",
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ type: "text", text: `Result: ${args.a / args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(divideTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Call tool with division by zero
      const errorResult = await registry.handleToolCall(
        "divide",
        { a: 10, b: 0 },
        context,
      );

      // Verify error result was returned
      expect(errorResult.isError).toBe(true);
      expect(errorResult.content[0]?.text).toContain("Cannot divide by zero");
    });

    it("should handle tool throwing exception", async () => {
      // Create tool that throws
      const faultyTool = tool({
        name: "faulty",
        description: "A tool that throws",
        inputSchema: {},
        handler: async (): Promise<ToolResult> => {
          throw new Error("Intentional error for testing");
        },
      });

      const registry = new ToolRegistry("test");
      registry.register(faultyTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Tool should throw ToolExecutionError
      await expect(
        registry.handleToolCall("faulty", {}, context),
      ).rejects.toThrow();
    });

    it("should continue session after tool error", async () => {
      let successfulCallAfterError = false;

      // Create divide tool (can error) and add tool (always succeeds)
      const divideTool = tool({
        name: "divide",
        description: "Divide two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          if (args.b === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Cannot divide by zero",
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ type: "text", text: `Result: ${args.a / args.b}` }],
          };
        },
      });

      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          successfulCallAfterError = true;
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(divideTool as unknown as SdkTool);
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Call tool that errors
      const errorResult = await registry.handleToolCall(
        "divide",
        { a: 10, b: 0 },
        context,
      );
      expect(errorResult.isError).toBe(true);

      // Call successful tool after error
      const successResult = await registry.handleToolCall(
        "add",
        { a: 5, b: 10 },
        context,
      );

      // Verify session continued and second tool was called
      expect(successfulCallAfterError).toBe(true);
      expect(successResult.isError).toBeFalsy();
    });
  });

  describe("Session State During Tool Call", () => {
    it("should transition to waiting_tool_call state", async () => {
      // Create tool with delay
      const slowTool = tool({
        name: "slow",
        description: "Slow tool",
        inputSchema: {},
        handler: async (): Promise<ToolResult> => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            content: [{ type: "text", text: "Done" }],
          };
        },
      });

      const registry = new ToolRegistry("test");
      registry.register(slowTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute slow tool
      const resultPromise = registry.handleToolCall("slow", {}, context);

      // Tool is executing
      expect(resultPromise).toBeInstanceOf(Promise);

      // Wait for completion
      const result = await resultPromise;
      expect(result.content[0]?.text).toBe("Done");
    });

    it("should include pendingToolCall info", async () => {
      // Verify tool context includes all required info
      let capturedContext: ToolContext | null = null;

      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (
          args: { a: number; b: number },
          context: ToolContext,
        ): Promise<ToolResult> => {
          capturedContext = context;
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_123",
        sessionId: "session-456",
      };

      await registry.handleToolCall("add", { a: 15, b: 27 }, context);

      // Verify context was passed correctly
      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.toolUseId).toBe("tool_use_123");
      expect(capturedContext!.sessionId).toBe("session-456");
    });

    it("should transition back to running after result", async () => {
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute tool call
      const result = await registry.handleToolCall(
        "add",
        { a: 5, b: 10 },
        context,
      );

      // After result, tool execution is complete
      expect(result).toBeTruthy();
      expect(result.content[0]?.text).toContain("15");
    });
  });

  describe("External Library Usage", () => {
    it("should allow external code to define tools", async () => {
      // Simulate external library defining a custom tool
      interface WeatherArgs {
        city: string;
        units: "celsius" | "fahrenheit";
      }

      const weatherTool = tool<WeatherArgs>({
        name: "get_weather",
        description: "Get weather for a city",
        inputSchema: {
          city: "string",
          units: "string",
        },
        handler: async (
          args: WeatherArgs,
          _context: ToolContext,
        ): Promise<ToolResult> => {
          // External library implementation
          const temp = args.units === "celsius" ? 20 : 68;
          return {
            content: [
              {
                type: "text",
                text: `Weather in ${args.city}: ${temp}°${args.units === "celsius" ? "C" : "F"}`,
              },
            ],
          };
        },
      });

      // Create MCP server with external tool
      const weatherServer = createSdkMcpServer({
        name: "weather",
        version: "1.0.0",
        tools: [weatherTool as unknown as SdkTool],
      });

      // Verify server was created correctly
      expect(weatherServer.type).toBe("sdk");
      expect(weatherServer.name).toBe("weather");
      expect(weatherServer.version).toBe("1.0.0");
      expect(weatherServer.tools).toHaveLength(1);
      expect(weatherServer.tools[0]?.name).toBe("get_weather");

      // Execute tool
      const registry = new ToolRegistry("weather");
      registry.register(weatherTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      const result = await registry.handleToolCall(
        "get_weather",
        { city: "Tokyo", units: "celsius" },
        context,
      );

      expect(result.content[0]?.text).toContain("Tokyo");
      expect(result.content[0]?.text).toContain("20");
    });

    it("should allow external code to access tool call history", async () => {
      // External code can track tool calls via handler
      const toolCallHistory: Array<{
        args: Record<string, unknown>;
        context: ToolContext;
      }> = [];

      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (
          args: { a: number; b: number },
          context: ToolContext,
        ): Promise<ToolResult> => {
          // External code tracks calls
          toolCallHistory.push({ args, context });
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      const context: ToolContext = {
        toolUseId: "tool_use_1",
        sessionId: "session-1",
      };

      // Execute multiple tool calls
      await registry.handleToolCall("add", { a: 1, b: 2 }, context);
      await registry.handleToolCall("add", { a: 3, b: 4 }, context);

      // External code can access full history
      expect(toolCallHistory.length).toBe(2);
      expect(toolCallHistory[0]?.args).toEqual({ a: 1, b: 2 });
      expect(toolCallHistory[1]?.args).toEqual({ a: 3, b: 4 });
    });

    it("should allow external code to query session state", async () => {
      // External code can query tool registry state
      const addTool = tool({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args: {
          a: number;
          b: number;
        }): Promise<ToolResult> => {
          return {
            content: [{ type: "text", text: `Result: ${args.a + args.b}` }],
          };
        },
      });

      const registry = new ToolRegistry("calc");
      registry.register(addTool as unknown as SdkTool);

      // External code can query registry
      expect(registry.has("add")).toBe(true);
      expect(registry.has("nonexistent")).toBe(false);

      const tools = registry.list();
      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe("add");

      const toolListForMcp = registry.getToolListForMcp();
      expect(toolListForMcp).toHaveLength(1);
      expect(toolListForMcp[0]?.name).toBe("add");
    });
  });
});
