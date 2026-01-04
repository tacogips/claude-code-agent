# Design Draft: Additional Components Requiring Design

This document identifies design gaps and provides draft designs for components not yet fully specified.

---

## 1. Error Handling Strategy

### Current Gap

No comprehensive error handling strategy documented across components.

### Proposed Design

#### Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| File System | File not found, permission denied, file locked | Graceful fallback, retry with backoff |
| Parse | Malformed JSON, incomplete line | Skip line, log warning |
| Network (browser mode) | Port in use, bind failure | Try next port, inform user |
| User Input | Invalid session ID, project not found | Clear error message |

#### Error Types

```typescript
// src/errors.ts

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export enum ErrorCode {
  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_LOCKED = 'FILE_LOCKED',

  // Parse errors
  INVALID_JSON = 'INVALID_JSON',
  INCOMPLETE_LINE = 'INCOMPLETE_LINE',
  UNKNOWN_MESSAGE_TYPE = 'UNKNOWN_MESSAGE_TYPE',

  // Network errors
  PORT_IN_USE = 'PORT_IN_USE',
  BIND_FAILED = 'BIND_FAILED',

  // User input errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
}
```

#### Recovery Strategies

```typescript
interface RecoveryStrategy {
  maxRetries: number;
  backoffMs: number;
  onFailure: 'skip' | 'throw' | 'fallback';
}

const defaultStrategies: Record<ErrorCode, RecoveryStrategy> = {
  [ErrorCode.FILE_LOCKED]: { maxRetries: 3, backoffMs: 100, onFailure: 'skip' },
  [ErrorCode.INVALID_JSON]: { maxRetries: 0, backoffMs: 0, onFailure: 'skip' },
  [ErrorCode.PORT_IN_USE]: { maxRetries: 5, backoffMs: 0, onFailure: 'throw' },
  // ...
};
```

---

## 2. Configuration System

### Current Gap

No unified configuration system for user preferences and defaults.

### Proposed Design

#### Configuration Sources (Priority Order)

1. CLI arguments (highest priority)
2. Environment variables
3. Project config file (`.claude-code-agent.json`)
4. User config file (`~/.config/claude-code-agent/config.json`)
5. Default values

#### Configuration Schema

```typescript
// src/config/schema.ts

interface PeeperConfig {
  // Server settings
  server: {
    port: number;           // default: 3000
    host: string;           // default: '127.0.0.1'
    autoOpen: boolean;      // default: true
  };

  // Display settings
  display: {
    mode: 'tui' | 'browser';  // default: 'tui'
    theme: 'light' | 'dark';  // default: 'dark'
    dateFormat: string;       // default: 'YYYY-MM-DD HH:mm'
    showThinking: boolean;    // default: false
    showToolCalls: boolean;   // default: true
  };

  // Session settings
  session: {
    defaultProject: string | null;  // default: null (current directory)
    maxSessionsDisplay: number;     // default: 50
    pollIntervalMs: number;         // default: 100
  };

  // Query settings
  query: {
    backend: 'native' | 'jq' | 'duckdb';  // default: 'native'
    cacheResults: boolean;                 // default: true
  };
}
```

#### Configuration File Example

```json
{
  "server": {
    "port": 8080,
    "host": "127.0.0.1"
  },
  "display": {
    "theme": "dark",
    "showThinking": true
  }
}
```

#### Environment Variables

| Variable | Config Path | Example |
|----------|-------------|---------|
| `CLAUDE_CODE_AGENT_PORT` | `server.port` | `8080` |
| `CLAUDE_CODE_AGENT_HOST` | `server.host` | `0.0.0.0` |
| `CLAUDE_CODE_AGENT_MODE` | `display.mode` | `browser` |
| `CLAUDE_CODE_AGENT_THEME` | `display.theme` | `light` |

---

## 3. Plugin/Extension System

### Current Gap

No extensibility mechanism documented.

### Proposed Design (Future)

#### Extension Points

| Extension Point | Purpose |
|-----------------|---------|
| Message Renderers | Custom rendering for specific content types |
| Exporters | Additional export formats |
| Data Sources | Alternative data sources (not just files) |
| Analyzers | Custom analysis/aggregation logic |

#### Plugin Interface (Draft)

```typescript
// src/plugins/types.ts

interface Plugin {
  name: string;
  version: string;

  // Lifecycle
  init?(context: PluginContext): Promise<void>;
  destroy?(): Promise<void>;

  // Extensions
  messageRenderers?: MessageRenderer[];
  exporters?: Exporter[];
}

interface MessageRenderer {
  name: string;
  contentTypes: string[];  // e.g., ['tool_use', 'thinking']
  render(content: ContentBlock, format: 'text' | 'html'): string;
}

interface Exporter {
  name: string;
  extension: string;  // e.g., 'md', 'pdf'
  export(session: Session): Promise<Buffer>;
}
```

**Note**: Plugin system is a future enhancement, not MVP.

---

## 4. Caching Strategy

### Current Gap

No caching strategy for parsed session data.

### Proposed Design

#### Cache Levels

| Level | Scope | Purpose |
|-------|-------|---------|
| File Metadata | Per session file | Store file size, mtime, line count |
| Parsed Messages | Per session | Avoid re-parsing unchanged files |
| Computed Stats | Per project | Session counts, total costs |

#### Cache Implementation

```typescript
// src/cache/session-cache.ts

interface CacheEntry<T> {
  data: T;
  fileSize: number;
  mtime: number;
  createdAt: number;
}

class SessionCache {
  private cache = new Map<string, CacheEntry<Session>>();
  private readonly maxAge = 60_000; // 1 minute

  async get(filePath: string): Promise<Session | null> {
    const entry = this.cache.get(filePath);
    if (!entry) return null;

    const stat = await Bun.file(filePath).stat();

    // Invalidate if file changed
    if (stat.size !== entry.fileSize || stat.mtime !== entry.mtime) {
      this.cache.delete(filePath);
      return null;
    }

    // Invalidate if too old (for live sessions)
    if (Date.now() - entry.createdAt > this.maxAge) {
      this.cache.delete(filePath);
      return null;
    }

    return entry.data;
  }

  set(filePath: string, session: Session, stat: Stats): void {
    this.cache.set(filePath, {
      data: session,
      fileSize: stat.size,
      mtime: stat.mtime,
      createdAt: Date.now(),
    });
  }
}
```

---

## 5. Logging and Observability

### Current Gap

No logging strategy documented.

### Proposed Design

#### Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Development details, full message dumps |
| `info` | Normal operations (server start, session load) |
| `warn` | Recoverable issues (skipped lines, retry) |
| `error` | Failures requiring attention |

#### Logger Interface

```typescript
// src/logger.ts

interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

const logger = createLogger({
  level: process.env.CLAUDE_CODE_AGENT_LOG_LEVEL || 'info',
  format: process.env.CLAUDE_CODE_AGENT_LOG_FORMAT || 'text', // or 'json'
});
```

#### Log Output

- TUI mode: Logs to stderr (avoid interfering with TUI)
- Browser mode: Logs to stdout with timestamps
- Debug file: Optional `--log-file` for persistent logging

---

## 6. Testing Strategy

### Current Gap

Test approach not documented beyond Vitest setup.

### Proposed Design

#### Test Categories

| Category | Location | Coverage |
|----------|----------|----------|
| Unit | `src/**/*.test.ts` | Pure functions, parsers |
| Integration | `tests/integration/` | File reading, API endpoints |
| E2E | `tests/e2e/` | Full CLI workflows |
| Fixtures | `tests/fixtures/` | Sample JSONL files |

#### Test Fixtures

```
tests/fixtures/
  sessions/
    simple-session.jsonl      # Basic user/assistant exchange
    with-thinking.jsonl       # Includes thinking blocks
    with-tools.jsonl          # Tool calls and results
    with-agents.jsonl         # Session with subagents
    incomplete-write.jsonl    # Simulates partial write
  agents/
    agent-sample.jsonl        # Standalone agent file
```

#### Key Test Cases

```typescript
// src/viewer/session-reader.test.ts

describe('SessionReader', () => {
  describe('parseSession', () => {
    it('parses simple user/assistant exchange');
    it('extracts thinking content when present');
    it('handles tool_use and tool_result pairs');
    it('skips malformed JSON lines');
    it('handles incomplete last line');
    it('calculates correct token totals');
    it('extracts session metadata');
  });

  describe('listSessions', () => {
    it('lists only session files, not agent files');
    it('sorts by modification time');
    it('handles empty project directory');
  });

  describe('getAgentsForSession', () => {
    it('finds all agents with matching sessionId');
    it('returns empty array if no agents');
    it('extracts agentId and slug from each agent');
  });
});
```

---

## 7. WebSocket Real-time Updates

### Current Gap

No design for pushing live updates to browser.

### Proposed Design

#### WebSocket Messages

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

#### Implementation

```typescript
// src/viewer/browser/websocket.ts

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

## 8. Search and Filtering

### Current Gap

Search functionality mentioned but not designed.

### Proposed Design

#### Search Scope

| Scope | Description |
|-------|-------------|
| Session Search | Search across session summaries |
| Message Search | Full-text search within messages |
| Tool Search | Filter by tool name |
| Date Search | Filter by date range |

#### Query Syntax

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
```

#### Implementation

```typescript
// src/search/query-parser.ts

interface SearchQuery {
  text?: string;
  filters: {
    type?: 'user' | 'assistant' | 'system';
    tool?: string;
    model?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
}

function parseQuery(input: string): SearchQuery {
  // Parse query string into structured query
}

function matchMessage(message: Message, query: SearchQuery): boolean {
  // Check if message matches query
}
```

---

## 9. Performance Optimization

### Current Gap

Performance considerations scattered, not consolidated.

### Proposed Design

#### Optimization Strategies

| Strategy | Implementation |
|----------|----------------|
| Lazy loading | Load message content on demand |
| Streaming parse | Use async generators for large files |
| Incremental updates | Track file offset, only parse new lines |
| Pagination | Limit results per API call |
| Index files | Optional index for fast search |

#### Memory Management

```typescript
// For large sessions, stream rather than load all
async function* streamMessages(
  filePath: string
): AsyncGenerator<Message> {
  const file = Bun.file(filePath);
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
  }
}
```

---

## 10. Internationalization (i18n)

### Current Gap

No i18n strategy documented.

### Proposed Design (Future)

For MVP, English only. Future i18n approach:

```typescript
// src/i18n/messages.ts

const messages = {
  en: {
    'session.list.title': 'Claude Sessions',
    'session.list.empty': 'No sessions found',
    'error.file.notFound': 'Session file not found: {path}',
  },
  ja: {
    'session.list.title': 'Claudeセッション',
    'session.list.empty': 'セッションが見つかりません',
    'error.file.notFound': 'セッションファイルが見つかりません: {path}',
  },
};
```

---

## Priority Matrix

| Component | MVP | Post-MVP | Future |
|-----------|-----|----------|--------|
| Error Handling | Core errors | Full strategy | - |
| Configuration | CLI + env | Config files | - |
| Plugin System | - | - | Yes |
| Caching | Basic | Full | - |
| Logging | Minimal | Full | - |
| Testing | Unit | Integration | E2E |
| WebSocket | - | Yes | - |
| Search | Basic | Full syntax | - |
| Performance | Basic | Optimized | - |
| i18n | - | - | Yes |

---

## Next Steps

1. Finalize error handling for MVP (session reader errors)
2. Implement basic configuration (CLI + environment)
3. Set up test fixtures with sample JSONL files
4. Design complete search query syntax
5. Document performance requirements and benchmarks
