# SDK Tool Registration Specification

This document describes the programmatic tool and MCP server registration feature for claude-code-agent SDK, enabling TypeScript code to handle tool calls without pre-configuring them in `.claude` settings.

---

## 1. Overview

### 1.1 Problem Statement

Currently, MCP servers and custom tools must be registered in Claude Code's configuration files (`.claude/settings.json` or similar). This creates friction for:

- Dynamic tool registration at runtime
- Embedding Claude Code in TypeScript applications
- Testing tools without modifying configuration
- Building workflow engines that need custom tools

### 1.2 Solution

Provide a TypeScript SDK that:

1. **Programmatically registers MCP servers and tools** - No `.claude` config modification required
2. **Handles tool calls in TypeScript code** - Tools run in-process within the application
3. **Manages bidirectional control protocol** - SDK communicates with Claude Code subprocess
4. **Tracks session state** - Including "waiting for tool call" states

### 1.3 Architecture

```
+------------------------------------------------------------------+
|                    External Application                           |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                     claude-code-agent SDK                         |
+------------------------------------------------------------------+
|  +-------------------+  +--------------------+  +---------------+ |
|  | Tool Registry     |  | Control Protocol   |  | Session State | |
|  | - registerTool()  |  | - JSONRPC routing  |  | Manager       | |
|  | - SdkMcpServer    |  | - Request/Response |  |               | |
|  +-------------------+  +--------------------+  +---------------+ |
|                              |                                    |
|  +--------------------------------------------------------+      |
|  |                Subprocess Transport                     |      |
|  | - Spawns Claude Code CLI                                |      |
|  | - stdin/stdout/stderr streams                           |      |
|  | - Bidirectional JSON-RPC                                |      |
|  +--------------------------------------------------------+      |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                     Claude Code CLI (subprocess)                  |
+------------------------------------------------------------------+
```

---

## 2. Core Types

### 2.1 Tool Definition

```typescript
/**
 * Input schema definition for a tool.
 * Can be a simple type mapping or a full JSON Schema.
 */
type ToolInputSchema =
  | Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
  | JsonSchema;

/**
 * Tool call result content block.
 */
interface ToolResultContent {
  type: 'text' | 'image';
  text?: string;
  data?: string;      // Base64 for images
  mimeType?: string;
}

/**
 * Result returned from a tool handler.
 */
interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
}

/**
 * SDK tool definition created by the @tool decorator or registerTool().
 */
interface SdkTool<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  handler: (args: TInput, context: ToolContext) => Promise<ToolResult>;
}

/**
 * Context passed to tool handlers.
 */
interface ToolContext {
  toolUseId: string;
  sessionId: string;
  signal?: AbortSignal;  // For cancellation support
}
```

### 2.2 MCP Server Configuration

```typescript
/**
 * External MCP server configuration (subprocess-based).
 */
interface McpStdioServerConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * External MCP server over HTTP/SSE.
 */
interface McpHttpServerConfig {
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
}

/**
 * SDK MCP server configuration (in-process).
 */
interface McpSdkServerConfig {
  type: 'sdk';
  name: string;
  version?: string;
  tools: SdkTool[];
}

type McpServerConfig =
  | McpStdioServerConfig
  | McpHttpServerConfig
  | McpSdkServerConfig;
```

### 2.3 Session State

```typescript
/**
 * Session execution state.
 */
type SessionState =
  | 'idle'                    // Not started
  | 'starting'                // Subprocess spawning
  | 'running'                 // Normal execution
  | 'waiting_tool_call'       // Waiting for SDK tool result
  | 'waiting_permission'      // Waiting for permission callback
  | 'paused'                  // User-initiated pause
  | 'completed'               // Finished successfully
  | 'failed'                  // Finished with error
  | 'cancelled';              // User-initiated cancellation

/**
 * Detailed session state with metadata.
 */
interface SessionStateInfo {
  state: SessionState;
  sessionId: string;

  // When state === 'waiting_tool_call'
  pendingToolCall?: {
    toolUseId: string;
    toolName: string;
    serverName: string;
    arguments: Record<string, unknown>;
    startedAt: string;
  };

  // When state === 'waiting_permission'
  pendingPermission?: {
    requestId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
  };

  // Statistics
  stats: {
    startedAt?: string;
    completedAt?: string;
    toolCallCount: number;
    messageCount: number;
  };
}
```

---

## 3. SDK API

### 3.1 Tool Registration

```typescript
import { tool, createSdkMcpServer, ClaudeCodeAgent } from 'claude-code-agent';

// Method 1: Decorator-style tool definition
const addTool = tool({
  name: 'add',
  description: 'Add two numbers together',
  inputSchema: { a: 'number', b: 'number' },
  handler: async (args) => ({
    content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
  })
});

// Method 2: Create tool inline
const multiplyTool: SdkTool = {
  name: 'multiply',
  description: 'Multiply two numbers',
  inputSchema: { a: 'number', b: 'number' },
  handler: async (args) => ({
    content: [{ type: 'text', text: `Result: ${args.a * args.b}` }]
  })
};

// Create SDK MCP server with tools
const calculatorServer = createSdkMcpServer({
  name: 'calculator',
  version: '1.0.0',
  tools: [addTool, multiplyTool]
});
```

### 3.2 Agent Configuration

```typescript
interface AgentOptions {
  // Working directory for Claude Code
  cwd?: string;

  // MCP servers (SDK and external)
  mcpServers?: Record<string, McpServerConfig>;

  // Tools to allow (pre-approved)
  allowedTools?: string[];

  // Tools to disallow
  disallowedTools?: string[];

  // System prompt customization
  systemPrompt?: string | { preset: 'claude_code'; append?: string };

  // Permission mode
  permissionMode?: 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';

  // Tool permission callback
  canUseTool?: CanUseToolCallback;

  // Hook configurations
  hooks?: HookConfigurations;

  // Model selection
  model?: string;

  // Budget limit
  maxBudgetUsd?: number;

  // Maximum turns
  maxTurns?: number;

  // Environment variables for Claude Code subprocess
  env?: Record<string, string>;

  // Custom CLI path (default: bundled or system claude)
  cliPath?: string;
}

// Permission callback type
type CanUseToolCallback = (
  toolName: string,
  toolInput: Record<string, unknown>,
  context: PermissionContext
) => Promise<PermissionResult>;

interface PermissionContext {
  signal?: AbortSignal;
  suggestions: PermissionSuggestion[];
}

type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
  | { behavior: 'deny'; message: string; interrupt?: boolean };
```

### 3.3 Running Sessions

```typescript
const agent = new ClaudeCodeAgent(options);

// Start a session
const session = await agent.startSession({
  prompt: 'Calculate 15 + 27 using the calculator',
  projectPath: '/path/to/project'
});

// Stream messages
for await (const message of session.messages()) {
  if (message.type === 'assistant') {
    console.log('Claude:', message.content);
  } else if (message.type === 'tool_use') {
    console.log('Tool call:', message.toolName);
  } else if (message.type === 'tool_result') {
    console.log('Tool result:', message.content);
  } else if (message.type === 'result') {
    console.log('Session complete:', message.stats);
  }
}

// Or use event-based API
session.on('message', (msg) => console.log(msg));
session.on('toolCall', (call) => console.log('Tool:', call.name));
session.on('stateChange', (state) => console.log('State:', state));
session.on('complete', (result) => console.log('Done:', result));
session.on('error', (err) => console.error('Error:', err));

// Control methods
await session.pause();
await session.resume();
await session.cancel();
await session.interrupt();

// Query state
const state = session.getState();
console.log('Current state:', state.state);
if (state.state === 'waiting_tool_call') {
  console.log('Pending tool:', state.pendingToolCall?.toolName);
}
```

### 3.4 Multi-turn Conversations

```typescript
// Using ClaudeCodeClient for interactive sessions
const client = new ClaudeCodeClient(options);

await client.connect();

// First turn
await client.query('What tools do you have available?');
for await (const msg of client.receiveResponse()) {
  console.log(msg);
}

// Second turn (maintains context)
await client.query('Now use the add tool to calculate 100 + 200');
for await (const msg of client.receiveResponse()) {
  console.log(msg);
}

await client.disconnect();
```

---

## 4. Control Protocol

### 4.1 Overview

The SDK communicates with Claude Code CLI via a bidirectional JSON-RPC protocol over stdin/stdout:

```
SDK                                    Claude Code CLI
 |                                           |
 |-- control_request: initialize ----------->|
 |<-- control_response: success -------------|
 |                                           |
 |-- user_message: "Calculate 15+27" ------->|
 |                                           |
 |<-- assistant_message: "I'll use add" -----|
 |<-- control_request: mcp_message ----------|  (tools/call)
 |                                           |
 |   [SDK executes tool handler]             |
 |                                           |
 |-- control_response: mcp_response -------->|
 |                                           |
 |<-- assistant_message: "Result is 42" -----|
 |<-- result_message: {cost, tokens} --------|
 |                                           |
```

### 4.2 Request/Response Types

```typescript
// SDK -> CLI: Control Request
interface ControlRequest {
  type: 'control_request';
  request_id: string;
  request:
    | { subtype: 'initialize'; hooks?: HookConfig }
    | { subtype: 'interrupt' }
    | { subtype: 'set_permission_mode'; mode: string }
    | { subtype: 'set_model'; model: string | null };
}

// CLI -> SDK: Control Request (for tool calls, hooks)
interface IncomingControlRequest {
  type: 'control_request';
  request_id: string;
  request:
    | { subtype: 'mcp_message'; server_name: string; message: JsonRpcMessage }
    | { subtype: 'can_use_tool'; tool_name: string; input: object; suggestions: object[] }
    | { subtype: 'hook_callback'; callback_id: string; input: object; tool_use_id?: string };
}

// Control Response
interface ControlResponse {
  type: 'control_response';
  response:
    | { subtype: 'success'; request_id: string; response: object }
    | { subtype: 'error'; request_id: string; error: string };
}
```

### 4.3 MCP Message Routing

When Claude Code needs to call an SDK tool, it sends an `mcp_message` control request:

```typescript
// Incoming from CLI
{
  type: 'control_request',
  request_id: 'req_1',
  request: {
    subtype: 'mcp_message',
    server_name: 'calculator',
    message: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'add',
        arguments: { a: 15, b: 27 }
      }
    }
  }
}

// SDK response
{
  type: 'control_response',
  response: {
    subtype: 'success',
    request_id: 'req_1',
    response: {
      mcp_response: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: '15 + 27 = 42' }]
        }
      }
    }
  }
}
```

---

## 5. Session State Management

### 5.1 State Machine

```
                    +-------------+
                    |    idle     |
                    +------+------+
                           |
                     startSession()
                           |
                    +------v------+
                    |  starting   |
                    +------+------+
                           |
                    CLI connected
                           |
         +----------+------v------+----------+
         |          |   running   |          |
         |          +------+------+          |
         |                 |                 |
    tool call        permission         pause()
    received          request               |
         |                 |          +-----v-----+
   +-----v-----+     +-----v-----+    |  paused   |
   | waiting_  |     | waiting_  |    +-----+-----+
   | tool_call |     | permission|          |
   +-----+-----+     +-----+-----+     resume()
         |                 |                |
    tool result       decision              |
    returned          returned              |
         |                 |                |
         +--------+--------+--------+-------+
                  |                 |
                  v                 v
           +------+------+  +------+------+
           |  completed  |  |   failed    |
           +-------------+  +-------------+
```

### 5.2 State Tracking Implementation

```typescript
class SessionStateManager {
  private state: SessionState = 'idle';
  private stateInfo: SessionStateInfo;
  private pendingOperations = new Map<string, PendingOperation>();

  constructor(sessionId: string) {
    this.stateInfo = {
      state: 'idle',
      sessionId,
      stats: { toolCallCount: 0, messageCount: 0 }
    };
  }

  transition(newState: SessionState, metadata?: Partial<SessionStateInfo>): void {
    const oldState = this.state;
    this.state = newState;
    this.stateInfo = { ...this.stateInfo, state: newState, ...metadata };
    this.emit('stateChange', { from: oldState, to: newState, info: this.stateInfo });
  }

  startToolCall(toolUseId: string, toolName: string, args: object): void {
    this.transition('waiting_tool_call', {
      pendingToolCall: {
        toolUseId,
        toolName,
        serverName: this.extractServerName(toolName),
        arguments: args,
        startedAt: new Date().toISOString()
      }
    });
  }

  completeToolCall(toolUseId: string): void {
    if (this.stateInfo.pendingToolCall?.toolUseId === toolUseId) {
      this.stateInfo.stats.toolCallCount++;
      this.transition('running', { pendingToolCall: undefined });
    }
  }

  getState(): SessionStateInfo {
    return { ...this.stateInfo };
  }
}
```

---

## 6. Transport Layer

### 6.1 Subprocess Transport

```typescript
interface Transport {
  connect(): Promise<void>;
  write(data: string): Promise<void>;
  readMessages(): AsyncIterable<object>;
  endInput(): Promise<void>;
  close(): Promise<void>;
}

class SubprocessTransport implements Transport {
  private process: Subprocess | null = null;
  private stdin: WritableStream | null = null;
  private stdout: ReadableStream | null = null;

  constructor(private options: TransportOptions) {}

  async connect(): Promise<void> {
    const command = this.buildCommand();
    this.process = Bun.spawn(command, {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...this.options.env },
      cwd: this.options.cwd
    });

    this.stdin = this.process.stdin;
    this.stdout = this.process.stdout;
  }

  private buildCommand(): string[] {
    const args = [
      this.options.cliPath ?? 'claude',
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--verbose'
    ];

    if (this.options.mcpConfig) {
      args.push('--mcp-config', JSON.stringify(this.options.mcpConfig));
    }

    if (this.options.permissionMode) {
      args.push('--permission-mode', this.options.permissionMode);
    }

    // Add more CLI flags...

    return args;
  }

  async *readMessages(): AsyncIterable<object> {
    const reader = this.stdout!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line);
        }
      }
    }
  }
}
```

### 6.2 CLI Command Construction

```typescript
function buildMcpConfig(servers: Record<string, McpServerConfig>): object {
  const mcpServers: Record<string, object> = {};

  for (const [name, config] of Object.entries(servers)) {
    if (config.type === 'sdk') {
      // SDK servers are marked with type: 'sdk'
      // The instance is NOT passed to CLI (can't serialize)
      mcpServers[name] = {
        type: 'sdk',
        name: config.name
      };
    } else {
      // External servers passed as-is
      mcpServers[name] = config;
    }
  }

  return { mcpServers };
}
```

---

## 7. Hook System

### 7.1 Hook Types

```typescript
type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'Notification'
  | 'PermissionRequest';

interface HookMatcher {
  matcher?: string;  // Tool name pattern (e.g., "Bash", "Write|Edit")
  hooks: HookCallback[];
  timeout?: number;  // Seconds
}

type HookCallback = (
  input: HookInput,
  toolUseId: string | null,
  context: HookContext
) => Promise<HookOutput>;

interface HookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  stopReason?: string;
  hookSpecificOutput?: object;
}
```

### 7.2 Hook Configuration

```typescript
const agent = new ClaudeCodeAgent({
  hooks: {
    PreToolUse: [
      {
        matcher: 'Bash',
        hooks: [async (input, toolUseId, ctx) => {
          // Check if bash command is safe
          if (input.tool_input.command?.includes('rm -rf')) {
            return {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Destructive command blocked'
              }
            };
          }
          return {};
        }],
        timeout: 30
      }
    ],
    PostToolUse: [
      {
        hooks: [async (input) => {
          console.log(`Tool ${input.tool_name} completed`);
          return {};
        }]
      }
    ]
  }
});
```

---

## 8. Error Handling

### 8.1 Error Types

```typescript
class ClaudeCodeAgentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ClaudeCodeAgentError';
  }
}

class CLINotFoundError extends ClaudeCodeAgentError {
  constructor(path: string) {
    super(`Claude Code CLI not found at: ${path}`, 'CLI_NOT_FOUND');
  }
}

class CLIConnectionError extends ClaudeCodeAgentError {
  constructor(reason: string) {
    super(`Failed to connect to Claude Code CLI: ${reason}`, 'CLI_CONNECTION');
  }
}

class ToolExecutionError extends ClaudeCodeAgentError {
  constructor(toolName: string, message: string) {
    super(`Tool '${toolName}' failed: ${message}`, 'TOOL_EXECUTION');
  }
}

class ControlProtocolError extends ClaudeCodeAgentError {
  constructor(message: string) {
    super(`Control protocol error: ${message}`, 'CONTROL_PROTOCOL');
  }
}

class TimeoutError extends ClaudeCodeAgentError {
  constructor(operation: string, timeout: number) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 'TIMEOUT');
  }
}
```

### 8.2 Tool Error Handling

```typescript
// Tools can return errors gracefully
const divideToolWithError = tool({
  name: 'divide',
  description: 'Divide two numbers',
  inputSchema: { a: 'number', b: 'number' },
  handler: async (args) => {
    if (args.b === 0) {
      return {
        content: [{ type: 'text', text: 'Error: Division by zero' }],
        isError: true
      };
    }
    return {
      content: [{ type: 'text', text: `Result: ${args.a / args.b}` }]
    };
  }
});

// Or throw exceptions (caught and converted to error result)
const riskyTool = tool({
  name: 'risky',
  description: 'A risky operation',
  inputSchema: { value: 'string' },
  handler: async (args) => {
    if (!args.value) {
      throw new Error('Value is required');
    }
    // ... operation
    return { content: [{ type: 'text', text: 'Success' }] };
  }
});
```

---

## 9. Implementation Plan

### 9.1 Phase 1: Core Types and Tool Registry

- [ ] Define core TypeScript types (`SdkTool`, `McpServerConfig`, etc.)
- [ ] Implement `tool()` function for tool definition
- [ ] Implement `createSdkMcpServer()` for server creation
- [ ] Unit tests for tool registry

### 9.2 Phase 2: Transport Layer

- [ ] Implement `SubprocessTransport` class
- [ ] CLI command builder with MCP config
- [ ] Message streaming and parsing
- [ ] Integration tests with mock CLI

### 9.3 Phase 3: Control Protocol

- [ ] Control request/response handling
- [ ] MCP message routing for SDK tools
- [ ] Initialize handshake
- [ ] Error response handling

### 9.4 Phase 4: Session State Management

- [ ] `SessionStateManager` implementation
- [ ] State machine with transitions
- [ ] Pending operation tracking
- [ ] State query API

### 9.5 Phase 5: High-level API

- [ ] `ClaudeCodeAgent` class
- [ ] `ClaudeCodeClient` for multi-turn
- [ ] Event emitter integration
- [ ] Async iterator for messages

### 9.6 Phase 6: Hooks and Permissions

- [ ] Hook callback system
- [ ] Permission callback (`canUseTool`)
- [ ] Hook registration and routing
- [ ] Timeout handling

### 9.7 Phase 7: Integration and Testing

- [ ] End-to-end tests with real Claude Code
- [ ] Example applications
- [ ] Documentation
- [ ] Performance optimization

---

## 10. Usage Examples

### 10.1 Simple Calculator

```typescript
import { tool, createSdkMcpServer, ClaudeCodeAgent } from 'claude-code-agent';

// Define tools
const addTool = tool({
  name: 'add',
  description: 'Add two numbers',
  inputSchema: { a: 'number', b: 'number' },
  handler: async (args) => ({
    content: [{ type: 'text', text: `${args.a} + ${args.b} = ${args.a + args.b}` }]
  })
});

const subtractTool = tool({
  name: 'subtract',
  description: 'Subtract two numbers',
  inputSchema: { a: 'number', b: 'number' },
  handler: async (args) => ({
    content: [{ type: 'text', text: `${args.a} - ${args.b} = ${args.a - args.b}` }]
  })
});

// Create server
const calculator = createSdkMcpServer({
  name: 'calculator',
  version: '1.0.0',
  tools: [addTool, subtractTool]
});

// Run session
const agent = new ClaudeCodeAgent({
  mcpServers: { calc: calculator },
  allowedTools: ['mcp__calc__add', 'mcp__calc__subtract']
});

const session = await agent.startSession({
  prompt: 'Calculate 100 + 50, then subtract 25 from the result'
});

for await (const message of session.messages()) {
  console.log(message);
}
```

### 10.2 Database Query Tool

```typescript
import { tool, createSdkMcpServer, ClaudeCodeAgent } from 'claude-code-agent';
import { Database } from 'bun:sqlite';

const db = new Database('app.db');

const queryTool = tool({
  name: 'query',
  description: 'Execute a read-only SQL query',
  inputSchema: {
    sql: 'string',
    params: 'array'
  },
  handler: async (args) => {
    try {
      // Only allow SELECT queries
      if (!args.sql.trim().toLowerCase().startsWith('select')) {
        return {
          content: [{ type: 'text', text: 'Only SELECT queries are allowed' }],
          isError: true
        };
      }

      const results = db.query(args.sql).all(...(args.params ?? []));
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Query error: ${error.message}` }],
        isError: true
      };
    }
  }
});

const dbServer = createSdkMcpServer({
  name: 'database',
  tools: [queryTool]
});

const agent = new ClaudeCodeAgent({
  mcpServers: { db: dbServer },
  allowedTools: ['mcp__db__query'],
  permissionMode: 'bypassPermissions'  // Auto-approve tool calls
});
```

### 10.3 File Processing with State Tracking

```typescript
import { ClaudeCodeAgent } from 'claude-code-agent';

const agent = new ClaudeCodeAgent({
  mcpServers: { processor: fileProcessor },
  allowedTools: ['mcp__processor__*']
});

const session = await agent.startSession({
  prompt: 'Process all CSV files in /data and generate a summary report'
});

// Monitor state changes
session.on('stateChange', ({ from, to, info }) => {
  console.log(`State: ${from} -> ${to}`);

  if (to === 'waiting_tool_call' && info.pendingToolCall) {
    console.log(`Executing tool: ${info.pendingToolCall.toolName}`);
    console.log(`Arguments: ${JSON.stringify(info.pendingToolCall.arguments)}`);
  }
});

// Track tool execution times
const toolTimes = new Map<string, number>();

session.on('toolCall', (call) => {
  toolTimes.set(call.toolUseId, Date.now());
});

session.on('toolResult', (result) => {
  const startTime = toolTimes.get(result.toolUseId);
  if (startTime) {
    console.log(`Tool ${result.toolName} took ${Date.now() - startTime}ms`);
  }
});

await session.waitForCompletion();
console.log('Final state:', session.getState());
```

---

## 11. References

- [claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python) - Python SDK reference implementation
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol SDK
- [spec-sdk-api.md](./spec-sdk-api.md) - Existing SDK specification
- [DESIGN.md](./DESIGN.md) - Main design document

---

## 12. Open Questions

1. **CLI Version Requirement**: What minimum Claude Code CLI version is required for the control protocol?

2. **Tool Name Conflicts**: How to handle conflicts between SDK tools and built-in Claude Code tools?

3. **Resource Support**: Should SDK MCP servers support MCP resources and prompts in addition to tools?

4. **Session Persistence**: Should session state be persisted for recovery after SDK process crash?

5. **Concurrent Sessions**: How many concurrent sessions should be supported per agent instance?
