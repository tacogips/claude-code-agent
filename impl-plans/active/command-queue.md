# Command Queue Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-command-queue.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-command-queue.md`

### Summary

Implement Command Queue - a feature for queuing multiple prompts for sequential execution within a project. Each command can optionally continue in the current session or start a new session. Provides pause/resume/stop controls and Web UI-based management.

### Scope

**Included**:
- Command Queue data model and types
- Queue storage/persistence
- Queue lifecycle management (create, run, pause, resume, stop)
- Command management (add, edit, remove, reorder)
- Execution runner with session mode support
- CLI commands for queue and command management
- SDK API for programmatic access
- Event system for queue operations

**Excluded**:
- Web UI for queue management (separate browser-viewer.md plan)
- TUI interface (deferred, low priority)

---

## Implementation Overview

### Approach

Build Command Queue in layers:
1. Core types and data model
2. Storage layer for queue persistence
3. Queue runner with session mode logic
4. CLI commands as SDK wrappers
5. SDK public API

### Key Decisions

- Use `--resume` flag for continuing sessions (sessionMode: 'continue')
- Start new session without `--resume` for new mode
- Store queue state in JSON files under `~/.local/claude-code-agent/metadata/queues/`
- SIGTERM for pause, track current command for resume
- Sequential execution (no parallelism within a queue)

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Foundation Layer (interfaces, types, errors) | Required | foundation-and-core.md |
| ProcessManager interface | Required | foundation-and-core.md |
| FileSystem interface | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/sdk/queue/types.ts

**Purpose**: Define Command Queue data model types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `CommandQueue` | interface | Main queue data structure | QueueManager, QueueRepository |
| `QueueCommand` | interface | Command within a queue | CommandQueue |
| `QueueStatus` | type | Queue lifecycle states | CommandQueue |
| `CommandStatus` | type | Command execution states | QueueCommand |
| `SessionMode` | type | Session continuation mode | QueueCommand |
| `QueueConfig` | interface | Queue configuration | CommandQueue |
| `QueueStats` | interface | Queue statistics | CommandQueue |

**Interface Definitions**:

```
CommandQueue
  Purpose: A queue of commands for sequential execution
  Properties:
    - id: string - Format: YYYYMMDD-HHMMSS-{slug}
    - name: string - Human-readable name
    - description?: string - Optional description
    - projectPath: string - Project directory
    - status: QueueStatus - Current state
    - claudeSessionId?: string - Active Claude session ID
    - currentCommandIndex: number - Current/next command
    - commands: QueueCommand[] - Commands in queue
    - config: QueueConfig - Queue configuration
    - stats: QueueStats - Execution statistics
    - createdAt: string - ISO timestamp
    - updatedAt: string - ISO timestamp
  Used by: QueueManager, QueueRepository, QueueRunner

QueueCommand
  Purpose: A command within the queue
  Properties:
    - id: string - Command identifier
    - index: number - Position in queue
    - prompt: string - Prompt text
    - sessionMode: SessionMode - 'continue' or 'new'
    - status: CommandStatus - Current state
    - claudeSessionId?: string - Session ID used for this command
    - addedAt: string - ISO timestamp
    - startedAt?: string - ISO timestamp
    - completedAt?: string - ISO timestamp
    - cost?: number - Execution cost
    - tokens?: { input: number; output: number }
    - error?: string - Error message if failed
  Used by: CommandQueue, QueueRunner

QueueStatus
  Purpose: Queue lifecycle states
  Values: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed'
  Used by: CommandQueue

CommandStatus
  Purpose: Command execution states
  Values: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  Used by: QueueCommand

SessionMode
  Purpose: How to handle session continuation
  Values: 'continue' | 'new'
  Used by: QueueCommand

QueueConfig
  Purpose: Queue-level configuration
  Properties:
    - stopOnError: boolean - Stop queue on command failure
    - model?: string - Claude model to use
  Used by: CommandQueue, QueueRunner

QueueStats
  Purpose: Aggregated queue statistics
  Properties:
    - totalCommands: number
    - completedCommands: number
    - failedCommands: number
    - totalCost: number
    - totalTokens: { input: number; output: number }
    - totalDuration: number - Milliseconds
  Used by: CommandQueue
```

**Dependencies**: None

**Dependents**: QueueManager, QueueRepository, QueueRunner

---

### Deliverable 2: src/sdk/queue/manager.ts

**Purpose**: Manage Command Queue lifecycle and commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `QueueManager` | class | Create, list, update queues and commands | SDK agent, CLI |

**Class Definition**:

```
QueueManager
  Purpose: Command Queue CRUD operations and lifecycle management
  Constructor: (container: Container, repository: QueueRepository, eventEmitter: EventEmitter)
  Public Methods:
    - createQueue(options: CreateQueueOptions): Promise<CommandQueue>
    - getQueue(queueId: string): Promise<CommandQueue | null>
    - listQueues(filter?: QueueFilter): Promise<CommandQueue[]>
    - deleteQueue(queueId: string, force?: boolean): Promise<void>
    - addCommand(queueId: string, command: AddCommandOptions): Promise<QueueCommand>
    - updateCommand(queueId: string, index: number, updates: UpdateCommandOptions): Promise<QueueCommand>
    - removeCommand(queueId: string, index: number): Promise<void>
    - reorderCommand(queueId: string, fromIndex: number, toIndex: number): Promise<void>
    - toggleSessionMode(queueId: string, index: number): Promise<QueueCommand>
  Dependencies: Container, QueueRepository, EventEmitter
  Used by: SDK agent, CLI commands
```

**Function Signatures**:

```
createQueue(options: CreateQueueOptions): Promise<CommandQueue>
  Purpose: Create a new Command Queue
  Called by: SDK agent.createQueue(), CLI queue create

addCommand(queueId: string, command: AddCommandOptions): Promise<QueueCommand>
  Purpose: Add a command to a queue
  Called by: SDK queue.addCommand(), CLI queue command add

updateCommand(queueId: string, index: number, updates: UpdateCommandOptions): Promise<QueueCommand>
  Purpose: Update a command's prompt or session mode
  Called by: SDK queue.updateCommand(), CLI queue command edit

reorderCommand(queueId: string, fromIndex: number, toIndex: number): Promise<void>
  Purpose: Move a command to a different position
  Called by: SDK queue.reorderCommand(), CLI queue command move

toggleSessionMode(queueId: string, index: number): Promise<QueueCommand>
  Purpose: Toggle between 'continue' and 'new' session mode
  Called by: SDK, CLI queue command toggle-mode
```

**Dependencies**: `src/container.ts`, `src/repository/queue-repository.ts`, `src/sdk/events/emitter.ts`

**Dependents**: SDK agent, CLI commands, QueueRunner

---

### Deliverable 3: src/sdk/queue/runner.ts

**Purpose**: Execute Command Queue sequentially

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `QueueRunner` | class | Execute queue commands | QueueManager |

**Class Definition**:

```
QueueRunner
  Purpose: Execute Command Queue with session mode support
  Constructor: (container: Container, manager: QueueManager, eventEmitter: EventEmitter)
  Public Methods:
    - run(queueId: string, options?: RunOptions): Promise<QueueResult>
    - pause(queueId: string): Promise<void>
    - resume(queueId: string): Promise<void>
    - stop(queueId: string): Promise<void>
  Private Methods:
    - executeCommand(queue: CommandQueue, command: QueueCommand): Promise<void>
    - shouldStartNewSession(queue: CommandQueue, command: QueueCommand): boolean
    - captureSessionId(stdout: AsyncIterable<string>): Promise<string>
    - updateStats(queue: CommandQueue, command: QueueCommand): void
  Private Properties:
    - runningProcess: ManagedProcess | null
    - processManager: ProcessManager
  Dependencies: Container, QueueManager, EventEmitter
  Used by: CLI queue run
```

**Function Signatures**:

```
run(queueId: string, options?: RunOptions): Promise<QueueResult>
  Purpose: Execute all pending commands in queue
  Called by: CLI queue run

pause(queueId: string): Promise<void>
  Purpose: Pause running queue (SIGTERM to Claude process)
  Called by: CLI queue pause

resume(queueId: string): Promise<void>
  Purpose: Resume paused queue from current command
  Called by: CLI queue resume

stop(queueId: string): Promise<void>
  Purpose: Stop queue and skip remaining commands
  Called by: CLI queue stop

executeCommand(queue: CommandQueue, command: QueueCommand): Promise<void>
  Purpose: Execute a single command with proper session mode
  Called by: run()

shouldStartNewSession(queue: CommandQueue, command: QueueCommand): boolean
  Purpose: Determine if command should start new session or continue
  Called by: executeCommand()
```

**Dependencies**: `src/container.ts`, `src/sdk/queue/manager.ts`, `src/sdk/events/emitter.ts`

**Dependents**: CLI commands

---

### Deliverable 4: src/sdk/queue/events.ts

**Purpose**: Command Queue event types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `QueueEvent` | type | Union of all queue events | EventEmitter, SDK |
| `QueueCreatedEvent` | interface | Queue created | QueueManager |
| `QueueStartedEvent` | interface | Queue execution started | QueueRunner |
| `QueueCompletedEvent` | interface | Queue completed | QueueRunner |
| `CommandStartedEvent` | interface | Command started | QueueRunner |
| `CommandCompletedEvent` | interface | Command completed | QueueRunner |

**Type Definitions**:

```
QueueEvent
  Purpose: Union type for all queue-related events
  Values: QueueCreatedEvent | QueueStartedEvent | QueuePausedEvent | QueueResumedEvent |
          QueueStoppedEvent | QueueCompletedEvent | QueueFailedEvent |
          CommandStartedEvent | CommandCompletedEvent | CommandFailedEvent |
          CommandAddedEvent | CommandUpdatedEvent | CommandRemovedEvent |
          CommandReorderedEvent | CommandModeChangedEvent
  Used by: EventEmitter, SDK consumers

CommandStartedEvent
  Purpose: Emitted when a command begins execution
  Properties:
    - type: 'command_started'
    - queueId: string
    - commandId: string
    - prompt: string
    - sessionMode: SessionMode
    - isNewSession: boolean
  Used by: CLI, Browser viewer

CommandCompletedEvent
  Purpose: Emitted when a command completes
  Properties:
    - type: 'command_completed'
    - queueId: string
    - commandId: string
    - cost: number
    - claudeSessionId: string
  Used by: CLI, Browser viewer
```

**Dependencies**: `src/sdk/queue/types.ts`

**Dependents**: QueueRunner, QueueManager, SDK consumers

---

### Deliverable 5: src/repository/queue-repository.ts

**Purpose**: Queue repository interface

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `QueueRepository` | interface | Data access for queues | QueueManager |
| `QueueFilter` | interface | Query filter | QueueRepository.list |

**Interface Definitions**:

```
QueueRepository
  Purpose: Data access for Command Queues
  Methods:
    - findById(id: string): Promise<CommandQueue | null>
    - findByProject(projectPath: string): Promise<CommandQueue[]>
    - list(filter?: QueueFilter): Promise<CommandQueue[]>
    - save(queue: CommandQueue): Promise<void>
    - update(id: string, updates: Partial<CommandQueue>): Promise<void>
    - delete(id: string): Promise<void>
  Used by: QueueManager

QueueFilter
  Purpose: Filter criteria for listing queues
  Properties:
    - projectPath?: string
    - status?: QueueStatus | QueueStatus[]
    - since?: Date
    - limit?: number
  Used by: QueueRepository.list
```

**Dependencies**: `src/sdk/queue/types.ts`

**Dependents**: FileQueueRepository, InMemoryQueueRepository, QueueManager

---

### Deliverable 6: src/repository/file/queue-repository.ts

**Purpose**: File-based queue repository

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileQueueRepository` | class | File-based implementation | Production |

**Class Definition**:

```
FileQueueRepository implements QueueRepository
  Purpose: Store Command Queues as JSON files
  Constructor: (container: Container)
  Public Methods:
    - (all QueueRepository methods)
  Private Methods:
    - getQueuePath(id: string): string
    - ensureDirectory(): Promise<void>
  Private Properties:
    - baseDir: string - ~/.local/claude-code-agent/metadata/queues/
    - fileSystem: FileSystem
  Used by: Production container
```

**Dependencies**: `src/repository/queue-repository.ts`, `src/container.ts`

**Dependents**: Production container

---

## Subtasks

### TASK-001: Queue Types and Interfaces

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/queue/types.ts`, `src/sdk/queue/events.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for Command Queue including the main data model and events.

**Completion Criteria**:
- [ ] CommandQueue interface defined with all properties
- [ ] QueueCommand interface defined with sessionMode
- [ ] QueueStatus, CommandStatus, SessionMode types defined
- [ ] QueueConfig and QueueStats interfaces defined
- [ ] All event types defined (QueueEvent union type)
- [ ] Type checking passes
- [ ] All types exported from index.ts

---

### TASK-002: Queue Repository

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/repository/queue-repository.ts`, `src/repository/file/queue-repository.ts`, `src/repository/in-memory/queue-repository.ts`
**Estimated Effort**: Medium

**Description**:
Implement the repository interface and both file-based and in-memory implementations for storing Command Queues.

**Completion Criteria**:
- [ ] QueueRepository interface defined
- [ ] QueueFilter interface defined
- [ ] FileQueueRepository implemented with JSON file storage
- [ ] InMemoryQueueRepository implemented for testing
- [ ] Storage path: `~/.local/claude-code-agent/metadata/queues/{queue-id}.json`
- [ ] Unit tests for both implementations
- [ ] Type checking passes

---

### TASK-003: Queue Manager

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/sdk/queue/manager.ts`
**Estimated Effort**: Medium

**Description**:
Implement the QueueManager class for CRUD operations on Command Queues and their commands.

**Completion Criteria**:
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

### TASK-004: Queue Runner

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-003)
**Deliverables**: `src/sdk/queue/runner.ts`
**Estimated Effort**: Large

**Description**:
Implement the QueueRunner class for executing Command Queue commands sequentially.

**Completion Criteria**:
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

### TASK-005: SDK Public API

**Status**: Not Started
**Parallelizable**: No (depends on TASK-003, TASK-004)
**Deliverables**: `src/sdk/queue/index.ts`, updates to `src/sdk/index.ts`
**Estimated Effort**: Small

**Description**:
Export Command Queue functionality from SDK public API.

**Completion Criteria**:
- [ ] All public types exported
- [ ] QueueManager accessible from SDK agent
- [ ] Convenience methods on queue object (addCommand, run, pause, etc.)
- [ ] Example usage documented in comments
- [ ] Type checking passes

---

### TASK-006: Crash Recovery

**Status**: Not Started
**Parallelizable**: No (depends on TASK-003, TASK-004)
**Deliverables**: Updates to `src/sdk/queue/runner.ts`, `src/sdk/queue/recovery.ts`
**Estimated Effort**: Small

**Description**:
Implement crash recovery to detect and handle queues left in 'running' state.

**Completion Criteria**:
- [ ] On startup, scan for queues with status: 'running'
- [ ] Check if Claude Code process is alive
- [ ] Mark stale running queues as 'paused'
- [ ] Unit tests for recovery logic
- [ ] Type checking passes

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

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-003 (after Group A)
- Group C: TASK-004 (after TASK-003)
- Group D: TASK-005, TASK-006 (after TASK-004)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing for QueueRunner
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] All types and classes exported from SDK

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test queue creation, command management, execution flow
4. Test pause/resume/stop functionality
5. Test session mode switching
6. Review implementation against spec-command-queue.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding command timeout support
- Consider adding command retry on failure

### Future Enhancements

- TUI interface for queue management (deferred)
- Conditional command execution based on previous results
- Command templates
