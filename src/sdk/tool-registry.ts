/**
 * Tool Registry and Factory Functions
 *
 * Provides factory functions for creating SDK tools and MCP servers,
 * plus an internal registry for managing tool instances.
 */

import type {
  SdkTool,
  ToolInputSchema,
  ToolContext,
  ToolResult,
  JsonSchema,
} from "./types/tool";
import type { McpSdkServerConfig } from "./types/mcp";
import { isJsonSchema } from "./types/tool";
import { ToolExecutionError } from "./errors";

/**
 * Configuration for creating a tool.
 */
export interface ToolConfig<TInput = Record<string, unknown>> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ToolInputSchema;
  readonly handler: (args: TInput, context: ToolContext) => Promise<ToolResult>;
}

/**
 * Options for creating an SDK MCP server.
 */
export interface SdkMcpServerOptions {
  readonly name: string;
  readonly version?: string;
  readonly tools: readonly SdkTool[];
}

/**
 * Factory function to create a tool definition.
 *
 * @example
 * ```typescript
 * const addTool = tool({
 *   name: 'add',
 *   description: 'Add two numbers',
 *   inputSchema: { a: 'number', b: 'number' },
 *   handler: async (args) => ({
 *     content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
 *   })
 * });
 * ```
 */
export function tool<TInput = Record<string, unknown>>(
  config: ToolConfig<TInput>,
): SdkTool<TInput> {
  return {
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    handler: config.handler,
  };
}

/**
 * Create an in-process MCP server configuration.
 *
 * @example
 * ```typescript
 * const calculator = createSdkMcpServer({
 *   name: 'calculator',
 *   version: '1.0.0',
 *   tools: [addTool, subtractTool]
 * });
 * ```
 */
export function createSdkMcpServer(
  options: SdkMcpServerOptions,
): McpSdkServerConfig {
  // Use conditional spread to handle exactOptionalPropertyTypes
  const config: McpSdkServerConfig = {
    type: "sdk",
    name: options.name,
    ...(options.version !== undefined && { version: options.version }),
    tools: options.tools,
  };
  return config;
}

/**
 * Convert ToolInputSchema to JSON Schema for MCP tools/list response.
 * Simple schemas like { a: 'number', b: 'string' } are converted to proper JSON Schema.
 */
export function toJsonSchema(schema: ToolInputSchema): JsonSchema {
  if (isJsonSchema(schema)) {
    return schema;
  }

  // Simple schema - convert to JSON Schema
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [key, type] of Object.entries(schema)) {
    properties[key] = { type };
    required.push(key);
  }

  return {
    type: "object",
    properties,
    required,
  };
}

/**
 * Internal registry for SDK tools.
 * Used by ControlProtocolHandler to look up and execute tools.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, SdkTool>();
  readonly serverName: string;

  constructor(serverName: string) {
    this.serverName = serverName;
  }

  /**
   * Register a tool.
   */
  register(tool: SdkTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool '${tool.name}' is already registered in server '${this.serverName}'`,
      );
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name.
   */
  get(name: string): SdkTool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools.
   */
  list(): SdkTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name with given arguments and context.
   * Throws ToolExecutionError if tool not found or execution fails.
   */
  async handleToolCall(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      throw new ToolExecutionError(
        name,
        `Tool '${name}' not found in server '${this.serverName}'`,
      );
    }

    try {
      const result = await tool.handler(args, context);
      return result;
    } catch (error) {
      if (error instanceof ToolExecutionError) {
        throw error;
      }
      throw new ToolExecutionError(
        name,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get tool list in MCP format (for tools/list response).
   */
  getToolListForMcp(): Array<{
    name: string;
    description: string;
    inputSchema: object;
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toJsonSchema(tool.inputSchema),
    }));
  }
}
