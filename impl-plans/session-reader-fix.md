# Session Reader Fix Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-session-reader-fix.md
**Created**: 2026-01-13
**Last Updated**: 2026-01-13
**Completed**: 2026-01-13

---

## Overview

Fix critical bugs in `SessionReader` that prevent proper reading of Claude Code session data.

### Scope

- Fix file discovery pattern to match actual Claude Code session files
- Fix message extraction to match actual JSONL structure
- Implement task extraction from TodoWrite tool calls
- Add token usage and metadata extraction

### Out of Scope

- Agent session support (agent-*.jsonl) - future enhancement
- Conversation tree reconstruction (parentUuid) - future enhancement

---

## Modules

### 1. File Discovery Fix

#### src/sdk/session-reader.ts - findSessionFiles method

**Status**: Not Started

```typescript
// UUID pattern for main session files
const UUID_SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

function isSessionFile(filename: string): boolean {
  return UUID_SESSION_PATTERN.test(filename);
}

// Updated findSessionFiles - no longer searches for "session.jsonl"
async findSessionFiles(projectPath: string): Promise<readonly string[]> {
  // Read directory entries
  // Filter by isSessionFile()
  // Return matching paths
}
```

**Checklist**:
- [ ] Add UUID_SESSION_PATTERN constant
- [ ] Add isSessionFile() helper function
- [ ] Update findSessionFiles() to use pattern matching
- [ ] Remove recursive search (sessions are flat in project dirs)

### 2. Message Extraction Fix

#### src/sdk/session-reader.ts - extractMessage method

**Status**: Not Started

```typescript
interface RawMessageEntry {
  type: "user" | "assistant";
  uuid: string;
  sessionId: string;
  timestamp: string;
  message: {
    role: "user" | "assistant";
    content: string | ContentBlock[];
    id?: string;
    model?: string;
    usage?: RawUsageStats;
  };
}

interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

private extractMessage(record: Record<string, unknown>): Message | null {
  // Check type is "user" or "assistant"
  // Extract message.role, message.content
  // Parse content blocks for tool calls/results
  // Return Message object
}
```

**Checklist**:
- [ ] Add RawMessageEntry interface
- [ ] Add ContentBlock interface
- [ ] Implement extractMessage() method
- [ ] Handle string content vs array content
- [ ] Extract tool calls from tool_use blocks
- [ ] Extract tool results from tool_result blocks

### 3. Task Extraction

#### src/sdk/session-reader.ts - extractTasks method

**Status**: Not Started

```typescript
private extractTasks(record: Record<string, unknown>): Task[] {
  // Find TodoWrite tool_use in message.content
  // Extract input.todos array
  // Map to Task[] format
  // Return empty array if no TodoWrite found
}
```

**Checklist**:
- [ ] Implement extractTasks() method
- [ ] Handle missing TodoWrite calls
- [ ] Validate task structure (content, status, activeForm)

### 4. Updated readSession

#### src/sdk/session-reader.ts - readSession method

**Status**: Not Started

```typescript
async readSession(path: string): Promise<Result<Session, AgentError>> {
  // Parse JSONL file
  // Filter for user/assistant entries
  // Extract messages using extractMessage()
  // Track latest tasks from TodoWrite
  // Derive session metadata
  // Return Session object
}
```

**Checklist**:
- [ ] Refactor readSession() to use new extraction methods
- [ ] Track first/last timestamps for createdAt/updatedAt
- [ ] Keep only latest tasks (from last TodoWrite)
- [ ] Derive projectPath from file path

### 5. Project Path Derivation

#### src/sdk/session-reader.ts - deriveProjectPath method

**Status**: Not Started

```typescript
private deriveProjectPath(filePath: string): string {
  // Extract encoded path from ~/.claude/projects/{encoded}/
  // Decode: replace dashes with slashes
  // Return decoded project path
}
```

**Checklist**:
- [ ] Implement deriveProjectPath() method
- [ ] Handle edge cases (missing projects segment)

### 6. Token Usage Extraction (Optional)

#### src/sdk/session-reader.ts - extractUsage method

**Status**: Not Started

```typescript
private extractUsage(record: Record<string, unknown>): TokenUsage | undefined {
  // Extract message.usage
  // Map to TokenUsage interface
  // Return undefined if not present
}

private aggregateUsage(messages: Message[]): TokenUsage {
  // Sum up usage across all assistant messages
  // Return aggregated totals
}
```

**Checklist**:
- [ ] Implement extractUsage() method
- [ ] Implement aggregateUsage() method
- [ ] Add tokenUsage to Session type (optional field)

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| File Discovery | `src/sdk/session-reader.ts` | Completed | Pass |
| Message Extraction | `src/sdk/session-reader.ts` | Completed | Pass |
| Task Extraction | `src/sdk/session-reader.ts` | Completed | Pass |
| readSession Refactor | `src/sdk/session-reader.ts` | Completed | Pass |
| Project Path Derivation | `src/sdk/session-reader.ts` | Completed | Pass |
| Token Usage | `src/sdk/session-reader.ts` | Completed | Pass |

---

## Tasks

### TASK-001: File Discovery Pattern Fix

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/session-reader.ts` (findSessionFiles, isSessionFile)
**Dependencies**: None

**Description**:
Fix the file discovery pattern to match UUID-named session files instead of searching for `session.jsonl`.

**Completion Criteria**:
- [x] UUID_SESSION_PATTERN constant added
- [x] isSessionFile() helper implemented
- [x] findSessionFiles() updated to use pattern matching
- [x] Recursive search removed (max one level deep for Claude Code structure)
- [x] Unit tests for pattern matching

### TASK-002: Message Extraction Fix

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/session-reader.ts` (extractMessage, RawMessageEntry, ContentBlock)
**Dependencies**: None

**Description**:
Fix message extraction to read from nested `message.role` and `message.content` fields.

**Completion Criteria**:
- [x] RawMessageEntry interface defined
- [x] ContentBlock interface defined
- [x] extractMessage() method implemented
- [x] Tool call extraction working (via extractContentBlocks)
- [x] Tool result extraction working (via extractContentBlocks)
- [x] Unit tests for message parsing

### TASK-003: Task Extraction Implementation

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/session-reader.ts` (extractTasks)
**Dependencies**: None

**Description**:
Implement task extraction from TodoWrite tool calls in assistant messages.

**Completion Criteria**:
- [x] extractTasks() method implemented
- [x] Handles multiple TodoWrite calls (keeps latest)
- [x] Handles missing TodoWrite calls (returns [])
- [x] Unit tests for task extraction

### TASK-004: readSession Refactor

**Status**: Completed
**Parallelizable**: No
**Deliverables**: `src/sdk/session-reader.ts` (readSession)
**Dependencies**: TASK-001, TASK-002, TASK-003

**Description**:
Refactor readSession() to use the new extraction methods and properly populate Session object.

**Completion Criteria**:
- [x] readSession() uses extractMessage()
- [x] readSession() tracks latest tasks
- [x] createdAt/updatedAt derived from timestamps
- [x] projectPath derived from file path (with cwd field + fallback)
- [x] Unit tests covering all functionality (65+ passing tests)

### TASK-005: Project Path Derivation

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/session-reader.ts` (deriveProjectPath)
**Dependencies**: None

**Description**:
Implement project path derivation from the encoded directory name.

**Completion Criteria**:
- [x] deriveProjectPath() implemented
- [x] Handles dash-encoded paths correctly
- [x] Unit tests for path decoding

### TASK-006: Token Usage Extraction

**Status**: Completed
**Parallelizable**: No
**Deliverables**: `src/sdk/session-reader.ts` (extractUsage, aggregateUsage), `src/types/session.ts` (TokenUsage update)
**Dependencies**: TASK-002

**Description**:
Add token usage extraction and aggregation from assistant message usage stats.

**Completion Criteria**:
- [x] extractUsage() implemented
- [x] aggregateUsage() implemented
- [x] Session.tokenUsage populated
- [x] Unit tests for usage extraction (5 comprehensive tests added)

---

## Dependencies

| Task | Depends On | Status |
|------|------------|--------|
| TASK-001 | None | Completed |
| TASK-002 | None | Completed |
| TASK-003 | None | Completed |
| TASK-004 | TASK-001, TASK-002, TASK-003 | Completed |
| TASK-005 | None | Completed |
| TASK-006 | TASK-002 | Completed |

---

## Completion Criteria

- [x] All file discovery tests passing
- [x] All message extraction tests passing
- [x] All task extraction tests passing
- [x] Token usage extraction and aggregation tests passing
- [x] Type checking passes (`bun run typecheck`)
- [x] All unit tests passing (70 tests in session-reader.test.ts)

---

## Progress Log

### Session: 2026-01-13 16:15 (Implementation - FINAL)
**Tasks Completed**: TASK-004, TASK-006
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- TASK-004 (readSession Refactor): Verified already complete from previous sessions
  - readSession() already uses extractMessage() for parsing (line 345)
  - Already tracks latest tasks from TodoWrite (lines 352-358)
  - Already derives createdAt/updatedAt from timestamps (lines 371-391)
  - Already uses cwd field with deriveProjectPath() fallback (lines 365-382)
  - All 65 unit tests passing
- TASK-006 (Token Usage Extraction): Implemented new functionality
  - Added extractUsage() method to extract usage from assistant message records
  - Added aggregateUsage() method to sum usage across all messages
  - Updated readSession() to track and aggregate token usage
  - Added TokenUsage import to session-reader.ts
  - Populated Session.tokenUsage field in readSession()
  - Added 5 comprehensive unit tests:
    - Extract and aggregate usage from multiple assistant messages
    - Handle missing usage data (returns undefined)
    - Handle zero cache tokens (undefined for optional fields)
    - Aggregate mixed cache tokens across messages
    - Include tokenUsage in SessionMetadata
  - All 70 unit tests passing
- Type checking passes (no errors in session-reader.ts)
- ALL TASKS COMPLETED - Implementation plan complete

### Session: 2026-01-13 15:30 (Implementation)
**Tasks Completed**: TASK-003, TASK-005
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- TASK-003 (extractTasks): Already implemented with comprehensive tests for TodoWrite tool call extraction
- TASK-005 (deriveProjectPath): Implemented new method to decode Claude Code dash-encoded project paths
  - Extracts project directory from ~/.claude/projects/{encoded}/ structure
  - Converts dash separators to slashes (e.g., -g-gits-project to /g/gits/project)
  - Handles edge cases: missing "projects/" segment, relative paths, deeply nested paths
- Updated readSession() to use deriveProjectPath() for populating session.projectPath
- Added 7 comprehensive unit tests for deriveProjectPath() covering all scenarios
- All tests passing (56 total unit tests)
- Type checking passes
- TASK-004 and TASK-006 now unblocked (all dependencies completed)

### Session: 2026-01-13 14:50 (Implementation)
**Tasks Completed**: TASK-002
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Implemented RawMessageEntry and ContentBlock interfaces to document nested message structure
- Implemented extractMessage() method to parse user/assistant entries from new Claude Code format
- Implemented extractContentBlocks() to handle text, tool_use, and tool_result blocks
- Updated readSession() to use extractMessage() instead of old flat format parsing
- Removed old parseToolCalls() and parseToolResults() methods (replaced by extractContentBlocks)
- Added comprehensive unit tests for new nested format (tool calls, tool results, mixed content)
- Updated legacy format tests to reflect correct behavior (metadata extracted, messages not parsed)
- All 49 unit tests passing
- Type checking passes

### Session: 2026-01-13 14:45 (Implementation)
**Tasks Completed**: TASK-001
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Implemented UUID_SESSION_PATTERN constant for matching UUID-named session files
- Added isSessionFile() helper supporting both UUID files and legacy session.jsonl format
- Updated findSessionFiles() to use pattern matching with one-level-deep search (Claude Code structure)
- Updated deriveSessionIdFromPath() to handle both UUID filenames and legacy directory-based IDs
- All 39 unit tests passing
- Type checking passes

### Session: 2026-01-13 (Planning)
**Tasks Completed**: None
**Tasks In Progress**: None
**Blockers**: None
**Notes**: Initial implementation plan created from design spec
