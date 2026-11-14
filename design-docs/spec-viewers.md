# Viewers and Monitoring Specification

This document describes the browser viewer (primary), TUI viewer (future), and real-time monitoring systems.

> **Priority Note**: Web UI (Browser Viewer) is the primary interactive interface. TUI implementation is deferred to future phases as a low-priority feature.

---

## 1. TUI Viewer (Future/Low Priority)

### 1.1 Technology

Library: **Ink** (React-like TUI framework)
- Familiar React patterns
- Good TypeScript support
- Modern component model

### 1.2 Session List View

```
+--------------------------------------------------+
| Claude Sessions - /path/to/project               |
+--------------------------------------------------+
| ID         | Date       | Messages | Cost        |
|------------|------------|----------|-------------|
| > a3bd4eea | 2026-01-02 | 12       | $0.05       |
|   b2cd5ff9 | 2026-01-01 | 45       | $0.23       |
|   c1de6gg0 | 2025-12-31 | 8        | $0.02       |
+--------------------------------------------------+
| [Enter] View  [q] Quit  [/] Search  [t] Tasks    |
+--------------------------------------------------+
```

### 1.3 Session Detail View

```
+--------------------------------------------------+
| Session: a3bd4eea-e189-4c18-9768-4f0179de16aa    |
| Model: claude-sonnet-4-5 | Cost: $0.05           |
+--------------------------------------------------+
| [User] 14:32:06                                  |
| Say just 'hello'                                 |
|--------------------------------------------------|
| [Assistant] 14:32:10                             |
| hello                                            |
|--------------------------------------------------|
| [User] 14:32:15                                  |
| Now explain TypeScript generics                  |
+--------------------------------------------------+
| [j/k] Navigate  [q] Back  [y] Copy  [o] Browser  |
+--------------------------------------------------+
```

### 1.4 Task List View

```
+--------------------------------------------------+
| Active Tasks                                      |
+--------------------------------------------------+
| Status | Task                          | Session |
|--------|-------------------------------|---------|
| [*]    | Running type check            | a3bd... |
| [ ]    | Fix authentication bug        | a3bd... |
| [x]    | Create user model             | b2cd... |
+--------------------------------------------------+
| [*] In Progress  [ ] Pending  [x] Completed      |
+--------------------------------------------------+
```

### 1.5 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j/k` or arrows | Navigate up/down |
| `Enter` | Select/view details |
| `q` / `Esc` | Back/quit |
| `/` | Search |
| `t` | Toggle tasks view |
| `o` | Open in browser |
| `y` | Copy selected item |
| `r` | Refresh |

> **Implementation Note**: TUI features described above are planned for future implementation. Focus initial development on the Browser Viewer below.

---

## 2. Browser Viewer (Primary UI)

### 2.1 Technology

Framework: **SvelteKit**
- Full-stack with SSR
- File-based routing
- Small bundle size
- Excellent developer experience

HTTP Server: **Elysia**
- Type-safe API
- Bun-optimized performance

### 2.2 CLI Usage

```bash
# Start browser viewer (default port 3000)
claude-code-agent server start

# Custom port
claude-code-agent server start --port 8080

# Don't auto-open browser
claude-code-agent server start --no-open
```

### 2.3 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_CODE_AGENT_PORT` | HTTP server port | 3000 |
| `CLAUDE_CODE_AGENT_HOST` | Bind host | 127.0.0.1 |

### 2.4 Features

- Session list with search/filter
- Message timeline with syntax highlighting
- Token usage visualization
- Cost tracking charts
- Export functionality (JSON, Markdown)
- Dark/light theme toggle

### 2.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/:id` | Get session detail |
| GET | `/api/sessions/:id/messages` | Get session messages |
| GET | `/api/tasks` | Get current tasks |
| GET | `/api/projects` | List available projects |

### 2.6 Static Assets Structure

```
static/
+-- index.html      # Single page app shell
+-- styles.css      # Styles
+-- app.js          # Client-side JavaScript
+-- components/
    +-- session-list.js
    +-- message-view.js
    +-- task-board.js
```

---

## 3. Real-time Monitoring

### 3.1 Transcript Polling Architecture

```
+-------------------+     +------------------+     +----------------+
|  File Watcher     | --> |  Event Parser    | --> |  State Manager |
|  (fs.watch)       |     |  (JSONL stream)  |     |  (Task Tree)   |
+-------------------+     +------------------+     +----------------+
                                                          |
                                                          v
                                                   +----------------+
                                                   |  Output/API    |
                                                   |  (TUI/JSON)    |
                                                   +----------------+
```

### 3.2 File Watching (fs.watch)

```typescript
class JsonlTailer {
  private buffer = '';
  private offset = 0;

  async *tail(filePath: string): AsyncGenerator<object> {
    const watcher = fs.watch(filePath);

    for await (const event of watcher) {
      if (event.eventType === 'change') {
        const content = await this.readNewContent(filePath);
        this.buffer += content;

        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              yield JSON.parse(line);
            } catch (e) {
              console.warn('Malformed JSON line:', line.substring(0, 50));
            }
          }
        }
      }
    }
  }
}
```

### 3.3 Edge Cases

- Buffer incomplete lines until newline received
- Handle JSON parse errors gracefully (skip malformed)
- Track file offset to read only new content
- Handle file truncation/rotation
- Retry on read errors (Claude Code may be writing)

### 3.4 State Manager

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

### 3.5 TUI Output (Future)

> **Note**: TUI output is planned for future implementation. Use Web UI for real-time monitoring.

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

### 3.6 JSON Stream Output

```json
{"event": "tool_start", "session": "37f666e8-...", "tool": "Task", "time": "..."}
{"event": "subagent_start", "session": "37f666e8-...", "agentId": "a341d20", "type": "claude-code-guide"}
{"event": "tool_end", "session": "37f666e8-...", "tool": "Task", "duration": 45.2}
```

---

## 4. WebSocket Real-time Updates

### 4.1 WebSocket Messages

```typescript
// Client -> Server
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe';
  sessionId: string;
}

// Server -> Client
interface ServerMessage {
  type: 'session_update' | 'new_message' | 'session_end';
  sessionId: string;
  payload: NewMessage | SessionUpdate | null;
}

interface NewMessage {
  uuid: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: string;
  content: ContentBlock[];
}
```

### 4.2 Implementation

```typescript
class SessionWebSocket {
  private subscriptions = new Map<WebSocket, Set<string>>();

  handleConnection(ws: WebSocket): void {
    ws.on('message', (data) => {
      const msg: ClientMessage = JSON.parse(data);
      this.handleClientMessage(ws, msg);
    });

    ws.on('close', () => {
      this.subscriptions.delete(ws);
    });
  }

  notifySessionUpdate(sessionId: string, update: SessionUpdate): void {
    for (const [ws, sessions] of this.subscriptions) {
      if (sessions.has(sessionId)) {
        ws.send(JSON.stringify({
          type: 'session_update',
          sessionId,
          payload: update,
        }));
      }
    }
  }
}
```

---

## 5. Search and Filtering

### 5.1 Search Scope

| Scope | Description |
|-------|-------------|
| Session Search | Search across session summaries |
| Message Search | Full-text search within messages |
| Tool Search | Filter by tool name |
| Date Search | Filter by date range |
| Bookmark Search | Search bookmarks (metadata + content) |

### 5.2 Query Syntax

```
# Simple text search
"authentication bug"

# Field-specific search
type:assistant
tool:Read
model:opus

# Date filters
date:today
date:2026-01-01..2026-01-03

# Combination
type:assistant tool:Edit date:today

# Bookmark-specific
bookmark:true              # Only bookmarked messages
bookmark:auth              # Messages with bookmark tagged "auth"
```

### 5.3 CLI Usage

```bash
# Search in sessions
claude-code-agent search "oauth token" --scope sessions

# Search in bookmarks
claude-code-agent search "oauth token" --scope bookmarks

# Search everywhere (default)
claude-code-agent search "oauth token" --scope all
```

---

## 6. Bookmarks

### 6.1 Bookmark Types

| Type | Target | Use Case |
|------|--------|----------|
| Session Bookmark | Entire session | "Important debugging session" |
| Message Bookmark | Specific message UUID | "This solution worked" |
| Range Bookmark | Message range (from-to) | "This conversation segment" |

### 6.2 Bookmark Metadata

```typescript
interface Bookmark {
  id: string;
  type: 'session' | 'message' | 'range';
  sessionId: string;
  messageId?: string;
  messageRange?: { fromMessageId: string; toMessageId: string };
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 CLI Commands

```bash
# Bookmark a session
claude-code-agent bookmark add --session <session-id> \
  --name "Important session" \
  --tags auth,debugging

# Bookmark a message
claude-code-agent bookmark add --session <session-id> --message <message-id> \
  --name "Working solution"

# Bookmark a message range
claude-code-agent bookmark add --session <session-id> \
  --from <message-id> --to <message-id> \
  --name "Auth discussion"

# List bookmarks
claude-code-agent bookmark list [--tag <tag>]

# Search bookmarks
claude-code-agent bookmark search "oauth" [--metadata-only]
```

### 6.4 SDK API

```typescript
const bookmark = await agent.bookmarks.add({
  type: 'message',
  sessionId: 'session-001',
  messageId: 'msg-uuid-12345',
  name: 'Working auth solution',
  tags: ['auth', 'solution'],
});

const { bookmark, content } = await agent.bookmarks.getWithContent('bm-001');

const results = await agent.bookmarks.search('oauth token');
```

---

## 7. Display Options

### 7.1 Thinking Content

- Hidden by default
- Show with `--show-thinking` flag
- Verbose and not always relevant

### 7.2 Session Summary

- Use existing transcript summary (from `summary` type message)
- Fallback to first user message if not present

### 7.3 Cost Display

- Format: USD with cents ($0.05)
- Token details available in detail view
