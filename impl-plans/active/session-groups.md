# Session Groups Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-session-groups.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-session-groups.md`

### Summary

Implement Session Groups - a collection of related sessions that can span multiple projects, support concurrent execution with dependency management, and provide unified progress tracking. Session Groups enable multi-project orchestration with configurable concurrency, budget enforcement, and pause/resume capabilities.

### Scope

**Included**:
- Session Group data model and types
- Group and session metadata storage
- Concurrent execution with worker model
- Dependency graph execution
- Pause/resume/stop functionality
- Budget enforcement
- Configuration generation (CLAUDE.md, etc.)
- Template system for prompts and configs
- CLI commands for group management
- SDK API for programmatic access

**Excluded**:
- Browser viewer for session groups (separate plan)
- TUI viewer (deferred, low priority)
- DuckDB query integration (separate enhancement)

---

## Implementation Overview

### Approach

Implement Session Groups in layers:
1. Core types and interfaces
2. Storage layer for group/session metadata
3. Group runner with worker pool pattern
4. Configuration generation
5. CLI commands as SDK wrappers
6. SDK public API

### Key Decisions

- Use worker pool pattern for concurrent execution (max N workers)
- Topological sort for dependency graph execution
- SIGTERM for pause, restart with --resume for resume
- Store metadata in JSON files under `~/.local/claude-code-agent/session-groups/`
- Use EventEmitter pattern for progress notifications

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Foundation Layer (interfaces, types, errors) | Required | foundation-and-core.md |
| ProcessManager interface | Required | foundation-and-core.md |
| FileSystem interface | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |

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

**Interface Definitions**:

```
SessionGroup
  Purpose: A collection of related sessions
  Properties:
    - id: string - Format: YYYYMMDD-HHMMSS-{slug}
    - name: string - Human-readable name
    - description?: string - Optional description
    - slug: string - URL-safe identifier
    - status: GroupStatus - Current state
    - sessions: GroupSession[] - Sessions in group
    - config: GroupConfig - Group configuration
    - createdAt: string - ISO timestamp
    - updatedAt: string - ISO timestamp
  Used by: GroupManager, GroupRepository, GroupRunner

GroupSession
  Purpose: A session within a group
  Properties:
    - id: string - Session identifier
    - projectPath: string - Target project directory
    - prompt: string - Prompt for Claude
    - template?: string - Template name
    - status: SessionStatus - Current state
    - dependsOn?: string[] - Session IDs this depends on
    - claudeSessionId?: string - Actual Claude Code session ID
    - cost?: number - Total cost
    - tokens?: { input: number; output: number }
    - createdAt: string - ISO timestamp
    - completedAt?: string - ISO timestamp
  Used by: SessionGroup, GroupRunner

GroupStatus
  Purpose: Session Group lifecycle states
  Values: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'archived' | 'deleted'
  Used by: SessionGroup

GroupConfig
  Purpose: Group-level configuration
  Properties:
    - model?: string - Claude model to use
    - maxBudgetUsd?: number - Budget limit
    - maxConcurrentSessions: number - Max parallel sessions (default: 3)
    - onBudgetExceeded: 'stop' | 'warn' | 'pause'
    - warningThreshold: number - Percentage for warning (default: 0.8)
  Used by: SessionGroup, GroupRunner

ConcurrencyConfig
  Purpose: Worker pool configuration
  Properties:
    - maxConcurrent: number - Max parallel workers
    - respectDependencies: boolean - Honor dependency graph
    - pauseOnError: boolean - Pause group on session error
    - errorThreshold: number - Pause after N failures
  Used by: GroupRunner

SessionConfig
  Purpose: Per-session config generation settings
  Properties:
    - generateClaudeMd: boolean - Generate CLAUDE.md
    - generateSettings: boolean - Generate settings.json
    - generateCommands: boolean - Generate custom commands
    - generateMcpConfig: boolean - Generate .mcp.json
    - claudeMdTemplate?: string - Template name or path
    - settingsOverride?: object - Partial settings.json
    - inheritFromGroup: boolean - Inherit shared config
  Used by: GroupSession, ConfigGenerator
```

**Dependencies**: `src/types/session.ts` (SessionStatus)

**Dependents**: GroupManager, GroupRepository, GroupRunner, ConfigGenerator

---

### Deliverable 2: src/sdk/group/manager.ts

**Purpose**: Manage Session Group lifecycle

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupManager` | class | Create, list, update groups | SDK agent, CLI |

**Class Definition**:

```
GroupManager
  Purpose: Session Group CRUD operations and lifecycle management
  Constructor: (container: Container, repository: GroupRepository, eventEmitter: EventEmitter)
  Public Methods:
    - createGroup(options: CreateGroupOptions): Promise<SessionGroup>
    - getGroup(groupId: string): Promise<SessionGroup | null>
    - listGroups(filter?: GroupFilter): Promise<SessionGroup[]>
    - updateGroup(groupId: string, updates: Partial<SessionGroup>): Promise<SessionGroup>
    - archiveGroup(groupId: string): Promise<void>
    - deleteGroup(groupId: string, force?: boolean): Promise<void>
    - addSession(groupId: string, session: Omit<GroupSession, 'id' | 'status'>): Promise<GroupSession>
    - removeSession(groupId: string, sessionId: string): Promise<void>
    - updateSession(groupId: string, sessionId: string, updates: Partial<GroupSession>): Promise<void>
  Dependencies: Container, GroupRepository, EventEmitter
  Used by: SDK agent, CLI commands
```

**Function Signatures**:

```
createGroup(options: CreateGroupOptions): Promise<SessionGroup>
  Purpose: Create a new Session Group
  Called by: SDK agent.createGroup(), CLI group create

getGroup(groupId: string): Promise<SessionGroup | null>
  Purpose: Retrieve a Session Group by ID
  Called by: GroupRunner, CLI group show

listGroups(filter?: GroupFilter): Promise<SessionGroup[]>
  Purpose: List Session Groups with optional filtering
  Called by: CLI group list, Browser viewer

addSession(groupId: string, session: Omit<GroupSession, 'id' | 'status'>): Promise<GroupSession>
  Purpose: Add a session to a group
  Called by: SDK group.addSession(), CLI session add
```

**Dependencies**: `src/container.ts`, `src/repository/group-repository.ts`, `src/sdk/events/emitter.ts`

**Dependents**: SDK agent, CLI commands

---

### Deliverable 3: src/sdk/group/runner.ts

**Purpose**: Execute Session Groups with worker pool

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupRunner` | class | Execute group with concurrency | GroupManager |

**Class Definition**:

```
GroupRunner
  Purpose: Execute Session Group with worker pool and dependency management
  Constructor: (container: Container, eventEmitter: EventEmitter)
  Public Methods:
    - run(group: SessionGroup, config: ConcurrencyConfig): Promise<GroupResult>
    - pause(groupId: string): Promise<void>
    - resume(groupId: string): Promise<void>
    - stop(groupId: string): Promise<void>
    - getProgress(groupId: string): GroupProgress
  Private Methods:
    - buildDependencyGraph(sessions: GroupSession[]): DependencyGraph
    - getReadySessions(graph: DependencyGraph): GroupSession[]
    - startWorker(session: GroupSession): Promise<void>
    - waitForCompletion(): Promise<void>
    - checkBudget(session: GroupSession): void
  Private Properties:
    - runningWorkers: Map<string, Worker>
    - processManager: ProcessManager
  Dependencies: Container, EventEmitter
  Used by: GroupManager.run(), CLI group run
```

**Function Signatures**:

```
run(group: SessionGroup, config: ConcurrencyConfig): Promise<GroupResult>
  Purpose: Execute all sessions respecting dependencies and concurrency
  Called by: GroupManager

pause(groupId: string): Promise<void>
  Purpose: Pause running group (SIGTERM to workers)
  Called by: CLI group pause

resume(groupId: string): Promise<void>
  Purpose: Resume paused group (restart with --resume)
  Called by: CLI group resume

getProgress(groupId: string): GroupProgress
  Purpose: Get current execution progress
  Called by: CLI group watch, Browser viewer
```

**Dependencies**: `src/container.ts`, `src/interfaces/process-manager.ts`, `src/sdk/events/emitter.ts`

**Dependents**: GroupManager, CLI commands

---

### Deliverable 4: src/sdk/group/config-generator.ts

**Purpose**: Generate per-session configuration files

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `ConfigGenerator` | class | Generate CLAUDE.md and other configs | GroupRunner |

**Class Definition**:

```
ConfigGenerator
  Purpose: Generate configuration files for session execution
  Constructor: (container: Container)
  Public Methods:
    - generateSessionConfig(session: GroupSession, group: SessionGroup): Promise<string>
    - generateClaudeMd(template: string, variables: Record<string, unknown>): string
    - generateSettings(overrides: object): object
    - resolveTemplate(templateRef: string): Promise<string>
  Private Methods:
    - renderTemplate(template: string, variables: Record<string, unknown>): string
    - loadSharedConfig(group: SessionGroup): Promise<object>
  Dependencies: Container (FileSystem)
  Used by: GroupRunner
```

**Function Signatures**:

```
generateSessionConfig(session: GroupSession, group: SessionGroup): Promise<string>
  Purpose: Generate all config files for a session, return config directory path
  Called by: GroupRunner before spawning Claude

generateClaudeMd(template: string, variables: Record<string, unknown>): string
  Purpose: Generate CLAUDE.md from template with variable substitution
  Called by: generateSessionConfig

resolveTemplate(templateRef: string): Promise<string>
  Purpose: Load template from file or inline string
  Called by: generateClaudeMd
```

**Dependencies**: `src/container.ts`

**Dependents**: GroupRunner

---

### Deliverable 5: src/sdk/group/events.ts

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

**Type Definitions**:

```
GroupEvent
  Purpose: Union type for all group-related events
  Values: GroupCreatedEvent | GroupStartedEvent | GroupCompletedEvent | GroupPausedEvent |
          GroupResumedEvent | SessionStartedEvent | SessionCompletedEvent | SessionFailedEvent |
          BudgetWarningEvent | BudgetExceededEvent | DependencyWaitingEvent | DependencyResolvedEvent
  Used by: EventEmitter, SDK consumers

GroupCompletedEvent
  Purpose: Emitted when all sessions in group complete
  Properties:
    - type: 'group_completed'
    - groupId: string
    - stats: GroupStats
  Used by: CLI, Browser viewer
```

**Dependencies**: None

**Dependents**: GroupRunner, GroupManager, SDK consumers

---

### Deliverable 6: src/sdk/group/progress.ts

**Purpose**: Progress aggregation for groups

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupProgress` | interface | Aggregated progress | GroupRunner |
| `SessionProgress` | interface | Individual session progress | GroupProgress |
| `ProgressAggregator` | class | Collect and aggregate progress | GroupRunner |

**Interface Definitions**:

```
GroupProgress
  Purpose: Aggregated view of group execution
  Properties:
    - totalSessions: number
    - completed: number
    - running: number
    - pending: number
    - failed: number
    - sessions: SessionProgress[]
    - totalCost: number
    - totalTokens: { input: number; output: number }
    - elapsedTime: number
  Used by: CLI watch, Browser viewer

SessionProgress
  Purpose: Progress of individual session
  Properties:
    - id: string
    - projectPath: string
    - status: string
    - currentTool?: string
    - cost: number
    - tokens: { input: number; output: number }
  Used by: GroupProgress
```

**Dependencies**: `src/sdk/group/types.ts`

**Dependents**: GroupRunner, CLI, Browser viewer

---

### Deliverable 7: src/repository/group-repository.ts

**Purpose**: Group repository interface

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `GroupRepository` | interface | Data access for groups | GroupManager |
| `GroupFilter` | interface | Query filter | GroupRepository.list |

**Interface Definitions**:

```
GroupRepository
  Purpose: Data access for Session Groups
  Methods:
    - findById(id: string): Promise<SessionGroup | null>
    - list(filter?: GroupFilter): Promise<SessionGroup[]>
    - save(group: SessionGroup): Promise<void>
    - update(id: string, updates: Partial<SessionGroup>): Promise<void>
    - delete(id: string): Promise<void>
  Used by: GroupManager

GroupFilter
  Purpose: Filter criteria for listing groups
  Properties:
    - status?: GroupStatus | GroupStatus[]
    - since?: Date
    - limit?: number
  Used by: GroupRepository.list
```

**Dependencies**: `src/sdk/group/types.ts`

**Dependents**: FileGroupRepository, InMemoryGroupRepository, GroupManager

---

### Deliverable 8: src/repository/file/group-repository.ts

**Purpose**: File-based group repository

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileGroupRepository` | class | File-based implementation | Production |

**Class Definition**:

```
FileGroupRepository implements GroupRepository
  Purpose: Store Session Groups as JSON files
  Constructor: (container: Container)
  Public Methods:
    - (all GroupRepository methods)
  Private Methods:
    - getGroupPath(id: string): string
    - ensureDirectory(): Promise<void>
  Private Properties:
    - baseDir: string - ~/.local/claude-code-agent/session-groups/
    - fileSystem: FileSystem
  Used by: Production container
```

**Dependencies**: `src/repository/group-repository.ts`, `src/container.ts`

**Dependents**: Production container

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

### TASK-003: Group Manager

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
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
**Parallelizable**: No (depends on TASK-001, TASK-003, TASK-004, TASK-005)
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

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Repository)     TASK-004 (Config Gen)     TASK-005 (Dep Graph)
    |                       |                         |                         |
    +-------+---------------+-----------+-------------+-----------+-------------+
            |                           |                         |
            v                           v                         v
      TASK-003 (Manager)          TASK-007 (Progress)       (feeds into TASK-006)
            |                           |
            +-----------+---------------+
                        |
                        v
                  TASK-006 (Runner)
                        |
                        v
                  TASK-008 (SDK API)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002, TASK-004, TASK-005
- Group B: TASK-003, TASK-007 (after respective deps)
- Group C: TASK-006 (after all Group B)
- Group D: TASK-008 (after TASK-006)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
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

### Open Questions

None at this time.

### Technical Debt

- Consider adding retry logic for failed sessions
- Template caching for repeated generations

### Future Enhancements

- Watch mode for session progress (TUI)
- Remote session execution via daemon
- Session result caching for re-runs
