# Real-Time Monitoring - File Watching and Parsing

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#3-real-time-monitoring
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of the real-time monitoring system. See also:
- `impl-plans/realtime-events.md` - Event emission, state management

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 3: Real-time Monitoring

### Summary

Implement file watching and JSONL stream parsing for Claude Code transcript files. This module provides the foundation for real-time monitoring by detecting file changes and parsing JSONL streams with buffering.

### Scope

**Included**:
- File watcher using fs.watch
- JSONL stream parser with line buffering
- File offset tracking for incremental reads
- Debounce handling for rapid changes

**Excluded**:
- Event parsing and state management (covered in realtime-events.md)
- TUI output display (deferred, low priority)
- Browser WebSocket integration (covered in browser-viewer.md)

---

## Implementation Overview

### Approach

Build the foundation for real-time monitoring:
1. File Watcher - detects changes to transcript files using fs.watch
2. JSONL Parser - parses JSONL streams with line buffering

### Key Decisions

- Use fs.watch for cross-platform file monitoring
- Buffer incomplete lines until newline received
- Track file offset to read only new content
- Graceful handling of parse errors (skip malformed lines)

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
| `FileChange` | interface | File change event | TranscriptWatcher |

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

## Subtasks

### TASK-001: File Watcher

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/polling/watcher.ts`
**Estimated Effort**: Medium

**Description**:
Implement transcript file watching with fs.watch.

**Completion Criteria**:
- [x] watch() monitors single file
- [x] watchMultiple() monitors multiple files
- [x] Offset tracking reads only new content
- [x] Debounce rapid changes
- [x] Handle file truncation/rotation
- [x] stop() cleans up watchers
- [x] Unit tests with MockFileSystem
- [x] Type checking passes

---

### TASK-002: JSONL Stream Parser

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/polling/parser.ts`
**Estimated Effort**: Small

**Description**:
Implement JSONL stream parser with line buffering.

**Completion Criteria**:
- [x] feed() parses complete lines
- [x] Buffer incomplete lines until newline
- [x] flush() handles remaining content
- [x] Handle malformed JSON gracefully
- [x] Unit tests with various inputs
- [x] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Watcher)     TASK-002 (JSONL Parser)
        |                     |
        +----------+----------+
                   |
                   v
        (See realtime-events.md for downstream tasks)
```

Parallelizable: TASK-001 and TASK-002 can be implemented concurrently.

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] Integrates with realtime-events.md modules

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test src/polling/watcher.test.ts`
3. Run `bun test src/polling/parser.test.ts`
4. Verify FileChange events stream correctly
5. Verify JSONL parsing handles edge cases

---

## Progress Log

### Session: 2026-01-06
**Tasks Completed**: TASK-002
**Implementation**: Completed JSONL Stream Parser

**Summary**:
- Implemented `JsonlStreamParser` class with line buffering
- Created `TranscriptEvent` interface matching specification
- Implemented `feed()` method for incremental parsing
- Implemented `flush()` method for remaining content
- Added graceful error handling for malformed JSON
- Created comprehensive test suite (34 tests, 80 assertions)
- All tests passing

**Files Created**:
- `src/polling/parser.ts` - JsonlStreamParser implementation
- `src/polling/parser.test.ts` - Comprehensive unit tests

**Notes**:
- Parser correctly handles incomplete lines across multiple feed() calls
- Gracefully skips malformed JSON without throwing errors
- Supports nested objects, arrays, unicode, and special characters

---

### Session: 2026-01-06 (Later)
**Tasks Completed**: TASK-001 (File Watcher)

**Summary**:
Implemented TranscriptWatcher class with fs.watch-based file monitoring. Includes offset tracking for incremental reads, debouncing for rapid changes, and graceful handling of file truncation and stop signals.

**Files Created**:
- `src/polling/watcher.ts` - TranscriptWatcher implementation
- `src/polling/watcher.test.ts` - Comprehensive unit tests

**Test Results**:
- All 13 tests passing
- Coverage includes single file watching, multiple file watching, debouncing, truncation handling, and cleanup

**Notes**:
- Used periodic check interval to resolve promise when stop() is called
- MockFileSystem integration works seamlessly for testing
- Type safety ensured with strict TypeScript configuration
- Properly handles multiple concurrent file watchers via watchMultiple()
- Test coverage includes edge cases and real-time streaming scenarios

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding rate limiting for very active sessions
- Consider file rotation handling

### Future Enhancements

- Support for compressed transcript files
- Performance optimization for large files
