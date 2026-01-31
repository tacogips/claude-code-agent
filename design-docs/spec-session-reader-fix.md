# Session Reader Fix Specification

## Overview

This document specifies the fixes required for `SessionReader` to correctly parse Claude Code session data. The current implementation has critical bugs preventing proper data retrieval.

**Related Files:**
- `src/sdk/session-reader.ts` - Main session reader implementation
- `src/types/session.ts` - Session type definitions
- `src/types/message.ts` - Message type definitions
- `src/types/task.ts` - Task type definitions

---

## Problem Statement

### Issue 1: File Discovery Pattern Mismatch

**Current Implementation** (`session-reader.ts:216`):
```typescript
if (entry === "session.jsonl") {
  sessionFiles.push(entryPath);
}
```

**Actual File Naming**:
- Main sessions: `{uuid}.jsonl` (e.g., `88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl`)
- Agent sessions: `agent-{hash}.jsonl` (e.g., `agent-a01b1a4.jsonl`)

**Impact**: Returns 0 sessions out of 2,042 available files.

### Issue 2: Field Extraction Mismatch

**Current Implementation** (`session-reader.ts:85-103`):
```typescript
if (
  typeof record["id"] === "string" &&
  typeof record["role"] === "string" &&
  typeof record["content"] === "string" &&
  typeof record["timestamp"] === "string"
)
```

**Actual JSONL Structure**:
```json
{
  "type": "user" | "assistant",
  "uuid": "entry-uuid",
  "sessionId": "session-uuid",
  "timestamp": "ISO-timestamp",
  "message": {
    "id": "msg_xxx",
    "role": "user" | "assistant",
    "content": "..." | [...],
    "model": "claude-xxx",
    "usage": { ... }
  }
}
```

**Impact**: No messages extracted even if files were found.

### Issue 3: Task Extraction Not Implemented

Tasks are stored in `TodoWrite` tool calls within assistant messages but never extracted.

**Current**: `Session.tasks` always returns `[]`

---

## Specification

### 1. File Discovery Fix

#### 1.1 UUID Pattern Matching

Replace exact filename match with pattern matching for session files.

**Pattern**: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/`

```typescript
const UUID_SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

function isSessionFile(filename: string): boolean {
  return UUID_SESSION_PATTERN.test(filename);
}
```

#### 1.2 Agent Session Support (Optional)

Agent sessions follow pattern: `agent-{7-char-hash}.jsonl`

```typescript
const AGENT_SESSION_PATTERN = /^agent-[a-f0-9]{7}\.jsonl$/;

function isAgentSessionFile(filename: string): boolean {
  return AGENT_SESSION_PATTERN.test(filename);
}
```

#### 1.3 Updated findSessionFiles

```typescript
async findSessionFiles(projectPath: string): Promise<readonly string[]> {
  const entries = await this.fileSystem.readDir(projectPath);
  const sessionFiles: string[] = [];

  for (const entry of entries) {
    if (isSessionFile(entry)) {
      sessionFiles.push(`${projectPath}/${entry}`);
    }
    // Optionally include agent sessions
    // if (isAgentSessionFile(entry)) { ... }
  }

  return sessionFiles;
}
```

### 2. Message Extraction Fix

#### 2.1 Entry Type Handling

Session JSONL contains multiple entry types:

| Type | Description | Message Data Location |
|------|-------------|----------------------|
| `user` | User messages | `record.message` |
| `assistant` | Assistant responses | `record.message` |
| `system` | System events | No message content |
| `summary` | Session summary | Summary text only |
| `file-history-snapshot` | File backups | No message content |
| `queue-operation` | Queue events | No message content |

#### 2.2 Message Field Mapping

| Target Field | Source Location |
|--------------|-----------------|
| `Message.id` | `record.uuid` |
| `Message.role` | `record.message.role` |
| `Message.content` | `record.message.content` (stringify if array) |
| `Message.timestamp` | `record.timestamp` |
| `Message.toolCalls` | Extract from `record.message.content[]` where `type === "tool_use"` |
| `Message.toolResults` | Extract from `record.message.content[]` where `type === "tool_result"` |

#### 2.3 Content Handling

`message.content` can be:
1. **String**: Direct text content
2. **Array**: Mixed content blocks

```typescript
interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  // For text:
  text?: string;
  // For tool_use:
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  // For tool_result:
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}
```

**Extraction Logic**:
```typescript
function extractMessageContent(content: string | ContentBlock[]): {
  textContent: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
} {
  if (typeof content === "string") {
    return { textContent: content, toolCalls: [], toolResults: [] };
  }

  const textParts: string[] = [];
  const toolCalls: ToolCall[] = [];
  const toolResults: ToolResult[] = [];

  for (const block of content) {
    switch (block.type) {
      case "text":
        textParts.push(block.text ?? "");
        break;
      case "tool_use":
        toolCalls.push({
          id: block.id!,
          name: block.name!,
          input: block.input ?? {},
        });
        break;
      case "tool_result":
        toolResults.push({
          id: block.tool_use_id!,
          output: typeof block.content === "string" ? block.content : JSON.stringify(block.content),
          isError: block.is_error ?? false,
        });
        break;
    }
  }

  return {
    textContent: textParts.join("\n"),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
  };
}
```

#### 2.4 Updated readSession

```typescript
async readSession(path: string): Promise<Result<Session, AgentError>> {
  const content = await this.fileSystem.readFile(path);
  const lines = parseJsonl<unknown>(content, path);

  const messages: Message[] = [];
  let sessionId = "";
  let projectPath = this.deriveProjectPath(path);
  let createdAt = "";
  let updatedAt = "";
  let tasks: Task[] = [];

  for (const line of lines) {
    const record = line as Record<string, unknown>;
    const type = record["type"] as string;

    // Extract session metadata
    if (!sessionId && typeof record["sessionId"] === "string") {
      sessionId = record["sessionId"];
    }

    // Track timestamps
    if (typeof record["timestamp"] === "string") {
      if (!createdAt) createdAt = record["timestamp"];
      updatedAt = record["timestamp"];
    }

    // Process message entries
    if (type === "user" || type === "assistant") {
      const message = this.extractMessage(record);
      if (message) {
        messages.push(message);

        // Extract tasks from TodoWrite calls
        if (type === "assistant") {
          const newTasks = this.extractTasks(record);
          if (newTasks.length > 0) {
            tasks = newTasks; // Replace with latest
          }
        }
      }
    }
  }

  return ok({
    id: sessionId || this.deriveSessionIdFromPath(path),
    projectPath,
    status: this.inferStatus(messages),
    createdAt,
    updatedAt,
    messages,
    tasks,
  });
}
```

### 3. Task Extraction

#### 3.1 TodoWrite Tool Call Structure

```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_xxx",
        "name": "TodoWrite",
        "input": {
          "todos": [
            {
              "content": "Task description",
              "status": "pending" | "in_progress" | "completed",
              "activeForm": "Working on task"
            }
          ]
        }
      }
    ]
  }
}
```

#### 3.2 Task Extraction Logic

```typescript
private extractTasks(record: Record<string, unknown>): Task[] {
  const message = record["message"] as Record<string, unknown> | undefined;
  if (!message) return [];

  const content = message["content"];
  if (!Array.isArray(content)) return [];

  for (const block of content) {
    if (block.type === "tool_use" && block.name === "TodoWrite") {
      const input = block.input as { todos?: Task[] } | undefined;
      if (input?.todos && Array.isArray(input.todos)) {
        return input.todos.map((todo) => ({
          content: todo.content,
          status: todo.status,
          activeForm: todo.activeForm,
        }));
      }
    }
  }

  return [];
}
```

#### 3.3 Task State: Latest Wins

TodoWrite replaces the entire task list with each call. The session reader should:
1. Scan all assistant messages for TodoWrite calls
2. Keep only the tasks from the **last** TodoWrite call
3. Return empty array if no TodoWrite calls found

### 4. Additional Metadata Extraction

#### 4.1 Token Usage

Extract from assistant messages:

```typescript
interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

private extractUsage(record: Record<string, unknown>): UsageStats | undefined {
  const message = record["message"] as Record<string, unknown> | undefined;
  const usage = message?.["usage"] as Record<string, unknown> | undefined;

  if (!usage) return undefined;

  return {
    inputTokens: (usage["input_tokens"] as number) ?? 0,
    outputTokens: (usage["output_tokens"] as number) ?? 0,
    cacheCreationTokens: (usage["cache_creation_input_tokens"] as number) ?? 0,
    cacheReadTokens: (usage["cache_read_input_tokens"] as number) ?? 0,
  };
}
```

#### 4.2 Project Path Derivation

```typescript
private deriveProjectPath(filePath: string): string {
  // Path: ~/.claude/projects/{encoded-project-path}/{session}.jsonl
  // Example: ~/.claude/projects/-g-gits-tacogips-claude-code-agent/xxx.jsonl

  const parts = filePath.split("/");
  const projectsIndex = parts.indexOf("projects");

  if (projectsIndex >= 0 && projectsIndex + 1 < parts.length) {
    const encodedPath = parts[projectsIndex + 1];
    // Decode: replace leading dash and internal dashes with slashes
    return "/" + encodedPath.replace(/^-/, "").replace(/-/g, "/");
  }

  return "";
}
```

#### 4.3 Status Inference

Session status is not explicitly stored. Infer from:

```typescript
private inferStatus(messages: Message[]): SessionStatus {
  // Heuristic: Check last message characteristics
  // - If session has recent activity (< 5 min), status = "active"
  // - If ended with error tool result, status = "failed"
  // - Otherwise, status = "completed"

  // For now, default to "active" as status tracking is external
  return "active";
}
```

---

## Type Updates

### Session Type Enhancement

```typescript
// src/types/session.ts
export interface Session {
  readonly id: string;
  readonly projectPath: string;
  readonly status: SessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: readonly Message[];
  readonly tasks: readonly Task[];
  // New optional fields
  readonly tokenUsage?: TokenUsage;
  readonly model?: string;
  readonly gitBranch?: string;
}

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
  readonly cacheWrite?: number;
}
```

---

## Implementation Tasks

### Phase 1: Critical Fixes

| Task | Description | Priority |
|------|-------------|----------|
| TASK-001 | Fix file discovery pattern | Critical |
| TASK-002 | Fix message extraction | Critical |
| TASK-003 | Implement task extraction | Critical |

### Phase 2: Enhancements

| Task | Description | Priority |
|------|-------------|----------|
| TASK-004 | Add token usage extraction | High |
| TASK-005 | Add project path derivation | High |
| TASK-006 | Add agent session support | Medium |
| TASK-007 | Add conversation tree support (parentUuid) | Low |

---

## Testing Strategy

### Unit Tests

1. **File pattern matching**
   - UUID pattern recognition
   - Agent session pattern recognition
   - Non-session file rejection

2. **Message extraction**
   - User message parsing
   - Assistant message parsing
   - Tool call extraction
   - Tool result extraction
   - Mixed content handling

3. **Task extraction**
   - Single TodoWrite call
   - Multiple TodoWrite calls (last wins)
   - No TodoWrite calls

### Integration Tests

1. **Real session files**
   - Parse actual `~/.claude/projects/` files
   - Verify message count matches entry count
   - Verify task state matches last TodoWrite

2. **CLI verification**
   - `session list` returns correct count
   - `session show` displays messages correctly

---

## Backwards Compatibility

The type interfaces (`Session`, `Message`, `Task`) remain unchanged. Only the internal parsing logic is updated. No breaking changes to SDK consumers.

---

## References

- Claude Code Internals: `design-docs/reference-claude-code-internals.md`
- Session Types: `src/types/session.ts`
- Message Types: `src/types/message.ts`
- Task Types: `src/types/task.ts`
