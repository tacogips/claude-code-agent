/**
 * SDK Tool type definitions.
 *
 * Defines types for SDK tools that can be registered and invoked
 * by Claude Code sessions. Tools are in-process TypeScript functions
 * that extend Claude Code's capabilities.
 *
 * @module sdk/types/tool
 */

/**
 * JSON Schema definition for complex tool input schemas.
 *
 * Supports JSON Schema Draft 7 features commonly used for tool definitions.
 *
 * @example Basic object schema
 * ```typescript
 * const schema: JsonSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string', description: 'User name' },
 *     age: { type: 'number', description: 'User age' }
 *   },
 *   required: ['name']
 * };
 * ```
 *
 * @example Array schema
 * ```typescript
 * const schema: JsonSchema = {
 *   type: 'array',
 *   items: { type: 'string' },
 *   description: 'List of tags'
 * };
 * ```
 */
export interface JsonSchema {
  readonly type?: string | undefined;
  readonly properties?: Readonly<Record<string, JsonSchema>> | undefined;
  readonly required?: readonly string[] | undefined;
  readonly items?: JsonSchema | undefined;
  readonly additionalProperties?: boolean | JsonSchema | undefined;
  readonly description?: string | undefined;
  readonly enum?: readonly unknown[] | undefined;
  readonly default?: unknown | undefined;
  readonly pattern?: string | undefined;
  readonly format?: string | undefined;
  readonly minimum?: number | undefined;
  readonly maximum?: number | undefined;
  readonly minLength?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly minItems?: number | undefined;
  readonly maxItems?: number | undefined;
  readonly [key: string]: unknown;
}

/**
 * Simple type mapping for tool input schemas.
 *
 * Maps parameter names to primitive types for straightforward tool definitions.
 *
 * @example Simple calculator input
 * ```typescript
 * const schema: SimpleInputSchema = {
 *   a: 'number',
 *   b: 'number'
 * };
 * ```
 */
export type SimpleInputSchema = Readonly<
  Record<string, "string" | "number" | "boolean" | "object" | "array">
>;

/**
 * Input schema definition for a tool.
 *
 * Can be either a simple type mapping or a full JSON Schema for complex cases.
 *
 * @example Simple schema
 * ```typescript
 * const schema: ToolInputSchema = { a: 'number', b: 'number' };
 * ```
 *
 * @example Complex schema
 * ```typescript
 * const schema: ToolInputSchema = {
 *   type: 'object',
 *   properties: {
 *     query: { type: 'string', description: 'SQL query' },
 *     params: { type: 'array', items: { type: 'string' } }
 *   },
 *   required: ['query']
 * };
 * ```
 */
export type ToolInputSchema = SimpleInputSchema | JsonSchema;

/**
 * Tool result content block.
 *
 * Represents a single piece of content in a tool result.
 * Can be text or image data.
 *
 * @example Text content
 * ```typescript
 * const content: ToolResultContent = {
 *   type: 'text',
 *   text: 'Operation completed successfully'
 * };
 * ```
 *
 * @example Image content
 * ```typescript
 * const content: ToolResultContent = {
 *   type: 'image',
 *   data: 'iVBORw0KGgoAAAANSUhEUgAA...',  // Base64 encoded
 *   mimeType: 'image/png'
 * };
 * ```
 */
export interface ToolResultContent {
  /** Content type */
  readonly type: "text" | "image";
  /** Text content (for type: 'text') */
  readonly text?: string | undefined;
  /** Base64-encoded image data (for type: 'image') */
  readonly data?: string | undefined;
  /** MIME type for image content */
  readonly mimeType?: string | undefined;
}

/**
 * Result returned from a tool handler.
 *
 * Tool handlers must return a ToolResult containing one or more
 * content blocks. If isError is true, the result represents a
 * graceful error that Claude can understand and work with.
 *
 * @example Success result
 * ```typescript
 * const result: ToolResult = {
 *   content: [
 *     { type: 'text', text: 'Found 3 users matching criteria' }
 *   ]
 * };
 * ```
 *
 * @example Error result
 * ```typescript
 * const result: ToolResult = {
 *   content: [
 *     { type: 'text', text: 'Database connection failed: timeout' }
 *   ],
 *   isError: true
 * };
 * ```
 *
 * @example Multi-content result
 * ```typescript
 * const result: ToolResult = {
 *   content: [
 *     { type: 'text', text: 'Generated chart:' },
 *     { type: 'image', data: base64Data, mimeType: 'image/png' }
 *   ]
 * };
 * ```
 */
export interface ToolResult {
  /** Content blocks in the result */
  readonly content: readonly ToolResultContent[];
  /** Whether this result represents an error */
  readonly isError?: boolean | undefined;
}

/**
 * Context passed to tool handlers.
 *
 * Provides metadata about the tool call and session context.
 *
 * @example Usage in handler
 * ```typescript
 * async function handler(args: MyInput, context: ToolContext): Promise<ToolResult> {
 *   logger.info(`Tool called in session ${context.sessionId}`);
 *   logger.info(`Tool use ID: ${context.toolUseId}`);
 *
 *   // Check for cancellation
 *   if (context.signal?.aborted) {
 *     return {
 *       content: [{ type: 'text', text: 'Operation cancelled' }],
 *       isError: true
 *     };
 *   }
 *
 *   // Perform operation...
 *   return { content: [{ type: 'text', text: 'Success' }] };
 * }
 * ```
 */
export interface ToolContext {
  /** Unique identifier for this tool call */
  readonly toolUseId: string;
  /** Session ID where this tool is being called */
  readonly sessionId: string;
  /** Abort signal for cancellation support */
  readonly signal?: AbortSignal | undefined;
}

/**
 * SDK tool definition.
 *
 * Represents a complete tool that can be registered with the SDK
 * and invoked by Claude during sessions.
 *
 * @typeParam TInput - Type of the input arguments (inferred from schema)
 *
 * @example Simple calculator tool
 * ```typescript
 * const addTool: SdkTool<{ a: number; b: number }> = {
 *   name: 'add',
 *   description: 'Add two numbers together',
 *   inputSchema: { a: 'number', b: 'number' },
 *   handler: async (args) => ({
 *     content: [{ type: 'text', text: `${args.a} + ${args.b} = ${args.a + args.b}` }]
 *   })
 * };
 * ```
 *
 * @example Tool with complex schema
 * ```typescript
 * const queryTool: SdkTool = {
 *   name: 'query',
 *   description: 'Execute a database query',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       sql: { type: 'string', description: 'SQL query to execute' },
 *       params: { type: 'array', items: { type: 'string' } }
 *     },
 *     required: ['sql']
 *   },
 *   handler: async (args, context) => {
 *     // Type of args is Record<string, unknown> by default
 *     const sql = args.sql as string;
 *     const params = (args.params as string[] | undefined) ?? [];
 *
 *     const results = await db.query(sql, params);
 *     return {
 *       content: [{ type: 'text', text: JSON.stringify(results) }]
 *     };
 *   }
 * };
 * ```
 */
export interface SdkTool<TInput = Record<string, unknown>> {
  /** Tool name (must be unique within MCP server) */
  readonly name: string;
  /** Human-readable description of what this tool does */
  readonly description: string;
  /** Input parameter schema */
  readonly inputSchema: ToolInputSchema;
  /** Handler function that executes the tool */
  readonly handler: (args: TInput, context: ToolContext) => Promise<ToolResult>;
}

/**
 * Type guard to check if a schema is a JsonSchema.
 *
 * @param schema - Schema to check
 * @returns True if schema is a JsonSchema (has 'type' or 'properties' fields)
 *
 * @example
 * ```typescript
 * const schema1 = { a: 'number', b: 'string' };
 * const schema2 = { type: 'object', properties: { a: { type: 'number' } } };
 *
 * console.log(isJsonSchema(schema1));  // false
 * console.log(isJsonSchema(schema2));  // true
 * ```
 */
export function isJsonSchema(schema: ToolInputSchema): schema is JsonSchema {
  return (
    typeof schema === "object" &&
    schema !== null &&
    ("type" in schema || "properties" in schema)
  );
}

/**
 * Type guard to check if a schema is a SimpleInputSchema.
 *
 * @param schema - Schema to check
 * @returns True if schema is a simple type mapping
 *
 * @example
 * ```typescript
 * const schema1 = { a: 'number', b: 'string' };
 * const schema2 = { type: 'object', properties: { a: { type: 'number' } } };
 *
 * console.log(isSimpleSchema(schema1));  // true
 * console.log(isSimpleSchema(schema2));  // false
 * ```
 */
export function isSimpleSchema(
  schema: ToolInputSchema,
): schema is SimpleInputSchema {
  return !isJsonSchema(schema);
}

/**
 * Type guard to check if content is a ToolResultContent.
 *
 * @param value - Value to check
 * @returns True if value is a valid ToolResultContent
 *
 * @example
 * ```typescript
 * const content1 = { type: 'text', text: 'Hello' };
 * const content2 = { type: 'image', data: 'base64...', mimeType: 'image/png' };
 * const invalid = { type: 'unknown' };
 *
 * console.log(isToolResultContent(content1));  // true
 * console.log(isToolResultContent(content2));  // true
 * console.log(isToolResultContent(invalid));   // false
 * ```
 */
export function isToolResultContent(
  value: unknown,
): value is ToolResultContent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (obj["type"] !== "text" && obj["type"] !== "image") {
    return false;
  }

  if (obj["type"] === "text") {
    return typeof obj["text"] === "string" || obj["text"] === undefined;
  }

  // type === 'image'
  return (
    (typeof obj["data"] === "string" || obj["data"] === undefined) &&
    (typeof obj["mimeType"] === "string" || obj["mimeType"] === undefined)
  );
}

/**
 * Type guard to check if a value is a ToolResult.
 *
 * @param value - Value to check
 * @returns True if value is a valid ToolResult
 *
 * @example
 * ```typescript
 * const result1 = {
 *   content: [{ type: 'text', text: 'Success' }]
 * };
 * const result2 = {
 *   content: [{ type: 'text', text: 'Error' }],
 *   isError: true
 * };
 * const invalid = { content: 'not an array' };
 *
 * console.log(isToolResult(result1));  // true
 * console.log(isToolResult(result2));  // true
 * console.log(isToolResult(invalid));  // false
 * ```
 */
export function isToolResult(value: unknown): value is ToolResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj["content"])) {
    return false;
  }

  if (!obj["content"].every(isToolResultContent)) {
    return false;
  }

  if (obj["isError"] !== undefined && typeof obj["isError"] !== "boolean") {
    return false;
  }

  return true;
}
