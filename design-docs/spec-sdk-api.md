# SDK and API Specification

This document describes the TypeScript SDK, HTTP daemon API, and CLI interface.

---

## 1. SDK Overview

### 1.1 Architecture

CLI is a thin wrapper around SDK:

```
src/
+-- sdk/                    # Core SDK (library)
|   +-- index.ts           # Public API exports
|   +-- agent.ts           # ClaudeCodeAgent class
|   +-- session.ts         # Session management
|   +-- group.ts           # SessionGroup management
+-- cli/                    # CLI (thin wrapper)
|   +-- main.ts            # Entry point
|   +-- commands/          # Uses SDK internally
+-- daemon/                 # HTTP daemon (uses SDK)
    +-- server.ts
```

### 1.2 Basic Usage

```typescript
import { ClaudeCodeAgent, Session, SessionGroup } from 'claude-code-agent';

const agent = new ClaudeCodeAgent({
  configDir: '~/.config/claude-code-agent',
  dataDir: '~/.local/claude-code-agent',
});

// Single session (without Session Group)
const session = await agent.runSession({
  projectPath: '/path/to/project',
  prompt: 'Implement feature X',
  template: 'typescript-strict',
  onProgress: (event) => console.log(event),
});

// With Session Group
const group = await agent.createGroup({
  name: 'My Task',
  maxConcurrent: 3,
});

await group.addSession({
  projectPath: '/path/to/project-a',
  prompt: 'Task A',
});

await group.run({
  onSessionComplete: (session) => { ... },
  onGroupComplete: (stats) => { ... },
});

// Query sessions
const sessions = await agent.query('SELECT * FROM sessions WHERE cost > 1.0');
```

---

## 2. Standalone Sessions

Sessions can run without Session Group:

```typescript
// Standalone session (no group)
const session = await agent.runSession({
  projectPath: '/path/to/project',
  prompt: 'Quick task',
});
// session.groupId === null

// Session with group
const session = await agent.runSession({
  projectPath: '/path/to/project',
  prompt: 'Task in group',
  groupId: 'my-group-id',
});

// Attach existing session to group
await group.attachSession(session.id);

// Detach from group
await group.detachSession(session.id);
```

---

## 2.5 Session Update Receiver

Polling-based API for receiving real-time updates from session transcript files.
Alternative to AsyncIterable patterns, offering a simpler pull-based interface.

### 2.5.1 Interface

```typescript
interface ISessionUpdateReceiver {
  readonly sessionId: string;
  readonly isClosed: boolean;
  receive(): Promise<SessionUpdate | null>;
  close(): void;
}

interface SessionUpdate {
  readonly sessionId: string;
  readonly newContent: string;                // Raw new JSONL content since last poll
  readonly events: readonly TranscriptEvent[];  // Parsed transcript events
  readonly timestamp: string;                 // ISO timestamp
}

interface ReceiverOptions {
  readonly pollingIntervalMs?: number;   // default: 300
  readonly includeExisting?: boolean;    // default: true
  readonly transcriptPath?: string;      // override auto-resolved path
}
```

### 2.5.2 Usage

```typescript
import { createSessionReceiver } from 'claude-code-agent/sdk';

const receiver = createSessionReceiver('session-uuid', {
  pollingIntervalMs: 300,
  includeExisting: true,
});

while (true) {
  const update = await receiver.receive();
  if (update === null) break; // receiver closed

  for (const event of update.events) {
    console.log(`${event.type}: ${JSON.stringify(event.content)}`);
  }
}

receiver.close();
```

Key behaviors:
- Lazy initialization: polling starts on first `receive()` call
- File offset tracking: only reads new content incrementally
- Handles missing files: waits for file to appear
- Handles file truncation: resets offset when detected
- Queue-based: multiple `receive()` calls are queued

### 2.5.3 Mock Receiver (for testing)

`MockSessionUpdateReceiver` provides the same `ISessionUpdateReceiver` interface
without filesystem dependency. Updates are injected programmatically.

```typescript
import {
  MockSessionUpdateReceiver,
  createMockSessionReceiver,
  type ISessionUpdateReceiver,
  type TranscriptEvent,
} from 'claude-code-agent/sdk';

// Create mock
const mock = createMockSessionReceiver('test-session');

// Push events programmatically
mock.pushEvents([
  { type: 'user', raw: { type: 'user', content: 'Hello' } } as TranscriptEvent,
]);

// Or push a full SessionUpdate
mock.pushUpdate({
  sessionId: 'test-session',
  newContent: '{"type":"user","content":"Hello"}\n',
  events: [{ type: 'user', raw: { type: 'user', content: 'Hello' } }],
  timestamp: new Date().toISOString(),
});

// Consume like the real receiver
const update = await mock.receive();

// Inspect mock state
mock.hasPendingReceive;  // true if receive() is waiting
mock.queueSize;          // number of queued updates

mock.close();
```

Both `SessionUpdateReceiver` and `MockSessionUpdateReceiver` implement
`ISessionUpdateReceiver`, enabling type-safe substitution in application code:

```typescript
function processUpdates(receiver: ISessionUpdateReceiver): Promise<void> {
  // Works with both real and mock receiver
  while (true) {
    const update = await receiver.receive();
    if (update === null) break;
    // process events
  }
}
```

---

## 3. Event System

### 3.1 Event Types

```typescript
type SessionEvent =
  // Lifecycle events
  | { type: 'session_created'; sessionId: string; groupId: string; projectPath: string }
  | { type: 'session_started'; sessionId: string; timestamp: string }
  | { type: 'session_completed'; sessionId: string; cost: number; tokens: TokenUsage }
  | { type: 'session_failed'; sessionId: string; error: string }
  | { type: 'session_paused'; sessionId: string; reason: string }
  | { type: 'session_resumed'; sessionId: string }

  // Progress events
  | { type: 'message_added'; sessionId: string; message: Message }
  | { type: 'tool_executed'; sessionId: string; toolName: string; duration: number }
  | { type: 'task_updated'; sessionId: string; task: Task; status: TaskStatus }
  | { type: 'subagent_spawned'; sessionId: string; agentId: string }

  // Group events
  | { type: 'group_created'; groupId: string; name: string }
  | { type: 'group_started'; groupId: string; sessionCount: number }
  | { type: 'group_completed'; groupId: string; stats: GroupStats }
  | { type: 'group_paused'; groupId: string }
  | { type: 'group_resumed'; groupId: string }

  // Budget events
  | { type: 'budget_warning'; sessionId: string; usage: number; limit: number }
  | { type: 'budget_exceeded'; sessionId: string; action: string }

  // Dependency events
  | { type: 'dependency_waiting'; sessionId: string; waitingFor: string[] }
  | { type: 'dependency_resolved'; sessionId: string; dependency: string }

  // Config events
  | { type: 'config_generated'; sessionId: string; configPath: string };
```

### 3.2 Event Emitter (SDK)

```typescript
import { AgentEventEmitter } from 'claude-code-agent';

const emitter = new AgentEventEmitter();
emitter.on('session_completed', (event) => { ... });
emitter.on('tool_executed', (event) => { ... });
```

### 3.3 JSON Stream (CLI)

```bash
# Watch session group with JSON output
claude-code-agent group watch my-group --format json

# Output:
{"type":"session_started","sessionId":"...","timestamp":"..."}
{"type":"tool_executed","sessionId":"...","toolName":"Read","duration":150}
{"type":"session_completed","sessionId":"...","cost":0.05}
```

---

## 4. Daemon Mode

### 4.1 Starting the Daemon

```bash
# Start daemon with auth
claude-code-agent daemon start \
  --host 0.0.0.0 \
  --port 8443 \
  --auth-token-file ~/.config/claude-code-agent/api-tokens.json \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem

# With browser viewer included
claude-code-agent daemon start --port 8443 --with-viewer

# Stop/status
claude-code-agent daemon stop
claude-code-agent daemon status
```

### 4.2 Server Modes

| Mode | Command | Auth | Use Case |
|------|---------|------|----------|
| Viewer only | `server start` | None | Local read-only viewing |
| Daemon API | `daemon start` | Required | Remote execution |
| Daemon + Viewer | `daemon start --with-viewer` | Required | Full remote access |

---

## 5. REST API Endpoints

### 5.1 Session Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create and run session |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/:id` | Get session details |
| GET | `/api/sessions/:id/stream` | SSE stream of session events |
| POST | `/api/sessions/:id/cancel` | Cancel running session |
| POST | `/api/sessions/:id/pause` | Pause session |
| POST | `/api/sessions/:id/resume` | Resume session |

### 5.2 Group Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups` | Create session group |
| GET | `/api/groups` | List groups |
| GET | `/api/groups/:id` | Get group details |
| POST | `/api/groups/:id/run` | Run session group |
| POST | `/api/groups/:id/pause` | Pause group |
| POST | `/api/groups/:id/resume` | Resume group |
| GET | `/api/groups/:id/stream` | SSE stream of group events |

### 5.3 Bookmark Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bookmarks` | Create bookmark |
| GET | `/api/bookmarks` | List bookmarks |
| GET | `/api/bookmarks/:id` | Get bookmark |
| GET | `/api/bookmarks/:id/content` | Get bookmark with message content |
| DELETE | `/api/bookmarks/:id` | Delete bookmark |
| GET | `/api/bookmarks/search?q=...` | Search bookmarks |

### 5.4 Request/Response Examples

```bash
# Create session
curl -X POST https://localhost:8443/api/sessions \
  -H "Authorization: Bearer cca_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/project", "prompt": "Implement feature"}'

# Response:
{"sessionId": "...", "status": "running"}

# Stream session events (SSE)
curl https://localhost:8443/api/sessions/abc123/stream \
  -H "Authorization: Bearer cca_abc123xyz"

# Events:
data: {"type":"session_started","sessionId":"abc123"}
data: {"type":"tool_executed","sessionId":"abc123","toolName":"Read"}
data: {"type":"session_completed","sessionId":"abc123","cost":0.05}
```

---

## 6. Authentication

### 6.1 API Key (Bearer Token)

```bash
# Request format
curl -X POST https://localhost:8443/api/sessions \
  -H "Authorization: Bearer cca_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path", "prompt": "Task"}'
```

### 6.2 Token Management

```bash
# Create token
claude-code-agent token create \
  --name "CI/CD Token" \
  --permissions session:create,session:read,group:create \
  --expires 365d
# Output: cca_abc123xyz...

# List tokens
claude-code-agent token list

# Revoke token
claude-code-agent token revoke cca_abc123xyz

# Rotate token
claude-code-agent token rotate cca_abc123xyz
```

### 6.3 Token Storage

```json
// ~/.config/claude-code-agent/api-tokens.json
{
  "tokens": [
    {
      "id": "cca_abc123xyz",
      "name": "CI/CD Token",
      "hash": "sha256:...",
      "permissions": ["session:create", "session:read", "group:create"],
      "createdAt": "2026-01-04T00:00:00Z",
      "expiresAt": "2027-01-04T00:00:00Z",
      "lastUsedAt": "2026-01-04T12:00:00Z"
    }
  ]
}
```

### 6.4 Permissions

| Permission | Description |
|------------|-------------|
| `session:create` | Create new sessions |
| `session:read` | Read session details |
| `session:cancel` | Cancel running sessions |
| `group:create` | Create session groups |
| `group:run` | Run session groups |
| `bookmark:*` | All bookmark operations |

---

## 7. CLI Command Reference

### 7.1 Command Structure (Noun-oriented)

```bash
claude-code-agent <entity> <action> [options]
```

### 7.2 Session Commands

```bash
# Run standalone session
claude-code-agent session run \
  --project /path/to/project \
  --prompt "Implement feature" \
  [--template <name>]

# Add session to group
claude-code-agent session add <group-id> \
  --project /path/to/project \
  --prompt "Task" \
  [--depends-on <session-id>]

# Show session details
claude-code-agent session show <session-id>

# Watch session progress
claude-code-agent session watch <session-id> [--format json]
```

### 7.3 Group Commands

```bash
# Create group
claude-code-agent group create <slug> \
  --name "Human Readable Name" \
  [--description "Description"]

# List groups
claude-code-agent group list [--status active|completed|archived]

# Run group
claude-code-agent group run <group-id> \
  [--concurrent 3] \
  [--respect-dependencies]

# Watch group progress
claude-code-agent group watch <group-id> [--format json]

# Pause/resume
claude-code-agent group pause <group-id>
claude-code-agent group resume <group-id>
```

### 7.4 Bookmark Commands

```bash
# Add bookmark
claude-code-agent bookmark add \
  --session <session-id> \
  [--message <message-id>] \
  --name "Bookmark name" \
  [--tags tag1,tag2]

# List bookmarks
claude-code-agent bookmark list [--tag <tag>]

# Search bookmarks
claude-code-agent bookmark search "query" [--metadata-only]

# Show bookmark
claude-code-agent bookmark show <bookmark-id>

# Delete bookmark
claude-code-agent bookmark delete <bookmark-id>
```

### 7.5 Server/Daemon Commands

```bash
# Start viewer server (read-only, local)
claude-code-agent server start [--port 3000]

# Start daemon (auth required, remote execution)
claude-code-agent daemon start \
  --port 8443 \
  --auth-token-file /path/to/tokens.json \
  [--with-viewer]

# Stop daemon
claude-code-agent daemon stop

# Daemon status
claude-code-agent daemon status
```

### 7.6 Token Commands

```bash
claude-code-agent token create --name "Name" --permissions "..." [--expires 365d]
claude-code-agent token list
claude-code-agent token revoke <token-id>
claude-code-agent token rotate <token-id>
```

---

## 8. Auth Token Override

### 8.1 Override Methods

| Method | Usage | Use Case |
|--------|-------|----------|
| `--auth-file` | `--auth-file /path/.claude.json` | Copy auth from another machine |
| `--auth-json` | `--auth-json '{"oauthAccount":...}'` | Inline override |
| Env var | `CLAUDE_CODE_AGENT_AUTH_FILE=/path` | CI/CD automation |
| (default) | - | Use Claude Code's default auth |

### 8.2 Example

```bash
# Use auth from another machine
claude-code-agent group create "my-task" \
  --auth-file /mnt/shared/.claude.json

# Via environment
CLAUDE_CODE_AGENT_AUTH_FILE=/path/to/.claude.json \
  claude-code-agent session run "prompt"
```

---

## 9. Output Formats

### 9.1 Session Discovery

```bash
# Current project only (default)
claude-code-agent session list

# All projects
claude-code-agent session list --all

# Specific project
claude-code-agent session list --project /path/to/project
```

### 9.2 Cost Display

- Format: USD with cents (e.g., $0.05)
- Token details available in detail view

### 9.3 Export Formats (MVP)

- JSON (programmatic access, backup)
- Markdown (human-readable)

---

## 10. Markdown-to-JSON Parsing

### 10.1 Overview

Parse markdown content from Claude Code message responses into structured JSON. Splits content by `##` headings and paragraphs into a JSON array of sections.

**Default**: Disabled (returns original markdown)
**Enable**: Via `--parse-markdown` flag or SDK option

### 10.2 Output Schema

```typescript
interface ParsedMarkdown {
  version: "1.0";
  rawContent: string;                  // Original markdown
  sections: MarkdownSection[];
  metadata: {
    sectionCount: number;
    headingLevels: number[];
    hasCodeBlocks: boolean;
    hasLists: boolean;
  };
}

interface MarkdownSection {
  index: number;
  heading: {
    level: number;                     // 1-6 for h1-h6
    text: string;                      // Heading text without ## markers
    lineNumber: number;
  } | null;                            // null for content before first heading
  content: ContentBlock[];
}

type ContentBlock =
  | { type: 'paragraph'; text: string; lineStart: number; lineEnd: number; }
  | { type: 'code'; code: string; language: string; lineStart: number; lineEnd: number; }
  | { type: 'list'; listType: 'ordered' | 'unordered'; items: ListItem[]; lineStart: number; }
  | { type: 'blockquote'; content: ContentBlock[]; lineStart: number; }
  | { type: 'table'; headers: string[]; rows: string[][]; lineStart: number; };

interface ListItem {
  text: string;
  depth: number;
  checked?: boolean;                   // For task lists
}
```

### 10.3 Example

**Input:**
```markdown
## Overview
This is the overview section.

## Implementation
Here is the implementation details.

- Item 1
- Item 2

## Conclusion
Final thoughts.
```

**Output:**
```json
{
  "version": "1.0",
  "rawContent": "## Overview\nThis is the overview...",
  "sections": [
    {
      "index": 0,
      "heading": { "level": 2, "text": "Overview", "lineNumber": 1 },
      "content": [
        { "type": "paragraph", "text": "This is the overview section.", "lineStart": 2, "lineEnd": 2 }
      ]
    },
    {
      "index": 1,
      "heading": { "level": 2, "text": "Implementation", "lineNumber": 4 },
      "content": [
        { "type": "paragraph", "text": "Here is the implementation details.", "lineStart": 5, "lineEnd": 5 },
        { "type": "list", "listType": "unordered", "items": [
          { "text": "Item 1", "depth": 0 },
          { "text": "Item 2", "depth": 0 }
        ], "lineStart": 7 }
      ]
    },
    {
      "index": 2,
      "heading": { "level": 2, "text": "Conclusion", "lineNumber": 10 },
      "content": [
        { "type": "paragraph", "text": "Final thoughts.", "lineStart": 11, "lineEnd": 11 }
      ]
    }
  ],
  "metadata": {
    "sectionCount": 3,
    "headingLevels": [2],
    "hasCodeBlocks": false,
    "hasLists": true
  }
}
```

### 10.4 Parsing Rules

| Element | Rule |
|---------|------|
| Section boundary | Heading of equal or higher level (fewer `#`) |
| Implicit section | Content before first heading |
| Code block | Fenced with triple backticks |
| List | Lines starting with `- `, `* `, `+ `, or `1. ` |
| Paragraph | Consecutive non-empty lines not matching other patterns |

### 10.5 SDK API

```typescript
import { parseMarkdown } from 'claude-code-agent';

// Parse markdown string
const parsed = parseMarkdown(markdownContent);

// With options
const parsed = parseMarkdown(markdownContent, {
  includeRawContent: true,             // default: true
  includeLineNumbers: true,            // default: true
});

// Session helper
const session = await agent.getSession(sessionId);
const messages = await session.getAssistantResponses({
  parseMarkdown: true,
});
```

### 10.6 CLI Usage

```bash
# Show session with parsed markdown
claude-code-agent session show <session-id> --parse-markdown

# Export with parsed markdown
claude-code-agent session export <session-id> --format json --parse-markdown

# Export messages only, parsed
claude-code-agent session messages <session-id> --format parsed-markdown
```

### 10.7 REST API

```bash
# Get messages with parsed markdown
GET /api/sessions/:id/messages?parseMarkdown=true

# Response includes parsed content
{
  "messages": [
    {
      "uuid": "...",
      "type": "assistant",
      "content": {
        "original": [...],
        "parsed": { "version": "1.0", "sections": [...] }
      }
    }
  ]
}
```
