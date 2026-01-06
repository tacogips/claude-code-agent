# Session Groups Implementation Plan - Part 1: Types and Repository

**Status**: Ready
**Design Reference**: design-docs/spec-session-groups.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

This is part 1 of 2 for Session Groups implementation:
- **Part 1** (this file): Types, interfaces, repository, events, progress
- **Part 2**: `session-groups-runner.md` - Manager, ConfigGenerator, DependencyGraph, Runner, SDK API

---

## Design Document Reference

**Source**: `design-docs/spec-session-groups.md`

### Summary

Implement Session Groups - a collection of related sessions that can span multiple projects, support concurrent execution with dependency management, and provide unified progress tracking. Session Groups enable multi-project orchestration with configurable concurrency, budget enforcement, and pause/resume capabilities.

### Scope (Part 1)

**Included**:
- Session Group data model and types
- Event types for group lifecycle
- Progress tracking interfaces
- Group repository interface
- File-based repository implementation
- In-memory repository implementation

**Deferred to Part 2**:
- GroupManager (CRUD operations)
- GroupRunner (execution logic)
- ConfigGenerator (template rendering)
- DependencyGraph (execution ordering)
- SDK public API

---

## Implementation Overview

### Approach

This part implements the foundation layer for Session Groups:
1. Core types and interfaces (types.ts, events.ts, progress.ts)
2. Repository interface (group-repository.ts)
3. File-based and in-memory repository implementations

### Key Decisions

- Store metadata in JSON files under `~/.local/claude-code-agent/session-groups/`
- Use discriminated unions for event types
- GroupProgress interface for real-time aggregation

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Foundation Layer (interfaces, types, errors) | Required | foundation-and-core.md |
| FileSystem interface | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/sdk/group/types.ts

**Purpose**: Define Session Group data model types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `SessionGroup` | interface | Main group data structure | GroupManager, GroupRepository |
| `GroupSession` | interface | Session within a group | SessionGroup |
| `GroupStatus` | type | Group lifecycle states | SessionGroup |
| `GroupConfig` | interface | Group configuration | SessionGroup |
| `ConcurrencyConfig` | interface | Concurrency settings | GroupRunner |
| `BudgetConfig` | interface | Budget enforcement settings | GroupRunner |
| `SessionConfig` | interface | Per-session configuration | GroupSession |

**Key Interfaces** (see design spec for full details):
- `SessionGroup`: id, name, slug, status, sessions[], config, timestamps
- `GroupSession`: id, projectPath, prompt, status, dependsOn[], cost, tokens
- `GroupStatus`: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'archived' | 'deleted'
- `GroupConfig`: model, maxBudgetUsd, maxConcurrentSessions, onBudgetExceeded, warningThreshold
- `ConcurrencyConfig`: maxConcurrent, respectDependencies, pauseOnError, errorThreshold
- `SessionConfig`: generateClaudeMd, generateSettings, claudeMdTemplate, settingsOverride

**Dependencies**: `src/types/session.ts` (SessionStatus)

**Dependents**: GroupManager, GroupRepository, GroupRunner, ConfigGenerator

---

### Deliverable 2: src/sdk/group/events.ts

**Purpose**: Session Group event types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupEvent` | type | Union of all group events | EventEmitter, SDK |
| `GroupCreatedEvent` | interface | Group created | GroupManager |
| `GroupStartedEvent` | interface | Group execution started | GroupRunner |
| `GroupCompletedEvent` | interface | Group completed | GroupRunner |
| `SessionStartedEvent` | interface | Session started | GroupRunner |
| `SessionCompletedEvent` | interface | Session completed | GroupRunner |
| `BudgetWarningEvent` | interface | Budget warning | GroupRunner |
| `DependencyWaitingEvent` | interface | Waiting for dependency | GroupRunner |

**Event Types**: Discriminated unions with type property
- GroupCreatedEvent, GroupStartedEvent, GroupCompletedEvent, GroupPausedEvent
- SessionStartedEvent, SessionCompletedEvent, SessionFailedEvent
- BudgetWarningEvent, BudgetExceededEvent, DependencyWaitingEvent, DependencyResolvedEvent

**Dependencies**: None

**Dependents**: GroupRunner, GroupManager, SDK consumers

---

### Deliverable 3: src/sdk/group/progress.ts

**Purpose**: Progress aggregation for groups

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupProgress` | interface | Aggregated progress | GroupRunner |
| `SessionProgress` | interface | Individual session progress | GroupProgress |
| `ProgressAggregator` | class | Collect and aggregate progress | GroupRunner |

**Progress Interfaces**:
- `GroupProgress`: totalSessions, completed, running, pending, failed, sessions[], totalCost, totalTokens, elapsedTime
- `SessionProgress`: id, projectPath, status, currentTool, cost, tokens
- `ProgressAggregator`: class for real-time aggregation

**Dependencies**: `src/sdk/group/types.ts`

**Dependents**: GroupRunner, CLI, Browser viewer

---

### Deliverable 4: src/repository/group-repository.ts

**Purpose**: Group repository interface

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupRepository` | interface | Data access for groups | GroupManager |
| `GroupFilter` | interface | Query filter | GroupRepository.list |

**Methods**: findById, list, save, update, delete
**Filter**: status, since, limit

**Dependencies**: `src/sdk/group/types.ts`

**Dependents**: FileGroupRepository, InMemoryGroupRepository, GroupManager

---

### Deliverable 5: src/repository/file/group-repository.ts

**Purpose**: File-based group repository

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileGroupRepository` | class | File-based implementation | Production |

Implements GroupRepository with JSON file storage at `~/.local/claude-code-agent/session-groups/`

**Dependencies**: `src/repository/group-repository.ts`, `src/container.ts`

**Dependents**: Production container

---

### Deliverable 6: src/repository/in-memory/group-repository.ts

**Purpose**: In-memory group repository for testing

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `InMemoryGroupRepository` | class | In-memory implementation | Tests |

Implements GroupRepository with in-memory Map storage for testing

**Dependencies**: `src/repository/group-repository.ts`

**Dependents**: Test suite

---

## Subtasks

### TASK-001: Group Types and Interfaces

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/group/types.ts`, `src/sdk/group/events.ts`, `src/sdk/group/progress.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for Session Groups including the main data model, events, and progress tracking interfaces.

**Completion Criteria**:
- [ ] SessionGroup interface defined with all properties
- [ ] GroupSession interface defined
- [ ] GroupStatus, GroupConfig, ConcurrencyConfig, BudgetConfig, SessionConfig types defined
- [ ] All event types defined (GroupEvent union type)
- [ ] GroupProgress and SessionProgress interfaces defined
- [ ] Type checking passes
- [ ] All types exported from index.ts

---

### TASK-002: Group Repository

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/repository/group-repository.ts`, `src/repository/file/group-repository.ts`, `src/repository/in-memory/group-repository.ts`
**Estimated Effort**: Medium

**Description**:
Implement the repository interface and both file-based and in-memory implementations for storing Session Groups.

**Completion Criteria**:
- [ ] GroupRepository interface defined
- [ ] GroupFilter interface defined
- [ ] FileGroupRepository implemented with JSON file storage
- [ ] InMemoryGroupRepository implemented for testing
- [ ] Directory structure: `~/.local/claude-code-agent/session-groups/{id}/`
- [ ] meta.json file format matches spec
- [ ] Unit tests for both implementations
- [ ] Type checking passes

---

### TASK-007: Progress Aggregator

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001)
**Deliverables**: `src/sdk/group/progress.ts` (class implementation)
**Estimated Effort**: Small

**Description**:
Implement the ProgressAggregator class for collecting session progress into group-level statistics.

**Completion Criteria**:
- [ ] ProgressAggregator class implemented
- [ ] Real-time aggregation of session stats
- [ ] Cost and token summation
- [ ] Elapsed time tracking
- [ ] Unit tests
- [ ] Type checking passes

---

## Task Dependency Graph (Part 1)

```
TASK-001 (Types & Events)     TASK-002 (Repository)
    |                               |
    v                               |
TASK-007 (Progress Aggregator)     |
                                    |
                        (feeds into Part 2)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-007 (after TASK-001)

---

## Completion Criteria

### Required for Part 1 Completion

- [ ] TASK-001 completed (Types and Interfaces)
- [ ] TASK-002 completed (Repository implementations)
- [ ] TASK-007 completed (Progress Aggregator)
- [ ] All unit tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] All types and interfaces exported

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test` for repository and progress tests
3. Verify interfaces match design spec

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Part 1 Focus

This part provides the foundational data structures and persistence layer for Session Groups. Part 2 will build on these types to implement the execution logic.

### Technical Debt

None at this stage.

### Future Enhancements

Deferred to Part 2.
