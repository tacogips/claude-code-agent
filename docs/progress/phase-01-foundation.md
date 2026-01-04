# Phase 1: Foundation Layer

**Status**: NOT_STARTED

**Goal**: Establish testability infrastructure with interface abstractions and mock implementations.

## Spec Reference

- `design-docs/spec-infrastructure.md` Section 1 (Testability Architecture)
- `design-docs/DESIGN.md` Module Structure

---

## 1. Core Interfaces

### 1.1 FileSystem Interface

**File**: `src/interfaces/filesystem.ts`
**Status**: NOT_STARTED

```typescript
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readDir(path: string): Promise<string[]>;
  watch(path: string): AsyncIterable<WatchEvent>;
  stat(path: string): Promise<FileStat>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  rm(path: string, options?: { recursive?: boolean }): Promise<void>;
}
```

**Checklist**:
- [ ] Define FileSystem interface
- [ ] Define WatchEvent type
- [ ] Define FileStat type
- [ ] Export from interfaces/index.ts

### 1.2 ProcessManager Interface

**File**: `src/interfaces/process-manager.ts`
**Status**: NOT_STARTED

```typescript
interface ProcessManager {
  spawn(command: string, args: string[], options: SpawnOptions): ManagedProcess;
  kill(pid: number, signal?: string): Promise<void>;
}

interface ManagedProcess {
  pid: number;
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  exitCode: Promise<number>;
  kill(signal?: string): void;
}
```

**Checklist**:
- [ ] Define ProcessManager interface
- [ ] Define ManagedProcess interface
- [ ] Define SpawnOptions type
- [ ] Export from interfaces/index.ts

### 1.3 Clock Interface

**File**: `src/interfaces/clock.ts`
**Status**: NOT_STARTED

```typescript
interface Clock {
  now(): Date;
  timestamp(): string;
  sleep(ms: number): Promise<void>;
}
```

**Checklist**:
- [ ] Define Clock interface
- [ ] Export from interfaces/index.ts

---

## 2. Mock Implementations

### 2.1 MockFileSystem

**File**: `src/test/mocks/filesystem.ts`
**Status**: NOT_STARTED

**Features**:
- In-memory file storage (Map<string, string>)
- setFile(path, content) for test setup
- getFiles() for verification
- Simulated watch events

**Checklist**:
- [ ] Implement MockFileSystem class
- [ ] Implement setFile() helper
- [ ] Implement clearFiles() helper
- [ ] Write unit tests

### 2.2 MockProcessManager

**File**: `src/test/mocks/process-manager.ts`
**Status**: NOT_STARTED

**Features**:
- Configurable process behavior
- Mock stdout/stderr streams
- Configurable exit codes

**Checklist**:
- [ ] Implement MockProcessManager class
- [ ] Implement MockManagedProcess class
- [ ] Add configurable responses
- [ ] Write unit tests

### 2.3 MockClock

**File**: `src/test/mocks/clock.ts`
**Status**: NOT_STARTED

**Features**:
- Fixed starting time
- advance(ms) to move time forward
- Controlled sleep resolution

**Checklist**:
- [ ] Implement MockClock class
- [ ] Implement advance() method
- [ ] Write unit tests

---

## 3. Production Implementations

### 3.1 BunFileSystem

**File**: `src/interfaces/bun-filesystem.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using Bun.file API
- [ ] Implement using fs.watch
- [ ] Write integration tests (optional, filesystem tests are slow)

### 3.2 BunProcessManager

**File**: `src/interfaces/bun-process-manager.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using Bun.spawn
- [ ] Implement stream handling
- [ ] Write integration tests

### 3.3 SystemClock

**File**: `src/interfaces/system-clock.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using native Date
- [ ] Implement using Bun.sleep
- [ ] Write unit tests

---

## 4. Dependency Injection

### 4.1 Container

**File**: `src/container.ts`
**Status**: NOT_STARTED

```typescript
interface Container {
  fileSystem: FileSystem;
  processManager: ProcessManager;
  clock: Clock;
}
```

**Checklist**:
- [ ] Define Container interface
- [ ] Create productionContainer factory
- [ ] Write unit tests

### 4.2 Test Helpers

**File**: `src/test/helpers.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement createTestContainer()
- [ ] Implement createMockSession()
- [ ] Implement fixture loaders

---

## 5. Error Types

### 5.1 Base Error Classes

**File**: `src/errors.ts`
**Status**: NOT_STARTED

**Error Types**:
- AgentError (abstract base)
- FileNotFoundError
- SessionNotFoundError
- ParseError
- ProcessError
- BudgetExceededError

**Checklist**:
- [ ] Define AgentError abstract class
- [ ] Implement all error subclasses
- [ ] Add error code constants
- [ ] Write unit tests

### 5.2 Result Type

**File**: `src/result.ts`
**Status**: NOT_STARTED

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

**Checklist**:
- [ ] Define Result type
- [ ] Implement ok() helper
- [ ] Implement err() helper
- [ ] Implement isOk() type guard
- [ ] Implement isErr() type guard
- [ ] Write unit tests

---

## 6. Core Types

### 6.1 Session Types

**File**: `src/types/session.ts`
**Status**: NOT_STARTED

**Types**:
- Session
- SessionStatus
- SessionMetadata

**Checklist**:
- [ ] Define Session interface
- [ ] Define SessionStatus enum/union
- [ ] Define SessionMetadata
- [ ] Write type tests (compile-time)

### 6.2 Message Types

**File**: `src/types/message.ts`
**Status**: NOT_STARTED

**Types**:
- Message
- MessageRole
- ToolCall
- ToolResult

**Checklist**:
- [ ] Define Message interface
- [ ] Define role types
- [ ] Define tool-related types
- [ ] Write type tests

### 6.3 Task Types

**File**: `src/types/task.ts`
**Status**: NOT_STARTED

**Types**:
- Task
- TaskStatus
- TaskProgress

**Checklist**:
- [ ] Define Task interface
- [ ] Define status types
- [ ] Write type tests

### 6.4 Config Types

**File**: `src/types/config.ts`
**Status**: NOT_STARTED

**Types**:
- Config
- DefaultsConfig
- ViewerConfig
- DaemonConfig
- LoggingConfig

**Checklist**:
- [ ] Define all config interfaces
- [ ] Define default values
- [ ] Write type tests

---

## Implementation Order

1. Core Interfaces (filesystem, process-manager, clock)
2. Error Types (errors.ts, result.ts)
3. Core Types (session, message, task, config)
4. Mock Implementations (MockFileSystem, MockProcessManager, MockClock)
5. Container and Test Helpers
6. Production Implementations (Bun*)

---

## Testing Strategy

- Each interface file gets a corresponding `.test.ts`
- Mock implementations tested thoroughly
- Production implementations may have integration tests (marked as slow)
- Use Vitest for all tests

---

## Notes

- All interfaces use async/await patterns
- Error messages should be user-friendly
- Types should align with Claude Code's actual data structures
- Consider using zod for runtime validation in Phase 3
