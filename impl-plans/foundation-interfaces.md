# Foundation Interfaces Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/DESIGN.md, design-docs/spec-infrastructure.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06
**Part**: 1 of 4

---

## Related Plans

This plan is part of the Foundation and Core implementation, split into:
1. **foundation-interfaces.md** (this file) - Core interfaces and production implementations
2. **foundation-types.md** - Error types, Result pattern, and core type definitions
3. **foundation-mocks.md** - Container and mock implementations
4. **foundation-services.md** - JSONL parser, session reader, events, repositories

---

## Design Document Reference

**Source**:
- `design-docs/DESIGN.md` - Overall architecture and module structure
- `design-docs/spec-infrastructure.md` - Testability, error handling, configuration

### Summary

Implement core interfaces for abstracting external dependencies (filesystem, process-manager, clock) and their production implementations using Bun APIs.

### Scope

**Included**:
- FileSystem interface and BunFileSystem implementation
- ProcessManager interface and BunProcessManager implementation
- Clock interface and SystemClock implementation

**Excluded**: Mock implementations (see foundation-mocks.md)

---

## Deliverables

### Deliverable 1: src/interfaces/filesystem.ts

**Purpose**: Abstract file system operations for testability

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileSystem` | interface | Abstract file operations | SessionReader, ConfigLoader, repositories |
| `WatchEvent` | interface | File system watch event | TranscriptWatcher |
| `FileStat` | interface | File metadata | FileSystem implementations |

**Function Signatures**:

```
readFile(path: string): Promise<string>
  Purpose: Read file content as UTF-8 string
  Called by: SessionReader, ConfigLoader

writeFile(path: string, content: string): Promise<void>
  Purpose: Write content to file
  Called by: Repositories, ConfigGenerator

exists(path: string): Promise<boolean>
  Purpose: Check if file or directory exists
  Called by: ConfigLoader, SessionReader

readDir(path: string): Promise<string[]>
  Purpose: List directory contents
  Called by: SessionReader (discover sessions)

watch(path: string): AsyncIterable<WatchEvent>
  Purpose: Watch file for changes
  Called by: TranscriptWatcher

stat(path: string): Promise<FileStat>
  Purpose: Get file metadata
  Called by: SessionReader

mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  Purpose: Create directory
  Called by: Repositories

rm(path: string, options?: { recursive?: boolean }): Promise<void>
  Purpose: Remove file or directory
  Called by: Repositories
```

**Dependencies**: None (base interface)

**Dependents**:
- `src/interfaces/bun-filesystem.ts`
- `src/test/mocks/filesystem.ts`
- All repository implementations
- SessionReader, ConfigLoader

---

### Deliverable 2: src/interfaces/process-manager.ts

**Purpose**: Abstract process spawning for testability

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `ProcessManager` | interface | Spawn and manage processes | GroupRunner, QueueRunner |
| `ManagedProcess` | interface | Handle to spawned process | GroupRunner |
| `SpawnOptions` | interface | Options for spawning | ProcessManager.spawn |

**Function Signatures**:

```
spawn(command: string, args: string[], options: SpawnOptions): ManagedProcess
  Purpose: Spawn a subprocess
  Called by: GroupRunner, QueueRunner

kill(pid: number, signal?: string): Promise<void>
  Purpose: Kill a process by PID
  Called by: GroupRunner (pause/stop)
```

**Interface Definition**:

```
ManagedProcess
  Purpose: Handle to a spawned process
  Properties:
    - pid: number - Process ID
    - stdout: AsyncIterable<string> - Standard output stream
    - stderr: AsyncIterable<string> - Standard error stream
    - exitCode: Promise<number> - Resolves when process exits
  Methods:
    - kill(signal?: string): void - Send signal to process
  Used by: GroupRunner, QueueRunner
```

**Dependencies**: None (base interface)

**Dependents**:
- `src/interfaces/bun-process-manager.ts`
- `src/test/mocks/process-manager.ts`
- GroupRunner, QueueRunner

---

### Deliverable 3: src/interfaces/clock.ts

**Purpose**: Abstract time operations for testability

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Clock` | interface | Time operations | Caching, logging, scheduling |

**Function Signatures**:

```
now(): Date
  Purpose: Get current date/time
  Called by: Logger, Cache

timestamp(): string
  Purpose: Get ISO timestamp string
  Called by: Logger, metadata

sleep(ms: number): Promise<void>
  Purpose: Pause execution
  Called by: Polling, retry logic
```

**Dependencies**: None

**Dependents**:
- `src/interfaces/system-clock.ts`
- `src/test/mocks/clock.ts`

---

### Deliverable 4: src/interfaces/bun-filesystem.ts

**Purpose**: Production FileSystem implementation using Bun APIs

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `BunFileSystem` | class | Bun-based file system | Production container |

**Dependencies**: `src/interfaces/filesystem.ts`, Bun APIs

**Dependents**: Production container

---

### Deliverable 5: src/interfaces/bun-process-manager.ts

**Purpose**: Production ProcessManager implementation using Bun.spawn

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `BunProcessManager` | class | Bun-based process manager | Production container |

**Dependencies**: `src/interfaces/process-manager.ts`, Bun APIs

**Dependents**: Production container

---

### Deliverable 6: src/interfaces/system-clock.ts

**Purpose**: Production Clock implementation using Date and Bun.sleep

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `SystemClock` | class | System clock | Production container |

**Dependencies**: `src/interfaces/clock.ts`, Bun APIs

**Dependents**: Production container

---

## Subtasks

### TASK-001: Core Interfaces

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `src/interfaces/filesystem.ts`
- `src/interfaces/process-manager.ts`
- `src/interfaces/clock.ts`
- `src/interfaces/index.ts`
**Estimated Effort**: Small

**Description**:
Define all core interfaces for abstracting external dependencies.

**Completion Criteria**:
- [x] FileSystem interface with all methods defined
- [x] ProcessManager and ManagedProcess interfaces defined
- [x] Clock interface defined
- [x] WatchEvent, FileStat, SpawnOptions types defined
- [x] All interfaces exported from index.ts
- [x] Type checking passes

---

### TASK-006: Production Implementations

**Status**: Completed
**Parallelizable**: No (depends on TASK-001)
**Deliverables**:
- `src/interfaces/bun-filesystem.ts`
- `src/interfaces/bun-process-manager.ts`
- `src/interfaces/system-clock.ts`
**Estimated Effort**: Medium

**Description**:
Implement production versions using Bun APIs.

**Completion Criteria**:
- [x] BunFileSystem using Bun.file and fs APIs
- [x] BunProcessManager using Bun.spawn
- [x] SystemClock using Date and Bun.sleep
- [x] Integration tests (optional, marked slow)
- [x] Type checking passes

---

## Progress Log

### Session: 2026-01-05 00:30
**Tasks Completed**: TASK-001
**Files Created**:
- `src/interfaces/filesystem.ts` - FileSystem interface with all methods
- `src/interfaces/process-manager.ts` - ProcessManager and ManagedProcess interfaces
- `src/interfaces/clock.ts` - Clock interface
- `src/interfaces/index.ts` - Module exports
**Notes**:
- All tests passing
- Type checking passes

---

### Session: 2026-01-06 09:40
**Tasks Completed**: TASK-006
**Files Created**:
- `src/interfaces/bun-filesystem.ts` - BunFileSystem using Bun.file and fs APIs
- `src/interfaces/bun-process-manager.ts` - BunProcessManager using Bun.spawn
- `src/interfaces/system-clock.ts` - SystemClock using Date and Bun.sleep
**Notes**:
- All implementations APPROVED on first iteration
- Type checking passes

---
