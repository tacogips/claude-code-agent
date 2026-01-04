# Implementation Plan

## Overview

This document tracks the implementation progress of claude-code-agent. The design phase is complete (see `design-docs/`), and we are now in the implementation phase.

**Implementation Strategy**:
1. Start with lower layers using mocks (interfaces, repositories)
2. Build client, API, and service layers
3. Write tests for each module as they are created
4. Defer frontend implementation (browser viewer)

**Status Legend**:
- `NOT_STARTED` - Implementation not begun
- `IN_PROGRESS` - Currently being implemented
- `COMPLETED` - Implementation and tests complete
- `BLOCKED` - Blocked by dependency or decision

---

## Phase 1: Foundation Layer (Mock-First)

**Goal**: Establish testability infrastructure with interface abstractions and mock implementations.

**Status**: NOT_STARTED

### 1.1 Core Interfaces

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| FileSystem interface | `src/interfaces/filesystem.ts` | NOT_STARTED | - |
| ProcessManager interface | `src/interfaces/process-manager.ts` | NOT_STARTED | - |
| Clock interface | `src/interfaces/clock.ts` | NOT_STARTED | - |
| Interface exports | `src/interfaces/index.ts` | NOT_STARTED | - |

### 1.2 Mock Implementations

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| MockFileSystem | `src/test/mocks/filesystem.ts` | NOT_STARTED | - |
| MockProcessManager | `src/test/mocks/process-manager.ts` | NOT_STARTED | - |
| MockClock | `src/test/mocks/clock.ts` | NOT_STARTED | - |
| Mock exports | `src/test/mocks/index.ts` | NOT_STARTED | - |

### 1.3 Production Implementations

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| BunFileSystem | `src/interfaces/bun-filesystem.ts` | NOT_STARTED | - |
| BunProcessManager | `src/interfaces/bun-process-manager.ts` | NOT_STARTED | - |
| SystemClock | `src/interfaces/system-clock.ts` | NOT_STARTED | - |

### 1.4 Dependency Injection

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Container interface | `src/container.ts` | NOT_STARTED | - |
| createTestContainer | `src/test/helpers.ts` | NOT_STARTED | - |

### 1.5 Error Types

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| AgentError base class | `src/errors.ts` | NOT_STARTED | - |
| FileNotFoundError | `src/errors.ts` | NOT_STARTED | - |
| SessionNotFoundError | `src/errors.ts` | NOT_STARTED | - |
| ParseError | `src/errors.ts` | NOT_STARTED | - |
| ProcessError | `src/errors.ts` | NOT_STARTED | - |
| BudgetExceededError | `src/errors.ts` | NOT_STARTED | - |
| Result type utilities | `src/result.ts` | NOT_STARTED | - |

### 1.6 Core Types

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Session types | `src/types/session.ts` | NOT_STARTED | - |
| Message types | `src/types/message.ts` | NOT_STARTED | - |
| Task types | `src/types/task.ts` | NOT_STARTED | - |
| Config types | `src/types/config.ts` | NOT_STARTED | - |
| Type exports | `src/types/index.ts` | NOT_STARTED | - |

**Dependencies**: None

---

## Phase 2: Repository Layer

**Goal**: Implement data access layer with repository pattern. Use in-memory implementation first.

**Status**: NOT_STARTED

### 2.1 Repository Interfaces

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| SessionRepository interface | `src/repository/session-repository.ts` | NOT_STARTED | - |
| BookmarkRepository interface | `src/repository/bookmark-repository.ts` | NOT_STARTED | - |
| GroupRepository interface | `src/repository/group-repository.ts` | NOT_STARTED | - |
| QueueRepository interface | `src/repository/queue-repository.ts` | NOT_STARTED | - |

### 2.2 In-Memory Implementations (Test/Initial)

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| InMemorySessionRepository | `src/repository/in-memory/session-repository.ts` | NOT_STARTED | - |
| InMemoryBookmarkRepository | `src/repository/in-memory/bookmark-repository.ts` | NOT_STARTED | - |
| InMemoryGroupRepository | `src/repository/in-memory/group-repository.ts` | NOT_STARTED | - |
| InMemoryQueueRepository | `src/repository/in-memory/queue-repository.ts` | NOT_STARTED | - |

### 2.3 File-Based Implementations

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| FileSessionRepository | `src/repository/file/session-repository.ts` | NOT_STARTED | - |
| FileBookmarkRepository | `src/repository/file/bookmark-repository.ts` | NOT_STARTED | - |
| FileGroupRepository | `src/repository/file/group-repository.ts` | NOT_STARTED | - |
| FileQueueRepository | `src/repository/file/queue-repository.ts` | NOT_STARTED | - |

**Dependencies**: Phase 1 (interfaces, types, errors)

---

## Phase 3: Core Services

**Goal**: Implement core SDK services that orchestrate business logic.

**Status**: NOT_STARTED

### 3.1 Session Reader (JSONL Parser)

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| SessionReader | `src/sdk/session-reader.ts` | NOT_STARTED | - |
| JSONL Parser | `src/sdk/jsonl-parser.ts` | NOT_STARTED | - |

### 3.2 Session Manager

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| SessionManager | `src/sdk/session-manager.ts` | NOT_STARTED | - |

### 3.3 Event System

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Event types | `src/sdk/events/types.ts` | NOT_STARTED | - |
| EventEmitter | `src/sdk/events/emitter.ts` | NOT_STARTED | - |

### 3.4 Config System

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| ConfigLoader | `src/sdk/config/loader.ts` | NOT_STARTED | - |
| ConfigValidator | `src/sdk/config/validator.ts` | NOT_STARTED | - |

### 3.5 Logging System

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Logger interface | `src/logging/logger.ts` | NOT_STARTED | - |
| ConsoleLogger | `src/logging/console-logger.ts` | NOT_STARTED | - |

**Dependencies**: Phase 1, Phase 2

---

## Phase 4: Session Groups

**Goal**: Implement multi-project orchestration with dependency management.

**Status**: NOT_STARTED

### 4.1 Group Management

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Group types | `src/sdk/group/types.ts` | NOT_STARTED | - |
| GroupManager | `src/sdk/group/manager.ts` | NOT_STARTED | - |

### 4.2 Execution Engine

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| DependencyGraph | `src/sdk/group/dependency-graph.ts` | NOT_STARTED | - |
| GroupRunner | `src/sdk/group/runner.ts` | NOT_STARTED | - |
| ProgressAggregator | `src/sdk/group/progress-aggregator.ts` | NOT_STARTED | - |

### 4.3 Config Generation

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| ConfigGenerator | `src/sdk/group/config-generator.ts` | NOT_STARTED | - |

**Dependencies**: Phase 3 (SessionManager, Events)

---

## Phase 5: Command Queue

**Goal**: Implement sequential prompt execution system.

**Status**: NOT_STARTED

### 5.1 Queue Core

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Queue types | `src/sdk/queue/types.ts` | NOT_STARTED | - |
| QueueManager | `src/sdk/queue/manager.ts` | NOT_STARTED | - |
| QueueRunner | `src/sdk/queue/runner.ts` | NOT_STARTED | - |

### 5.2 Queue Storage

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| QueueStorage | `src/sdk/queue/storage.ts` | NOT_STARTED | - |

**Dependencies**: Phase 3 (SessionManager, Events)

---

## Phase 6: Markdown Parser

**Goal**: Parse message content into structured JSON.

**Status**: NOT_STARTED

### 6.1 Parser Core

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Parser types | `src/sdk/markdown-parser/types.ts` | NOT_STARTED | - |
| MarkdownParser | `src/sdk/markdown-parser/parser.ts` | NOT_STARTED | - |

**Dependencies**: Phase 3 (types)

---

## Phase 7: Real-Time Monitoring

**Goal**: Implement transcript watching and event streaming.

**Status**: NOT_STARTED

### 7.1 File Watcher

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Watcher types | `src/polling/types.ts` | NOT_STARTED | - |
| TranscriptWatcher | `src/polling/watcher.ts` | NOT_STARTED | - |
| StreamParser | `src/polling/parser.ts` | NOT_STARTED | - |

**Dependencies**: Phase 1 (FileSystem interface)

---

## Phase 8: Bookmark System

**Goal**: Implement bookmark management for sessions and messages.

**Status**: NOT_STARTED

### 8.1 Bookmark Core

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Bookmark types | `src/sdk/bookmarks/types.ts` | NOT_STARTED | - |
| BookmarkService | `src/sdk/bookmarks/service.ts` | NOT_STARTED | - |
| BookmarkSearch | `src/sdk/bookmarks/search.ts` | NOT_STARTED | - |

**Dependencies**: Phase 2 (BookmarkRepository)

---

## Phase 9: File Change Service

**Goal**: Extract and index changed files from session transcripts.

**Status**: NOT_STARTED

### 9.1 File Changes

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| FileChangeExtractor | `src/sdk/file-changes/extractor.ts` | NOT_STARTED | - |
| FileChangeIndex | `src/sdk/file-changes/index.ts` | NOT_STARTED | - |

**Dependencies**: Phase 3 (SessionReader)

---

## Phase 10: SDK Entry Point

**Goal**: Create main SDK class that orchestrates all services.

**Status**: NOT_STARTED

### 10.1 Agent Class

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| ClaudeCodeAgent | `src/sdk/agent.ts` | NOT_STARTED | - |
| SDK exports | `src/sdk/index.ts` | NOT_STARTED | - |

**Dependencies**: Phase 3-9 (all services)

---

## Phase 11: HTTP API (Daemon)

**Goal**: Implement REST API for remote execution.

**Status**: NOT_STARTED

### 11.1 Server Core

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Server setup | `src/daemon/server.ts` | NOT_STARTED | - |
| Auth middleware | `src/daemon/auth.ts` | NOT_STARTED | - |

### 11.2 Route Handlers

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Session routes | `src/daemon/routes/sessions.ts` | NOT_STARTED | - |
| Group routes | `src/daemon/routes/groups.ts` | NOT_STARTED | - |
| Queue routes | `src/daemon/routes/queues.ts` | NOT_STARTED | - |
| Bookmark routes | `src/daemon/routes/bookmarks.ts` | NOT_STARTED | - |
| File routes | `src/daemon/routes/files.ts` | NOT_STARTED | - |

### 11.3 Real-Time

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| SSE handler | `src/daemon/sse.ts` | NOT_STARTED | - |
| WebSocket handler | `src/daemon/websocket.ts` | NOT_STARTED | - |

**Dependencies**: Phase 10 (SDK)

---

## Phase 12: CLI

**Goal**: Implement command-line interface.

**Status**: NOT_STARTED

### 12.1 CLI Core

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| CLI entry | `src/cli/main.ts` | NOT_STARTED | - |
| Formatter | `src/cli/formatter.ts` | NOT_STARTED | - |

### 12.2 Commands

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| session commands | `src/cli/commands/session.ts` | NOT_STARTED | - |
| group commands | `src/cli/commands/group.ts` | NOT_STARTED | - |
| queue commands | `src/cli/commands/queue.ts` | NOT_STARTED | - |
| bookmark commands | `src/cli/commands/bookmark.ts` | NOT_STARTED | - |
| files commands | `src/cli/commands/files.ts` | NOT_STARTED | - |
| server commands | `src/cli/commands/server.ts` | NOT_STARTED | - |
| daemon commands | `src/cli/commands/daemon.ts` | NOT_STARTED | - |
| token commands | `src/cli/commands/token.ts` | NOT_STARTED | - |

**Dependencies**: Phase 10 (SDK), Phase 11 (Daemon)

---

## Phase 13: DuckDB Integration (Deferred)

**Goal**: Add SQL query support on JSONL files.

**Status**: NOT_STARTED

### 13.1 DuckDB Adapter

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| DuckDB SessionRepository | `src/repository/duckdb/session-repository.ts` | NOT_STARTED | - |

**Dependencies**: Phase 2 (Repository interfaces)

---

## Phase 14: Browser Viewer (Deferred)

**Goal**: Implement SvelteKit-based web UI.

**Status**: NOT_STARTED

> **Note**: Frontend implementation is deferred until backend is stable.

**Dependencies**: Phase 11 (HTTP API)

---

## Phase 15: TUI Viewer (Future)

**Goal**: Terminal-based viewer using Ink.

**Status**: NOT_STARTED

> **Note**: Low priority. Web UI is primary interface.

**Dependencies**: Phase 10 (SDK)

---

## Implementation Order

The recommended implementation order based on dependencies:

```
Phase 1: Foundation Layer (Mocks)
    |
    v
Phase 2: Repository Layer
    |
    v
Phase 3: Core Services
    |
    +---> Phase 4: Session Groups
    |
    +---> Phase 5: Command Queue
    |
    +---> Phase 6: Markdown Parser
    |
    +---> Phase 7: Real-Time Monitoring
    |
    +---> Phase 8: Bookmark System
    |
    +---> Phase 9: File Change Service
    |
    v
Phase 10: SDK Entry Point
    |
    +---> Phase 11: HTTP API
    |         |
    |         v
    |     Phase 14: Browser Viewer (Deferred)
    |
    +---> Phase 12: CLI
    |
    +---> Phase 13: DuckDB (Deferred)
    |
    +---> Phase 15: TUI (Future)
```

---

## Current Focus

**Active Phase**: Phase 1 - Foundation Layer

**Next Actions**:
1. Create `src/interfaces/` directory structure
2. Implement FileSystem interface
3. Implement MockFileSystem
4. Create test helper utilities

---

## Notes

- Each module should have corresponding test file (`*.test.ts`)
- Use Vitest for testing
- Follow TypeScript strict mode
- All services receive dependencies via constructor injection
- Use Result<T, E> pattern for error handling

---

## Related Documents

- `design-docs/DESIGN.md` - Main architecture overview
- `design-docs/spec-infrastructure.md` - Testability, errors, caching
- `design-docs/spec-session-groups.md` - Session group architecture
- `design-docs/spec-command-queue.md` - Command queue specification
- `design-docs/spec-sdk-api.md` - SDK, API, markdown parsing
- `design-docs/DECISIONS.md` - All design decisions
