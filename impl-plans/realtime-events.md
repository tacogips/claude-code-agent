# Real-Time Monitoring - Event Emission and State Management

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#3-real-time-monitoring
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of the real-time monitoring system. See also:
- `impl-plans/realtime-watcher.md` - File watching and JSONL parsing

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 3: Real-time Monitoring

### Summary

Implement event parsing, state management, and high-level monitoring APIs for Claude Code sessions. This module transforms raw transcript events into meaningful state updates and provides monitoring interfaces for viewers and SDK consumers.

### Scope

**Included**:
- Event parsing from transcript entries
- State manager for task/subagent tracking
- Progress aggregation
- Event emission for consumers (viewers, SDK)
- High-level SessionMonitor and GroupMonitor APIs
- JSON stream output for CLI

**Excluded**:
- File watching and JSONL parsing (covered in realtime-watcher.md)
- TUI output display (deferred, low priority)
- Browser WebSocket integration (covered in browser-viewer.md)

---

## Implementation Overview

### Approach

Build on the file watching foundation with three layers:
1. Event Parser - extracts meaningful events from transcript entries
2. State Manager - maintains current task/subagent state
3. Monitor APIs - high-level interfaces for session and group monitoring

### Key Decisions

- Event-driven architecture for loose coupling
- Discriminated unions for MonitorEvent types
- Stateful tracking of tasks and subagents
- AsyncIterable interface for streaming events

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| TranscriptWatcher | Required | realtime-watcher.md |
| JsonlStreamParser | Required | realtime-watcher.md |
| Event system | Required | foundation-and-core.md |
| Session types | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/polling/event-parser.ts

**Purpose**: Extract meaningful events from transcript entries

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `EventParser` | class | Parse transcript events | SessionMonitor |
| `MonitorEvent` | type | Union of all monitor events | EventParser |

**Class Definition**:

```
EventParser
  Purpose: Extract high-level events from transcript entries
  Constructor: (eventEmitter: EventEmitter)
  Public Methods:
    - parseEvents(events: TranscriptEvent[]): MonitorEvent[]
    - reset(): void
  Private Methods:
    - parseToolUse(event: TranscriptEvent): MonitorEvent | null
    - parseToolResult(event: TranscriptEvent): MonitorEvent | null
    - parseSubagent(event: TranscriptEvent): MonitorEvent | null
    - parseMessage(event: TranscriptEvent): MonitorEvent | null
  Private Properties:
    - eventEmitter: EventEmitter
  Used by: SessionMonitor

MonitorEvent
  Purpose: High-level monitoring events
  Values: ToolStartEvent | ToolEndEvent | SubagentStartEvent | SubagentEndEvent |
          MessageEvent | TaskUpdateEvent | SessionEndEvent
  Used by: StateManager, viewers
```

**Type Definitions**:

```
ToolStartEvent
  Properties:
    - type: 'tool_start'
    - sessionId: string
    - tool: string
    - timestamp: string

ToolEndEvent
  Properties:
    - type: 'tool_end'
    - sessionId: string
    - tool: string
    - duration: number
    - timestamp: string

SubagentStartEvent
  Properties:
    - type: 'subagent_start'
    - sessionId: string
    - agentId: string
    - agentType: string
    - description: string
    - timestamp: string

SubagentEndEvent
  Properties:
    - type: 'subagent_end'
    - sessionId: string
    - agentId: string
    - status: 'completed' | 'failed'
    - timestamp: string

TaskUpdateEvent
  Properties:
    - type: 'task_update'
    - sessionId: string
    - tasks: TaskState[]
    - timestamp: string
```

**Dependencies**: `src/polling/parser.ts`, `src/sdk/events/emitter.ts`

**Dependents**: SessionMonitor, StateManager

---

### Deliverable 2: src/polling/state.ts

**Purpose**: Maintain current task and subagent state

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `StateManager` | class | Track session state | SessionMonitor |
| `TaskState` | interface | Current task state | StateManager |
| `SubagentState` | interface | Subagent state | TaskState |
| `MonitorState` | interface | Complete monitor state | StateManager |

**Class Definition**:

```
StateManager
  Purpose: Maintain current state of monitored sessions
  Constructor: ()
  Public Methods:
    - update(event: MonitorEvent): void
    - getState(sessionId: string): MonitorState | null
    - getAllStates(): Map<string, MonitorState>
    - clear(sessionId?: string): void
  Private Methods:
    - updateTask(state: MonitorState, event: TaskUpdateEvent): void
    - updateTool(state: MonitorState, event: ToolStartEvent | ToolEndEvent): void
    - updateSubagent(state: MonitorState, event: SubagentStartEvent | SubagentEndEvent): void
  Private Properties:
    - states: Map<string, MonitorState>
  Used by: SessionMonitor, CLI watch

MonitorState
  Purpose: Complete state for a monitored session
  Properties:
    - sessionId: string
    - status: 'running' | 'completed' | 'error'
    - startTime: string
    - lastUpdate: string
    - currentTool?: string
    - tasks: TaskState[]
    - subagents: Map<string, SubagentState>
    - toolCalls: number
    - duration: number
  Used by: CLI watch, Browser viewer

TaskState
  Purpose: State of a single task
  Properties:
    - summary: string
    - status: 'running' | 'completed' | 'error'
  Used by: MonitorState

SubagentState
  Purpose: State of a subagent
  Properties:
    - agentId: string
    - type: string
    - description: string
    - status: 'running' | 'completed'
    - toolCalls: ToolCall[]
  Used by: MonitorState
```

**Dependencies**: `src/polling/event-parser.ts`

**Dependents**: SessionMonitor, CLI watch, Browser viewer

---

### Deliverable 3: src/polling/monitor.ts

**Purpose**: High-level session monitoring API

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `SessionMonitor` | class | Monitor a single session | SDK, CLI |
| `GroupMonitor` | class | Monitor a session group | SDK, CLI |

**Class Definition**:

```
SessionMonitor
  Purpose: Monitor a single session in real-time
  Constructor: (container: Container, eventEmitter: EventEmitter)
  Public Methods:
    - watch(sessionId: string): AsyncIterable<MonitorEvent>
    - getState(): MonitorState | null
    - stop(): void
  Private Properties:
    - watcher: TranscriptWatcher
    - parser: JsonlStreamParser
    - eventParser: EventParser
    - stateManager: StateManager
  Used by: SDK session.watch(), CLI session watch

GroupMonitor
  Purpose: Monitor all sessions in a group
  Constructor: (container: Container, eventEmitter: EventEmitter)
  Public Methods:
    - watch(groupId: string): AsyncIterable<MonitorEvent>
    - getStates(): Map<string, MonitorState>
    - stop(): void
  Private Properties:
    - monitors: Map<string, SessionMonitor>
  Used by: SDK group.watch(), CLI group watch
```

**Function Signatures**:

```
SessionMonitor.watch(sessionId: string): AsyncIterable<MonitorEvent>
  Purpose: Start monitoring and yield events
  Called by: SDK session.watch()

SessionMonitor.getState(): MonitorState | null
  Purpose: Get current aggregated state
  Called by: CLI watch display

GroupMonitor.watch(groupId: string): AsyncIterable<MonitorEvent>
  Purpose: Monitor all sessions in group
  Called by: SDK group.watch()
```

**Dependencies**: All polling modules, `src/sdk/index.ts`

**Dependents**: SDK, CLI, Browser viewer

---

### Deliverable 4: src/polling/output.ts

**Purpose**: JSON stream output for CLI

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `JsonStreamOutput` | class | Output events as JSON stream | CLI watch |

**Class Definition**:

```
JsonStreamOutput
  Purpose: Output monitor events as JSON stream
  Constructor: (outputStream: NodeJS.WritableStream)
  Public Methods:
    - write(event: MonitorEvent): void
    - close(): void
  Private Properties:
    - stream: NodeJS.WritableStream
  Used by: CLI watch --format json

Output format:
  {"event": "tool_start", "session": "...", "tool": "Task", "time": "..."}
  {"event": "subagent_start", "session": "...", "agentId": "...", "type": "..."}
```

**Dependencies**: `src/polling/event-parser.ts`

**Dependents**: CLI watch commands

---

### Deliverable 5: src/polling/index.ts

**Purpose**: Module exports

**Exports**: All public classes and types from polling modules

---

## Subtasks

### TASK-003: Event Parser

**Status**: Not Started
**Parallelizable**: No (depends on TASK-002 in realtime-watcher.md)
**Deliverables**: `src/polling/event-parser.ts`
**Estimated Effort**: Medium

**Description**:
Implement event extraction from transcript entries.

**Completion Criteria**:
- [ ] Parse tool_use events
- [ ] Parse tool results
- [ ] Parse subagent spawn/complete
- [ ] Parse message events
- [ ] Parse task updates
- [ ] MonitorEvent union type complete
- [ ] Unit tests for all event types
- [ ] Type checking passes

---

### TASK-004: State Manager

**Status**: Not Started
**Parallelizable**: No (depends on TASK-003)
**Deliverables**: `src/polling/state.ts`
**Estimated Effort**: Medium

**Description**:
Implement state management for monitored sessions.

**Completion Criteria**:
- [ ] update() processes all event types
- [ ] Track current tool
- [ ] Track task states
- [ ] Track subagent states with tool counts
- [ ] Calculate duration
- [ ] getState() returns complete state
- [ ] clear() resets state
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-005: Session Monitor

**Status**: Completed
**Parallelizable**: No (depends on TASK-001 in realtime-watcher.md, TASK-003, TASK-004)
**Deliverables**: `src/polling/monitor.ts`
**Estimated Effort**: Medium

**Description**:
Implement high-level SessionMonitor class.

**Completion Criteria**:
- [x] watch() yields events from transcript
- [x] Integrates watcher, parser, state manager
- [x] getState() returns current state
- [x] stop() cleans up all resources
- [x] Integration tests
- [x] Type checking passes

---

### TASK-006: Group Monitor

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005)
**Deliverables**: `src/polling/monitor.ts` (GroupMonitor)
**Estimated Effort**: Small

**Description**:
Implement GroupMonitor for monitoring all sessions in a group.

**Completion Criteria**:
- [ ] watch() monitors all group sessions
- [ ] Add/remove sessions dynamically
- [ ] getStates() returns all session states
- [ ] Merge events from all sessions
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-007: JSON Stream Output

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/polling/output.ts`
**Estimated Effort**: Small

**Description**:
Implement JSON stream output for CLI.

**Completion Criteria**:
- [ ] write() outputs formatted JSON
- [ ] One event per line
- [ ] close() flushes and closes stream
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-008: Module Exports

**Status**: Completed
**Parallelizable**: No (depends on all above)
**Deliverables**: `src/polling/index.ts`
**Estimated Effort**: Small

**Description**:
Create module exports.

**Completion Criteria**:
- [x] All public classes exported
- [x] All public types exported
- [x] Type checking passes

---

## Task Dependency Graph

```
(TASK-001, TASK-002 from realtime-watcher.md)
            |
            v
      TASK-003 (Event Parser)
            |
            v
      TASK-004 (State Manager)
            |
            v
      TASK-005 (Session Monitor)     TASK-007 (JSON Output)
            |                              |
            v                              |
      TASK-006 (Group Monitor)            |
            |                              |
            +---------------+--------------+
                            |
                            v
                      TASK-008 (Exports)
```

Parallelizable groups:
- Group A: TASK-007 (can run anytime)
- Group B: TASK-003 (after TASK-002 from realtime-watcher.md)
- Group C: TASK-004 (after TASK-003)
- Group D: TASK-005 (after TASK-001 from realtime-watcher.md, TASK-003, TASK-004)
- Group E: TASK-006 (after TASK-005)
- Group F: TASK-008 (after all)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] Integrates with realtime-watcher.md modules

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test with actual Claude Code session
4. Verify events stream correctly
5. Verify state updates accurately
6. Review implementation against spec-viewers.md

---

## Progress Log

### Session: 2026-01-06 11:42
**Tasks Completed**: TASK-005
**Notes**:
- Implemented SessionMonitor class in src/polling/monitor.ts
- Integrates TranscriptWatcher, JsonlStreamParser, EventParser, and StateManager
- watch() method yields monitor events from transcript files
- getState() returns current session state from StateManager
- stop() cleans up all watcher resources
- Added comprehensive integration tests in src/polling/monitor.test.ts
- Enhanced MockFileSystem with writeFileSync and appendFileSync for testing
- Configured TranscriptWatcher with includeExisting: true by default for monitoring use case
- All tests passing (9/9)
- Type checking passes

### Session: 2026-01-06 22:49
**Tasks Completed**: TASK-008
**Notes**:
- Created src/polling/index.ts module exports file
- Exported all public classes: EventParser, StateManager, SessionMonitor, GroupMonitor, JsonStreamOutput
- Exported all public types: MonitorEvent (and constituent types), TaskState, SubagentState, SessionState
- Type checking passes (index.ts builds without errors)
- All polling module tests passing (134 pass, 2 skip, 0 fail)
- Verified exports are accessible via build test

---

## Notes

### Open Questions

None at this time.

### Technical Debt

None at this time.

### Future Enhancements

- TUI output renderer
- Notification system for task completion
- Metrics collection
