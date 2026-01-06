# Command Queue Core Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-command-queue.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Previous**: `impl-plans/active/command-queue-types.md` (Types and Events)
- **Depends On**: `command-queue-types.md`, `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-command-queue.md`

### Summary

Implement Command Queue manager, runner, repository, and SDK integration. This plan covers the core functionality for queue lifecycle management and execution.

### Scope

**Included**:
- Queue repository interface and implementations
- Queue manager for CRUD operations
- Queue runner for sequential execution
- SDK public API
- Crash recovery

**Excluded**:
- Type definitions (command-queue-types.md)
- CLI commands (cli.md)
- Web UI (browser-viewer.md)

---

## Modules

### 1. Queue Repository

#### src/repository/queue-repository.ts

**Status**: NOT_STARTED

```typescript
interface QueueRepository {
  findById(id: string): Promise<CommandQueue | null>;
  findByProject(projectPath: string): Promise<CommandQueue[]>;
  list(filter?: QueueFilter): Promise<CommandQueue[]>;
  save(queue: CommandQueue): Promise<void>;
  update(id: string, updates: Partial<CommandQueue>): Promise<void>;
  delete(id: string): Promise<void>;
}

interface QueueFilter {
  projectPath?: string;
  status?: QueueStatus | QueueStatus[];
  since?: Date;
  limit?: number;
}
```

**Checklist**:
- [ ] QueueRepository interface defined
- [ ] QueueFilter interface defined
- [ ] Type checking passes

---

#### src/repository/file/queue-repository.ts

**Status**: NOT_STARTED

```typescript
class FileQueueRepository implements QueueRepository {
  constructor(container: Container);

  // All QueueRepository methods
  findById(id: string): Promise<CommandQueue | null>;
  findByProject(projectPath: string): Promise<CommandQueue[]>;
  list(filter?: QueueFilter): Promise<CommandQueue[]>;
  save(queue: CommandQueue): Promise<void>;
  update(id: string, updates: Partial<CommandQueue>): Promise<void>;
  delete(id: string): Promise<void>;

  // Private
  private getQueuePath(id: string): string;
  private ensureDirectory(): Promise<void>;
}
```

**Checklist**:
- [ ] FileQueueRepository implemented
- [ ] JSON file storage at ~/.local/claude-code-agent/metadata/queues/
- [ ] All CRUD operations implemented
- [ ] Unit tests
- [ ] Type checking passes

---

### 2. Queue Manager

#### src/sdk/queue/manager.ts

**Status**: NOT_STARTED

```typescript
class QueueManager {
  constructor(
    container: Container,
    repository: QueueRepository,
    eventEmitter: EventEmitter
  );

  createQueue(options: CreateQueueOptions): Promise<CommandQueue>;
  getQueue(queueId: string): Promise<CommandQueue | null>;
  listQueues(filter?: QueueFilter): Promise<CommandQueue[]>;
  deleteQueue(queueId: string, force?: boolean): Promise<void>;
  addCommand(queueId: string, command: AddCommandOptions): Promise<QueueCommand>;
  updateCommand(queueId: string, index: number, updates: UpdateCommandOptions): Promise<QueueCommand>;
  removeCommand(queueId: string, index: number): Promise<void>;
  reorderCommand(queueId: string, fromIndex: number, toIndex: number): Promise<void>;
  toggleSessionMode(queueId: string, index: number): Promise<QueueCommand>;
}
```

**Checklist**:
- [ ] createQueue() generates proper ID format
- [ ] getQueue() and listQueues() with filtering
- [ ] deleteQueue() with force option
- [ ] addCommand() with position support
- [ ] updateCommand() for prompt and session mode
- [ ] removeCommand() reindexes remaining commands
- [ ] reorderCommand() updates indices correctly
- [ ] toggleSessionMode() switches between continue/new
- [ ] Events emitted for all operations
- [ ] Unit tests with mocks
- [ ] Type checking passes

---

### 3. Queue Runner

#### src/sdk/queue/runner.ts

**Status**: NOT_STARTED

```typescript
class QueueRunner {
  constructor(
    container: Container,
    manager: QueueManager,
    eventEmitter: EventEmitter
  );

  run(queueId: string, options?: RunOptions): Promise<QueueResult>;
  pause(queueId: string): Promise<void>;
  resume(queueId: string): Promise<void>;
  stop(queueId: string): Promise<void>;

  private executeCommand(queue: CommandQueue, command: QueueCommand): Promise<void>;
  private shouldStartNewSession(queue: CommandQueue, command: QueueCommand): boolean;
  private captureSessionId(stdout: AsyncIterable<string>): Promise<string>;
  private updateStats(queue: CommandQueue, command: QueueCommand): void;
}
```

**Checklist**:
- [ ] run() executes all pending commands
- [ ] Session mode logic: 'continue' uses --resume, 'new' starts fresh
- [ ] First command always starts new session
- [ ] pause() sends SIGTERM and saves state
- [ ] resume() continues from current command with --resume
- [ ] stop() terminates and marks remaining as skipped
- [ ] Stats updated after each command
- [ ] Error handling respects stopOnError config
- [ ] Events emitted for all state changes
- [ ] Integration tests with mock processes
- [ ] Type checking passes

---

### 4. SDK Public API

#### src/sdk/queue/index.ts

**Status**: NOT_STARTED

```typescript
// Re-export all public types
export type { CommandQueue, QueueCommand, QueueStatus, ... } from './types';
export type { QueueEvent, ... } from './events';
export { QueueManager } from './manager';
export { QueueRunner } from './runner';
```

**Checklist**:
- [ ] All public types exported
- [ ] QueueManager accessible from SDK agent
- [ ] Convenience methods on queue object
- [ ] Example usage documented in comments
- [ ] Type checking passes

---

### 5. Crash Recovery

#### src/sdk/queue/recovery.ts

**Status**: NOT_STARTED

```typescript
class QueueRecovery {
  constructor(container: Container, manager: QueueManager);

  recoverStaleQueues(): Promise<RecoveryResult>;
  private isProcessAlive(pid: number): boolean;
  private markAsPaused(queue: CommandQueue): Promise<void>;
}
```

**Checklist**:
- [ ] On startup, scan for queues with status: 'running'
- [ ] Check if Claude Code process is alive
- [ ] Mark stale running queues as 'paused'
- [ ] Unit tests for recovery logic
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Queue repository interface | `src/repository/queue-repository.ts` | COMPLETED | ✓ |
| File queue repository | `src/repository/file/queue-repository.ts` | COMPLETED | ✓ |
| In-memory queue repository | `src/repository/in-memory/queue-repository.ts` | COMPLETED | ✓ |
| Queue manager | `src/sdk/queue/manager.ts` | COMPLETED | ✓ |
| Queue runner | `src/sdk/queue/runner.ts` | COMPLETED | ✓ |
| SDK exports | `src/sdk/queue/index.ts` | COMPLETED | ✓ |
| Crash recovery | `src/sdk/queue/recovery.ts` | COMPLETED | ✓ |

---

## Subtasks

### TASK-002: Queue Repository

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/repository/queue-repository.ts`, `src/repository/file/queue-repository.ts`, `src/repository/in-memory/queue-repository.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [x] QueueRepository interface defined
- [x] QueueFilter interface defined
- [x] FileQueueRepository implemented with JSON file storage
- [x] InMemoryQueueRepository implemented for testing
- [x] Storage path: `~/.local/claude-code-agent/metadata/queues/{queue-id}.json`
- [x] Unit tests for both implementations
- [x] Type checking passes

---

### TASK-003: Queue Manager

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/sdk/queue/manager.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] All CRUD operations implemented
- [ ] Command management operations
- [ ] Events emitted for all operations
- [ ] Unit tests with mocks
- [ ] Type checking passes

---

### TASK-004: Queue Runner

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-003)
**Deliverables**: `src/sdk/queue/runner.ts`
**Estimated Effort**: Large

**Completion Criteria**:
- [ ] run() executes all pending commands
- [ ] Session mode logic implemented
- [ ] pause/resume/stop functionality
- [ ] Stats and events
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-005: SDK Public API

**Status**: Completed
**Parallelizable**: No (depends on TASK-003, TASK-004)
**Deliverables**: `src/sdk/queue/index.ts`, updates to `src/sdk/index.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] All public types exported
- [x] QueueManager accessible from SDK
- [x] Type checking passes

---

### TASK-006: Crash Recovery

**Status**: Completed
**Parallelizable**: No (depends on TASK-003, TASK-004)
**Deliverables**: `src/sdk/queue/recovery.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] Scan for stale running queues
- [x] Mark stale as paused
- [x] Unit tests
- [x] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Repository)
    |                       |
    +-------+---------------+
            |
            v
      TASK-003 (Manager)
            |
            v
      TASK-004 (Runner)
            |
            +---------------+
            |               |
            v               v
      TASK-005 (SDK)   TASK-006 (Recovery)
```

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Queue Repository | Foundation Layer | Completed |
| Queue Manager | TASK-001, TASK-002 | Blocked |
| Queue Runner | TASK-003 | Blocked |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing for QueueRunner
- [ ] Type checking passes without errors

---

## Progress Log

### Session: 2026-01-06 (TASK-002: Queue Repository)

**Status**: Completed
**Deliverables**: Queue repository interface and implementations

**Implementation Summary**:
- QueueRepository interface defined in `src/repository/queue-repository.ts`
- FileQueueRepository implemented with JSON file storage at `~/.local/claude-code-agent/metadata/queues/{queue-id}.json`
- InMemoryQueueRepository implemented for testing
- Comprehensive unit tests for both implementations (74 tests passing)
- All completion criteria met

**Files Implemented**:
- `src/repository/queue-repository.ts` - Repository interface with QueueFilter and QueueSort
- `src/repository/file/queue-repository.ts` - File-based implementation with JSON storage
- `src/repository/file/queue-repository.test.ts` - File repository tests
- `src/repository/in-memory/queue-repository.ts` - In-memory implementation
- `src/repository/in-memory/queue-repository.test.ts` - In-memory repository tests

**Test Results**: All 74 tests passing
**Type Checking**: Passes without errors

**Notes**:
- Implementation was already completed prior to this session
- Verified all tests pass and type checking succeeds
- Storage path follows XDG_DATA_HOME convention with fallback to ~/.local
- Repository supports comprehensive filtering, sorting, and command management operations

---

### Session: 2026-01-06 17:00 (TASK-005: SDK Public API)

**Status**: Completed
**Deliverables**: SDK public API exports

**Implementation Summary**:
- Updated `src/sdk/queue/index.ts` to export QueueManager and QueueRunner
- Exported manager types: CreateQueueOptions, AddCommandOptions, ListQueuesOptions
- Exported runner types: RunOptions, QueueResult
- All exports follow existing SDK module patterns (similar to session-groups module)
- Type checking passes without errors
- All tests pass (53 tests)

**Files Modified**:
- `src/sdk/queue/index.ts` - Added exports for QueueManager, QueueRunner, and related types

**Test Results**: All 53 tests passing
**Type Checking**: Passes without errors

**Notes**:
- Followed the same export pattern as the session-groups module
- QueueManager and QueueRunner are now accessible from the SDK
- All type exports are properly re-exported for external use
- No root SDK index file exists; modules are imported directly (e.g., `from "sdk/queue"`)
- Export verification test confirms all types and classes are accessible

---

### Session: 2026-01-06 11:45 (TASK-006: Crash Recovery)

**Status**: Completed
**Deliverables**: Crash recovery for stale running queues

**Implementation Summary**:
- QueueRecovery class implemented in `src/sdk/queue/recovery.ts`
- Scans for queues with status 'running' on startup
- Marks stale running queues as 'paused' for manual recovery
- Comprehensive unit tests (12 tests passing)
- All completion criteria met

**Files Implemented**:
- `src/sdk/queue/recovery.ts` - Recovery implementation
- `src/sdk/queue/recovery.test.ts` - Comprehensive unit tests
- `src/sdk/queue/index.ts` - Updated to export recovery types and class

**Test Results**: All 12 tests passing (65 total tests in queue module)
**Type Checking**: Passes without errors

**Notes**:
- Recovery assumes all running queues at startup are stale (clean shutdown should mark them properly)
- Future enhancement: Store Claude Code process PID in queue metadata for accurate liveness checking
- `isProcessAlive()` method included for future use when PID tracking is added
- Recovery operation is idempotent - can be run multiple times safely
- Errors during recovery are caught and logged without throwing to allow partial recovery
