# Q&A: Use Case Gaps and Design Clarifications

This document analyzes design gaps discovered when evaluating the current architecture against practical use cases.

**Status**: All decisions completed
**Created**: 2026-01-04
**Priority**: High (affects architecture)

---

## Use Cases Under Review

| UC | Description | Current Support |
|----|-------------|-----------------|
| **UC1** | Persist session info to external DB | Out of scope (external app responsibility) |
| **UC2** | Monitor sessions/tasks easily | Addressed (Q23: event system) |
| **UC3** | Workflow engine integration | Addressed (Q24-Q25: SDK + standalone) |
| **UC4** | Remote web interface execution | Addressed (Q26-Q27: daemon + auth) |

---

## UC1: Persist Session Info to External DB

### Current Design

- DuckDB bundled for querying JSONL files
- Clean Architecture decision (Q2): Repository interface allows DB swapping
- File-based storage in `~/.local/claude-code-agent/session-groups/`

### Clarification

**Not a gap** - external DB persistence is **out of scope** for claude-code-agent.

claude-code-agent's responsibility:
- Read-only query interface over JSONL files (via DuckDB)
- Event stream for external consumers

External app's responsibility:
- Consume events/API from claude-code-agent
- Persist to PostgreSQL/MySQL/etc as needed

### Q22: Session Query Interface

#### Question

How should claude-code-agent provide query access to session data?

#### Clarification: claude-code-agent's Role

**claude-code-agent does NOT persist session content**. It:
1. Generates config files for Claude Code (CLAUDE_CONFIG_DIR)
2. Executes Claude Code as subprocess
3. Watches/copies transcripts that **Claude Code writes**
4. Provides **read-only query interface** over JSONL files
5. Writes only its own metadata (meta.json for session groups)

**External persistence is out of scope** - handled by external apps consuming event stream/API.

```
┌─────────────────────┐
│  claude-code-agent  │ ──> generates config, executes Claude Code
└─────────────────────┘
          │
          v
┌─────────────────────┐
│    Claude Code      │ ──> writes transcripts (Claude Code's functionality)
└─────────────────────┘
          │
          v
┌─────────────────────┐
│  claude-code-agent  │ ──> watches, queries (READ-ONLY)
│  (DuckDB/Repository)│     emits events
└─────────────────────┘
          │
          v (events/API)
┌─────────────────────┐
│   External App      │ ──> persists to PostgreSQL (external responsibility)
└─────────────────────┘
```

#### Options

| Option | Pros | Cons |
|--------|------|------|
| **DuckDB only** | Simple, powerful SQL on JSONL | Single implementation |
| **Repository pattern (read-only)** | Swap query implementations | Implementation effort |

#### Repository Interface (Read-Only)

```typescript
interface SessionRepository {
  // Read-only queries
  getSession(id: string): Promise<Session | null>;
  findSessions(filter: SessionFilter): Promise<Session[]>;
  findByGroup(groupId: string): Promise<Session[]>;
  findByProject(projectPath: string): Promise<Session[]>;

  // SQL query (DuckDB)
  query(sql: string): Promise<QueryResult>;

  // Real-time watching
  watchSession(id: string): AsyncIterableIterator<SessionEvent>;
}

// Implementations
class DuckDBSessionRepository implements SessionRepository { }
class InMemorySessionRepository implements SessionRepository { }  // for testing
```

#### Decision

- [ ] DuckDB only
- [x] Repository pattern (read-only, for query abstraction)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Repository pattern provides query abstraction. DuckDB as default implementation for SQL queries on JSONL. **External persistence is out of scope** - external apps consume events/API and persist to their own databases.

---

## UC2: Monitor Sessions and Tasks

### Current Design

- fs.watch for real-time monitoring
- Progress Aggregator for concurrent sessions
- TUI and Browser viewers
- WebSocket for browser push

### Gaps Identified

| Gap | Description | Impact |
|-----|-------------|--------|
| **No programmatic event API** | Only viewers consume events | External apps cannot subscribe |
| **No structured event bus** | Events coupled to viewers | Hard to add new consumers |
| **Missing event types** | Informal event structure | Cannot build reliable integrations |

### Q23: Event System for External Consumers

#### Question

How should claude-code-agent expose session events for external consumption?

#### Options

| Option | Pros | Cons |
|--------|------|------|
| **Internal only** | Simple, no API surface | Cannot integrate with external apps |
| **Event emitter pattern** | Simple, Node.js standard | Requires code integration |
| **Message queue (Redis/NATS)** | Decoupled, scalable | External dependency |
| **Webhook callbacks** | Standard, HTTP-based | Requires callback server |
| **stdout JSON stream** | Simple, CLI-friendly | Requires process management |

#### Event Types

```typescript
type SessionEvent =
  | { type: 'session_created'; sessionId: string; groupId: string; projectPath: string }
  | { type: 'session_started'; sessionId: string; timestamp: string }
  | { type: 'message_added'; sessionId: string; message: Message }
  | { type: 'tool_executed'; sessionId: string; toolName: string; duration: number }
  | { type: 'task_updated'; sessionId: string; task: Task; status: TaskStatus }
  | { type: 'session_completed'; sessionId: string; cost: number; tokens: TokenUsage }
  | { type: 'session_failed'; sessionId: string; error: string }
  | { type: 'subagent_spawned'; sessionId: string; agentId: string };
```

#### Recommendation

Implement **stdout JSON stream** for CLI usage + **Event emitter pattern** for library usage:

```typescript
// CLI usage
claude-code-agent group watch my-group --format json
// Outputs: {"type":"session_started","sessionId":"..."}

// Library usage
import { AgentEventEmitter } from 'claude-code-agent';
const emitter = new AgentEventEmitter();
emitter.on('session_completed', (event) => { ... });
```

#### Decision

- [ ] Internal only (MVP, no external API)
- [ ] Event emitter pattern (library integration)
- [ ] stdout JSON stream (CLI integration)
- [x] Both event emitter + stdout stream
- [ ] Webhook callbacks
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Event emitter for SDK/library usage, stdout JSON stream for CLI piping. Both are essential for different integration patterns. Webhook callbacks can be added later as optional feature.

---

## UC3: Workflow Engine Integration

### Current Design

- CLI commands for group/session management
- Subprocess execution model
- Session Group with dependency graph

### Gaps Identified

| Gap | Description | Impact |
|-----|-------------|--------|
| **No TypeScript/JavaScript SDK** | CLI only | Cannot embed in other apps |
| **Session Group required** | Always requires group context | Overhead for single-session use |
| **No completion callbacks** | Must poll or watch | Workflow engines need callbacks |
| **Orchestration conflict** | Session Group dependencies | May conflict with external DAG |

### Q24: SDK and Library Mode

#### Question

Should claude-code-agent provide a TypeScript SDK for programmatic use?

#### Options

| Option | Pros | Cons |
|--------|------|------|
| **CLI only** | Simple, works anywhere | Requires subprocess spawn |
| **SDK with full API** | Rich integration | Larger API surface |
| **SDK with minimal API** | Easy adoption | May lack features |
| **Both CLI + SDK** | Flexibility | Two interfaces to maintain |

#### Proposed SDK Interface

```typescript
import { ClaudeCodeAgent, Session, SessionGroup } from 'claude-code-agent';

// Initialize
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

#### Decision

- [ ] CLI only
- [ ] SDK with full API
- [ ] SDK with minimal API (runSession, createGroup, query)
- [x] Both CLI + SDK
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: CLI for direct usage and shell scripting, SDK for embedding in TypeScript/JavaScript applications. SDK should expose same capabilities as CLI. CLI can be thin wrapper around SDK.

**Implementation Strategy**:
```
src/
├── sdk/                    # Core SDK (library)
│   ├── index.ts           # Public API exports
│   ├── agent.ts           # ClaudeCodeAgent class
│   ├── session.ts         # Session management
│   └── group.ts           # SessionGroup management
├── cli/                    # CLI (thin wrapper)
│   ├── main.ts            # Entry point
│   └── commands/          # Uses SDK internally
└── daemon/                 # HTTP daemon (uses SDK)
    └── server.ts
```

---

### Q25: Single Session Mode (Without Session Group)

#### Question

Should single sessions be allowed without creating a Session Group?

#### Background

Current design requires Session Group -> Session hierarchy. For workflow engine integration, this adds unnecessary overhead when the external workflow already manages task orchestration.

#### Options

| Option | Pros | Cons |
|--------|------|------|
| **Always require Group** | Consistent model | Overhead for simple cases |
| **Allow standalone sessions** | Simple for single tasks | Two code paths |
| **Auto-create ephemeral Group** | Transparent, consistent | Hidden complexity |

#### Recommendation

**Allow standalone sessions** with option to associate with Group later:

```typescript
// Standalone session
const session = await agent.runSession({
  projectPath: '/path',
  prompt: 'Quick task',
  // No groupId - runs standalone
});

// Later, can add to group for organization
await group.attachSession(session.id);
```

#### Decision

- [ ] Always require Session Group
- [x] Allow standalone sessions
- [ ] Auto-create ephemeral Group
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Standalone sessions are essential for workflow engine integration where orchestration is handled externally. Users can optionally attach standalone sessions to groups later for organization.

**API Design**:
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

**Storage**: Standalone sessions stored in `~/.local/claude-code-agent/standalone-sessions/`

---

## UC4: Remote Web Interface Execution

### Current Design

- Elysia HTTP server for browser mode
- Local execution only (Claude Code runs on same machine)
- CLAUDE_CONFIG_DIR is local filesystem path

### Gaps Identified

| Gap | Description | Impact |
|-----|-------------|--------|
| **No authentication** | Open HTTP server | Security risk for remote |
| **Local execution only** | Claude Code must run locally | Cannot trigger from remote |
| **No remote API** | HTTP API is read-only | Cannot create sessions remotely |
| **Filesystem dependency** | CLAUDE_CONFIG_DIR is local | Cannot run on remote machine |

### Q26: Remote Execution Architecture

#### Question

Should claude-code-agent support remote execution (trigger Claude Code from another machine)?

#### Architecture Options

| Option | Description | Complexity |
|--------|-------------|------------|
| **Local only** | Agent and Claude Code on same machine | Low |
| **Agent as daemon** | HTTP API to trigger local execution | Medium |
| **Agent + Worker nodes** | Distributed execution on multiple machines | High |
| **API Gateway pattern** | Central API, dispatch to worker agents | High |

#### Security Considerations

For remote access:
- Authentication (API keys, OAuth, mTLS)
- Authorization (which projects can be accessed)
- Rate limiting
- Audit logging
- Network isolation

#### Recommendation

For UC4, implement **Agent as daemon** with authenticated API:

```
+------------------+     HTTPS      +----------------------+
|  Web Interface   | <------------> |  claude-code-agent   |
|  (Remote App)    |                |  (Daemon Mode)       |
+------------------+                +----------------------+
                                            |
                                            v
                                    +------------------+
                                    |   Claude Code    |
                                    |   (Local)        |
                                    +------------------+
```

```bash
# Start agent in daemon mode with auth
claude-code-agent daemon start \
  --host 0.0.0.0 \
  --port 8443 \
  --auth-token-file /path/to/tokens.json \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem
```

#### API for Remote Execution

```typescript
// POST /api/sessions
{
  "projectPath": "/path/to/project",
  "prompt": "Implement feature",
  "template": "typescript-strict"
}
// Returns: { "sessionId": "...", "status": "running" }

// GET /api/sessions/:id/stream
// Returns: Server-Sent Events with session progress

// POST /api/sessions/:id/cancel
// Cancels running session
```

#### Decision

- [ ] Local only (no remote execution)
- [x] Agent as daemon (authenticated HTTP API)
- [ ] Agent + Worker nodes (distributed)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Daemon mode enables remote web interfaces to trigger Claude Code execution. "Agent + Worker nodes" is out of scope for initial design but architecture should not preclude future distributed execution.

**Daemon Commands**:
```bash
# Start daemon
claude-code-agent daemon start \
  --host 0.0.0.0 \
  --port 8443 \
  --auth-token-file ~/.config/claude-code-agent/api-tokens.json \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem

# Stop daemon
claude-code-agent daemon stop

# Status
claude-code-agent daemon status

# Generate API token
claude-code-agent token create --name "CI/CD" --permissions session:create,session:read
```

**REST API Endpoints**:
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/sessions | Create and run session |
| GET | /api/sessions | List sessions |
| GET | /api/sessions/:id | Get session details |
| GET | /api/sessions/:id/stream | SSE stream of session events |
| POST | /api/sessions/:id/cancel | Cancel running session |
| POST | /api/groups | Create session group |
| GET | /api/groups | List groups |
| POST | /api/groups/:id/run | Run session group |
| GET | /api/groups/:id/stream | SSE stream of group events |

---

### Q27: Authentication for Remote Access

#### Question

What authentication mechanism should be used for remote API access?

#### Options

| Option | Pros | Cons |
|--------|------|------|
| **API Key (Bearer token)** | Simple, stateless | Key management |
| **OAuth 2.0** | Standard, delegated | Complex setup |
| **mTLS (client certs)** | Strong, mutual auth | Certificate management |
| **Basic Auth + TLS** | Simple | Less secure |

#### Recommendation

**API Key (Bearer token)** for simplicity, with option for mTLS in high-security environments:

```json
// ~/.config/claude-code-agent/api-tokens.json
{
  "tokens": [
    {
      "id": "token-1",
      "hash": "sha256:...",
      "name": "CI/CD Token",
      "permissions": ["session:create", "session:read"],
      "createdAt": "2026-01-04T00:00:00Z",
      "expiresAt": "2027-01-04T00:00:00Z"
    }
  ]
}
```

#### Decision

- [x] API Key (Bearer token)
- [ ] OAuth 2.0
- [ ] mTLS (client certificates)
- [ ] Basic Auth + TLS
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: API Key is simple and sufficient for most use cases. mTLS can be added as optional enhancement for high-security environments. OAuth 2.0 is overkill for single-user/team scenarios.

**Token Management**:
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

**Token Storage**:
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

**Request Format**:
```bash
curl -X POST https://localhost:8443/api/sessions \
  -H "Authorization: Bearer cca_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path", "prompt": "Task"}'
```

---

## Summary: Design Gaps by Use Case

| Use Case | Gap | Solution | Priority |
|----------|-----|----------|----------|
| **UC1** | ~~No external DB~~ | Out of scope - external apps consume events (Q22) | N/A |
| **UC2** | No event API | Event emitter + stdout stream (Q23) | Medium |
| **UC3** | No SDK | TypeScript SDK (Q24) | High |
| **UC3** | Group required | Standalone sessions (Q25) | Medium |
| **UC4** | No remote exec | Daemon mode + API (Q26) | High |
| **UC4** | No auth | API token auth (Q27) | High |

---

## Architecture Impact

If all gaps are addressed, the architecture evolves to:

```
+------------------------------------------------------------------+
|                      claude-code-agent                            |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------------+                                              |
|  | SDK Layer       |  <-- New: TypeScript API for embedding       |
|  +-----------------+                                              |
|          |                                                        |
|  +-----------------+  +-----------------+  +-----------------+    |
|  | CLI             |  | Daemon (HTTP)   |  | Event Bus       |    |
|  +-----------------+  +-----------------+  +-----------------+    |
|          |                    |                    |              |
|          +--------------------+--------------------+              |
|                               |                                   |
|  +--------------------------------------------------------+      |
|  |                   Core Services                        |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  | | Session Manager| | Group Manager  | | Transcript    | |      |
|  | |                | |                | | Watcher       | |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  +--------------------------------------------------------+      |
|                               |                                   |
|  +--------------------------------------------------------+      |
|  |               Repository Layer (Clean Arch)            |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  | | DuckDB Adapter | | Postgres Adapt.| | InMemory      | |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  +--------------------------------------------------------+      |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Summary of Decisions

| Question | Topic | Decision | Status |
|----------|-------|----------|--------|
| Q22 | Session Query Interface | Repository pattern (read-only), external persistence out of scope | **Decided** |
| Q23 | Event System | Both event emitter + stdout stream | **Decided** |
| Q24 | SDK and Library Mode | Both CLI + SDK | **Decided** |
| Q25 | Single Session Mode | Allow standalone sessions | **Decided** |
| Q26 | Remote Execution | Agent as daemon (HTTP API) | **Decided** |
| Q27 | Authentication | API Key (Bearer token) | **Decided** |
| Q28 | Bookmark Feature | Session, message, and range bookmarks | **Decided** |

**All 7 decisions completed**: 2026-01-04

---

## Notes

### Use Cases Analyzed

1. **Session persistence to DB**: External apps consume events/API and persist to their own databases. **Out of scope** for claude-code-agent.
2. **Session/task monitoring**: Addressed via event emitter (SDK) and stdout JSON stream (CLI)
3. **Workflow engine integration**: Addressed via SDK + standalone session support
4. **Remote web execution**: Addressed via daemon mode with authenticated HTTP API

### claude-code-agent's Role (Clarified)

claude-code-agent is an **intermediary** between external apps and Claude Code:

```
External App  <-->  claude-code-agent  <-->  Claude Code
                         |
                         v
                    - Generates config (CLAUDE_CONFIG_DIR)
                    - Executes Claude Code subprocess
                    - Watches transcripts (Claude Code writes these)
                    - Emits events (external apps consume)
                    - Provides read-only query interface
                    - Writes only its own metadata
```

**claude-code-agent does NOT**:
- Persist session content to databases
- Modify ~/.claude directly
- Store auth tokens (only provides override capability)

---

## Directory Structure (Revised)

Separation of claude-code-agent metadata and Claude Code's working data:

```
~/.local/claude-code-agent/
│
├── metadata/                           # claude-code-agent's own data
│   ├── groups/                         # Session Group definitions
│   │   └── {group-id}.json
│   ├── sessions/                       # Session metadata
│   │   └── {session-id}.json
│   ├── bookmarks/                      # Bookmarks (Q28)
│   │   └── {bookmark-id}.json
│   └── index.json                      # quick lookup index
│
└── workspaces/                         # Claude Code's working directories
    └── {session-id}/                   # per-session isolation
        └── claude-config/              # CLAUDE_CONFIG_DIR points here
            ├── .claude.json            # auth (generated by agent)
            ├── CLAUDE.md               # instructions (generated by agent)
            └── projects/               # Claude Code writes here
                └── {project-hash}/
                    └── {id}.jsonl      # transcript (written by Claude Code)
```

| Data | Location | Managed By |
|------|----------|------------|
| Session Group definitions | `metadata/groups/` | claude-code-agent |
| Session metadata | `metadata/sessions/` | claude-code-agent |
| Bookmarks | `metadata/bookmarks/` | claude-code-agent |
| .claude.json, CLAUDE.md | `workspaces/{id}/claude-config/` | claude-code-agent (generates) |
| Transcripts (.jsonl) | `workspaces/{id}/.../projects/` | Claude Code (writes) |

---

## Q28: Bookmark Feature

### Question

How should bookmarks for sessions and messages be implemented?

### Use Cases

1. **Session Bookmark**: Mark important sessions for quick access
2. **Message Bookmark**: Mark specific chat messages within a session
3. **Easy Retrieval**: Query bookmarked content by tag, date, or text search

### Bookmark Types

| Type | Target | Use Case |
|------|--------|----------|
| **Session Bookmark** | Entire session | "Important debugging session" |
| **Message Bookmark** | Specific message UUID | "This solution worked" |
| **Range Bookmark** | Message range (from-to) | "This conversation segment" |

### Bookmark Metadata

```typescript
interface Bookmark {
  id: string;                    // bookmark ID
  type: 'session' | 'message' | 'range';

  // Target reference
  sessionId: string;
  messageId?: string;            // for message bookmark
  messageRange?: {               // for range bookmark
    fromMessageId: string;
    toMessageId: string;
  };

  // User metadata
  name: string;                  // user-defined name
  description?: string;
  tags: string[];                // for categorization

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Example Bookmark File (`metadata/bookmarks/{id}.json`)

```json
{
  "id": "bm-001",
  "type": "message",
  "sessionId": "session-001",
  "messageId": "msg-uuid-12345",
  "name": "Working auth solution",
  "description": "This approach fixed the OAuth token refresh issue",
  "tags": ["auth", "solution", "oauth"],
  "createdAt": "2026-01-04T15:30:00Z",
  "updatedAt": "2026-01-04T15:30:00Z"
}
```

### CLI Commands

```bash
# Bookmark a session
claude-code-agent bookmark add --session <session-id> \
  --name "Important session" \
  --tags auth,debugging

# Bookmark a specific message
claude-code-agent bookmark add --session <session-id> --message <message-id> \
  --name "Working solution"

# Bookmark a message range
claude-code-agent bookmark add --session <session-id> \
  --from <message-id> --to <message-id> \
  --name "Auth discussion"

# List bookmarks
claude-code-agent bookmark list [--tag <tag>] [--type session|message]

# Get bookmark content
claude-code-agent bookmark show <bookmark-id>

# Search bookmarks (metadata + content, default)
claude-code-agent bookmark search "oauth token"

# Search metadata only (faster)
claude-code-agent bookmark search "oauth" --metadata-only

# Search by tag
claude-code-agent bookmark list --tag auth

# Delete bookmark
claude-code-agent bookmark delete <bookmark-id>
```

### Search Behavior

| Mode | Target | Performance |
|------|--------|-------------|
| **Default** | Metadata (name, description, tags) + Message content | Slower (loads transcripts) |
| **--metadata-only** | Metadata only | Fast |
| **--tag** | Tags only | Fast |

```typescript
interface BookmarkSearchOptions {
  query: string;
  metadataOnly?: boolean;  // default: false (search both)
  tags?: string[];
  type?: 'session' | 'message' | 'range';
}

// Search flow:
// 1. Search bookmark metadata (name, description, tags)
// 2. If !metadataOnly, also search message content in transcripts
// 3. Merge results, deduplicate, return with relevance score
```

### SDK API

```typescript
// Add bookmark
const bookmark = await agent.bookmarks.add({
  type: 'message',
  sessionId: 'session-001',
  messageId: 'msg-uuid-12345',
  name: 'Working auth solution',
  tags: ['auth', 'solution'],
});

// List bookmarks
const bookmarks = await agent.bookmarks.list({
  tags: ['auth'],
  type: 'message',
});

// Get bookmark with content
const { bookmark, content } = await agent.bookmarks.getWithContent('bm-001');
// content includes the actual message(s) from transcript

// Search bookmarks (metadata + content, default)
const results = await agent.bookmarks.search('oauth token');

// Search metadata only (faster)
const results = await agent.bookmarks.search('oauth', { metadataOnly: true });

// Search with filters
const results = await agent.bookmarks.search('auth', {
  tags: ['solution'],
  type: 'message',
});
```

### REST API (Daemon Mode)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/bookmarks | Create bookmark |
| GET | /api/bookmarks | List bookmarks |
| GET | /api/bookmarks/:id | Get bookmark |
| GET | /api/bookmarks/:id/content | Get bookmark with message content |
| DELETE | /api/bookmarks/:id | Delete bookmark |
| GET | /api/bookmarks/search?q=... | Search bookmarks |

### Decision

- [x] Implement bookmark feature with session, message, and range types

**Decided**: 2026-01-04
**Rationale**: Bookmarks enable quick access to important sessions and messages. Essential for knowledge management and retrieval of past solutions.
