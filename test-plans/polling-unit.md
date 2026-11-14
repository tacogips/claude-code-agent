# Polling and Realtime Monitoring Unit Tests

**Status**: Ready
**Implementation Reference**: impl-plans/realtime-watcher.md, impl-plans/realtime-events.md
**Source Files**: src/polling/
**Test Type**: Unit
**Created**: 2026-01-09
**Last Updated**: 2026-01-09

## Implementation Reference

Polling system for realtime monitoring of Claude Code sessions via transcript file watching.

**Scope**: Unit tests for file watching, event parsing, state management, and session/group monitoring.

## Test Environment

**Runtime**: Bun test (vitest)
**Mocks Required**: MockFilesystem, MockClock
**Fixtures**: Sample transcript files, JSONL data
**Setup/Teardown**: Clean up temp files, reset watchers

## Test Cases

### TEST-001: Transcript Watcher

**Status**: Passing
**Priority**: Critical
**Parallelizable**: No
**Dependencies**: None

**Target**: `src/polling/watcher.ts`

**Description**:
Verify file watching and change detection.

**Scenarios**:
1. Detect new transcript file
2. Detect file modifications
3. Handle file deletion
4. Poll interval timing

**Assertions**:
- [x] File changes detected
- [x] Events emitted correctly
- [x] Polling interval respected

**Test Code Location**: `src/polling/watcher.test.ts`

---

### TEST-002: JSONL Output Parser

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/polling/output.ts`

**Description**:
Verify parsing of Claude Code JSONL output.

**Scenarios**:
1. Parse complete JSONL lines
2. Handle incomplete lines
3. Parse tool calls
4. Parse thinking blocks

**Assertions**:
- [x] Valid JSONL parsed correctly
- [x] Partial data handled
- [x] Errors caught

**Test Code Location**: `src/polling/output.test.ts`

---

### TEST-003: Transcript Parser

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-002

**Target**: `src/polling/parser.ts`

**Description**:
Verify transcript file parsing.

**Scenarios**:
1. Parse full transcript
2. Parse incremental updates
3. Extract messages
4. Extract metadata

**Assertions**:
- [x] Transcripts parsed correctly
- [x] Incremental parsing works
- [x] Metadata extracted

**Test Code Location**: `src/polling/parser.test.ts`

---

### TEST-004: Event Parser

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-003

**Target**: `src/polling/event-parser.ts`

**Description**:
Verify conversion of transcript updates to events.

**Scenarios**:
1. Message events
2. Tool call events
3. Status change events
4. Error events

**Assertions**:
- [x] Events generated correctly
- [x] Event timing accurate
- [x] Event data complete

**Test Code Location**: `src/polling/event-parser.test.ts`

---

### TEST-005: State Manager

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/polling/state-manager.ts`

**Description**:
Verify session state tracking.

**Scenarios**:
1. Initialize state
2. Update state from transcript
3. Detect state changes
4. Handle concurrent updates

**Assertions**:
- [x] State maintained correctly
- [x] Changes detected
- [x] Concurrency safe

**Test Code Location**: `src/polling/state-manager.test.ts`

---

### TEST-006: Session Monitor

**Status**: Passing
**Priority**: Critical
**Parallelizable**: No
**Dependencies**: TEST-001, TEST-003, TEST-005

**Target**: `src/polling/monitor.ts`

**Description**:
Verify end-to-end session monitoring.

**Scenarios**:
1. Start monitoring session
2. Detect transcript updates
3. Emit realtime events
4. Stop monitoring

**Assertions**:
- [x] Monitoring starts correctly
- [x] Updates detected
- [x] Events emitted
- [x] Clean shutdown

**Test Code Location**: `src/polling/monitor.test.ts`

---

### TEST-007: Group Monitor

**Status**: Passing
**Priority**: High
**Parallelizable**: No
**Dependencies**: TEST-006

**Target**: `src/polling/group-monitor.ts`

**Description**:
Verify monitoring of session groups.

**Scenarios**:
1. Monitor multiple sessions
2. Track group progress
3. Detect session completion
4. Handle session failures

**Assertions**:
- [x] All sessions monitored
- [x] Progress tracked
- [x] Events aggregated
- [x] Failures handled

**Test Code Location**: `src/polling/group-monitor.test.ts`

## Test Status

| Test ID | Name | Status | Priority | Dependencies |
|---------|------|--------|----------|--------------|
| TEST-001 | Transcript Watcher | Passing | Critical | None |
| TEST-002 | JSONL Parser | Passing | Critical | None |
| TEST-003 | Transcript Parser | Passing | Critical | TEST-002 |
| TEST-004 | Event Parser | Passing | High | TEST-003 |
| TEST-005 | State Manager | Passing | High | None |
| TEST-006 | Session Monitor | Passing | Critical | TEST-001, TEST-003, TEST-005 |
| TEST-007 | Group Monitor | Passing | High | TEST-006 |

## Coverage Targets

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| src/polling/watcher.ts | ~85% | 80% | Met |
| src/polling/output.ts | ~90% | 85% | Met |
| src/polling/parser.ts | ~90% | 85% | Met |
| src/polling/event-parser.ts | ~85% | 80% | Met |
| src/polling/state-manager.ts | ~90% | 85% | Met |
| src/polling/monitor.ts | ~85% | 80% | Met |

## Completion Criteria

- [x] All test cases implemented
- [x] All tests passing
- [x] Coverage targets met
- [x] No flaky tests
- [x] Documentation updated

## Progress Log

### Session: 2026-01-09 16:55
**Tests Completed**: All 7 tests documented
**Status**: All tests passing
**Notes**: Polling system has comprehensive test coverage including realtime monitoring and state management.
