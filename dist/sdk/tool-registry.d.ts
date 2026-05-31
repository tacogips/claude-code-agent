/**
 * Tool Registry and Factory Functions
 *
 * Provides factory functions for creating SDK tools and MCP servers,
 * plus an internal registry for managing tool instances.
 */
import type { SdkTool, ToolInputSchema, ToolContext, ToolResult, JsonSchema } from "./types/tool";
import type { McpSdkServerConfig } from "./types/mcp";
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
export declare function tool<TInput = Record<string, unknown>>(config: ToolConfig<TInput>): SdkTool<TInput>;
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
export declare function createSdkMcpServer(options: SdkMcpServerOptions): McpSdkServerConfig;
/**
 * Convert ToolInputSchema to JSON Schema for MCP tools/list response.
 * Simple schemas like { a: 'number', b: 'string' } are converted to proper JSON Schema.
 */
export declare function toJsonSchema(schema: ToolInputSchema): JsonSchema;
/**
 * Internal registry for SDK tools.
 * Used by ControlProtocolHandler to look up and execute tools.
 */
export declare class ToolRegistry {
    private readonly tools;
    readonly serverName: string;
    constructor(serverName: string);
    /**
     * Register a tool.
     */
    register(tool: SdkTool): void;
    /**
     * Get a tool by name.
     */
    get(name: string): SdkTool | undefined;
    /**
     * List all registered tools.
     */
    list(): SdkTool[];
    /**
     * Check if a tool exists.
     */
    has(name: string): boolean;
    /**
     * Execute a tool by name with given arguments and context.
     * Throws ToolExecutionError if tool not found or execution fails.
     */
    handleToolCall(name: string, args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
    /**
     * Get tool list in MCP format (for tools/list response).
     */
    getToolListForMcp(): Array<{
        name: string;
        description: string;
        inputSchema: object;
    }>;
}
//# sourceMappingURL=tool-registry.d.ts.map