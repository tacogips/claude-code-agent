# Exclusive Control (Locking) Implementation Plan

**Status**: Ready
**Design Reference**: N/A (Infrastructure improvement based on audit)
**Created**: 2026-01-31
**Last Updated**: 2026-01-31

---

## Overview

This plan addresses race condition vulnerabilities identified across file-based repositories and managers in the codebase. The implementation introduces a unified locking infrastructure with both file-level and record-level exclusive control mechanisms.

### Problem Statement

Current file-based write operations lack exclusive control, leading to:
- Lost updates in read-modify-write patterns
- TOCTOU (Time-of-check to time-of-use) vulnerabilities
- Data corruption in concurrent access scenarios

### Scope

**Included**:
- File locking infrastructure (advisory locks)
- Atomic write operations (temp file + rename pattern)
- Record-level locking for high-contention resources
- Retry mechanisms with exponential backoff
- Lock timeout and deadlock prevention

**Excluded**:
- Distributed locking (cross-machine coordination)
- Database migration (keeping file-based storage)
- Event sourcing / CQRS patterns (future consideration)

---

## Risk Assessment Summary

| Component | Risk Level | Concurrent Access Pattern | Priority |
|-----------|------------|--------------------------|----------|
| FileQueueRepository | CRITICAL | Multiple runners + CLI + daemon | P0 |
| TokenManager | HIGH | Multiple API requests | P0 |
| FileGroupRepository | HIGH | Multiple sessions updating | P1 |
| FileBookmarkRepository | HIGH | CLI + REST API | P1 |
| FileChangeIndex | MEDIUM | Session completion events | P2 |
| CredentialWriter | MEDIUM | Import/export operations | P2 |
| ConfigGenerator | LOW | Per-session generation | P3 |

---

## Modules

### 1. Core Locking Infrastructure

#### TASK-001: src/interfaces/lock.ts

**Status**: COMPLETED
**Parallelizable**: Yes
**Priority**: P0

```typescript
/**
 * Lock acquisition options.
 */
interface LockOptions {
  /** Lock timeout in milliseconds (default: 30000) */
  readonly timeout?: number;
  /** Retry interval in milliseconds (default: 100) */
  readonly retryInterval?: number;
  /** Maximum retry attempts (default: 10) */
  readonly maxRetries?: number;
  /** Lock type: exclusive or shared */
  readonly type?: "exclusive" | "shared";
}

/**
 * Lock handle returned after successful acquisition.
 */
interface LockHandle {
  /** Release the lock */
  release(): Promise<void>;
  /** Check if lock is still held */
  isHeld(): boolean;
  /** Lock file path */
  readonly lockPath: string;
}

/**
 * Result of lock acquisition attempt.
 */
type LockResult =
  | { success: true; handle: LockHandle }
  | { success: false; reason: "timeout" | "locked" | "error"; message: string };

/**
 * File locking service interface.
 */
interface FileLockService {
  /**
   * Acquire an exclusive lock on a file/resource.
   * @param resourcePath - Path to the resource to lock
   * @param options - Lock acquisition options
   */
  acquire(resourcePath: string, options?: LockOptions): Promise<LockResult>;

  /**
   * Execute a function while holding a lock.
   * Automatically releases lock after completion or error.
   * @param resourcePath - Path to the resource to lock
   * @param fn - Function to execute while holding lock
   * @param options - Lock acquisition options
   */
  withLock<T>(
    resourcePath: string,
    fn: () => Promise<T>,
    options?: LockOptions
  ): Promise<T>;

  /**
   * Check if a resource is currently locked.
   * @param resourcePath - Path to check
   */
  isLocked(resourcePath: string): Promise<boolean>;
}
```

**Checklist**:
- [x] Define LockOptions interface
- [x] Define LockHandle interface
- [x] Define LockResult type
- [x] Define FileLockService interface
- [x] Export from interfaces/index.ts
- [x] Unit tests for type definitions (interfaces are type-only, no runtime tests needed)

---

#### TASK-002: src/services/file-lock.ts

**Status**: COMPLETED
**Parallelizable**: No (depends on TASK-001)
**Priority**: P0

```typescript
/**
 * File-based locking service using advisory locks.
 *
 * Uses .lock files with PID and timestamp for lock management.
 * Implements retry with exponential backoff.
 */
class FileLockServiceImpl implements FileLockService {
  constructor(fs: FileSystem, clock: Clock);

  acquire(resourcePath: string, options?: LockOptions): Promise<LockResult>;
  withLock<T>(resourcePath: string, fn: () => Promise<T>, options?: LockOptions): Promise<T>;
  isLocked(resourcePath: string): Promise<boolean>;

  // Internal methods
  private createLockFile(lockPath: string): Promise<boolean>;
  private readLockInfo(lockPath: string): Promise<LockInfo | null>;
  private isLockStale(lockInfo: LockInfo): boolean;
  private cleanStaleLock(lockPath: string): Promise<void>;
}

/**
 * Lock file content structure.
 */
interface LockInfo {
  pid: number;
  timestamp: string;
  hostname: string;
}
```

**Lock File Format**: `{resource}.lock`
```json
{
  "pid": 12345,
  "timestamp": "2026-01-31T10:00:00.000Z",
  "hostname": "localhost"
}
```

**Implementation Details**:
1. Lock acquisition: Create .lock file atomically (O_CREAT | O_EXCL)
2. Retry with exponential backoff: 100ms, 200ms, 400ms, ...
3. Stale lock detection: Check if PID is alive, timeout after 5 minutes
4. Automatic cleanup: Remove stale locks before retry

**Checklist**:
- [x] Implement FileLockServiceImpl class
- [x] Implement atomic lock file creation
- [x] Implement retry with exponential backoff
- [x] Implement stale lock detection and cleanup
- [x] Implement withLock convenience method
- [ ] Add to Container (deferred to TASK-011)
- [x] Unit tests (all scenarios) - 23 tests
- [x] Integration tests (concurrent access)

---

#### TASK-003: src/services/atomic-writer.ts

**Status**: COMPLETED
**Parallelizable**: Yes
**Priority**: P0

```typescript
/**
 * Atomic file writer using temp file + rename pattern.
 *
 * Ensures writes are atomic - either complete or don't happen.
 * Prevents partial/corrupted writes on crash or concurrent access.
 */
class AtomicWriter {
  constructor(fs: FileSystem);

  /**
   * Write content atomically to a file.
   * @param filePath - Target file path
   * @param content - Content to write
   */
  write(filePath: string, content: string): Promise<void>;

  /**
   * Write JSON atomically with pretty printing.
   * @param filePath - Target file path
   * @param data - Data to serialize and write
   */
  writeJson<T>(filePath: string, data: T): Promise<void>;
}
```

**Implementation Details**:
1. Write to temp file: `{filePath}.tmp.{random}`
2. Sync temp file (fsync)
3. Rename temp file to target (atomic on POSIX)
4. Handle errors: cleanup temp file on failure

**Checklist**:
- [x] Implement AtomicWriter class
- [x] Implement temp file pattern
- [x] Implement fsync for durability (via FileSystem.writeFile)
- [x] Implement atomic rename
- [x] Implement error cleanup
- [ ] Add to Container (deferred to TASK-011)
- [x] Unit tests - 26 tests

---

### 2. Repository Layer Updates

#### TASK-004: src/repository/file/base-repository.ts

**Status**: NOT_STARTED
**Parallelizable**: No (depends on TASK-002, TASK-003)
**Priority**: P0

```typescript
/**
 * Base class for file-based repositories with locking support.
 *
 * Provides common infrastructure for atomic reads and writes
 * with optional locking for concurrent access safety.
 */
abstract class BaseFileRepository<T> {
  constructor(
    protected readonly fs: FileSystem,
    protected readonly lockService: FileLockService,
    protected readonly atomicWriter: AtomicWriter
  );

  /**
   * Read a record with optional shared lock.
   */
  protected readWithLock(filePath: string): Promise<T | null>;

  /**
   * Write a record with exclusive lock.
   */
  protected writeWithLock(filePath: string, data: T): Promise<void>;

  /**
   * Execute read-modify-write with exclusive lock.
   */
  protected modifyWithLock<R>(
    filePath: string,
    modifier: (current: T | null) => T,
    options?: LockOptions
  ): Promise<R>;

  /**
   * Delete a record with exclusive lock.
   */
  protected deleteWithLock(filePath: string): Promise<boolean>;
}
```

**Checklist**:
- [ ] Implement BaseFileRepository abstract class
- [ ] Implement readWithLock method
- [ ] Implement writeWithLock method
- [ ] Implement modifyWithLock method
- [ ] Implement deleteWithLock method
- [ ] Unit tests

---

#### TASK-005: src/repository/file/queue-repository.ts (Refactor)

**Status**: NOT_STARTED
**Parallelizable**: No (depends on TASK-004)
**Priority**: P0

**Current Issues**:
- `addCommand()`: Read-modify-write without lock
- `updateCommand()`: Read-modify-write without lock
- `removeCommand()`: Read-modify-write without lock
- `reorderCommand()`: Read-modify-write without lock

**Changes Required**:
```typescript
class FileQueueRepository extends BaseFileRepository<Queue> implements QueueRepository {
  // Use modifyWithLock for all command operations

  async addCommand(queueId: string, command: QueueCommand): Promise<void> {
    const queuePath = this.getQueuePath(queueId);
    await this.modifyWithLock(queuePath, (queue) => {
      if (!queue) throw new Error(`Queue not found: ${queueId}`);
      return {
        ...queue,
        commands: [...queue.commands, command],
        updatedAt: this.clock.now().toISOString()
      };
    });
  }

  async updateCommand(queueId: string, commandId: string, updates: Partial<QueueCommand>): Promise<void> {
    await this.modifyWithLock(this.getQueuePath(queueId), (queue) => {
      // ... atomic update logic
    });
  }

  // Similar changes for removeCommand, reorderCommand
}
```

**Checklist**:
- [ ] Extend BaseFileRepository
- [ ] Refactor addCommand to use modifyWithLock
- [ ] Refactor updateCommand to use modifyWithLock
- [ ] Refactor removeCommand to use modifyWithLock
- [ ] Refactor reorderCommand to use modifyWithLock
- [ ] Refactor save to use writeWithLock
- [ ] Refactor delete to use deleteWithLock
- [ ] Update existing tests
- [ ] Add concurrency tests

---

#### TASK-006: src/repository/file/bookmark-repository.ts (Refactor)

**Status**: NOT_STARTED
**Parallelizable**: Yes (after TASK-004)
**Priority**: P1

**Changes Required**:
- Extend BaseFileRepository
- Use writeWithLock for save()
- Use modifyWithLock for update()
- Use deleteWithLock for delete()

**Checklist**:
- [ ] Extend BaseFileRepository
- [ ] Refactor save to use writeWithLock
- [ ] Refactor update to use modifyWithLock
- [ ] Refactor delete to use deleteWithLock
- [ ] Update existing tests
- [ ] Add concurrency tests

---

#### TASK-007: src/repository/file/group-repository.ts (Refactor)

**Status**: NOT_STARTED
**Parallelizable**: Yes (after TASK-004)
**Priority**: P1

**Changes Required**:
- Extend BaseFileRepository
- Use writeWithLock for save()
- Use modifyWithLock for updateSession()
- Use deleteWithLock for delete()

**Checklist**:
- [ ] Extend BaseFileRepository
- [ ] Refactor save to use writeWithLock
- [ ] Refactor updateSession to use modifyWithLock
- [ ] Refactor delete to use deleteWithLock
- [ ] Update existing tests
- [ ] Add concurrency tests

---

### 3. SDK Layer Updates

#### TASK-008: src/daemon/auth.ts (TokenManager Refactor)

**Status**: NOT_STARTED
**Parallelizable**: Yes (after TASK-002, TASK-003)
**Priority**: P0

**Current Issues**:
- In-memory token array with full file rewrite
- No locking on createToken/revokeToken
- Multiple API requests can cause lost tokens

**Changes Required**:
```typescript
class TokenManager {
  constructor(
    private readonly fs: FileSystem,
    private readonly lockService: FileLockService,
    private readonly atomicWriter: AtomicWriter
  );

  async createToken(options: CreateTokenOptions): Promise<ApiToken> {
    return this.lockService.withLock(this.tokensPath, async () => {
      const tokens = await this.loadTokens();
      const newToken = this.generateToken(options);
      tokens.push(newToken);
      await this.atomicWriter.writeJson(this.tokensPath, tokens);
      return newToken;
    });
  }

  async revokeToken(tokenId: string): Promise<boolean> {
    return this.lockService.withLock(this.tokensPath, async () => {
      const tokens = await this.loadTokens();
      const index = tokens.findIndex(t => t.id === tokenId);
      if (index === -1) return false;
      tokens.splice(index, 1);
      await this.atomicWriter.writeJson(this.tokensPath, tokens);
      return true;
    });
  }
}
```

**Checklist**:
- [ ] Inject FileLockService and AtomicWriter
- [ ] Refactor createToken to use withLock
- [ ] Refactor revokeToken to use withLock
- [ ] Update existing tests
- [ ] Add concurrency tests

---

#### TASK-009: src/sdk/file-changes/index-manager.ts (Refactor)

**Status**: NOT_STARTED
**Parallelizable**: Yes (after TASK-002, TASK-003)
**Priority**: P2

**Current Issues**:
- Full index rebuild without locking
- Concurrent session completions can overwrite index

**Changes Required**:
- Add locking around saveIndex()
- Consider incremental updates instead of full rebuild

**Checklist**:
- [ ] Inject FileLockService and AtomicWriter
- [ ] Add locking to saveIndex
- [ ] Add locking to buildIndex
- [ ] Consider incremental update pattern
- [ ] Update existing tests
- [ ] Add concurrency tests

---

#### TASK-010: src/sdk/credentials/backends/file.ts (Refactor)

**Status**: NOT_STARTED
**Parallelizable**: Yes (after TASK-002, TASK-003)
**Priority**: P2

**Current Issues**:
- Direct file write without locking
- Concurrent import/export could corrupt

**Checklist**:
- [ ] Inject FileLockService and AtomicWriter
- [ ] Refactor write to use atomic pattern
- [ ] Add locking for concurrent access
- [ ] Update existing tests

---

### 4. Container Integration

#### TASK-011: src/container.ts (Update)

**Status**: NOT_STARTED
**Parallelizable**: No (depends on TASK-002, TASK-003)
**Priority**: P0

**Changes Required**:
```typescript
interface Container {
  // Existing...
  readonly fileSystem: FileSystem;
  readonly clock: Clock;

  // New services
  readonly fileLockService: FileLockService;
  readonly atomicWriter: AtomicWriter;
}

function createContainer(options?: ContainerOptions): Container {
  const fs = options?.fileSystem ?? new BunFileSystem();
  const clock = options?.clock ?? new SystemClock();

  return {
    fileSystem: fs,
    clock,
    fileLockService: new FileLockServiceImpl(fs, clock),
    atomicWriter: new AtomicWriter(fs),
  };
}
```

**Checklist**:
- [ ] Add FileLockService to Container interface
- [ ] Add AtomicWriter to Container interface
- [ ] Update createContainer factory
- [ ] Update createTestContainer
- [ ] Update all container usages

---

### 5. Testing Infrastructure

#### TASK-012: src/test/mocks/lock.ts

**Status**: COMPLETED
**Parallelizable**: Yes
**Priority**: P1

```typescript
/**
 * Mock lock service for testing.
 *
 * Provides controllable locking behavior for unit tests.
 */
class MockFileLockService implements FileLockService {
  private locks = new Map<string, LockHandle>();

  // Control methods for tests
  setLockBehavior(path: string, behavior: "success" | "timeout" | "error"): void;
  simulateContention(path: string): void;
  reset(): void;

  // FileLockService implementation
  acquire(resourcePath: string, options?: LockOptions): Promise<LockResult>;
  withLock<T>(resourcePath: string, fn: () => Promise<T>, options?: LockOptions): Promise<T>;
  isLocked(resourcePath: string): Promise<boolean>;
}
```

**Checklist**:
- [x] Implement MockFileLockService
- [x] Implement controllable behaviors (setLockBehavior, clearContention)
- [x] Implement contention simulation (simulateContention)
- [x] Unit tests for mock itself (34 tests in lock.test.ts)

---

#### TASK-013: Concurrency Test Utilities

**Status**: COMPLETED
**Parallelizable**: Yes
**Priority**: P1

```typescript
/**
 * Test utilities for concurrent access scenarios.
 */

/**
 * Run multiple async operations concurrently and collect results.
 */
async function runConcurrent<T>(
  operations: Array<() => Promise<T>>,
  options?: { delayBetween?: number }
): Promise<Array<{ result?: T; error?: Error }>>;

/**
 * Verify no lost updates in concurrent modifications.
 */
async function verifyNoLostUpdates<T>(
  initial: T,
  modifications: Array<(current: T) => T>,
  readFn: () => Promise<T>,
  writeFn: (value: T) => Promise<void>
): Promise<{ success: boolean; expected: T; actual: T }>;
```

**Checklist**:
- [x] Implement runConcurrent utility
- [x] Implement verifyNoLostUpdates utility
- [x] Documentation and examples (comprehensive JSDoc with examples)

---

## Module Status

| Module | File Path | Status | Tests | Priority |
|--------|-----------|--------|-------|----------|
| Lock interfaces | `src/interfaces/lock.ts` | COMPLETED | N/A (types only) | P0 |
| FileLockService | `src/services/file-lock.ts` | COMPLETED | 23 tests | P0 |
| AtomicWriter | `src/services/atomic-writer.ts` | COMPLETED | 26 tests | P0 |
| BaseFileRepository | `src/repository/file/base-repository.ts` | NOT_STARTED | - | P0 |
| FileQueueRepository | `src/repository/file/queue-repository.ts` | NOT_STARTED | - | P0 |
| FileBookmarkRepository | `src/repository/file/bookmark-repository.ts` | NOT_STARTED | - | P1 |
| FileGroupRepository | `src/repository/file/group-repository.ts` | NOT_STARTED | - | P1 |
| TokenManager | `src/daemon/auth.ts` | NOT_STARTED | - | P0 |
| FileChangeIndex | `src/sdk/file-changes/index-manager.ts` | NOT_STARTED | - | P2 |
| FileCredentialBackend | `src/sdk/credentials/backends/file.ts` | NOT_STARTED | - | P2 |
| Container | `src/container.ts` | NOT_STARTED | - | P0 |
| MockFileLockService | `src/test/mocks/lock.ts` | COMPLETED | 34 tests | P1 |
| Concurrency Test Utils | `src/test/utils/concurrency.ts` | COMPLETED | 15 tests | P1 |

---

## Dependencies

```
TASK-001 (Lock interfaces)
    |
    +---> TASK-002 (FileLockService) --+
    |                                   |
    +---> TASK-003 (AtomicWriter) -----+
                                        |
                                        v
                                 TASK-004 (BaseFileRepository)
                                        |
         +------------------------------+------------------------------+
         |                              |                              |
         v                              v                              v
 TASK-005 (Queue)              TASK-006 (Bookmark)            TASK-007 (Group)
         |                              |                              |
         +------------------------------+------------------------------+
                                        |
                                        v
                                 TASK-011 (Container)

Parallel tracks:
- TASK-008 (TokenManager) - depends on TASK-002, TASK-003
- TASK-009 (FileChangeIndex) - depends on TASK-002, TASK-003
- TASK-010 (CredentialBackend) - depends on TASK-002, TASK-003
- TASK-012 (MockLockService) - independent
- TASK-013 (Test Utils) - independent
```

| Task | Depends On | Blocks |
|------|------------|--------|
| TASK-001 | None | TASK-002, TASK-003 |
| TASK-002 | TASK-001 | TASK-004, TASK-008, TASK-009, TASK-010 |
| TASK-003 | TASK-001 | TASK-004, TASK-008, TASK-009, TASK-010 |
| TASK-004 | TASK-002, TASK-003 | TASK-005, TASK-006, TASK-007 |
| TASK-005 | TASK-004 | TASK-011 |
| TASK-006 | TASK-004 | TASK-011 |
| TASK-007 | TASK-004 | TASK-011 |
| TASK-008 | TASK-002, TASK-003 | TASK-011 |
| TASK-009 | TASK-002, TASK-003 | None |
| TASK-010 | TASK-002, TASK-003 | None |
| TASK-011 | TASK-005, TASK-006, TASK-007, TASK-008 | None |
| TASK-012 | None | None |
| TASK-013 | None | None |

---

## Execution Order

### Phase 1: Core Infrastructure (P0)

**Parallel Set 1**:
- TASK-001: Lock interfaces
- TASK-012: Mock lock service (independent)
- TASK-013: Concurrency test utilities (independent)

**Parallel Set 2** (after Set 1):
- TASK-002: FileLockService implementation
- TASK-003: AtomicWriter implementation

**Sequential** (after Set 2):
- TASK-004: BaseFileRepository

### Phase 2: Critical Repositories (P0)

**Sequential** (after TASK-004):
- TASK-005: FileQueueRepository refactor (highest risk)

**Parallel** (after TASK-002, TASK-003):
- TASK-008: TokenManager refactor

### Phase 3: High-Priority Repositories (P1)

**Parallel** (after TASK-004):
- TASK-006: FileBookmarkRepository refactor
- TASK-007: FileGroupRepository refactor

### Phase 4: Container Integration (P0)

**Sequential** (after Phase 2 & 3):
- TASK-011: Container updates

### Phase 5: Medium-Priority Components (P2)

**Parallel** (after TASK-002, TASK-003):
- TASK-009: FileChangeIndex refactor
- TASK-010: FileCredentialBackend refactor

---

## Completion Criteria

- [ ] All lock interface types defined
- [ ] FileLockService implementation complete with tests
- [ ] AtomicWriter implementation complete with tests
- [ ] BaseFileRepository provides locking infrastructure
- [ ] FileQueueRepository uses locking (CRITICAL)
- [ ] TokenManager uses locking (HIGH)
- [ ] FileBookmarkRepository uses locking (HIGH)
- [ ] FileGroupRepository uses locking (HIGH)
- [ ] FileChangeIndex uses locking (MEDIUM)
- [ ] Container updated with new services
- [ ] All existing tests still pass
- [ ] New concurrency tests verify no race conditions
- [ ] Type checking passes
- [ ] Code follows project standards

---

## Risk Mitigation

### Deadlock Prevention

1. **Lock ordering**: Always acquire locks in consistent order (alphabetical by path)
2. **Lock timeout**: Default 30 second timeout prevents indefinite blocking
3. **Stale lock cleanup**: Automatic cleanup of locks from dead processes

### Performance Considerations

1. **Lock granularity**: Per-file locks minimize contention
2. **Read-only operations**: No locks for pure reads (eventual consistency acceptable)
3. **Lock-free fallback**: Consider optimistic locking for low-contention resources

### Backward Compatibility

1. **Lock files**: Stored alongside data files, ignored by existing code
2. **Graceful degradation**: If lock acquisition fails, log warning and proceed (configurable)
3. **Migration**: No data migration required

---

## Progress Log

### Session: 2026-01-31 (3)

**Tasks Completed**: TASK-002, TASK-003
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Implemented FileLockServiceImpl in src/services/file-lock.ts
  - Advisory locks using .lock files with PID/timestamp tracking
  - Retry with exponential backoff (100ms, 200ms, 400ms, ...)
  - Stale lock detection (dead process or 5+ minutes old)
  - 23 tests covering all scenarios
- Implemented AtomicWriter in src/services/atomic-writer.ts
  - Temp file + rename pattern for atomic writes
  - Error cleanup on failure
  - 26 tests covering all scenarios

**Newly Unblocked Tasks**:
- TASK-004 (BaseFileRepository) - now unblocked by TASK-002 and TASK-003
- TASK-008 (TokenManager refactor) - now unblocked
- TASK-009 (FileChangeIndex refactor) - now unblocked
- TASK-010 (FileCredentialBackend refactor) - now unblocked

### Session: 2026-01-31 (2)

**Tasks Completed**: TASK-001, TASK-012, TASK-013
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Implemented lock interfaces (LockOptions, LockHandle, LockResult, FileLockService) in src/interfaces/lock.ts
- Created MockFileLockService with controllable behaviors for testing
- Created concurrency test utilities (runConcurrent, verifyNoLostUpdates)
- All tests passing (49 new tests)
- Type checking passes

**Newly Unblocked Tasks**:
- TASK-002 (FileLockService implementation) - now unblocked by TASK-001
- TASK-003 (AtomicWriter implementation) - now unblocked by TASK-001

### Session: 2026-01-31

**Tasks Completed**: Plan creation
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Identified 10 components with race condition risks
- Prioritized FileQueueRepository and TokenManager as CRITICAL
- Designed layered approach: interfaces -> services -> base repository -> concrete repositories
