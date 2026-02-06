/**
 * MCP Server Configuration Types
 *
 * This module defines types for configuring MCP (Model Context Protocol) servers
 * in the claude-code-agent SDK. Supports three types of MCP servers:
 * - stdio: External subprocess-based servers
 * - http/sse: External HTTP-based servers
 * - sdk: In-process SDK-based servers with custom tools
 */

import type { SdkTool } from "./tool";

/**
 * External MCP server configuration (subprocess-based).
 *
 * Spawns an external MCP server as a subprocess and communicates via stdio.
 *
 * @example
 * ```typescript
 * const stdioServer: McpStdioServerConfig = {
 *   type: 'stdio',
 *   command: 'node',
 *   args: ['./server.js'],
 *   env: { API_KEY: process.env.API_KEY }
 * };
 * ```
 */
export interface McpStdioServerConfig {
  readonly type: "stdio";
  readonly command: string;
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * External MCP server over HTTP/SSE.
 *
 * Connects to an external MCP server via HTTP or Server-Sent Events (SSE).
 *
 * @example
 * ```typescript
 * const httpServer: McpHttpServerConfig = {
 *   type: 'http',
 *   url: 'https://api.example.com/mcp',
 *   headers: { 'Authorization': 'Bearer token' }
 * };
 * ```
 */
export interface McpHttpServerConfig {
  readonly type: "http" | "sse";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
}

/**
 * SDK MCP server configuration (in-process).
 *
 * Defines an MCP server that runs in-process within the SDK, handling tool calls
 * directly in TypeScript without external subprocess communication.
 *
 * @example
 * ```typescript
 * const sdkServer: McpSdkServerConfig = {
 *   type: 'sdk',
 *   name: 'calculator',
 *   version: '1.0.0',
 *   tools: [addTool, subtractTool]
 * };
 * ```
 */
export interface McpSdkServerConfig {
  readonly type: "sdk";
  readonly name: string;
  readonly version?: string;
  readonly tools: readonly SdkTool[];
}

/**
 * Union type for all MCP server configurations.
 *
 * Use this type when accepting any kind of MCP server configuration.
 * Use type guards (isSdkServer, isStdioServer, isHttpServer) to narrow the type.
 */
export type McpServerConfig =
  | McpStdioServerConfig
  | McpHttpServerConfig
  | McpSdkServerConfig;

/**
 * Type guard to check if a server config is an SDK server.
 *
 * @param config - The MCP server configuration to check
 * @returns True if the config is an McpSdkServerConfig
 *
 * @example
 * ```typescript
 * if (isSdkServer(config)) {
 *   console.log('SDK server with tools:', config.tools.length);
 * }
 * ```
 */
export function isSdkServer(
  config: McpServerConfig,
): config is McpSdkServerConfig {
  return config.type === "sdk";
}

/**
 * Type guard to check if a server config is a stdio server.
 *
 * @param config - The MCP server configuration to check
 * @returns True if the config is an McpStdioServerConfig
 *
 * @example
 * ```typescript
 * if (isStdioServer(config)) {
 *   console.log('Stdio server command:', config.command);
 * }
 * ```
 */
export function isStdioServer(
  config: McpServerConfig,
): config is McpStdioServerConfig {
  return config.type === "stdio";
}

/**
 * Type guard to check if a server config is an HTTP server.
 *
 * @param config - The MCP server configuration to check
 * @returns True if the config is an McpHttpServerConfig
 *
 * @example
 * ```typescript
 * if (isHttpServer(config)) {
 *   console.log('HTTP server URL:', config.url);
 * }
 * ```
 */
export function isHttpServer(
  config: McpServerConfig,
): config is McpHttpServerConfig {
  return config.type === "http" || config.type === "sse";
}

/**
 * Validates that an MCP server configuration has all required fields.
 *
 * @param config - The configuration to validate
 * @returns True if the configuration is valid
 *
 * @example
 * ```typescript
 * if (!isValidMcpServerConfig(config)) {
 *   throw new Error('Invalid MCP server configuration');
 * }
 * ```
 */
export function isValidMcpServerConfig(
  config: unknown,
): config is McpServerConfig {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const configObj = config as Record<string, unknown>;

  if (typeof configObj["type"] !== "string") {
    return false;
  }

  const type = configObj["type"];

  if (type === "stdio") {
    return (
      typeof configObj["command"] === "string" &&
      (configObj["args"] === undefined ||
        (Array.isArray(configObj["args"]) &&
          configObj["args"].every((arg) => typeof arg === "string"))) &&
      (configObj["env"] === undefined ||
        (typeof configObj["env"] === "object" &&
          configObj["env"] !== null &&
          Object.values(configObj["env"]).every((v) => typeof v === "string")))
    );
  }

  if (type === "http" || type === "sse") {
    return (
      typeof configObj["url"] === "string" &&
      (configObj["headers"] === undefined ||
        (typeof configObj["headers"] === "object" &&
          configObj["headers"] !== null &&
          Object.values(configObj["headers"]).every(
            (v) => typeof v === "string",
          )))
    );
  }

  if (type === "sdk") {
    return (
      typeof configObj["name"] === "string" &&
      (configObj["version"] === undefined ||
        typeof configObj["version"] === "string") &&
      Array.isArray(configObj["tools"])
    );
  }

  return false;
}
