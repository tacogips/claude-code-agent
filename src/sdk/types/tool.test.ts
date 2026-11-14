/**
 * Unit tests for SDK tool types and type guards.
 *
 * @module sdk/types/tool.test
 */

import { describe, expect, test } from "vitest";
import {
  isJsonSchema,
  isSimpleSchema,
  isToolResult,
  isToolResultContent,
  type JsonSchema,
  type SimpleInputSchema,
  type SdkTool,
  type ToolContext,
  type ToolInputSchema,
  type ToolResult,
  type ToolResultContent,
} from "./tool";

describe("SDK Tool Types", () => {
  describe("ToolInputSchema", () => {
    test("accepts simple schema", () => {
      const schema: ToolInputSchema = {
        a: "number",
        b: "string",
      };

      expect(schema).toBeDefined();
    });

    test("accepts JSON schema", () => {
      const schema: ToolInputSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      expect(schema).toBeDefined();
    });
  });

  describe("ToolResultContent", () => {
    test("creates text content", () => {
      const content: ToolResultContent = {
        type: "text",
        text: "Hello world",
      };

      expect(content.type).toBe("text");
      expect(content.text).toBe("Hello world");
    });

    test("creates image content", () => {
      const content: ToolResultContent = {
        type: "image",
        data: "base64encodeddata",
        mimeType: "image/png",
      };

      expect(content.type).toBe("image");
      expect(content.data).toBe("base64encodeddata");
      expect(content.mimeType).toBe("image/png");
    });
  });

  describe("ToolResult", () => {
    test("creates success result", () => {
      const result: ToolResult = {
        content: [{ type: "text", text: "Success" }],
      };

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();
    });

    test("creates error result", () => {
      const result: ToolResult = {
        content: [{ type: "text", text: "Error occurred" }],
        isError: true,
      };

      expect(result.isError).toBe(true);
    });

    test("creates multi-content result", () => {
      const result: ToolResult = {
        content: [
          { type: "text", text: "Chart:" },
          { type: "image", data: "base64...", mimeType: "image/png" },
        ],
      };

      expect(result.content).toHaveLength(2);
    });
  });

  describe("ToolContext", () => {
    test("creates context with required fields", () => {
      const context: ToolContext = {
        toolUseId: "toolu_123",
        sessionId: "sess_456",
      };

      expect(context.toolUseId).toBe("toolu_123");
      expect(context.sessionId).toBe("sess_456");
    });

    test("creates context with abort signal", () => {
      const controller = new AbortController();
      const context: ToolContext = {
        toolUseId: "toolu_123",
        sessionId: "sess_456",
        signal: controller.signal,
      };

      expect(context.signal).toBeDefined();
      expect(context.signal?.aborted).toBe(false);
    });
  });

  describe("SdkTool", () => {
    test("creates simple tool", () => {
      const tool: SdkTool<{ a: number; b: number }> = {
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args) => ({
          content: [
            { type: "text", text: `Result: ${args.a + args.b}` as const },
          ],
        }),
      };

      expect(tool.name).toBe("add");
      expect(tool.description).toBe("Add two numbers");
    });

    test("creates tool with JSON schema", () => {
      const tool: SdkTool = {
        name: "query",
        description: "Execute query",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string" },
          },
          required: ["sql"],
        },
        handler: async (args) => ({
          content: [{ type: "text", text: `Executed: ${String(args["sql"])}` }],
        }),
      };

      expect(tool.inputSchema).toHaveProperty("type");
    });

    test("handler returns promise", async () => {
      const tool: SdkTool<{ value: string }> = {
        name: "echo",
        description: "Echo input",
        inputSchema: { value: "string" },
        handler: async (args) => ({
          content: [{ type: "text", text: args.value }],
        }),
      };

      const context: ToolContext = {
        toolUseId: "toolu_1",
        sessionId: "sess_1",
      };

      const result = await tool.handler({ value: "test" }, context);
      expect(result.content[0]?.text).toBe("test");
    });
  });

  describe("isJsonSchema", () => {
    test("returns true for JSON schema with type", () => {
      const schema: JsonSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      expect(isJsonSchema(schema)).toBe(true);
    });

    test("returns true for JSON schema with properties", () => {
      const schema: JsonSchema = {
        properties: {
          id: { type: "number" },
        },
      };

      expect(isJsonSchema(schema)).toBe(true);
    });

    test("returns false for simple schema", () => {
      const schema: SimpleInputSchema = {
        a: "number",
        b: "string",
      };

      expect(isJsonSchema(schema)).toBe(false);
    });

    test("returns false for empty object", () => {
      const schema = {};

      expect(isJsonSchema(schema)).toBe(false);
    });
  });

  describe("isSimpleSchema", () => {
    test("returns true for simple schema", () => {
      const schema: SimpleInputSchema = {
        name: "string",
        age: "number",
        active: "boolean",
      };

      expect(isSimpleSchema(schema)).toBe(true);
    });

    test("returns false for JSON schema", () => {
      const schema: JsonSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      expect(isSimpleSchema(schema)).toBe(false);
    });
  });

  describe("isToolResultContent", () => {
    test("returns true for text content", () => {
      const content = { type: "text", text: "Hello" };

      expect(isToolResultContent(content)).toBe(true);
    });

    test("returns true for text content without text field", () => {
      const content = { type: "text" };

      expect(isToolResultContent(content)).toBe(true);
    });

    test("returns true for image content", () => {
      const content = {
        type: "image",
        data: "base64...",
        mimeType: "image/png",
      };

      expect(isToolResultContent(content)).toBe(true);
    });

    test("returns true for image content with minimal fields", () => {
      const content = { type: "image" };

      expect(isToolResultContent(content)).toBe(true);
    });

    test("returns false for invalid type", () => {
      const content = { type: "video", data: "..." };

      expect(isToolResultContent(content)).toBe(false);
    });

    test("returns false for null", () => {
      expect(isToolResultContent(null)).toBe(false);
    });

    test("returns false for non-object", () => {
      expect(isToolResultContent("string")).toBe(false);
      expect(isToolResultContent(123)).toBe(false);
      expect(isToolResultContent(true)).toBe(false);
    });

    test("returns false for text with non-string text", () => {
      const content = { type: "text", text: 123 };

      expect(isToolResultContent(content)).toBe(false);
    });

    test("returns false for image with non-string data", () => {
      const content = { type: "image", data: 123 };

      expect(isToolResultContent(content)).toBe(false);
    });
  });

  describe("isToolResult", () => {
    test("returns true for valid result", () => {
      const result = {
        content: [{ type: "text", text: "Success" }],
      };

      expect(isToolResult(result)).toBe(true);
    });

    test("returns true for result with isError", () => {
      const result = {
        content: [{ type: "text", text: "Error" }],
        isError: true,
      };

      expect(isToolResult(result)).toBe(true);
    });

    test("returns true for multi-content result", () => {
      const result = {
        content: [
          { type: "text", text: "Text" },
          { type: "image", data: "base64..." },
        ],
      };

      expect(isToolResult(result)).toBe(true);
    });

    test("returns true for empty content array", () => {
      const result = {
        content: [],
      };

      expect(isToolResult(result)).toBe(true);
    });

    test("returns false for null", () => {
      expect(isToolResult(null)).toBe(false);
    });

    test("returns false for non-object", () => {
      expect(isToolResult("string")).toBe(false);
      expect(isToolResult(123)).toBe(false);
    });

    test("returns false for missing content", () => {
      const result = {
        isError: false,
      };

      expect(isToolResult(result)).toBe(false);
    });

    test("returns false for non-array content", () => {
      const result = {
        content: "not an array",
      };

      expect(isToolResult(result)).toBe(false);
    });

    test("returns false for invalid content items", () => {
      const result = {
        content: [{ type: "invalid" }],
      };

      expect(isToolResult(result)).toBe(false);
    });

    test("returns false for non-boolean isError", () => {
      const result = {
        content: [{ type: "text", text: "Test" }],
        isError: "true",
      };

      expect(isToolResult(result)).toBe(false);
    });
  });

  describe("Type inference", () => {
    test("infers handler argument types from generic", async () => {
      interface AddInput {
        a: number;
        b: number;
      }

      const tool: SdkTool<AddInput> = {
        name: "add",
        description: "Add numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args) => {
          // args should be typed as AddInput
          const sum: number = args.a + args.b;
          return {
            content: [{ type: "text", text: String(sum) }],
          };
        },
      };

      const context: ToolContext = {
        toolUseId: "toolu_1",
        sessionId: "sess_1",
      };

      const result = await tool.handler({ a: 5, b: 3 }, context);
      expect(result.content[0]?.text).toBe("8");
    });

    test("defaults to Record<string, unknown> without generic", async () => {
      const tool: SdkTool = {
        name: "generic",
        description: "Generic tool",
        inputSchema: { value: "string" },
        handler: async (args) => {
          // args is Record<string, unknown>
          const value = args["value"] as string;
          return {
            content: [{ type: "text", text: value }],
          };
        },
      };

      const context: ToolContext = {
        toolUseId: "toolu_1",
        sessionId: "sess_1",
      };

      const result = await tool.handler({ value: "test" }, context);
      expect(result.content[0]?.text).toBe("test");
    });
  });
});
