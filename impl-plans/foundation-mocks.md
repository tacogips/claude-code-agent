# Foundation Mocks Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/DESIGN.md, design-docs/spec-infrastructure.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06
**Part**: 3 of 4

---

## Related Plans

This plan is part of the Foundation and Core implementation, split into:
1. **foundation-interfaces.md** - Core interfaces and production implementations
2. **foundation-types.md** - Error types, Result pattern, and core type definitions
3. **foundation-mocks.md** (this file) - Container and mock implementations
4. **foundation-services.md** - JSONL parser, session reader, events, repositories

---

## Design Document Reference

**Source**:
- `design-docs/DESIGN.md` - Overall architecture and module structure
- `design-docs/spec-infrastructure.md` - Testability, error handling, configuration

### Summary

Implement mock implementations of interfaces for testing and the dependency injection container.

### Scope

**Included**:
- Mock implementations (MockFileSystem, MockProcessManager, MockClock)
- Dependency injection container (Container, createProductionContainer, createTestContainer)
- Test helpers (createMockSession, createMockMessage, etc.)

**Excluded**: Production implementations (see foundation-interfaces.md)

---

## Deliverables

### Deliverable 1: src/test/mocks/filesystem.ts

**Purpose**: Mock FileSystem for testing

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `MockFileSystem` | class | In-memory file system | Tests |

**Class Definition**:

```
MockFileSystem implements FileSystem
  Purpose: In-memory file system for testing
  Constructor: ()
  Public Methods:
    - setFile(path: string, content: string): void - Add file
    - getFile(path: string): string | undefined - Get file content
    - clearFiles(): void - Clear all files
    - getFiles(): Map<string, string> - Get all files
    - (all FileSystem interface methods)
  Private Properties:
    - files: Map<string, string> - In-memory storage
  Used by: All tests
```

**Dependencies**: `src/interfaces/filesystem.ts`

**Dependents**: Test files

---

### Deliverable 2: src/test/mocks/process-manager.ts

**Purpose**: Mock ProcessManager for testing

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `MockProcessManager` | class | Configurable process manager | Tests |

**Dependencies**: `src/interfaces/process-manager.ts`

**Dependents**: Test files

---

### Deliverable 3: src/test/mocks/clock.ts

**Purpose**: Mock Clock for testing

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `MockClock` | class | Controllable clock | Tests |

**Dependencies**: `src/interfaces/clock.ts`

**Dependents**: Test files

---

### Deliverable 4: src/container.ts

**Purpose**: Dependency injection container

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Container` | interface | DI container | All services |
| `createProductionContainer` | function | Create prod container | Main entry |
| `createTestContainer` | function | Create test container | Tests |

**Interface Definition**:

```
Container
  Purpose: Holds all injectable dependencies
  Properties:
    - fileSystem: FileSystem
    - processManager: ProcessManager
    - clock: Clock
  Used by: All services that need dependencies
```

**Function Signatures**:

```
createProductionContainer(): Container
  Purpose: Create container with production implementations
  Called by: Main entry point

createTestContainer(overrides?: Partial<Container>): Container
  Purpose: Create container with mock implementations
  Called by: Test files
```

**Dependencies**: All interface files

**Dependents**: All services, tests

---

### Deliverable 5: src/test/helpers.ts

**Purpose**: Test helper utilities

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `createMockSession` | function | Create test session | Tests |
| `createMockMessage` | function | Create test message | Tests |
| `createMockTask` | function | Create test task | Tests |
| `resetHelperCounters` | function | Reset ID counters | Tests |

**Dependencies**: `src/types/*`

**Dependents**: Test files

---

## Subtasks

### TASK-004: Mock Implementations

**Status**: Completed
**Parallelizable**: No (depends on TASK-001)
**Deliverables**:
- `src/test/mocks/filesystem.ts`
- `src/test/mocks/process-manager.ts`
- `src/test/mocks/clock.ts`
- `src/test/mocks/index.ts`
**Estimated Effort**: Medium

**Description**:
Implement mock versions of all interfaces for testing.

**Completion Criteria**:
- [x] MockFileSystem with in-memory storage
- [x] MockFileSystem helper methods (setFile, clearFiles)
- [x] MockProcessManager with configurable behavior
- [x] MockClock with advance() method
- [x] Unit tests for all mocks
- [x] Type checking passes

---

### TASK-005: Container and Test Helpers

**Status**: Completed
**Parallelizable**: No (depends on TASK-001, TASK-004)
**Deliverables**:
- `src/container.ts`
- `src/test/helpers.ts`
**Estimated Effort**: Small

**Description**:
Implement dependency injection container and test utilities.

**Completion Criteria**:
- [x] Container interface defined
- [x] createProductionContainer() implemented (stub, uses real impls)
- [x] createTestContainer() implemented with mocks
- [x] createMockSession() helper implemented
- [x] Unit tests for container
- [x] Type checking passes

---

## Progress Log

### Session: 2026-01-06 09:40
**Tasks Completed**: TASK-004
**Files Created**:
- `src/test/mocks/filesystem.ts` - MockFileSystem with in-memory storage
- `src/test/mocks/process-manager.ts` - MockProcessManager with configurable behavior
- `src/test/mocks/clock.ts` - MockClock with advance() and auto-advance mode
- `src/test/mocks/index.ts` - Module exports
- `src/test/mocks/filesystem.test.ts` - 33 unit tests for MockFileSystem
- `src/test/mocks/process-manager.test.ts` - 21 unit tests for MockProcessManager
- `src/test/mocks/clock.test.ts` - 20 unit tests for MockClock
**Notes**:
- All implementations APPROVED on first iteration
- Type checking passes
- All 74 tests passing

---

### Session: 2026-01-06 14:00
**Tasks Completed**: TASK-005
**Files Created**:
- `src/container.ts` - Container interface, createProductionContainer(), createTestContainer()
- `src/container.test.ts` - 11 unit tests for Container
- `src/test/helpers.ts` - createMockSession(), createMockMessage(), createMockTask(), resetHelperCounters()
- `src/test/helpers.test.ts` - 26 unit tests for test helpers
**Notes**:
- All implementations APPROVED on first iteration
- Type checking passes
- All 37 tests passing

---
