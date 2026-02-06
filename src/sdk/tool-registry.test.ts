import { describe, test, expect } from "vitest";
import {
  tool,
  createSdkMcpServer,
  toJsonSchema,
  ToolRegistry,
} from "./tool-registry";
import type { ToolContext } from "./types/tool";
import { ToolExecutionError } from "./errors";

describe("tool()", () => {
  test("creates a tool from config", () => {
    const addTool = tool({
      name: "add",
      description: "Add two numbers",
      inputSchema: { a: "number", b: "number" },
      handler: async (args) => {
        const a = args["a"] as number;
        const b = args["b"] as number;
        return {
          content: [{ type: "text", text: `Result: ${a + b}` }],
        };
      },
    });

    expect(addTool.name).toBe("add");
    expect(addTool.description).toBe("Add two numbers");
    expect(addTool.inputSchema).toEqual({ a: "number", b: "number" });
    expect(typeof addTool.handler).toBe("function");
  });

  test("creates tool with type inference", async () => {
    interface AddInput {
      a: number;
      b: number;
    }

    const addTool = tool<AddInput>({
      name: "add",
      description: "Add two numbers",
      inputSchema: { a: "number", b: "number" },
      handler: async (args) => {
        // TypeScript should infer args as AddInput
        const sum = args.a + args.b;
        return {
          content: [{ type: "text", text: `Result: ${sum}` }],
        };
      },
    });

    const context: ToolContext = {
      toolUseId: "test-1",
      sessionId: "session-1",
    };

    const result = await addTool.handler({ a: 10, b: 20 }, context);
    expect(result.content).toEqual([{ type: "text", text: "Result: 30" }]);
  });

  test("creates tool with complex JSON Schema", () => {
    const queryTool = tool({
      name: "query",
      description: "Execute query",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SQL query" },
          params: { type: "array", items: { type: "string" } },
        },
        required: ["sql"],
      },
      handler: async (args) => ({
        content: [{ type: "text", text: JSON.stringify(args) }],
      }),
    });

    expect(queryTool.name).toBe("query");
    expect(queryTool.inputSchema).toHaveProperty("type", "object");
    expect(queryTool.inputSchema).toHaveProperty("properties");
  });
});

describe("createSdkMcpServer()", () => {
  test("creates SDK MCP server config", () => {
    const addTool = tool({
      name: "add",
      description: "Add numbers",
      inputSchema: { a: "number", b: "number" },
      handler: async (args) => {
        const a = args["a"] as number;
        const b = args["b"] as number;
        return { content: [{ type: "text", text: String(a + b) }] };
      },
    });

    const subtractTool = tool({
      name: "subtract",
      description: "Subtract numbers",
      inputSchema: { a: "number", b: "number" },
      handler: async (args) => {
        const a = args["a"] as number;
        const b = args["b"] as number;
        return { content: [{ type: "text", text: String(a - b) }] };
      },
    });

    const server = createSdkMcpServer({
      name: "calculator",
      version: "1.0.0",
      tools: [addTool, subtractTool],
    });

    expect(server.type).toBe("sdk");
    expect(server.name).toBe("calculator");
    expect(server.version).toBe("1.0.0");
    expect(server.tools).toHaveLength(2);
  });

  test("creates server without version", () => {
    const server = createSdkMcpServer({
      name: "test-server",
      tools: [],
    });

    expect(server.type).toBe("sdk");
    expect(server.name).toBe("test-server");
    expect(server.version).toBeUndefined();
    expect(server.tools).toEqual([]);
  });
});

describe("toJsonSchema()", () => {
  test("converts simple schema to JSON Schema", () => {
    const simple = { a: "number", b: "string" };
    const jsonSchema = toJsonSchema(simple);

    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema.properties).toEqual({
      a: { type: "number" },
      b: { type: "string" },
    });
    expect(jsonSchema.required).toEqual(["a", "b"]);
  });

  test("returns JSON Schema as-is", () => {
    const jsonSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };

    const result = toJsonSchema(jsonSchema);
    expect(result).toEqual(jsonSchema);
  });

  test("handles all simple schema types", () => {
    const schema = {
      str: "string",
      num: "number",
      bool: "boolean",
      obj: "object",
      arr: "array",
    };

    const jsonSchema = toJsonSchema(schema);

    expect(jsonSchema.properties).toEqual({
      str: { type: "string" },
      num: { type: "number" },
      bool: { type: "boolean" },
      obj: { type: "object" },
      arr: { type: "array" },
    });
    expect(jsonSchema.required).toEqual(["str", "num", "bool", "obj", "arr"]);
  });
});

describe("ToolRegistry", () => {
  test("constructs with server name", () => {
    const registry = new ToolRegistry("test-server");
    expect(registry.serverName).toBe("test-server");
  });

  describe("register()", () => {
    test("registers a tool", () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "test-tool",
        description: "Test",
        inputSchema: {},
        handler: async () => ({ content: [] }),
      });

      registry.register(mockTool);
      expect(registry.has("test-tool")).toBe(true);
    });

    test("throws error for duplicate tool name", () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "duplicate",
        description: "Test",
        inputSchema: {},
        handler: async () => ({ content: [] }),
      });

      registry.register(mockTool);

      expect(() => registry.register(mockTool)).toThrow(
        "Tool 'duplicate' is already registered in server 'test'",
      );
    });
  });

  describe("get()", () => {
    test("retrieves registered tool", () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "my-tool",
        description: "Test",
        inputSchema: {},
        handler: async () => ({ content: [] }),
      });

      registry.register(mockTool);
      const retrieved = registry.get("my-tool");

      expect(retrieved).toBe(mockTool);
    });

    test("returns undefined for unregistered tool", () => {
      const registry = new ToolRegistry("test");
      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("list()", () => {
    test("lists all tools", () => {
      const registry = new ToolRegistry("test");
      const tool1 = tool({
        name: "tool1",
        description: "First",
        inputSchema: {},
        handler: async () => ({ content: [] }),
      });
      const tool2 = tool({
        name: "tool2",
        description: "Second",
        inputSchema: {},
        handler: async () => ({ content: [] }),
      });

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.list();
      expect(tools).toHaveLength(2);
      expect(tools).toContain(tool1);
      expect(tools).toContain(tool2);
    });

    test("returns empty array when no tools registered", () => {
      const registry = new ToolRegistry("test");
      expect(registry.list()).toEqual([]);
    });
  });

  describe("has()", () => {
    test("returns true for registered tool", () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "exists",
        description: "Test",
        inputSchema: {},
        handler: async () => ({ content: [] }),
      });

      registry.register(mockTool);
      expect(registry.has("exists")).toBe(true);
    });

    test("returns false for unregistered tool", () => {
      const registry = new ToolRegistry("test");
      expect(registry.has("does-not-exist")).toBe(false);
    });
  });

  describe("handleToolCall()", () => {
    test("executes tool handler", async () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "echo",
        description: "Echo input",
        inputSchema: { message: "string" },
        handler: async (args) => {
          const message = args["message"] as string;
          return { content: [{ type: "text", text: message }] };
        },
      });

      registry.register(mockTool);

      const context: ToolContext = {
        toolUseId: "test-1",
        sessionId: "session-1",
      };

      const result = await registry.handleToolCall(
        "echo",
        { message: "Hello, world!" },
        context,
      );

      expect(result.content).toEqual([{ type: "text", text: "Hello, world!" }]);
    });

    test("passes context to handler", async () => {
      const registry = new ToolRegistry("test");
      let receivedContext: ToolContext | undefined;

      const mockTool = tool({
        name: "context-check",
        description: "Check context",
        inputSchema: {},
        handler: async (_args, ctx) => {
          receivedContext = ctx;
          return { content: [{ type: "text", text: "ok" }] };
        },
      });

      registry.register(mockTool);

      const context: ToolContext = {
        toolUseId: "test-1",
        sessionId: "session-1",
        signal: new AbortController().signal,
      };

      await registry.handleToolCall("context-check", {}, context);

      expect(receivedContext).toBe(context);
      expect(receivedContext?.toolUseId).toBe("test-1");
      expect(receivedContext?.sessionId).toBe("session-1");
      expect(receivedContext?.signal).toBeDefined();
    });

    test("throws ToolExecutionError for unknown tool", async () => {
      const registry = new ToolRegistry("test");
      const context: ToolContext = {
        toolUseId: "test-1",
        sessionId: "session-1",
      };

      await expect(
        registry.handleToolCall("nonexistent", {}, context),
      ).rejects.toThrow(ToolExecutionError);

      await expect(
        registry.handleToolCall("nonexistent", {}, context),
      ).rejects.toThrow("Tool 'nonexistent' not found in server 'test'");
    });

    test("wraps handler exceptions in ToolExecutionError", async () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "failing-tool",
        description: "Always fails",
        inputSchema: {},
        handler: async () => {
          throw new Error("Something went wrong");
        },
      });

      registry.register(mockTool);

      const context: ToolContext = {
        toolUseId: "test-1",
        sessionId: "session-1",
      };

      await expect(
        registry.handleToolCall("failing-tool", {}, context),
      ).rejects.toThrow(ToolExecutionError);

      await expect(
        registry.handleToolCall("failing-tool", {}, context),
      ).rejects.toThrow("Tool 'failing-tool' failed");
    });

    test("preserves ToolExecutionError when thrown by handler", async () => {
      const registry = new ToolRegistry("test");
      const originalError = new ToolExecutionError(
        "custom-error",
        "Custom error message",
      );

      const mockTool = tool({
        name: "error-tool",
        description: "Throws ToolExecutionError",
        inputSchema: {},
        handler: async () => {
          throw originalError;
        },
      });

      registry.register(mockTool);

      const context: ToolContext = {
        toolUseId: "test-1",
        sessionId: "session-1",
      };

      await expect(
        registry.handleToolCall("error-tool", {}, context),
      ).rejects.toThrow(originalError);
    });
  });

  describe("getToolListForMcp()", () => {
    test("returns tools in MCP format", () => {
      const registry = new ToolRegistry("test");
      const tool1 = tool({
        name: "add",
        description: "Add numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async () => ({ content: [] }),
      });
      const tool2 = tool({
        name: "multiply",
        description: "Multiply numbers",
        inputSchema: { x: "number", y: "number" },
        handler: async () => ({ content: [] }),
      });

      registry.register(tool1);
      registry.register(tool2);

      const mcpTools = registry.getToolListForMcp();

      expect(mcpTools).toHaveLength(2);
      expect(mcpTools[0]).toEqual({
        name: "add",
        description: "Add numbers",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["a", "b"],
        },
      });
      expect(mcpTools[1]).toEqual({
        name: "multiply",
        description: "Multiply numbers",
        inputSchema: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
          required: ["x", "y"],
        },
      });
    });

    test("returns empty array when no tools registered", () => {
      const registry = new ToolRegistry("test");
      expect(registry.getToolListForMcp()).toEqual([]);
    });

    test("converts simple schema to JSON Schema in MCP format", () => {
      const registry = new ToolRegistry("test");
      const mockTool = tool({
        name: "simple",
        description: "Simple tool",
        inputSchema: { name: "string", count: "number" },
        handler: async () => ({ content: [] }),
      });

      registry.register(mockTool);

      const mcpTools = registry.getToolListForMcp();
      expect(mcpTools[0]?.inputSchema).toHaveProperty("type", "object");
      expect(mcpTools[0]?.inputSchema).toHaveProperty("properties");
      expect(mcpTools[0]?.inputSchema).toHaveProperty("required");
    });

    test("preserves complex JSON Schema in MCP format", () => {
      const registry = new ToolRegistry("test");
      const complexSchema = {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "SQL query",
          },
          params: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["query"],
      };

      const mockTool = tool({
        name: "query",
        description: "Execute query",
        inputSchema: complexSchema,
        handler: async () => ({ content: [] }),
      });

      registry.register(mockTool);

      const mcpTools = registry.getToolListForMcp();
      expect(mcpTools[0]?.inputSchema).toEqual(complexSchema);
    });
  });
});
