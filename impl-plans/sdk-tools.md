# SDK Tools Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-tools.md
**Created**: 2026-02-04
**Last Updated**: 2026-02-04

---

## Design Document Reference

**Source**: design-docs/spec-sdk-tools.md

### Summary

Implement programmatic tool and MCP server registration for claude-code-agent SDK, enabling TypeScript code to handle tool calls without pre-configuring them in `.claude` settings. External applications using claude-code-agent as a library can define custom tools that run in-process.

### Scope

**Included**:
- Core types for tools, MCP servers, and session state
- Tool registration functions (`tool()`, `createSdkMcpServer()`)
- Subprocess transport layer for Claude Code CLI communication
- Control protocol handler for bidirectional JSON-RPC
- Session state management with "waiting_tool_call" state
- High-level API (`ClaudeCodeAgent`, `ClaudeCodeClient`)
- Mock Claude session fixtures for testing
- Integration tests ensuring tools are invoked correctly

**Excluded**:
- Claude Code CLI modifications (uses existing CLI)
- MCP resources and prompts support (tools only in v1)
- Session persistence/recovery

---

## Deliverables Overview

| Module | Location | Description |
|--------|----------|-------------|
| SDK Tool Types | `src/sdk/types/tool.ts` | SdkTool, ToolResult, ToolContext interfaces |
| MCP Config Types | `src/sdk/types/mcp.ts` | McpServerConfig, McpSdkServerConfig |
| Session State Types | `src/sdk/types/state.ts` | SessionState, SessionStateInfo |
| Control Protocol Types | `src/sdk/types/protocol.ts` | ControlRequest, ControlResponse, JsonRpcMessage |
| Tool Registry | `src/sdk/tool-registry.ts` | tool(), createSdkMcpServer() |
| Subprocess Transport | `src/sdk/transport/subprocess.ts` | SubprocessTransport class |
| Control Protocol Handler | `src/sdk/control-protocol.ts` | MCP message routing, request/response |
| Session State Manager | `src/sdk/session-state.ts` | SessionStateManager class |
| Claude Code Agent | `src/sdk/agent.ts` | ClaudeCodeAgent class |
| Claude Code Client | `src/sdk/client.ts` | ClaudeCodeClient class |
| Mock Session Fixtures | `src/sdk/__fixtures__/mock-session.ts` | MockClaudeSession for testing |
| Mock Transport | `src/sdk/__fixtures__/mock-transport.ts` | MockTransport for unit tests |

---

## Subtasks

### TASK-001: SDK Tool Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/types/tool.ts`
- `src/sdk/types/tool.test.ts`
**Estimated Effort**: Small

**Description**:
Define core types for SDK tools including SdkTool interface, ToolResult, ToolContext, and input schema types.

**Type Definitions**:

```
ToolInputSchema
  Purpose: Input parameter schema definition
  Values: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'> | JsonSchema
  Used by: SdkTool

ToolResultContent
  Purpose: Tool result content block
  Properties:
    - type: 'text' | 'image'
    - text?: string
    - data?: string (base64 for images)
    - mimeType?: string
  Used by: ToolResult

ToolResult
  Purpose: Result returned from tool handler
  Properties:
    - content: ToolResultContent[]
    - isError?: boolean
  Used by: SdkTool.handler

ToolContext
  Purpose: Context passed to tool handlers
  Properties:
    - toolUseId: string
    - sessionId: string
    - signal?: AbortSignal
  Used by: SdkTool.handler

SdkTool<TInput>
  Purpose: SDK tool definition
  Properties:
    - name: string
    - description: string
    - inputSchema: ToolInputSchema
    - handler: (args: TInput, context: ToolContext) => Promise<ToolResult>
  Used by: createSdkMcpServer, ToolRegistry
```

**Completion Criteria**:
- [ ] ToolInputSchema type defined
- [ ] ToolResultContent interface defined
- [ ] ToolResult interface defined
- [ ] ToolContext interface defined
- [ ] SdkTool generic interface defined
- [ ] JsonSchema type for complex schemas
- [ ] Exported from src/sdk/types/index.ts
- [ ] Unit tests for type guards

---

### TASK-002: MCP Config Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/types/mcp.ts`
- `src/sdk/types/mcp.test.ts`
**Estimated Effort**: Small

**Description**:
Define MCP server configuration types for external (stdio, http) and SDK (in-process) servers.

**Type Definitions**:

```
McpStdioServerConfig
  Purpose: External MCP server via subprocess
  Properties:
    - type: 'stdio'
    - command: string
    - args?: string[]
    - env?: Record<string, string>
  Used by: AgentOptions

McpHttpServerConfig
  Purpose: External MCP server via HTTP/SSE
  Properties:
    - type: 'http' | 'sse'
    - url: string
    - headers?: Record<string, string>
  Used by: AgentOptions

McpSdkServerConfig
  Purpose: In-process SDK MCP server
  Properties:
    - type: 'sdk'
    - name: string
    - version?: string
    - tools: SdkTool[]
  Used by: AgentOptions, createSdkMcpServer

McpServerConfig
  Purpose: Union type for all server configs
  Values: McpStdioServerConfig | McpHttpServerConfig | McpSdkServerConfig
  Used by: AgentOptions
```

**Completion Criteria**:
- [ ] McpStdioServerConfig interface defined
- [ ] McpHttpServerConfig interface defined
- [ ] McpSdkServerConfig interface defined
- [ ] McpServerConfig union type defined
- [ ] Type guards: isSdkServer(), isStdioServer(), isHttpServer()
- [ ] Exported from src/sdk/types/index.ts
- [ ] Unit tests for type guards

---

### TASK-003: Session State Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/types/state.ts`
- `src/sdk/types/state.test.ts`
**Estimated Effort**: Small

**Description**:
Define session execution state types including state machine states and detailed state info.

**Type Definitions**:

```
SessionState
  Purpose: Session execution state enum
  Values: 'idle' | 'starting' | 'running' | 'waiting_tool_call' |
          'waiting_permission' | 'paused' | 'completed' | 'failed' | 'cancelled'
  Used by: SessionStateInfo, SessionStateManager

PendingToolCall
  Purpose: Info about pending tool call
  Properties:
    - toolUseId: string
    - toolName: string
    - serverName: string
    - arguments: Record<string, unknown>
    - startedAt: string
  Used by: SessionStateInfo

PendingPermission
  Purpose: Info about pending permission request
  Properties:
    - requestId: string
    - toolName: string
    - toolInput: Record<string, unknown>
  Used by: SessionStateInfo

SessionStats
  Purpose: Session statistics
  Properties:
    - startedAt?: string
    - completedAt?: string
    - toolCallCount: number
    - messageCount: number
  Used by: SessionStateInfo

SessionStateInfo
  Purpose: Detailed session state with metadata
  Properties:
    - state: SessionState
    - sessionId: string
    - pendingToolCall?: PendingToolCall
    - pendingPermission?: PendingPermission
    - stats: SessionStats
  Used by: SessionStateManager, ClaudeCodeAgent
```

**Completion Criteria**:
- [ ] SessionState type defined
- [ ] PendingToolCall interface defined
- [ ] PendingPermission interface defined
- [ ] SessionStats interface defined
- [ ] SessionStateInfo interface defined
- [ ] isTerminalState() helper function
- [ ] Exported from src/sdk/types/index.ts
- [ ] Unit tests

---

### TASK-004: Control Protocol Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/types/protocol.ts`
- `src/sdk/types/protocol.test.ts`
**Estimated Effort**: Small

**Description**:
Define types for the bidirectional control protocol between SDK and Claude Code CLI.

**Type Definitions**:

```
JsonRpcMessage
  Purpose: JSON-RPC 2.0 message structure
  Properties:
    - jsonrpc: '2.0'
    - id?: string | number
    - method?: string
    - params?: object
    - result?: object
    - error?: { code: number; message: string; data?: unknown }
  Used by: ControlRequest, ControlResponse

ControlRequestSubtype
  Purpose: Types of control requests
  Values: 'initialize' | 'interrupt' | 'set_permission_mode' |
          'set_model' | 'mcp_message' | 'can_use_tool' | 'hook_callback'

OutgoingControlRequest
  Purpose: Control request from SDK to CLI
  Properties:
    - type: 'control_request'
    - request_id: string
    - request: InitializeRequest | InterruptRequest | SetModeRequest
  Used by: ControlProtocolHandler

IncomingControlRequest
  Purpose: Control request from CLI to SDK
  Properties:
    - type: 'control_request'
    - request_id: string
    - request: McpMessageRequest | CanUseToolRequest | HookCallbackRequest
  Used by: ControlProtocolHandler

McpMessageRequest
  Purpose: MCP message forwarding request
  Properties:
    - subtype: 'mcp_message'
    - server_name: string
    - message: JsonRpcMessage
  Used by: IncomingControlRequest

ControlResponse
  Purpose: Response to control request
  Properties:
    - type: 'control_response'
    - response: SuccessResponse | ErrorResponse
  Used by: ControlProtocolHandler

MessageType
  Purpose: All message types from CLI
  Values: 'user' | 'assistant' | 'system' | 'result' | 'control_request' | 'control_response'
  Used by: Transport message parsing
```

**Completion Criteria**:
- [ ] JsonRpcMessage interface defined
- [ ] OutgoingControlRequest interface defined
- [ ] IncomingControlRequest interface defined
- [ ] McpMessageRequest interface defined
- [ ] ControlResponse interface defined
- [ ] Message type unions defined
- [ ] Type guards for message types
- [ ] Exported from src/sdk/types/index.ts
- [ ] Unit tests

---

### TASK-005: Mock Transport Fixture

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/__fixtures__/mock-transport.ts`
- `src/sdk/__fixtures__/mock-transport.test.ts`
**Estimated Effort**: Medium

**Description**:
Create mock transport for unit testing that simulates CLI communication without spawning subprocess.

**Implementation**:

```
MockTransport implements Transport
  Purpose: Mock transport for testing
  Methods:
    - connect(): Promise<void>
    - write(data: string): Promise<void>
    - readMessages(): AsyncIterable<object>
    - endInput(): Promise<void>
    - close(): Promise<void>
    - simulateMessage(msg: object): void
    - simulateToolCall(name: string, args: object): void
    - getWrittenMessages(): object[]
  Used by: Unit tests for agent, client, protocol handler

MockTransportOptions
  Properties:
    - autoConnect?: boolean
    - messageDelay?: number
    - simulatedResponses?: object[]
```

**Completion Criteria**:
- [ ] MockTransport class implements Transport interface
- [ ] connect/close lifecycle methods
- [ ] simulateMessage() injects messages from "CLI"
- [ ] simulateToolCall() simulates tool call flow
- [ ] getWrittenMessages() returns messages sent by SDK
- [ ] Async iterator for readMessages()
- [ ] Message delay simulation for realistic timing
- [ ] Unit tests for MockTransport itself

---

### TASK-006: Mock Session Fixture

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/__fixtures__/mock-session.ts`
- `src/sdk/__fixtures__/mock-session.test.ts`
- `src/sdk/__fixtures__/scenarios/index.ts`
- `src/sdk/__fixtures__/scenarios/calculator.ts`
- `src/sdk/__fixtures__/scenarios/tool-error.ts`
**Estimated Effort**: Medium

**Description**:
Create mock Claude session that simulates complete conversation flows including tool calls, for integration testing.

**Implementation**:

```
MockClaudeSession
  Purpose: Simulates complete Claude session with tool calls
  Properties:
    - transport: MockTransport
    - scenario: SessionScenario
    - toolCallsReceived: ToolCallRecord[]
    - toolResultsReturned: ToolResultRecord[]
  Methods:
    - start(prompt: string): void
    - expectToolCall(name: string, args: object): MockClaudeSession
    - respondWithToolResult(result: ToolResult): void
    - expectCompletion(): Promise<void>
    - getToolCallHistory(): ToolCallRecord[]
  Used by: Integration tests

SessionScenario
  Purpose: Pre-defined conversation flow
  Properties:
    - name: string
    - steps: ScenarioStep[]
  Examples:
    - CalculatorScenario: Tests add/subtract tool calls
    - ToolErrorScenario: Tests error handling
    - MultiToolScenario: Tests sequential tool calls

ScenarioStep
  Purpose: Single step in scenario
  Variants:
    - AssistantMessage: { type: 'assistant', content: string }
    - ToolUse: { type: 'tool_use', name: string, args: object }
    - ExpectToolResult: { type: 'expect_result' }
    - Result: { type: 'result', stats: object }
```

**Completion Criteria**:
- [ ] MockClaudeSession class implemented
- [ ] SessionScenario interface defined
- [ ] CalculatorScenario: session calls add tool, expects result
- [ ] ToolErrorScenario: session handles tool error response
- [ ] MultiToolScenario: session calls multiple tools in sequence
- [ ] Scenario step validation
- [ ] Tool call history tracking
- [ ] Assertion helpers for test verification
- [ ] Unit tests for MockClaudeSession

---

### TASK-007: Tool Registry

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-001, TASK-002
**Deliverables**:
- `src/sdk/tool-registry.ts`
- `src/sdk/tool-registry.test.ts`
**Estimated Effort**: Medium

**Description**:
Implement tool() factory function and createSdkMcpServer() for creating in-process MCP servers with tools.

**Implementation**:

```
tool<TInput>(config: ToolConfig<TInput>): SdkTool<TInput>
  Purpose: Factory function to create tool definition
  Parameters:
    - name: string
    - description: string
    - inputSchema: ToolInputSchema
    - handler: (args: TInput, context: ToolContext) => Promise<ToolResult>
  Returns: SdkTool<TInput>
  Used by: External applications, examples

createSdkMcpServer(config: SdkMcpServerOptions): McpSdkServerConfig
  Purpose: Create in-process MCP server configuration
  Parameters:
    - name: string
    - version?: string
    - tools: SdkTool[]
  Returns: McpSdkServerConfig with tool registry
  Used by: AgentOptions.mcpServers

ToolRegistry
  Purpose: Internal registry for SDK tools
  Properties:
    - tools: Map<string, SdkTool>
    - serverName: string
  Methods:
    - register(tool: SdkTool): void
    - get(name: string): SdkTool | undefined
    - list(): SdkTool[]
    - handleToolCall(name: string, args: object, ctx: ToolContext): Promise<ToolResult>
  Used by: ControlProtocolHandler
```

**Completion Criteria**:
- [ ] tool() factory function implemented
- [ ] Input schema to JSON Schema conversion
- [ ] createSdkMcpServer() implemented
- [ ] ToolRegistry class for tool lookup
- [ ] handleToolCall() executes tool handler
- [ ] Error handling for unknown tools
- [ ] Unit tests with mock tools
- [ ] Type safety for tool input/output

---

### TASK-008: Subprocess Transport

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-004
**Deliverables**:
- `src/sdk/transport/transport.ts`
- `src/sdk/transport/subprocess.ts`
- `src/sdk/transport/subprocess.test.ts`
**Estimated Effort**: Medium

**Description**:
Implement subprocess transport that spawns Claude Code CLI and handles stdin/stdout communication.

**Implementation**:

```
Transport (interface)
  Purpose: Abstract transport for CLI communication
  Methods:
    - connect(): Promise<void>
    - write(data: string): Promise<void>
    - readMessages(): AsyncIterable<object>
    - endInput(): Promise<void>
    - close(): Promise<void>
  Used by: ClaudeCodeAgent, ClaudeCodeClient

SubprocessTransport implements Transport
  Purpose: Spawns Claude Code CLI as subprocess
  Properties:
    - process: Subprocess | null
    - stdin: WritableStream | null
    - stdout: ReadableStream | null
    - stderr: ReadableStream | null
  Methods:
    - connect(): Spawns CLI with correct arguments
    - write(): Writes JSON line to stdin
    - readMessages(): Yields parsed JSON from stdout
    - close(): Terminates subprocess
  Used by: ClaudeCodeAgent

TransportOptions
  Properties:
    - cliPath?: string
    - cwd?: string
    - env?: Record<string, string>
    - mcpConfig?: object
    - permissionMode?: string
    - model?: string
    - maxBudgetUsd?: number
```

**Completion Criteria**:
- [ ] Transport interface defined
- [ ] SubprocessTransport class implemented
- [ ] CLI argument builder with all options
- [ ] Bun.spawn() for subprocess management
- [ ] stdin JSON line writing
- [ ] stdout line-by-line JSON parsing
- [ ] stderr capture for debugging
- [ ] Graceful subprocess termination
- [ ] Unit tests with mock (no real CLI)
- [ ] Integration test marker for real CLI tests

---

### TASK-009: Control Protocol Handler

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-004, TASK-007, TASK-008
**Deliverables**:
- `src/sdk/control-protocol.ts`
- `src/sdk/control-protocol.test.ts`
**Estimated Effort**: Large

**Description**:
Implement control protocol handler for bidirectional JSON-RPC communication, routing MCP tool calls to SDK handlers.

**Implementation**:

```
ControlProtocolHandler
  Purpose: Handles control protocol between SDK and CLI
  Properties:
    - transport: Transport
    - toolRegistries: Map<string, ToolRegistry>
    - pendingRequests: Map<string, PendingRequest>
    - eventEmitter: EventEmitter
  Methods:
    - initialize(): Promise<void>
    - sendRequest(request: OutgoingControlRequest): Promise<ControlResponse>
    - handleIncomingMessage(msg: object): Promise<void>
    - routeMcpMessage(serverName: string, msg: JsonRpcMessage): Promise<JsonRpcMessage>
    - registerToolRegistry(serverName: string, registry: ToolRegistry): void
  Events:
    - 'message': (msg: Message) => void
    - 'toolCall': (call: ToolCallInfo) => void
    - 'toolResult': (result: ToolResultInfo) => void
    - 'error': (error: Error) => void
  Used by: ClaudeCodeAgent, ClaudeCodeClient

PendingRequest
  Properties:
    - requestId: string
    - resolve: (response) => void
    - reject: (error) => void
    - timeout: Timer
```

**Completion Criteria**:
- [ ] ControlProtocolHandler class implemented
- [ ] Initialize handshake with CLI
- [ ] Outgoing request sending with timeout
- [ ] Incoming message routing
- [ ] MCP tools/list handling
- [ ] MCP tools/call routing to ToolRegistry
- [ ] Response generation for CLI requests
- [ ] Event emission for messages, tool calls
- [ ] Error handling and propagation
- [ ] Unit tests with MockTransport
- [ ] Integration test with mock scenarios

---

### TASK-010: Session State Manager

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-003
**Deliverables**:
- `src/sdk/session-state.ts`
- `src/sdk/session-state.test.ts`
**Estimated Effort**: Medium

**Description**:
Implement session state manager with state machine transitions and pending operation tracking.

**Implementation**:

```
SessionStateManager extends EventEmitter
  Purpose: Manages session execution state
  Properties:
    - state: SessionState
    - stateInfo: SessionStateInfo
    - pendingOperations: Map<string, PendingOperation>
  Methods:
    - transition(newState: SessionState, metadata?: object): void
    - startToolCall(toolUseId: string, toolName: string, args: object): void
    - completeToolCall(toolUseId: string): void
    - startPermissionRequest(requestId: string, toolName: string, input: object): void
    - completePermissionRequest(requestId: string): void
    - getState(): SessionStateInfo
    - waitForState(state: SessionState, timeout?: number): Promise<void>
  Events:
    - 'stateChange': (change: StateChange) => void
  Used by: ClaudeCodeAgent

StateChange
  Properties:
    - from: SessionState
    - to: SessionState
    - info: SessionStateInfo
    - timestamp: string

PendingOperation
  Properties:
    - type: 'tool_call' | 'permission'
    - id: string
    - startedAt: string
    - metadata: object
```

**Completion Criteria**:
- [ ] SessionStateManager class implemented
- [ ] State transition validation (valid transitions only)
- [ ] startToolCall/completeToolCall for tool tracking
- [ ] startPermissionRequest/completePermissionRequest
- [ ] Stats tracking (toolCallCount, messageCount)
- [ ] waitForState() with timeout
- [ ] stateChange event emission
- [ ] Unit tests for all state transitions
- [ ] Test invalid transition rejection

---

### TASK-011: Claude Code Agent

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-007, TASK-008, TASK-009, TASK-010
**Deliverables**:
- `src/sdk/agent.ts`
- `src/sdk/agent.test.ts`
**Estimated Effort**: Large

**Description**:
Implement ClaudeCodeAgent class that orchestrates session execution with SDK tools.

**Implementation**:

```
ClaudeCodeAgent
  Purpose: High-level API for running Claude sessions with SDK tools
  Properties:
    - options: AgentOptions
    - transport: Transport
    - protocol: ControlProtocolHandler
    - stateManager: SessionStateManager
    - toolRegistries: Map<string, ToolRegistry>
  Methods:
    - startSession(config: SessionConfig): Promise<AgentSession>
    - close(): Promise<void>
  Used by: External applications

AgentSession extends EventEmitter
  Purpose: Running session instance
  Properties:
    - sessionId: string
    - agent: ClaudeCodeAgent
  Methods:
    - messages(): AsyncIterable<Message>
    - pause(): Promise<void>
    - resume(): Promise<void>
    - cancel(): Promise<void>
    - interrupt(): Promise<void>
    - getState(): SessionStateInfo
    - waitForCompletion(): Promise<SessionResult>
  Events:
    - 'message': (msg: Message) => void
    - 'toolCall': (call: ToolCallInfo) => void
    - 'toolResult': (result: ToolResultInfo) => void
    - 'stateChange': (change: StateChange) => void
    - 'complete': (result: SessionResult) => void
    - 'error': (error: Error) => void
  Used by: External applications

AgentOptions
  Properties:
    - cwd?: string
    - mcpServers?: Record<string, McpServerConfig>
    - allowedTools?: string[]
    - disallowedTools?: string[]
    - systemPrompt?: string | { preset: 'claude_code'; append?: string }
    - permissionMode?: PermissionMode
    - canUseTool?: CanUseToolCallback
    - hooks?: HookConfigurations
    - model?: string
    - maxBudgetUsd?: number
    - maxTurns?: number
    - env?: Record<string, string>
    - cliPath?: string

SessionConfig
  Properties:
    - prompt: string
    - projectPath?: string
```

**Completion Criteria**:
- [ ] ClaudeCodeAgent class implemented
- [ ] Tool registry creation from mcpServers
- [ ] Transport initialization
- [ ] Protocol handler setup
- [ ] AgentSession class implemented
- [ ] messages() async iterator
- [ ] Session control methods (pause, resume, cancel)
- [ ] State query via getState()
- [ ] Event emission for all events
- [ ] waitForCompletion() promise
- [ ] Proper cleanup on close()
- [ ] Unit tests with MockTransport
- [ ] Integration test with MockClaudeSession

---

### TASK-012: Claude Code Client

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-011
**Deliverables**:
- `src/sdk/client.ts`
- `src/sdk/client.test.ts`
**Estimated Effort**: Medium

**Description**:
Implement ClaudeCodeClient for multi-turn interactive sessions.

**Implementation**:

```
ClaudeCodeClient
  Purpose: Multi-turn conversation client
  Properties:
    - agent: ClaudeCodeAgent
    - connected: boolean
    - currentSession: AgentSession | null
  Methods:
    - connect(): Promise<void>
    - query(prompt: string): Promise<void>
    - receiveResponse(): AsyncIterable<Message>
    - disconnect(): Promise<void>
    - isConnected(): boolean
    - getState(): SessionStateInfo | null
  Used by: External applications for interactive sessions

ClientOptions extends AgentOptions
  Properties:
    - keepAlive?: boolean
    - reconnectOnError?: boolean
```

**Completion Criteria**:
- [ ] ClaudeCodeClient class implemented
- [ ] connect/disconnect lifecycle
- [ ] query() sends user message
- [ ] receiveResponse() streams response messages
- [ ] Multi-turn conversation support
- [ ] Context preservation between queries
- [ ] State query
- [ ] Unit tests with MockTransport
- [ ] Integration test with multi-turn scenario

---

### TASK-013: SDK Index and Exports

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-001, TASK-002, TASK-003, TASK-004, TASK-007, TASK-011, TASK-012
**Deliverables**:
- `src/sdk/index.ts`
- `src/sdk/types/index.ts`
**Estimated Effort**: Small

**Description**:
Create module exports for public SDK API.

**Exports**:

```
src/sdk/index.ts exports:
  - tool
  - createSdkMcpServer
  - ClaudeCodeAgent
  - ClaudeCodeClient
  - Types: SdkTool, ToolResult, ToolContext, etc.
  - Errors: ClaudeCodeAgentError subclasses

src/sdk/types/index.ts exports:
  - All type definitions from tool.ts, mcp.ts, state.ts, protocol.ts
```

**Completion Criteria**:
- [ ] src/sdk/types/index.ts exports all types
- [ ] src/sdk/index.ts exports public API
- [ ] No internal implementation details exposed
- [ ] JSDoc comments for all exports
- [ ] Type checking passes

---

### TASK-014: Tool Call Integration Tests

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-006, TASK-011, TASK-012, TASK-013
**Deliverables**:
- `src/sdk/__tests__/tool-call.integration.test.ts`
**Estimated Effort**: Medium

**Description**:
Integration tests using MockClaudeSession to verify tools are correctly invoked.

**Test Cases**:

```
describe('SDK Tool Call Integration')
  describe('Single Tool Call')
    - should invoke registered tool handler with correct arguments
    - should return tool result to Claude
    - should track tool call in session state
    - should emit toolCall and toolResult events

  describe('Multiple Tool Calls')
    - should handle sequential tool calls
    - should track all tool calls in history
    - should update stats correctly

  describe('Tool Error Handling')
    - should handle tool returning isError: true
    - should handle tool throwing exception
    - should continue session after tool error

  describe('Session State During Tool Call')
    - should transition to waiting_tool_call state
    - should include pendingToolCall info
    - should transition back to running after result

  describe('External Library Usage')
    - should allow external code to define tools
    - should allow external code to access tool call history
    - should allow external code to query session state
```

**Completion Criteria**:
- [ ] All test cases implemented
- [ ] Uses MockClaudeSession with CalculatorScenario
- [ ] Verifies tool handler invocation
- [ ] Verifies tool result delivery
- [ ] Verifies session state transitions
- [ ] Verifies event emissions
- [ ] All tests passing

---

### TASK-015: Error Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/errors.ts`
- `src/sdk/errors.test.ts`
**Estimated Effort**: Small

**Description**:
Define error types specific to SDK tool execution.

**Error Classes**:

```
ClaudeCodeAgentError extends Error
  Purpose: Base error for SDK
  Properties:
    - code: string
  Used by: All SDK errors

CLINotFoundError extends ClaudeCodeAgentError
  Purpose: CLI binary not found
  Properties:
    - path: string
    - code: 'CLI_NOT_FOUND'

CLIConnectionError extends ClaudeCodeAgentError
  Purpose: Failed to connect to CLI
  Properties:
    - reason: string
    - code: 'CLI_CONNECTION'

ToolExecutionError extends ClaudeCodeAgentError
  Purpose: Tool handler failed
  Properties:
    - toolName: string
    - cause: Error
    - code: 'TOOL_EXECUTION'

ControlProtocolError extends ClaudeCodeAgentError
  Purpose: Protocol communication error
  Properties:
    - requestId?: string
    - code: 'CONTROL_PROTOCOL'

TimeoutError extends ClaudeCodeAgentError
  Purpose: Operation timed out
  Properties:
    - operation: string
    - timeout: number
    - code: 'TIMEOUT'
```

**Completion Criteria**:
- [ ] All error classes implemented
- [ ] Proper error inheritance
- [ ] Error codes defined
- [ ] Unit tests for error creation
- [ ] Exported from src/sdk/index.ts

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| SDK Tool Types | `src/sdk/types/tool.ts` | NOT_STARTED | - |
| MCP Config Types | `src/sdk/types/mcp.ts` | NOT_STARTED | - |
| Session State Types | `src/sdk/types/state.ts` | NOT_STARTED | - |
| Control Protocol Types | `src/sdk/types/protocol.ts` | NOT_STARTED | - |
| Mock Transport | `src/sdk/__fixtures__/mock-transport.ts` | NOT_STARTED | - |
| Mock Session | `src/sdk/__fixtures__/mock-session.ts` | NOT_STARTED | - |
| Tool Registry | `src/sdk/tool-registry.ts` | NOT_STARTED | - |
| Subprocess Transport | `src/sdk/transport/subprocess.ts` | NOT_STARTED | - |
| Control Protocol | `src/sdk/control-protocol.ts` | NOT_STARTED | - |
| Session State Manager | `src/sdk/session-state.ts` | NOT_STARTED | - |
| Claude Code Agent | `src/sdk/agent.ts` | NOT_STARTED | - |
| Claude Code Client | `src/sdk/client.ts` | NOT_STARTED | - |
| SDK Index | `src/sdk/index.ts` | NOT_STARTED | - |
| Error Types | `src/sdk/errors.ts` | NOT_STARTED | - |
| Integration Tests | `src/sdk/__tests__/tool-call.integration.test.ts` | NOT_STARTED | - |

---

## Dependencies

| Task | Depends On | Status |
|------|------------|--------|
| TASK-001 | None | Ready |
| TASK-002 | None | Ready |
| TASK-003 | None | Ready |
| TASK-004 | None | Ready |
| TASK-005 | None | Ready |
| TASK-006 | None | Ready |
| TASK-007 | TASK-001, TASK-002 | Blocked |
| TASK-008 | TASK-004 | Blocked |
| TASK-009 | TASK-004, TASK-007, TASK-008 | Blocked |
| TASK-010 | TASK-003 | Blocked |
| TASK-011 | TASK-007, TASK-008, TASK-009, TASK-010 | Blocked |
| TASK-012 | TASK-011 | Blocked |
| TASK-013 | TASK-001-004, TASK-007, TASK-011, TASK-012 | Blocked |
| TASK-014 | TASK-006, TASK-011, TASK-012, TASK-013 | Blocked |
| TASK-015 | None | Ready |

---

## Parallelization Strategy

**Wave 1** (Parallelizable - No Dependencies):
- TASK-001: SDK Tool Types
- TASK-002: MCP Config Types
- TASK-003: Session State Types
- TASK-004: Control Protocol Types
- TASK-005: Mock Transport Fixture
- TASK-006: Mock Session Fixture
- TASK-015: Error Types

**Wave 2** (After Wave 1):
- TASK-007: Tool Registry (needs TASK-001, TASK-002)
- TASK-008: Subprocess Transport (needs TASK-004)
- TASK-010: Session State Manager (needs TASK-003)

**Wave 3** (After Wave 2):
- TASK-009: Control Protocol Handler (needs TASK-004, TASK-007, TASK-008)

**Wave 4** (After Wave 3):
- TASK-011: Claude Code Agent (needs TASK-007, TASK-008, TASK-009, TASK-010)

**Wave 5** (After Wave 4):
- TASK-012: Claude Code Client (needs TASK-011)

**Wave 6** (After Wave 5):
- TASK-013: SDK Index and Exports
- TASK-014: Tool Call Integration Tests

---

## Completion Criteria

- [ ] All 15 tasks completed
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Type checking passes
- [ ] External library usage works (tool definition from external code)
- [ ] Tool calls are correctly routed to handlers
- [ ] Session state correctly tracks "waiting_tool_call" state
- [ ] Mock session fixtures enable reliable testing

---

## Progress Log

### Session: 2026-02-04

**Tasks Completed**: Initial plan created
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Created implementation plan with 15 tasks
- Defined parallelization strategy with 6 waves
- Wave 1 has 7 parallelizable tasks
- Mock session fixtures (TASK-005, TASK-006) enable testing without real CLI
- Integration tests (TASK-014) verify tool invocation with scenarios
