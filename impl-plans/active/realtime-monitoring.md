# Real-Time Monitoring Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#3-real-time-monitoring
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 3: Real-time Monitoring

### Summary

Implement the real-time monitoring system that watches Claude Code transcript files and provides live updates on session progress. Uses fs.watch for file monitoring, parses JSONL streams, and maintains task state for progress tracking.

### Scope

**Included**:
- File watcher using fs.watch
- JSONL stream parser with buffering
- State manager for task/subagent tracking
- Progress aggregation
- Event emission for consumers (viewers, SDK)
- JSON stream output for CLI

**Excluded**:
- TUI output display (deferred, low priority)
- Browser WebSocket integration (covered in browser-viewer.md)

---

## Implementation Overview

### Approach

Build a three-stage pipeline:
1. File Watcher - detects changes to transcript files
2. Event Parser - parses JSONL and extracts events
3. State Manager - maintains current task/subagent state

### Key Decisions

- Use fs.watch for cross-platform file monitoring
- Buffer incomplete lines until newline received
- Track file offset to read only new content
- Graceful handling of parse errors (skip malformed lines)
- Event-driven architecture for loose coupling

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| FileSystem interface | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |
| Session types | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/polling/watcher.ts

**Purpose**: Watch transcript files for changes

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `TranscriptWatcher` | class | Watch and emit file changes | SessionMonitor |
| `WatcherConfig` | interface | Watcher configuration | TranscriptWatcher |

**Class Definition**:

```
TranscriptWatcher
  Purpose: Watch transcript files and emit change events
  Constructor: (container: Container, config: WatcherConfig)
  Public Methods:
    - watch(transcriptPath: string): AsyncIterable<FileChange>
    - watchMultiple(paths: string[]): AsyncIterable<FileChange>
    - stop(): void
  Private Methods:
    - handleChange(path: string, event: WatchEvent): void
    - readNewContent(path: string): Promise<string>
  Private Properties:
    - fileSystem: FileSystem
    - watchers: Map<string, FSWatcher>
    - offsets: Map<string, number>
  Used by: SessionMonitor, GroupMonitor

WatcherConfig
  Purpose: Configuration for file watching
  Properties:
    - debounceMs?: number - Debounce rapid changes (default: 50)
    - includeExisting?: boolean - Emit existing content on start
  Used by: TranscriptWatcher

FileChange
  Purpose: Represents new content in transcript
  Properties:
    - path: string - Transcript file path
    - content: string - New content since last read
    - timestamp: string - ISO timestamp of change
  Used by: TranscriptWatcher consumers
```

**Function Signatures**:

```
watch(transcriptPath: string): AsyncIterable<FileChange>
  Purpose: Watch a single transcript file for changes
  Called by: SessionMonitor.watch()

watchMultiple(paths: string[]): AsyncIterable<FileChange>
  Purpose: Watch multiple transcript files, merging changes
  Called by: GroupMonitor.watch()

stop(): void
  Purpose: Stop all file watchers and clean up
  Called by: Cleanup handlers
```

**Dependencies**: `src/interfaces/filesystem.ts`

**Dependents**: SessionMonitor, GroupMonitor

---

### Deliverable 2: src/polling/parser.ts

**Purpose**: Parse JSONL stream from transcripts

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `JsonlStreamParser` | class | Parse JSONL with buffering | EventParser |
| `TranscriptEvent` | interface | Parsed transcript event | JsonlStreamParser |

**Class Definition**:

```
JsonlStreamParser
  Purpose: Parse JSONL stream with line buffering
  Constructor: ()
  Public Methods:
    - feed(content: string): TranscriptEvent[]
    - flush(): TranscriptEvent[]
  Private Methods:
    - parseLine(line: string): TranscriptEvent | null
  Private Properties:
    - buffer: string - Incomplete line buffer
  Used by: EventParser

TranscriptEvent
  Purpose: Represents a parsed transcript entry
  Properties:
    - type: string - Event type (user, assistant, tool_use, etc.)
    - uuid?: string - Message UUID
    - timestamp?: string - Event timestamp
    - content?: unknown - Event-specific content
    - raw: object - Original parsed object
  Used by: EventParser, StateManager
```

**Function Signatures**:

```
feed(content: string): TranscriptEvent[]
  Purpose: Feed new content, return complete parsed events
  Called by: EventParser on file change

flush(): TranscriptEvent[]
  Purpose: Flush any remaining buffered content (force parse)
  Called by: On watcher close

parseLine(line: string): TranscriptEvent | null
  Purpose: Parse a single line, return event or null if invalid
  Called by: feed(), flush()
```

**Dependencies**: None

**Dependents**: EventParser

---

### Deliverable 3: src/polling/event-parser.ts

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

### Deliverable 4: src/polling/state.ts

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

### Deliverable 5: src/polling/monitor.ts

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

### Deliverable 6: src/polling/output.ts

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

## Subtasks

### TASK-001: File Watcher

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/polling/watcher.ts`
**Estimated Effort**: Medium

**Description**:
Implement transcript file watching with fs.watch.

**Completion Criteria**:
- [ ] watch() monitors single file
- [ ] watchMultiple() monitors multiple files
- [ ] Offset tracking reads only new content
- [ ] Debounce rapid changes
- [ ] Handle file truncation/rotation
- [ ] stop() cleans up watchers
- [ ] Unit tests with MockFileSystem
- [ ] Type checking passes

---

### TASK-002: JSONL Stream Parser

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/polling/parser.ts`
**Estimated Effort**: Small

**Description**:
Implement JSONL stream parser with line buffering.

**Completion Criteria**:
- [ ] feed() parses complete lines
- [ ] Buffer incomplete lines until newline
- [ ] flush() handles remaining content
- [ ] Handle malformed JSON gracefully
- [ ] Unit tests with various inputs
- [ ] Type checking passes

---

### TASK-003: Event Parser

**Status**: Not Started
**Parallelizable**: No (depends on TASK-002)
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

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-003, TASK-004)
**Deliverables**: `src/polling/monitor.ts`
**Estimated Effort**: Medium

**Description**:
Implement high-level SessionMonitor class.

**Completion Criteria**:
- [ ] watch() yields events from transcript
- [ ] Integrates watcher, parser, state manager
- [ ] getState() returns current state
- [ ] stop() cleans up all resources
- [ ] Integration tests
- [ ] Type checking passes

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

**Status**: Not Started
**Parallelizable**: No (depends on all above)
**Deliverables**: `src/polling/index.ts`
**Estimated Effort**: Small

**Description**:
Create module exports.

**Completion Criteria**:
- [ ] All public classes exported
- [ ] All public types exported
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Watcher)     TASK-002 (JSONL Parser)     TASK-007 (JSON Output)
    |                         |
    +-------+-----------------+
            |
            v
      TASK-003 (Event Parser)
            |
            v
      TASK-004 (State Manager)
            |
            v
      TASK-005 (Session Monitor)
            |
            v
      TASK-006 (Group Monitor)
            |
            v
      TASK-008 (Exports)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002, TASK-007
- Group B: TASK-003 (after TASK-002)
- Group C: TASK-004 (after TASK-003)
- Group D: TASK-005 (after TASK-001, TASK-003, TASK-004)
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

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test with actual Claude Code session
4. Verify events stream correctly
5. Review implementation against spec-viewers.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding rate limiting for very active sessions
- Consider file rotation handling

### Future Enhancements

- TUI output renderer
- Notification system for task completion
- Metrics collection
