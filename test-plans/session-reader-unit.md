# Session Reader Unit Test Plan

**Status**: Completed
**Test Type**: Unit
**Implementation Reference**: impl-plans/session-reader-fix.md
**Source Files**: `src/sdk/session-reader.ts`
**Test File**: `src/sdk/session-reader.test.ts`
**Created**: 2026-01-13
**Last Updated**: 2026-01-13

---

## Overview

Unit tests for `SessionReader` class that reads and parses Claude Code session data from JSONL files.

### Coverage Areas

- Session file reading and parsing (new nested format + legacy format)
- Message extraction with tool calls/results
- Task extraction from TodoWrite tool calls
- File discovery (UUID pattern matching)
- Project path derivation from encoded directory names
- Token usage extraction and aggregation
- Session listing and metadata generation

---

## Test Categories

### 1. readSession (18 tests)

Tests for parsing session JSONL files and extracting session data.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-RS-001 | Parse simple session file (new nested format) | Critical |
| TEST-RS-002 | Parse simple session file (old format - metadata only) | High |
| TEST-RS-003 | Handle session file with tool calls (new format) | Critical |
| TEST-RS-004 | Handle session file with tool calls (old format) | Medium |
| TEST-RS-005 | Handle session file with tool results (new format) | Critical |
| TEST-RS-006 | Handle session file with tool results (old format) | Medium |
| TEST-RS-007 | Derive session ID from UUID filename | High |
| TEST-RS-008 | Derive session ID from path | High |
| TEST-RS-009 | Handle empty session file | High |
| TEST-RS-010 | Handle session file with empty lines (new format) | Medium |
| TEST-RS-011 | Handle session file with empty lines (old format) | Medium |
| TEST-RS-012 | Return FileNotFoundError when file does not exist | Critical |
| TEST-RS-013 | Return ParseError when JSONL is malformed | Critical |
| TEST-RS-014 | Skip non-message lines gracefully (new format) | High |
| TEST-RS-015 | Skip non-message lines gracefully (old format) | Medium |
| TEST-RS-016 | Handle different session statuses | Medium |
| TEST-RS-017 | Use current timestamp when timestamps not in file | Medium |
| TEST-RS-018 | Handle nested message content structure | High |

### 2. readMessages (4 tests)

Tests for reading only messages from session files.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-RM-001 | Read only messages from session file (new format) | Critical |
| TEST-RM-002 | Read only messages from session file (old format) | Medium |
| TEST-RM-003 | Return FileNotFoundError when file does not exist | Critical |
| TEST-RM-004 | Return empty array for empty session | High |

### 3. findSessionFiles (13 tests)

Tests for discovering session files in directories.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-FS-001 | Find UUID-named session files in directory | Critical |
| TEST-FS-002 | Find session.jsonl in single directory | High |
| TEST-FS-003 | Find session files in nested directories | High |
| TEST-FS-004 | Ignore non-session files | Critical |
| TEST-FS-005 | Reject malformed UUID filenames | Critical |
| TEST-FS-006 | Return empty array when directory does not exist | High |
| TEST-FS-007 | Return empty array when directory has no sessions | High |
| TEST-FS-008 | Search one level deep (Claude Code structure) | Critical |
| TEST-FS-009 | Not search deeply nested directories | High |
| TEST-FS-010 | Return file directly if path is UUID session file | Medium |
| TEST-FS-011 | Return file directly if path is session.jsonl file | Medium |
| TEST-FS-012 | Return empty array if path is non-session file | Medium |
| TEST-FS-013 | Handle mixed directory structure | High |

### 4. listSessions (6 tests)

Tests for listing sessions with metadata.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-LS-001 | List all sessions from directory (new format) | Critical |
| TEST-LS-002 | List all sessions from directory (old format) | Medium |
| TEST-LS-003 | Return empty array when no sessions exist | High |
| TEST-LS-004 | Skip sessions that fail to parse | High |
| TEST-LS-005 | Include message count in metadata (new format) | High |
| TEST-LS-006 | Include message count in metadata (old format) | Medium |

### 5. getSession (5 tests)

Tests for finding session by ID.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-GS-001 | Find and return session by ID (new format) | Critical |
| TEST-GS-002 | Find and return session by ID (old format) | Medium |
| TEST-GS-003 | Return null when session ID not found | Critical |
| TEST-GS-004 | Search all sessions and return first match | High |
| TEST-GS-005 | Return null when projects directory does not exist | High |

### 6. extractTasks (9 tests)

Tests for extracting tasks from TodoWrite tool calls.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-ET-001 | Extract tasks from TodoWrite with single task | Critical |
| TEST-ET-002 | Extract tasks from TodoWrite with multiple tasks | Critical |
| TEST-ET-003 | Return empty array when no TodoWrite calls | High |
| TEST-ET-004 | Return empty array when TodoWrite has missing input.todos | High |
| TEST-ET-005 | Skip invalid task entries (missing required fields) | High |
| TEST-ET-006 | Handle multiple TodoWrite calls (keeps last) | Critical |
| TEST-ET-007 | Handle message with string content (no tasks) | Medium |
| TEST-ET-008 | Handle missing message field gracefully | Medium |
| TEST-ET-009 | Validate all three task status types | High |

### 7. deriveProjectPath (7 tests)

Tests for decoding project paths from Claude Code directory names.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-DP-001 | Decode dash-encoded absolute path | Critical |
| TEST-DP-002 | Decode simple encoded path | High |
| TEST-DP-003 | Handle single-level encoded path | High |
| TEST-DP-004 | Return empty string when path missing projects segment | High |
| TEST-DP-005 | Return empty string when projects segment at end | Medium |
| TEST-DP-006 | Handle path without leading dash (relative path) | Medium |
| TEST-DP-007 | Handle deeply nested encoded paths | High |

### 8. getMessages (4 tests)

Tests for getting messages by session ID.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-GM-001 | Return messages for session by ID (new format) | Critical |
| TEST-GM-002 | Return messages for session by ID (old format) | Medium |
| TEST-GM-003 | Return empty array when session not found | High |
| TEST-GM-004 | Return empty array when session has no messages | Medium |

### 9. Token Usage Extraction (5 tests)

Tests for extracting and aggregating token usage statistics.

| Test | Description | Priority |
|------|-------------|----------|
| TEST-TU-001 | Extract and aggregate token usage from assistant messages | Critical |
| TEST-TU-002 | Handle assistant messages without usage data | High |
| TEST-TU-003 | Return undefined for cache tokens when zero | Medium |
| TEST-TU-004 | Aggregate usage across messages with mixed cache tokens | High |
| TEST-TU-005 | Include tokenUsage in SessionMetadata when present | High |

---

## Test Statistics

| Category | Tests | Passing | Status |
|----------|-------|---------|--------|
| readSession | 18 | 18 | Completed |
| readMessages | 4 | 4 | Completed |
| findSessionFiles | 13 | 13 | Completed |
| listSessions | 6 | 6 | Completed |
| getSession | 5 | 5 | Completed |
| extractTasks | 9 | 9 | Completed |
| deriveProjectPath | 7 | 7 | Completed |
| getMessages | 4 | 4 | Completed |
| Token Usage | 5 | 5 | Completed |
| **Total** | **70** | **70** | **100%** |

---

## Completion Criteria

- [x] All readSession tests passing
- [x] All readMessages tests passing
- [x] All findSessionFiles tests passing
- [x] All listSessions tests passing
- [x] All getSession tests passing
- [x] All extractTasks tests passing
- [x] All deriveProjectPath tests passing
- [x] All getMessages tests passing
- [x] All token usage tests passing
- [x] Type checking passes
- [x] Coverage >= 80%

---

## Progress Log

### Session: 2026-01-13 (Test Plan Created)
**Status**: Completed
**Notes**: Test plan created to track existing 70 tests in session-reader.test.ts. All tests already implemented and passing as part of session-reader-fix implementation.
