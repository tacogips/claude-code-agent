# Foundation Types Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/DESIGN.md, design-docs/spec-infrastructure.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06
**Part**: 2 of 4

---

## Related Plans

This plan is part of the Foundation and Core implementation, split into:
1. **foundation-interfaces.md** - Core interfaces and production implementations
2. **foundation-types.md** (this file) - Error types, Result pattern, and core type definitions
3. **foundation-mocks.md** - Container and mock implementations
4. **foundation-services.md** - JSONL parser, session reader, events, repositories

---

## Design Document Reference

**Source**:
- `design-docs/DESIGN.md` - Overall architecture and module structure
- `design-docs/spec-infrastructure.md` - Testability, error handling, configuration

### Summary

Implement error types, Result pattern for error handling, and core type definitions (Session, Message, Task, Config).

### Scope

**Included**:
- Error type hierarchy (AgentError and subclasses)
- Result type pattern (integrated with neverthrow library)
- Session, Message, Task, and Config type definitions

**Excluded**: Repository interfaces (see foundation-services.md)

---

## Deliverables

### Deliverable 1: src/errors.ts

**Purpose**: Define error types for the application

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `AgentError` | abstract class | Base error type | All error subclasses |
| `FileNotFoundError` | class | File not found | FileSystem operations |
| `SessionNotFoundError` | class | Session not found | SessionManager |
| `ParseError` | class | Parse failure | JSONL parser |
| `ProcessError` | class | Process failure | ProcessManager |
| `BudgetExceededError` | class | Budget exceeded | GroupRunner |

**Class Definitions**:

```
AgentError extends Error
  Purpose: Base class for all application errors
  Properties:
    - code: string (abstract) - Error code
    - recoverable: boolean (abstract) - Whether error is recoverable
  Used by: All error handlers

FileNotFoundError extends AgentError
  Purpose: File not found error
  Properties:
    - path: string - The missing file path
    - code: 'FILE_NOT_FOUND'
    - recoverable: false

SessionNotFoundError extends AgentError
  Purpose: Session not found error
  Properties:
    - sessionId: string - The missing session ID
    - code: 'SESSION_NOT_FOUND'
    - recoverable: false

ParseError extends AgentError
  Purpose: Parse failure error
  Properties:
    - file: string - File being parsed
    - line: number - Line number of error
    - details: string - Error details
    - code: 'PARSE_ERROR'
    - recoverable: true

ProcessError extends AgentError
  Purpose: Process execution error
  Properties:
    - command: string - Command that failed
    - exitCode: number - Exit code
    - stderr: string - Error output
    - code: 'PROCESS_ERROR'
    - recoverable: false

BudgetExceededError extends AgentError
  Purpose: Budget limit exceeded
  Properties:
    - sessionId: string - Session that exceeded
    - usage: number - Actual usage
    - limit: number - Budget limit
    - code: 'BUDGET_EXCEEDED'
    - recoverable: false
```

**Dependencies**: None

**Dependents**: All modules that handle errors

---

### Deliverable 2: src/result.ts

**Purpose**: Result type for error handling without exceptions

**Implementation Note**: This module re-exports from `neverthrow` library with backward-compatible wrapper functions. Native neverthrow methods are preferred for new code (e.g., `result.isOk()` instead of `isOk(result)`).

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Result<T, E>` | type (re-export from neverthrow) | Success or error result | All SDK functions |
| `ResultAsync<T, E>` | type (re-export from neverthrow) | Async success or error result | Async SDK functions |
| `ok<T>` | function (re-export from neverthrow) | Create success result | SDK functions |
| `err<E>` | function (re-export from neverthrow) | Create error result | SDK functions |
| `isOk` | function (@deprecated) | Type guard for success | Legacy code |
| `isErr` | function (@deprecated) | Type guard for error | Legacy code |
| `map` | function (@deprecated) | Map success value | Legacy code |
| `mapErr` | function (@deprecated) | Map error value | Legacy code |
| `flatMap` | function (@deprecated) | Chain result operations | Legacy code |
| `unwrap` | function | Unwrap or throw | Program boundaries |
| `unwrapOr` | function (@deprecated) | Unwrap with default | Legacy code |
| `all` | function | Combine multiple results | Batch operations |
| `tryCatch` | function | Wrap throwing functions | Error boundaries |

**Preferred Usage (neverthrow native methods)**:

```
// Create results
const success = ok(value);
const failure = err(error);

// Check results
if (result.isOk()) { ... }
if (result.isErr()) { ... }

// Transform results
result.map(fn)
result.mapErr(fn)
result.andThen(fn)
result.unwrapOr(defaultValue)
```

**Dependencies**: neverthrow (npm package)

**Dependents**: All SDK modules

---

### Deliverable 3: src/types/session.ts

**Purpose**: Session-related type definitions

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Session` | interface | Session data | SessionManager, repositories |
| `SessionStatus` | type | Session state | Session tracking |
| `SessionMetadata` | interface | Session metadata | Storage, display |

**Interface Definitions**:

```
Session
  Purpose: Represents a Claude Code session
  Properties:
    - id: string - Session ID
    - projectPath: string - Project directory
    - status: SessionStatus - Current status
    - createdAt: string - ISO timestamp
    - updatedAt: string - ISO timestamp
    - messages: Message[] - Session messages
    - tasks: Task[] - Active tasks
  Used by: SessionManager, SessionReader, repositories

SessionStatus
  Purpose: Session lifecycle states
  Values: 'active' | 'paused' | 'completed' | 'failed'
  Used by: Session, GroupRunner

SessionMetadata
  Purpose: Session metadata for storage
  Properties:
    - id: string
    - projectPath: string
    - status: SessionStatus
    - createdAt: string
    - updatedAt: string
    - totalTokens: number
    - totalCostUsd: number
  Used by: SessionRepository
```

**Dependencies**: `src/types/message.ts`, `src/types/task.ts`

**Dependents**: SessionManager, SessionReader, repositories

---

### Deliverable 4: src/types/message.ts

**Purpose**: Message-related type definitions

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Message` | interface | Session message | Session, SessionReader |
| `MessageRole` | type | Message sender | Message |
| `ToolCall` | interface | Tool invocation | Message |
| `ToolResult` | interface | Tool response | Message |

**Interface Definitions**:

```
Message
  Purpose: A message in a session
  Properties:
    - id: string - Message ID
    - role: MessageRole - Sender role
    - content: string - Message content
    - timestamp: string - ISO timestamp
    - toolCalls?: ToolCall[] - Tool invocations
    - toolResults?: ToolResult[] - Tool responses
  Used by: Session, MarkdownParser

MessageRole
  Purpose: Who sent the message
  Values: 'user' | 'assistant' | 'system'
  Used by: Message

ToolCall
  Purpose: Tool invocation by assistant
  Properties:
    - id: string - Call ID
    - name: string - Tool name
    - input: Record<string, unknown> - Tool parameters
  Used by: Message

ToolResult
  Purpose: Result from tool execution
  Properties:
    - id: string - Matches ToolCall.id
    - output: string - Tool output
    - isError: boolean - Whether error occurred
  Used by: Message
```

**Dependencies**: None

**Dependents**: Session, SessionReader, MarkdownParser

---

## Subtasks

### TASK-002: Error Types and Result

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `src/errors.ts`
- `src/result.ts`
**Estimated Effort**: Small

**Description**:
Implement error types and Result type pattern for error handling.

**Completion Criteria**:
- [x] AgentError abstract base class implemented
- [x] All error subclasses implemented (FileNotFound, SessionNotFound, Parse, Process, BudgetExceeded)
- [x] Result type defined
- [x] ok(), err(), isOk(), isErr() helpers implemented
- [x] Unit tests for error types
- [x] Unit tests for Result utilities

---

### TASK-003: Core Types

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `src/types/session.ts`
- `src/types/message.ts`
- `src/types/task.ts`
- `src/types/config.ts`
- `src/types/index.ts`
**Estimated Effort**: Small

**Description**:
Define all core type definitions for the SDK.

**Completion Criteria**:
- [x] Session, SessionStatus, SessionMetadata types defined
- [x] Message, MessageRole, ToolCall, ToolResult types defined
- [x] Task, TaskStatus types defined
- [x] Config types defined
- [x] All types exported from index.ts
- [x] Type checking passes

---

## Progress Log

### Session: 2026-01-05 00:30
**Tasks Completed**: TASK-002, TASK-003
**Files Created**:
- `src/errors.ts` - AgentError and all error subclasses
- `src/result.ts` - Result type and utilities (ok, err, map, flatMap, etc.)
- `src/types/session.ts` - Session, SessionStatus, SessionMetadata, TokenUsage
- `src/types/message.ts` - Message, MessageRole, ToolCall, ToolResult
- `src/types/task.ts` - Task, TaskStatus, TaskProgress
- `src/types/config.ts` - AgentConfig, DaemonConfig, ViewerConfig
- `src/types/index.ts` - Module exports
- `src/result.test.ts` - 31 unit tests for Result utilities
- `src/errors.test.ts` - 10 unit tests for error types
- `src/types/types.test.ts` - 18 unit tests for core types
**Notes**:
- All 59 tests passing
- Type checking passes
- 2 parallelizable tasks executed concurrently

---

### Session: 2026-01-06 (Library Migration)
**Type**: Refactoring / Library Replacement
**Changes**:
- **Result type**: Replaced custom implementation with `neverthrow` library
  - `src/result.ts` now re-exports from neverthrow with backward-compatible wrappers
  - Standalone functions (`isOk`, `isErr`, `map`, `mapErr`, `flatMap`, `unwrapOr`) marked `@deprecated`
  - New code should use native neverthrow methods: `result.isOk()`, `result.map()`, `result.andThen()`
  - `ResultAsync` now available for async operations
**Notes**:
- All existing tests continue to pass
- Backward compatibility maintained through wrapper functions
- Migration to native methods recommended for new code

---
