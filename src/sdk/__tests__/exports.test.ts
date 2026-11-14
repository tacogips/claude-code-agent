/**
 * Test to verify SDK exports are complete and accessible.
 */

import { describe, test, expect } from "bun:test";
import * as SDK from "../index";

describe("SDK Exports", () => {
  describe("Type Guards", () => {
    test("exports all type guards", () => {
      // Tool type guards
      expect(typeof SDK.isJsonSchema).toBe("function");
      expect(typeof SDK.isSimpleSchema).toBe("function");
      expect(typeof SDK.isToolResult).toBe("function");
      expect(typeof SDK.isToolResultContent).toBe("function");

      // MCP server type guards
      expect(typeof SDK.isSdkServer).toBe("function");
      expect(typeof SDK.isStdioServer).toBe("function");
      expect(typeof SDK.isHttpServer).toBe("function");
      expect(typeof SDK.isValidMcpServerConfig).toBe("function");

      // Session state type guards
      expect(typeof SDK.isTerminalState).toBe("function");
      expect(typeof SDK.isValidSessionState).toBe("function");
    });
  });

  describe("Tool Registry", () => {
    test("exports tool registry functions", () => {
      expect(typeof SDK.tool).toBe("function");
      expect(typeof SDK.createSdkMcpServer).toBe("function");
      expect(typeof SDK.toJsonSchema).toBe("function");
      expect(typeof SDK.ToolRegistry).toBe("function");
    });
  });

  describe("Agents and Clients", () => {
    test("exports agent classes", () => {
      expect(typeof SDK.ClaudeCodeAgent).toBe("function");
      expect(typeof SDK.ClaudeCodeToolAgent).toBe("function");
      expect(typeof SDK.ToolAgentSession).toBe("function");
      expect(typeof SDK.ClaudeCodeClient).toBe("function");
    });
  });

  describe("Errors", () => {
    test("exports all error classes", () => {
      expect(typeof SDK.ClaudeCodeAgentError).toBe("function");
      expect(typeof SDK.CLINotFoundError).toBe("function");
      expect(typeof SDK.CLIConnectionError).toBe("function");
      expect(typeof SDK.ToolExecutionError).toBe("function");
      expect(typeof SDK.ControlProtocolError).toBe("function");
      expect(typeof SDK.TimeoutError).toBe("function");
      expect(typeof SDK.InvalidStateError).toBe("function");
    });

    test("exports error type guards", () => {
      expect(typeof SDK.isClaudeCodeAgentError).toBe("function");
      expect(typeof SDK.isCLINotFoundError).toBe("function");
      expect(typeof SDK.isCLIConnectionError).toBe("function");
      expect(typeof SDK.isToolExecutionError).toBe("function");
      expect(typeof SDK.isControlProtocolError).toBe("function");
      expect(typeof SDK.isTimeoutError).toBe("function");
      expect(typeof SDK.isInvalidStateError).toBe("function");
    });
  });

  describe("Session Groups", () => {
    test("exports session group classes", () => {
      expect(typeof SDK.GroupManager).toBe("function");
      expect(typeof SDK.GroupRunner).toBe("function");
      expect(typeof SDK.ConfigGenerator).toBe("function");
      expect(typeof SDK.DependencyGraph).toBe("function");
    });
  });

  describe("Command Queue", () => {
    test("exports queue classes", () => {
      expect(typeof SDK.QueueManager).toBe("function");
      expect(typeof SDK.QueueRunner).toBe("function");
    });
  });

  describe("Events", () => {
    test("exports event emitter", () => {
      expect(typeof SDK.EventEmitter).toBe("function");
      expect(typeof SDK.createEventEmitter).toBe("function");
    });
  });

  describe("Utilities", () => {
    test("exports utility classes", () => {
      expect(typeof SDK.SessionReader).toBe("function");
      expect(typeof SDK.BookmarkManager).toBe("function");
      expect(typeof SDK.ActivityManager).toBe("function");
      expect(typeof SDK.FileChangeService).toBe("function");
    });

    test("exports parser functions", () => {
      expect(typeof SDK.parseJsonl).toBe("function");
      expect(typeof SDK.parseMarkdown).toBe("function");
    });
  });
});

describe("SDK Tool Types - Functional Test", () => {
  test("can create and use a tool", () => {
    const addTool = SDK.tool({
      name: "add",
      description: "Add two numbers",
      inputSchema: { a: "number", b: "number" },
      handler: async (args: { a: number; b: number }) => ({
        content: [
          { type: "text" as const, text: `Result: ${args.a + args.b}` },
        ],
      }),
    });

    expect(addTool.name).toBe("add");
    expect(addTool.description).toBe("Add two numbers");
    expect(SDK.isSimpleSchema(addTool.inputSchema)).toBe(true);
  });

  test("can create an SDK MCP server", () => {
    const addTool = SDK.tool({
      name: "add",
      description: "Add two numbers",
      inputSchema: { a: "number", b: "number" },
      handler: async (args: { a: number; b: number }) => ({
        content: [
          { type: "text" as const, text: `Result: ${args.a + args.b}` },
        ],
      }),
    });

    // Cast to base SdkTool type for createSdkMcpServer
    const server = SDK.createSdkMcpServer({
      name: "calculator",
      version: "1.0.0",
      tools: [addTool as unknown as SDK.SdkTool],
    });

    expect(server.type).toBe("sdk");
    expect(server.name).toBe("calculator");
    expect(server.version).toBe("1.0.0");
    expect(server.tools).toHaveLength(1);
    expect(SDK.isSdkServer(server)).toBe(true);
  });
});

describe("SDK State Types - Functional Test", () => {
  test("can validate session states", () => {
    expect(SDK.isValidSessionState("idle")).toBe(true);
    expect(SDK.isValidSessionState("running")).toBe(true);
    expect(SDK.isValidSessionState("waiting_tool_call")).toBe(true);
    expect(SDK.isValidSessionState("completed")).toBe(true);
    expect(SDK.isValidSessionState("invalid")).toBe(false);
  });

  test("can check terminal states", () => {
    expect(SDK.isTerminalState("completed")).toBe(true);
    expect(SDK.isTerminalState("failed")).toBe(true);
    expect(SDK.isTerminalState("cancelled")).toBe(true);
    expect(SDK.isTerminalState("running")).toBe(false);
    expect(SDK.isTerminalState("waiting_tool_call")).toBe(false);
  });
});
