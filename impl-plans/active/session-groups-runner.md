# Session Groups Implementation Plan - Part 2: Execution Logic

**Status**: Ready
**Design Reference**: design-docs/spec-session-groups.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

This is part 2 of 2 for Session Groups implementation:
- **Part 1**: `session-groups-types.md` - Types, interfaces, repository, events, progress
- **Part 2** (this file): Manager, ConfigGenerator, DependencyGraph, Runner, SDK API

**Dependencies**: Part 1 must be completed before starting Part 2.

---

## Design Document Reference

**Source**: `design-docs/spec-session-groups.md`

### Summary

Implement Session Groups execution logic - GroupManager for CRUD operations, GroupRunner for concurrent execution with worker pool, ConfigGenerator for template rendering, and DependencyGraph for execution ordering.

### Scope (Part 2)

**Included**:
- GroupManager (CRUD operations)
- ConfigGenerator (template rendering)
- DependencyGraph (execution ordering)
- GroupRunner (worker pool execution)
- SDK public API

**Excluded from Part 2**:
- Browser viewer for session groups (separate plan)
- TUI viewer (deferred, low priority)
- DuckDB query integration (separate enhancement)

---

## Implementation Overview

### Approach

This part implements the execution layer for Session Groups:
1. GroupManager for lifecycle management
2. ConfigGenerator for per-session configuration
3. DependencyGraph for determining execution order
4. GroupRunner with worker pool pattern
5. SDK public API

### Key Decisions

- Use worker pool pattern for concurrent execution (max N workers)
- Topological sort for dependency graph execution
- SIGTERM for pause, restart with --resume for resume
- Use EventEmitter pattern for progress notifications

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Part 1 (types, repository, events) | Required | session-groups-types.md |
| Foundation Layer (interfaces, errors) | Required | foundation-and-core.md |
| ProcessManager interface | Required | foundation-and-core.md |
| FileSystem interface | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/sdk/group/manager.ts

**Purpose**: Manage Session Group lifecycle

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupManager` | class | Create, list, update groups | SDK agent, CLI |

**Methods**: createGroup, getGroup, listGroups, updateGroup, archiveGroup, deleteGroup, addSession, removeSession, updateSession
**ID Format**: YYYYMMDD-HHMMSS-{slug}
**Events**: Emits events for all CRUD operations

**Dependencies**: `src/container.ts`, `src/repository/group-repository.ts`, `src/sdk/events/emitter.ts`

**Dependents**: SDK agent, CLI commands

---

### Deliverable 2: src/sdk/group/config-generator.ts

**Purpose**: Generate per-session configuration files

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `ConfigGenerator` | class | Generate CLAUDE.md and other configs | GroupRunner |

**Methods**: generateSessionConfig, generateClaudeMd, generateSettings, resolveTemplate
**Features**: Template rendering, variable substitution, shared config inheritance

**Dependencies**: `src/container.ts`

**Dependents**: GroupRunner

---

### Deliverable 3: src/sdk/group/dependency-graph.ts

**Purpose**: Dependency graph for execution ordering

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `DependencyGraph` | class | Manage session dependencies | GroupRunner |

**Methods**: getReadySessions, markCompleted, markFailed, hasCycles, getRemainingCount
**Algorithm**: Topological sort with cycle detection
**State**: Tracks completed and failed sessions

**Dependencies**: `src/sdk/group/types.ts`

**Dependents**: GroupRunner

---

### Deliverable 4: src/sdk/group/runner.ts

**Purpose**: Execute Session Groups with worker pool

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupRunner` | class | Execute group with concurrency | GroupManager |

**Methods**: run, pause, resume, stop, getProgress
**Pattern**: Worker pool with configurable concurrency
**Lifecycle**: SIGTERM for pause, --resume flag for resume
**Features**: Dependency graph execution, budget enforcement, progress aggregation

**Dependencies**: `src/container.ts`, `src/interfaces/process-manager.ts`, `src/sdk/events/emitter.ts`

**Dependents**: GroupManager, CLI commands

---

### Deliverable 5: src/sdk/group/index.ts

**Purpose**: Export Session Group functionality from SDK

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| All public types and classes | re-export | SDK public API | External consumers |

**Description**:
Export all public types, interfaces, and classes from the group module. Update `src/sdk/index.ts` to include group exports.

**Dependencies**: All deliverables from Part 1 and Part 2

**Dependents**: SDK consumers, CLI

---

## Subtasks

### TASK-003: Group Manager

**Status**: Not Started
**Parallelizable**: No (depends on Part 1: TASK-001, TASK-002)
**Deliverables**: `src/sdk/group/manager.ts`
**Estimated Effort**: Medium

**Description**:
Implement the GroupManager class for CRUD operations on Session Groups.

**Completion Criteria**:
- [ ] createGroup() generates proper ID format (YYYYMMDD-HHMMSS-{slug})
- [ ] getGroup() retrieves group by ID
- [ ] listGroups() supports filtering by status
- [ ] updateGroup() updates group properties
- [ ] archiveGroup() and deleteGroup() work correctly
- [ ] addSession() and removeSession() manage group sessions
- [ ] Events emitted for all operations
- [ ] Unit tests with mocks
- [ ] Type checking passes

---

### TASK-004: Config Generator

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/group/config-generator.ts`
**Estimated Effort**: Medium

**Description**:
Implement configuration generation for session execution including CLAUDE.md templates.

**Completion Criteria**:
- [ ] generateSessionConfig() creates config directory with all files
- [ ] CLAUDE.md template rendering with variable substitution
- [ ] Template resolution from file or inline string
- [ ] Shared config inheritance from group
- [ ] settings.json generation with overrides
- [ ] Unit tests for template rendering
- [ ] Type checking passes

---

### TASK-005: Dependency Graph

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/group/dependency-graph.ts`
**Estimated Effort**: Small

**Description**:
Implement dependency graph for determining session execution order.

**Completion Criteria**:
- [ ] buildDependencyGraph() creates graph from sessions
- [ ] Cycle detection to prevent deadlocks
- [ ] getReadySessions() returns sessions with satisfied dependencies
- [ ] markCompleted() updates graph state
- [ ] Unit tests for various graph configurations
- [ ] Type checking passes

---

### TASK-006: Group Runner

**Status**: Not Started
**Parallelizable**: No (depends on TASK-003, TASK-004, TASK-005, Part 1: TASK-007)
**Deliverables**: `src/sdk/group/runner.ts`
**Estimated Effort**: Large

**Description**:
Implement the GroupRunner class for executing Session Groups with worker pool.

**Completion Criteria**:
- [ ] Worker pool with configurable max concurrent
- [ ] Dependency graph execution
- [ ] run() executes all sessions
- [ ] pause() sends SIGTERM to workers
- [ ] resume() restarts with --resume flag
- [ ] stop() terminates and skips remaining
- [ ] Budget tracking and enforcement
- [ ] Progress aggregation
- [ ] Events emitted for all state changes
- [ ] Integration tests with mock processes
- [ ] Type checking passes

---

### TASK-008: SDK Public API

**Status**: Not Started
**Parallelizable**: No (depends on TASK-003, TASK-006)
**Deliverables**: `src/sdk/group/index.ts`, updates to `src/sdk/index.ts`
**Estimated Effort**: Small

**Description**:
Export Session Group functionality from SDK public API.

**Completion Criteria**:
- [ ] All public types exported
- [ ] GroupManager accessible from SDK agent
- [ ] Example usage documented in comments
- [ ] Type checking passes

---

## Task Dependency Graph (Part 2)

```
[Part 1 Complete]
    |
    +-------+---------------+-----------+
            |               |           |
            v               v           v
      TASK-003        TASK-004    TASK-005
      (Manager)     (Config Gen) (Dep Graph)
            |               |           |
            +-------+-------+-----------+
                    |
                    v
              TASK-006 (Runner)
                    |
                    v
              TASK-008 (SDK API)
```

Parallelizable groups:
- Group A: TASK-004, TASK-005 (independent)
- Group B: TASK-003 (depends on Part 1)
- Group C: TASK-006 (depends on all Group A & B tasks)
- Group D: TASK-008 (depends on TASK-006)

---

## Completion Criteria

### Required for Part 2 Completion

- [ ] Part 1 completed (session-groups-types.md)
- [ ] All Part 2 subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing for GroupRunner
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] All types and classes exported from SDK

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Verify group creation, execution, pause/resume flow
4. Review implementation against spec-session-groups.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Part 2 Focus

This part implements the execution logic for Session Groups. It builds on the foundation types and repository from Part 1.

### Open Questions

None at this time.

### Technical Debt

- Consider adding retry logic for failed sessions
- Template caching for repeated generations

### Future Enhancements

- Watch mode for session progress (TUI)
- Remote session execution via daemon
- Session result caching for re-runs
