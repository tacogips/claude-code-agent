# Design: Claude Code Transcript Polling System

## Overview

This document describes the design for monitoring Claude Code task progress by polling transcript files stored in `~/.claude/projects/`.

## Goal

- Monitor Claude Code sessions externally without modifying Claude Code configuration
- Track main session and subagent task progress in real-time
- Provide task hierarchy visibility (main task -> subagents)

---

## Transcript File Structure

### File Location

```
~/.claude/projects/<project-id>/<session-file>.jsonl
```

**Project ID Format**: Directory path with `/` replaced by `-`
- Example: `/g/gits/tacogips/claude-code-agent` -> `-g-gits-tacogips-claude-code-agent`

### File Types

| Pattern | Description | Example |
|---------|-------------|---------|
| `<uuid>.jsonl` | Main session transcript | `37f666e8-117a-4572-8c55-0463c0af0ee4.jsonl` |
| `agent-<short-id>.jsonl` | Subagent transcript | `agent-a341d20.jsonl` |

---

## JSONL Message Types

Each line in the JSONL file is a JSON object with a `type` field.

### Common Fields

```typescript
interface BaseMessage {
  type: string;
  uuid: string;
  sessionId: string;
  timestamp: string;
  parentUuid?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
}
```

### Message Types

#### 1. `summary` (First line of session file)

```json
{
  "type": "summary",
  "summary": "Claude config path specification research",
  "leafUuid": "46e98524-4ec3-4d0e-9cbd-4d68a3152643"
}
```

#### 2. `user` (User input or tool result)

```json
{
  "type": "user",
  "uuid": "...",
  "sessionId": "...",
  "message": {
    "role": "user",
    "content": [
      {"type": "text", "text": "..."},
      // OR
      {"type": "tool_result", "tool_use_id": "...", "content": [...]}
    ]
  }
}
```

#### 3. `assistant` (Claude response)

```json
{
  "type": "assistant",
  "uuid": "...",
  "sessionId": "...",
  "message": {
    "role": "assistant",
    "content": [
      {"type": "text", "text": "..."},
      {"type": "thinking", "thinking": "..."},
      {"type": "tool_use", "id": "toolu_...", "name": "ToolName", "input": {...}}
    ]
  }
}
```

#### 4. `system` (System events)

```json
{
  "type": "system",
  "subtype": "stop_hook_summary",
  "sessionId": "...",
  "hookCount": 1,
  "hookInfos": [{"command": "..."}],
  "preventedContinuation": false
}
```

**Subtypes**:
- `stop_hook_summary` - Hook execution summary
- `init` - Session initialization
- Other system events

#### 5. `file-history-snapshot`

```json
{
  "type": "file-history-snapshot",
  "messageId": "...",
  "snapshot": {...},
  "isSnapshotUpdate": false
}
```

#### 6. `queue-operation`

Queue management for pending operations.

---

## Subagent Relationship

### Main Session -> Subagent Link

When the main session spawns a subagent via `Task` tool:

**Main session `assistant` message:**
```json
{
  "type": "assistant",
  "message": {
    "content": [{
      "type": "tool_use",
      "id": "toolu_01UBnrepzi3oDtDnS9Jt8YsY",
      "name": "Task",
      "input": {
        "description": "Research Claude Code task streaming",
        "subagent_type": "claude-code-guide",
        "prompt": "..."
      }
    }]
  }
}
```

**Main session `user` message (tool result):**
```json
{
  "type": "user",
  "message": {
    "content": [{
      "type": "tool_result",
      "tool_use_id": "toolu_01UBnrepzi3oDtDnS9Jt8YsY",
      "content": [
        {"type": "text", "text": "... result ..."},
        {"type": "text", "text": "agentId: a341d20 (for resuming...)"}
      ]
    }]
  }
}
```

### Subagent Transcript

Subagent files contain their own conversation with:
- Same `sessionId` as parent session
- Unique `agentId` field

```json
{
  "type": "assistant",
  "uuid": "...",
  "sessionId": "37f666e8-117a-4572-8c55-0463c0af0ee4",
  "agentId": "a341d20",
  "message": {...}
}
```

---

## Polling Architecture

### Components

```
+-------------------+     +------------------+     +----------------+
|  File Watcher     | --> |  Event Parser    | --> |  State Manager |
|  (inotify/poll)   |     |  (JSONL stream)  |     |  (Task Tree)   |
+-------------------+     +------------------+     +----------------+
                                                          |
                                                          v
                                                   +----------------+
                                                   |  Output/API    |
                                                   |  (TUI/JSON)    |
                                                   +----------------+
```

### 1. File Watcher

**Option A: inotify (Linux)**
```typescript
// Watch for file modifications
import { watch } from "fs";

watch(projectDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith(".jsonl")) {
    // Process new lines
  }
});
```

**Option B: Polling**
```typescript
// Poll file size and read new content
interface FileState {
  path: string;
  size: number;
  lastLine: number;
}
```

### 2. Event Parser

Parse JSONL lines and emit structured events:

```typescript
interface TranscriptEvent {
  eventType: "user_input" | "assistant_response" | "tool_call" | "tool_result" | "subagent_start" | "subagent_end" | "system";
  sessionId: string;
  agentId?: string;
  timestamp: string;
  data: Record<string, unknown>;
}
```

### 3. State Manager

Maintain task hierarchy:

```typescript
interface TaskState {
  sessionId: string;
  summary: string;
  status: "running" | "completed" | "error";
  startTime: string;
  lastUpdate: string;
  currentTool?: string;
  subagents: Map<string, SubagentState>;
}

interface SubagentState {
  agentId: string;
  type: string;
  description: string;
  status: "running" | "completed";
  toolCalls: ToolCall[];
}
```

---

## Key Data Points to Extract

### From Main Session

| Data | Source | Purpose |
|------|--------|---------|
| Session ID | `summary` or first message | Unique identifier |
| Session summary | `summary.summary` | Display name |
| Current tool | `assistant.message.content[].name` | Progress indicator |
| Tool results | `user.message.content[].tool_result` | Completion status |
| Subagent spawn | `tool_use` where `name == "Task"` | Hierarchy tracking |
| Subagent ID | `tool_result` content containing `agentId:` | Link to subagent file |

### From Subagent Session

| Data | Source | Purpose |
|------|--------|---------|
| Agent ID | filename or `agentId` field | Identification |
| Parent session | `sessionId` field | Hierarchy link |
| Agent type | Task tool input `subagent_type` | Classification |
| Progress | Tool calls in `assistant` messages | Progress tracking |

---

## Implementation Considerations

### 1. File Locking

Claude Code may be actively writing to files. Use:
- Read-only access
- Handle partial JSON lines (incomplete writes)
- Retry on read errors

### 2. Performance

- Only parse new lines (track file offset)
- Debounce file change events
- Limit memory usage for large transcripts

### 3. Session Discovery

```typescript
// Find active sessions
function findActiveSessions(projectDir: string): string[] {
  // List all .jsonl files
  // Filter by modification time (e.g., last 24 hours)
  // Exclude agent-* files for main session list
  return sessions;
}

// Find subagents for a session
function findSubagents(projectDir: string, sessionId: string): string[] {
  // Parse main session to find Task tool calls
  // Extract agentIds from tool results
  // Match to agent-*.jsonl files
  return agentIds;
}
```

### 4. Real-time Updates

For near-real-time monitoring:

```typescript
// Tail-like behavior
async function* tailJsonl(filePath: string): AsyncGenerator<object> {
  let offset = 0;
  while (true) {
    const newContent = await readFromOffset(filePath, offset);
    for (const line of newContent.split("\n")) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
    offset += newContent.length;
    await sleep(100); // Poll interval
  }
}
```

---

## Output Formats

### 1. TUI Display

```
Session: Claude config path specification research
Status: Running | 2m 15s

Current: Searching code in repository...
  [Tool] mcp__gitcodes-mcp__grep_repository

Subagents:
  [a341d20] claude-code-guide - Completed
    - WebFetch x3
    - Glob x2

  [a30d5d7] Explore - Running
    - Grep x1
```

### 2. JSON Stream

```json
{"event": "tool_start", "session": "37f666e8-...", "tool": "Task", "time": "..."}
{"event": "subagent_start", "session": "37f666e8-...", "agentId": "a341d20", "type": "claude-code-guide"}
{"event": "tool_end", "session": "37f666e8-...", "tool": "Task", "duration": 45.2}
```

---

## File System Layout Reference

```
~/.claude/
  projects/
    -g-gits-tacogips-claude-code-agent/
      37f666e8-117a-4572-8c55-0463c0af0ee4.jsonl  # Main session
      agent-a341d20.jsonl                          # Subagent 1
      agent-a30d5d7.jsonl                          # Subagent 2
      ...
  history.jsonl                                    # Global history
  session-env/                                     # Session environment snapshots
  todos/                                           # Todo state files
```

---

## Next Steps

1. Implement file watcher with JSONL streaming parser
2. Build state manager for task hierarchy
3. Create TUI for real-time display
4. Add JSON streaming output for integration

---

## References

- Claude Code CHANGELOG: Hook events, session management
- JSONL format: One JSON object per line
- inotify: Linux file system events
