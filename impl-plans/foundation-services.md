# Foundation Services Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/DESIGN.md, design-docs/spec-infrastructure.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06
**Part**: 4 of 4

---

## Related Plans

This plan is part of the Foundation and Core implementation, split into:
1. **foundation-interfaces.md** - Core interfaces and production implementations
2. **foundation-types.md** - Error types, Result pattern, and core type definitions
3. **foundation-mocks.md** - Container and mock implementations
4. **foundation-services.md** (this file) - JSONL parser, session reader, events, repositories

---

## Design Document Reference

**Source**:
- `design-docs/DESIGN.md` - Overall architecture and module structure
- `design-docs/spec-infrastructure.md` - Testability, error handling, configuration

### Summary

Implement core services: JSONL parser, session reader, event system, repository interfaces, and in-memory repository implementations.

### Scope

**Included**:
- JSONL parser with error recovery
- Session reader for reading JSONL session files
- Event system (types and emitter)
- Repository interfaces (Session, Bookmark, Group, Queue)
- In-memory repository implementations

**Excluded**: File-based repositories (deferred to later)

---

## Deliverables

### Deliverable 1: src/sdk/jsonl-parser.ts

**Purpose**: Parse JSONL files with error recovery

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `parseJsonl` | function | Parse JSONL content | SessionReader |
| `parseJsonlWithRecovery` | function | Parse with error callback | SessionReader |

**Function Signatures**:

```
parseJsonl<T>(content: string): Result<T[], ParseError>
  Purpose: Parse JSONL content into array of objects
  Called by: SessionReader

parseJsonlWithRecovery<T>(
  content: string,
  onError: (error: ParseError) => void
): T[]
  Purpose: Parse JSONL, calling onError for invalid lines
  Called by: SessionReader when recovery is desired
```

**Dependencies**: `src/errors.ts`, `src/result.ts`

**Dependents**: SessionReader

---

### Deliverable 2: src/sdk/session-reader.ts

**Purpose**: Read and parse session files

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `SessionReader` | class | Read session files | SessionManager |

**Class Definition**:

```
SessionReader
  Purpose: Read and parse Claude Code session files
  Constructor: (container: Container)
  Public Methods:
    - readSession(path: string): Promise<Result<Session, AgentError>>
    - readMessages(path: string): Promise<Result<Message[], AgentError>>
    - findSessionFiles(projectPath: string): Promise<string[]>
  Dependencies: FileSystem
  Used by: SessionManager
```

**Dependencies**: `src/interfaces/filesystem.ts`, `src/sdk/jsonl-parser.ts`, `src/types/*`

**Dependents**: SessionManager

---

### Deliverable 3: src/sdk/events/emitter.ts

**Purpose**: Event emitter for SDK events

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `EventEmitter` | class | Emit and subscribe to events | SDK, daemon |

**Class Definition**:

```
EventEmitter
  Purpose: Typed event emitter for SDK events
  Constructor: ()
  Public Methods:
    - on<T>(event: string, handler: (data: T) => void): void
    - off<T>(event: string, handler: (data: T) => void): void
    - once<T>(event: string, handler: (data: T) => void): void
    - emit<T>(event: string, data: T): void
  Used by: SessionManager, GroupManager, QueueManager
```

**Dependencies**: `src/sdk/events/types.ts`

**Dependents**: All managers, daemon SSE

---

### Deliverable 4: src/repository/session-repository.ts

**Purpose**: Session repository interface

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `SessionRepository` | interface | Session data access | SessionManager |
| `SessionFilter` | interface | Query filter | SessionRepository.list |

**Interface Definitions**:

```
SessionRepository
  Purpose: Data access for sessions
  Methods:
    - findById(id: string): Promise<Session | null>
    - findByProject(projectPath: string): Promise<Session[]>
    - list(filter?: SessionFilter): Promise<Session[]>
    - save(metadata: SessionMetadata): Promise<void>
    - delete(id: string): Promise<void>
  Used by: SessionManager

SessionFilter
  Purpose: Filter criteria for listing sessions
  Properties:
    - projectPath?: string
    - status?: SessionStatus
    - since?: Date
    - limit?: number
  Used by: SessionRepository.list
```

**Dependencies**: `src/types/session.ts`

**Dependents**: InMemorySessionRepository, FileSessionRepository, SessionManager

---

### Deliverable 5: src/repository/in-memory/session-repository.ts

**Purpose**: In-memory session repository

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `InMemorySessionRepository` | class | In-memory implementation | Tests, initial dev |

**Class Definition**:

```
InMemorySessionRepository implements SessionRepository
  Purpose: In-memory session storage for testing
  Constructor: ()
  Public Methods:
    - (all SessionRepository methods)
    - clear(): void - Clear all data
  Private Properties:
    - sessions: Map<string, Session>
  Used by: Tests
```

**Dependencies**: `src/repository/session-repository.ts`

**Dependents**: Tests, initial development

---

## Subtasks

### TASK-007: Repository Interfaces

**Status**: Completed
**Parallelizable**: No (depends on TASK-003)
**Deliverables**:
- `src/repository/session-repository.ts`
- `src/repository/bookmark-repository.ts`
- `src/repository/group-repository.ts`
- `src/repository/queue-repository.ts`
- `src/repository/index.ts`
**Estimated Effort**: Small

**Description**:
Define repository interfaces for data access.

**Completion Criteria**:
- [x] SessionRepository interface defined
- [x] BookmarkRepository interface defined
- [x] GroupRepository interface defined
- [x] QueueRepository interface defined
- [x] All filter types defined
- [x] All interfaces exported
- [x] Type checking passes

---

### TASK-008: In-Memory Repositories

**Status**: Completed
**Parallelizable**: No (depends on TASK-007)
**Deliverables**:
- `src/repository/in-memory/session-repository.ts`
- `src/repository/in-memory/bookmark-repository.ts`
- `src/repository/in-memory/group-repository.ts`
- `src/repository/in-memory/queue-repository.ts`
- `src/repository/in-memory/index.ts`
**Estimated Effort**: Medium

**Description**:
Implement in-memory versions of all repositories for testing and initial development.

**Completion Criteria**:
- [x] InMemorySessionRepository implemented
- [x] InMemoryBookmarkRepository implemented
- [x] InMemoryGroupRepository implemented
- [x] InMemoryQueueRepository implemented
- [x] Unit tests for all repositories
- [x] Filter operations tested
- [x] Type checking passes

---

### TASK-009: JSONL Parser

**Status**: Completed
**Parallelizable**: No (depends on TASK-002)
**Deliverables**:
- `src/sdk/jsonl-parser.ts`
**Estimated Effort**: Small

**Description**:
Implement JSONL parsing with error recovery.

**Completion Criteria**:
- [x] parseJsonl function implemented
- [x] parseJsonlWithRecovery function implemented
- [x] Error recovery on malformed lines
- [x] Unit tests with valid JSONL
- [x] Unit tests with invalid lines
- [x] Type checking passes

---

### TASK-010: Session Reader

**Status**: Completed
**Parallelizable**: No (depends on TASK-001, TASK-009)
**Deliverables**:
- `src/sdk/session-reader.ts`
**Estimated Effort**: Medium

**Description**:
Implement session file reading and parsing.

**Completion Criteria**:
- [x] SessionReader class implemented
- [x] readSession() implemented
- [x] readMessages() implemented
- [x] findSessionFiles() implemented
- [x] Unit tests with MockFileSystem
- [x] Type checking passes

---

### TASK-011: Event System

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/events/types.ts`
- `src/sdk/events/emitter.ts`
- `src/sdk/events/index.ts`
**Estimated Effort**: Small

**Description**:
Implement typed event emitter for SDK events.

**Completion Criteria**:
- [x] Event types defined (SessionStarted, MessageReceived, etc.)
- [x] EventEmitter class implemented
- [x] on/off/once/emit methods working
- [x] Unit tests for event handling
- [x] Type checking passes

---

## Progress Log

### Session: 2026-01-05 00:30
**Tasks Completed**: TASK-011
**Files Created**:
- `src/sdk/events/types.ts` - All event types (Session, Group, Queue events)
- `src/sdk/events/emitter.ts` - Typed EventEmitter class
- `src/sdk/events/index.ts` - Module exports
- `src/sdk/events/emitter.test.ts` - 17 unit tests for EventEmitter
**Notes**:
- All tests passing
- Type checking passes

---

### Session: 2026-01-06 09:40
**Tasks Completed**: TASK-007, TASK-009
**Files Created**:
- `src/repository/session-repository.ts` - SessionRepository interface with filter/sort
- `src/repository/bookmark-repository.ts` - BookmarkRepository interface
- `src/repository/group-repository.ts` - GroupRepository interface with GroupSession
- `src/repository/queue-repository.ts` - QueueRepository interface with command management
- `src/repository/index.ts` - Module exports
- `src/sdk/jsonl-parser.ts` - parseJsonl, parseJsonlWithRecovery, parseJsonlStream, toJsonl
- `src/sdk/jsonl-parser.test.ts` - 26 unit tests for JSONL parser
**Notes**:
- All implementations APPROVED on first iteration
- Type checking passes
- All tests passing

---

### Session: 2026-01-06 (Library Migration)
**Type**: Refactoring / Library Replacement
**Changes**:
- **EventEmitter**: Replaced custom implementation with `mitt` library
  - `src/sdk/events/emitter.ts` wraps mitt for type-safe event handling
  - Maintains same public API (on/off/once/emit)
- **Logger**: Added centralized logging with `consola`
  - `src/logger.ts` provides configured consola instance
  - `createTaggedLogger()` for module-specific logging
  - Environment-based log levels (LOG_LEVEL, NODE_ENV)
**Notes**:
- All existing tests continue to pass
- Backward compatibility maintained

---

### Session: 2026-01-06 14:00
**Tasks Completed**: TASK-008, TASK-010
**Files Created**:
- `src/repository/in-memory/session-repository.ts` - InMemorySessionRepository with full CRUD
- `src/repository/in-memory/bookmark-repository.ts` - InMemoryBookmarkRepository with search
- `src/repository/in-memory/group-repository.ts` - InMemoryGroupRepository with session updates
- `src/repository/in-memory/queue-repository.ts` - InMemoryQueueRepository with command management
- `src/repository/in-memory/index.ts` - Module exports
- `src/repository/in-memory/session-repository.test.ts` - 21 tests
- `src/repository/in-memory/bookmark-repository.test.ts` - 30 tests
- `src/repository/in-memory/group-repository.test.ts` - 24 tests
- `src/repository/in-memory/queue-repository.test.ts` - 34 tests
- `src/sdk/session-reader.ts` - SessionReader class for reading JSONL session files
- `src/sdk/session-reader.test.ts` - 23 tests for SessionReader
**Notes**:
- All implementations APPROVED on first iteration
- Type checking passes
- All 132 tests passing
- Foundation and Core plan is now COMPLETE

---
