# Activity Status Specification

This document specifies the activity status feature for tracking real-time Claude Code session activity via hooks.

---

## 1. Overview

### 1.1 Purpose

Track whether a Claude Code session is actively working, waiting for user response, or idle. This enables external applications to understand session state without parsing transcripts continuously.

### 1.2 Design Approach

Use Claude Code's hook system to receive push notifications of state changes. The `claude-code-agent` CLI receives hook events via stdin and determines the appropriate activity status internally.

### 1.3 Non-Goals

- Full session lifecycle management (start/end tracking)
- Session persistence or history
- Replacing existing `SessionStatus` type

---

## 2. Activity Status Model

### 2.1 Status Values

```typescript
type ActivityStatus = "working" | "waiting_user_response" | "idle";
```

| Status | Description | Trigger |
|--------|-------------|---------|
| `working` | Claude is processing/responding | `UserPromptSubmit` hook |
| `waiting_user_response` | Waiting for user permission or choice | `PermissionRequest` hook or `AskUserQuestion` detected in transcript |
| `idle` | Finished responding, waiting for next prompt | `Stop` hook (when no AskUserQuestion) |

### 2.2 State Transitions

```
                    UserPromptSubmit
                          |
                          v
    +------------------[working]<------------------+
    |                     |                        |
    |                     v                        |
    |     +-------> PermissionRequest              |
    |     |               |                        |
    |     |               v                        |
    |     |    [waiting_user_response]             |
    |     |               |                        |
    |     |               | User answers           |
    |     |               v                        |
    |     |         UserPromptSubmit --------------+
    |     |
    |     +-------> Stop (with AskUserQuestion)
    |                     |
    |                     v
    |          [waiting_user_response]
    |                     |
    |                     | User selects choice
    |                     v
    |               UserPromptSubmit --------------+
    |                                              |
    +-------> Stop (no AskUserQuestion)            |
                          |                        |
                          v                        |
                       [idle] ---------------------+
                          |
                          | User types new prompt
                          v
                    UserPromptSubmit
```

---

## 3. Hook Integration

### 3.1 Required Hooks

Configure in `~/.claude/settings.json` or `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "claude-code-agent activity update"
      }]
    }],
    "PermissionRequest": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "claude-code-agent activity update"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "claude-code-agent activity update"
      }]
    }]
  }
}
```

### 3.2 Hook Input Schema

All hooks receive JSON via stdin with common fields:

```typescript
interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: "UserPromptSubmit" | "PermissionRequest" | "Stop";
}

// UserPromptSubmit additional fields
interface UserPromptSubmitInput extends HookInput {
  hook_event_name: "UserPromptSubmit";
  prompt: string;
}

// PermissionRequest additional fields
interface PermissionRequestInput extends HookInput {
  hook_event_name: "PermissionRequest";
  tool_name: string;
  tool_input: Record<string, unknown>;
}

// Stop has no additional fields
interface StopInput extends HookInput {
  hook_event_name: "Stop";
}
```

### 3.3 Status Determination Logic

```typescript
function determineStatus(input: HookInput): ActivityStatus {
  switch (input.hook_event_name) {
    case "UserPromptSubmit":
      return "working";

    case "PermissionRequest":
      return "waiting_user_response";

    case "Stop":
      // Check transcript for AskUserQuestion
      const hasAskUserQuestion = checkTranscriptForAskUserQuestion(
        input.transcript_path
      );
      return hasAskUserQuestion ? "waiting_user_response" : "idle";
  }
}
```

---

## 4. Transcript Analysis

### 4.1 AskUserQuestion Detection

When `Stop` hook fires, read the transcript to detect if Claude is waiting for user choice via `AskUserQuestion`.

```typescript
interface TranscriptAnalyzer {
  /**
   * Check if the last assistant turn used AskUserQuestion.
   * Reads only the last N lines for efficiency.
   */
  hasAskUserQuestion(transcriptPath: string): Promise<boolean>;
}
```

### 4.2 Detection Strategy

1. Read last 50 lines of transcript (configurable)
2. Parse JSONL entries
3. Find last assistant message
4. Check if it contains `AskUserQuestion` tool use

### 4.3 Reusing Existing Infrastructure

Leverage existing modules:

| Module | Usage |
|--------|-------|
| `src/polling/parser.ts` | JSONL parsing |
| `src/polling/event-parser.ts` | Event type detection |
| `src/sdk/session-reader.ts` | Transcript reading patterns |

---

## 5. Storage

### 5.1 Storage Location

```
~/.local/share/claude-code-agent/activity.json
```

Or respect `XDG_DATA_HOME`:
```
$XDG_DATA_HOME/claude-code-agent/activity.json
```

### 5.2 Storage Schema

```typescript
interface ActivityStore {
  version: "1.0";
  sessions: Record<string, ActivityEntry>;
}

interface ActivityEntry {
  status: ActivityStatus;
  projectPath: string;
  lastUpdated: string;  // ISO timestamp
}
```

### 5.3 Example

```json
{
  "version": "1.0",
  "sessions": {
    "abc123-def456": {
      "status": "working",
      "projectPath": "/home/user/projects/my-app",
      "lastUpdated": "2026-01-31T10:30:00.000Z"
    },
    "xyz789-uvw012": {
      "status": "idle",
      "projectPath": "/home/user/projects/other-app",
      "lastUpdated": "2026-01-31T10:25:00.000Z"
    }
  }
}
```

### 5.4 Cleanup Policy

- Entries older than 24 hours with status `idle` can be removed
- Cleanup runs on each `activity update` call
- Optional: `claude-code-agent activity cleanup` command

---

## 6. CLI Commands

### 6.1 Command Structure

```
claude-code-agent activity <action> [options]
```

### 6.2 Commands

#### `activity update`

Called by hooks. Reads hook input from stdin.

```bash
# Called by hook (stdin provides JSON)
claude-code-agent activity update

# Output: none (silent on success)
# Exit code: 0 on success, 1 on error
```

#### `activity status`

Query status of a specific session.

```bash
claude-code-agent activity status <session-id>

# Output (text):
# working

# Output (JSON with --json):
# {"sessionId":"abc123","status":"working","projectPath":"/path","lastUpdated":"..."}
```

#### `activity list`

List all tracked sessions with their status.

```bash
claude-code-agent activity list [--status <status>] [--json]

# Output (text):
# SESSION ID                            STATUS                PROJECT
# abc123-def456                         working               /home/user/my-app
# xyz789-uvw012                         idle                  /home/user/other

# With filter:
claude-code-agent activity list --status working
```

#### `activity cleanup`

Remove stale entries.

```bash
claude-code-agent activity cleanup [--older-than 24h]
```

### 6.3 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (invalid input, file error) |
| 2 | Session not found (for `status` command) |

---

## 7. SDK API

### 7.1 ActivityManager Class

```typescript
interface ActivityManager {
  /**
   * Update activity status from hook input.
   * Reads stdin for hook JSON.
   */
  updateFromHook(): Promise<void>;

  /**
   * Get activity status for a session.
   */
  getStatus(sessionId: string): Promise<ActivityEntry | null>;

  /**
   * List all tracked sessions.
   */
  list(filter?: { status?: ActivityStatus }): Promise<ActivityEntry[]>;

  /**
   * Check if session is currently working.
   */
  isWorking(sessionId: string): Promise<boolean>;

  /**
   * Check if session is waiting for user response.
   */
  isWaitingForUser(sessionId: string): Promise<boolean>;

  /**
   * Remove stale entries.
   */
  cleanup(olderThan?: Duration): Promise<number>;
}
```

### 7.2 Usage Example

```typescript
import { ActivityManager } from "claude-code-agent";

const activity = new ActivityManager();

// Query status
const entry = await activity.getStatus("abc123");
if (entry?.status === "working") {
  console.log("Session is currently working");
}

// List working sessions
const working = await activity.list({ status: "working" });
console.log(`${working.length} sessions currently working`);

// Convenience methods
if (await activity.isWaitingForUser("abc123")) {
  console.log("Waiting for user input");
}
```

---

## 8. REST API

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/activity` | List all activity entries |
| GET | `/api/activity/:sessionId` | Get activity for session |

### 8.2 Request/Response Examples

```bash
# List all
curl http://localhost:3000/api/activity

# Response:
{
  "entries": [
    {
      "sessionId": "abc123",
      "status": "working",
      "projectPath": "/path/to/project",
      "lastUpdated": "2026-01-31T10:30:00.000Z"
    }
  ]
}

# With filter
curl "http://localhost:3000/api/activity?status=working"

# Get specific session
curl http://localhost:3000/api/activity/abc123

# Response:
{
  "sessionId": "abc123",
  "status": "working",
  "projectPath": "/path/to/project",
  "lastUpdated": "2026-01-31T10:30:00.000Z"
}

# Not found response (404):
{
  "error": "not_found",
  "message": "Session not found"
}
```

---

## 9. Implementation Notes

### 9.1 File Locking

Use file locking when writing to `activity.json` to handle concurrent hook invocations:

```typescript
import { lockFile, unlockFile } from "proper-lockfile";

async function updateActivity(entry: ActivityEntry): Promise<void> {
  const release = await lockFile(ACTIVITY_FILE);
  try {
    const store = await readStore();
    store.sessions[entry.sessionId] = entry;
    await writeStore(store);
  } finally {
    await release();
  }
}
```

### 9.2 Transcript Reading Efficiency

For `Stop` hook, only read the last portion of transcript:

```typescript
async function checkTranscriptForAskUserQuestion(
  transcriptPath: string
): Promise<boolean> {
  // Read last 10KB of file (covers ~50-100 JSONL lines)
  const content = await readLastBytes(transcriptPath, 10 * 1024);
  const lines = content.split("\n").filter(Boolean);

  // Parse from end, find last assistant message
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = JSON.parse(lines[i]);
    if (isAssistantMessage(entry)) {
      return hasToolUse(entry, "AskUserQuestion");
    }
  }
  return false;
}
```

### 9.3 Error Handling

Hooks should fail silently to avoid disrupting Claude Code:

```typescript
async function main(): Promise<void> {
  try {
    await activityManager.updateFromHook();
    process.exit(0);
  } catch (error) {
    // Log error but don't fail
    console.error(`[claude-code-agent] Activity update error: ${error}`);
    process.exit(0); // Still exit 0 to not block Claude
  }
}
```

---

## 10. Configuration

### 10.1 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_CODE_AGENT_DATA_DIR` | Data directory | `~/.local/share/claude-code-agent` |
| `CLAUDE_CODE_AGENT_ACTIVITY_CLEANUP_HOURS` | Stale entry threshold | `24` |

### 10.2 Config File

Optional configuration in `~/.config/claude-code-agent/config.json`:

```json
{
  "activity": {
    "cleanupHours": 24,
    "transcriptReadBytes": 10240
  }
}
```

---

## 11. Hook Setup Command

### 11.1 Automatic Setup

Provide a command to configure hooks automatically:

```bash
claude-code-agent activity setup [--global] [--project]

# --global: Configure in ~/.claude/settings.json
# --project: Configure in .claude/settings.json (default)
```

### 11.2 Setup Logic

1. Read existing settings.json (or create if missing)
2. Merge activity hooks into existing hooks configuration
3. Write updated settings.json
4. Verify hooks are correctly configured

```typescript
async function setupHooks(options: { global?: boolean }): Promise<void> {
  const settingsPath = options.global
    ? "~/.claude/settings.json"
    : ".claude/settings.json";

  const settings = await readSettings(settingsPath);
  settings.hooks = mergeHooks(settings.hooks ?? {}, ACTIVITY_HOOKS);
  await writeSettings(settingsPath, settings);

  console.log(`Activity hooks configured in ${settingsPath}`);
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Status determination logic
- Transcript analysis (AskUserQuestion detection)
- Storage read/write with file locking
- Cleanup logic

### 12.2 Integration Tests

- Hook input parsing from stdin
- CLI command execution
- REST API endpoints

### 12.3 Mock Data

Provide mock transcript files with various scenarios:
- Simple assistant response (no tools) -> idle
- Response with AskUserQuestion -> waiting_user_response
- Response with other tools -> idle

---

## 13. Future Considerations

### 13.1 Event Streaming

Add SSE endpoint for real-time activity updates:

```
GET /api/activity/stream
```

### 13.2 Notification Hook

If Claude Code adds an `AskUserQuestion` hook in the future, integrate it for more accurate detection.

### 13.3 Activity History

Optional logging of activity transitions for debugging:

```json
{
  "sessionId": "abc123",
  "transitions": [
    { "from": null, "to": "working", "at": "..." },
    { "from": "working", "to": "idle", "at": "..." },
    { "from": "idle", "to": "working", "at": "..." }
  ]
}
```
