# Session Tasks CLI Specification

## Overview

Add CLI functionality to expose session tasks (TodoWrite subtasks) that are already extracted by SessionReader but not yet available in CLI output.

**Related Files:**
- `src/cli/commands/session.ts` - Session CLI commands
- `src/sdk/session-reader.ts` - Session reader with task extraction
- `src/types/task.ts` - Task type definitions
- `src/cli/output.ts` - Output formatting utilities

---

## Problem Statement

The `SessionReader` extracts tasks from TodoWrite tool calls and populates `Session.tasks`, but the CLI does not expose this data:

- `session show` command displays messages but not tasks
- No dedicated command exists for viewing tasks

**Current State:**
- Task extraction: Implemented (`session-reader.ts:228-294`)
- `Session.tasks` field: Available
- CLI output: **Not implemented**

---

## Specification

### 1. `session show --tasks` Option

Add `--tasks` flag to existing `session show` command to include tasks in output.

#### Usage

```bash
# Show session with tasks
claude-code-agent session show <session-id> --tasks

# Combined with format and parse-markdown
claude-code-agent -f json session show <session-id> --tasks --parse-markdown
```

#### Output (table format)

```
Session: 0dc4ee1f-2e78-462f-a400-16d14ab6a418
Project: /g/gits/tacogips/resume
Status: active
Created: 2026-01-07T04:49:16.208Z
Updated: 2026-01-07T05:02:16.550Z

Tasks (4/5 completed, 1 in progress):
+-----+-------------+--------------------------------------------------+
| #   | Status      | Content                                          |
+-----+-------------+--------------------------------------------------+
| 1   | completed   | Fix typo in prj_rust_onprem source file          |
| 2   | completed   | Fix typo in prj_rust_onprem_rev file             |
| 3   | in_progress | Verify all changes are correct                   |
+-----+-------------+--------------------------------------------------+

Messages (118):
... (existing message table)
```

#### Output (JSON format)

When `--tasks` is specified, add `taskProgress` field to the JSON output:

```json
{
  "id": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
  "projectPath": "/g/gits/tacogips/resume",
  "status": "active",
  "createdAt": "2026-01-07T04:49:16.208Z",
  "updatedAt": "2026-01-07T05:02:16.550Z",
  "tasks": [
    { "content": "Fix typo in prj_rust_onprem source file", "status": "completed", "activeForm": "Fixing typo..." },
    { "content": "Verify all changes are correct", "status": "in_progress", "activeForm": "Verifying..." }
  ],
  "taskProgress": { "total": 5, "completed": 4, "inProgress": 1, "pending": 0 },
  "messages": [...]
}
```

Note: `tasks` array is already included in Session object. The `--tasks` flag adds:
- Table format: Tasks section before messages
- JSON format: `taskProgress` summary field

---

### 2. `session tasks <session-id>` Subcommand

New dedicated command for viewing session tasks only (without messages).

#### Usage

```bash
# List tasks for session
claude-code-agent session tasks <session-id>

# JSON format
claude-code-agent -f json session tasks <session-id>
```

#### Output (table format)

```
Session: 0dc4ee1f-2e78-462f-a400-16d14ab6a418
Project: /g/gits/tacogips/resume

Progress: 4/5 completed (1 in progress)

+-----+-------------+--------------------------------------------------+--------------------------------------------+
| #   | Status      | Content                                          | Active Form                                |
+-----+-------------+--------------------------------------------------+--------------------------------------------+
| 1   | completed   | Fix typo in prj_rust_onprem source file          | Fixing typo in prj_rust_onprem source file |
| 2   | completed   | Fix typo in prj_rust_onprem_rev file             | Fixing typo in prj_rust_onprem_rev file    |
| 3   | in_progress | Verify all changes are correct                   | Verifying all changes are correct          |
+-----+-------------+--------------------------------------------------+--------------------------------------------+
```

#### Output (JSON format)

```json
{
  "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
  "projectPath": "/g/gits/tacogips/resume",
  "tasks": [
    { "content": "Fix typo in prj_rust_onprem source file", "status": "completed", "activeForm": "Fixing typo in prj_rust_onprem source file" },
    { "content": "Fix typo in prj_rust_onprem_rev file", "status": "completed", "activeForm": "Fixing typo in prj_rust_onprem_rev file" },
    { "content": "Verify all changes are correct", "status": "in_progress", "activeForm": "Verifying all changes are correct" }
  ],
  "progress": { "total": 3, "completed": 2, "inProgress": 1, "pending": 0 }
}
```

---

### 3. Empty Tasks Handling

When session has no tasks:

**Table format:**
```
Session: 0dc4ee1f-2e78-462f-a400-16d14ab6a418
Project: /g/gits/tacogips/resume

No tasks found.
```

**JSON format:**
```json
{
  "sessionId": "...",
  "projectPath": "...",
  "tasks": [],
  "progress": { "total": 0, "completed": 0, "inProgress": 0, "pending": 0 }
}
```

---

## Implementation Notes

### Existing Code to Reuse

1. **Task extraction**: `SessionReader.extractTasks()` already implemented
2. **Progress calculation**: `calculateTaskProgress()` in `src/types/task.ts`
3. **Output formatting**: `formatTable()`, `formatJson()` in `src/cli/output.ts`
4. **Command pattern**: Follow existing `session show` implementation

### Column Definitions for Table

```typescript
const taskColumns = [
  { key: "index", header: "#", width: 5, align: "right" as const },
  { key: "status", header: "Status", width: 12 },
  { key: "content", header: "Content", width: 50 },
  { key: "activeForm", header: "Active Form", width: 40 },
];
```

For `--tasks` option (compact):
```typescript
const compactTaskColumns = [
  { key: "index", header: "#", width: 5, align: "right" as const },
  { key: "status", header: "Status", width: 12 },
  { key: "content", header: "Content", width: 50 },
];
```
