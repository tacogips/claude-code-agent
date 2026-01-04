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

interface AgentConfig {
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
| `CCA_PORT` | `server.port` | `8080` |
| `CCA_HOST` | `server.host` | `0.0.0.0` |
| `CCA_MODE` | `display.mode` | `browser` |
| `CCA_THEME` | `display.theme` | `light` |
| `CCA_LOG_LEVEL` | `logging.level` | `info` |

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

## 11. Testability Architecture (Interfaces for Mocking)

### Current Gap

Core components need interface abstractions for unit testing with mocks.

### Design Principle

All external dependencies and I/O operations should be abstracted behind interfaces:
1. **File System Operations** - Reading/writing files, directory operations
2. **Repository Layer** - Data access (already defined in Q2/Q22)
3. **Process Management** - Claude Code subprocess execution
4. **Time/Clock** - For deterministic testing

### Interface Definitions

#### 11.1 File System Interface

```typescript
// src/interfaces/filesystem.ts

export interface FileSystem {
  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStat>;
  unlink(path: string): Promise<void>;

  // Directory operations
  readdir(path: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;

  // Watch operations
  watch(path: string): AsyncIterableIterator<WatchEvent>;

  // Path utilities
  join(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
}

export interface FileStat {
  size: number;
  mtime: Date;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface WatchEvent {
  eventType: 'change' | 'rename';
  filename: string;
}

// Production implementation
export class BunFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return Bun.file(path).text();
  }
  // ... other implementations
}

// Test mock
export class InMemoryFileSystem implements FileSystem {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error(`ENOENT: ${path}`);
    return content;
  }
  // ... other implementations
}
```

#### 11.2 Session Repository Interface

```typescript
// src/interfaces/session-repository.ts

export interface SessionRepository {
  // Read operations
  getSession(id: string): Promise<Session | null>;
  findSessions(filter: SessionFilter): Promise<Session[]>;
  findByGroup(groupId: string): Promise<Session[]>;
  findByProject(projectPath: string): Promise<Session[]>;

  // Search operations
  search(query: SearchQuery): Promise<SearchResult[]>;

  // SQL query (for DuckDB)
  query(sql: string, params?: unknown[]): Promise<QueryResult>;

  // Real-time watching
  watchSession(id: string): AsyncIterableIterator<SessionEvent>;
}

export interface SessionFilter {
  status?: SessionStatus[];
  projectPath?: string;
  groupId?: string | null;  // null for standalone
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

// Production implementation
export class DuckDBSessionRepository implements SessionRepository {
  constructor(private db: DuckDB, private fs: FileSystem) {}
  // ... implementations
}

// Test mock
export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, Session>();

  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }
  // ... other implementations

  // Test helper methods
  addSession(session: Session): void {
    this.sessions.set(session.id, session);
  }
}
```

#### 11.3 Process Manager Interface

```typescript
// src/interfaces/process-manager.ts

export interface ProcessManager {
  // Spawn Claude Code process
  spawn(options: SpawnOptions): Promise<ProcessHandle>;

  // Process control
  kill(handle: ProcessHandle, signal?: NodeJS.Signals): Promise<void>;

  // Check if process is running
  isRunning(handle: ProcessHandle): Promise<boolean>;
}

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  stdout?: 'pipe' | 'inherit' | 'ignore';
  stderr?: 'pipe' | 'inherit' | 'ignore';
}

export interface ProcessHandle {
  pid: number;
  stdout: AsyncIterableIterator<Uint8Array> | null;
  stderr: AsyncIterableIterator<Uint8Array> | null;
  exitCode: Promise<number>;
}

// Production implementation
export class BunProcessManager implements ProcessManager {
  async spawn(options: SpawnOptions): Promise<ProcessHandle> {
    const proc = Bun.spawn([options.command, ...options.args], {
      cwd: options.cwd,
      env: options.env,
      stdout: options.stdout,
      stderr: options.stderr,
    });
    return {
      pid: proc.pid,
      stdout: proc.stdout ? this.toAsyncIterator(proc.stdout) : null,
      stderr: proc.stderr ? this.toAsyncIterator(proc.stderr) : null,
      exitCode: proc.exited,
    };
  }
  // ... other implementations
}

// Test mock
export class MockProcessManager implements ProcessManager {
  private processes = new Map<number, MockProcess>();
  private nextPid = 1000;

  // Configurable behavior for tests
  public mockOutputs: string[] = [];
  public mockExitCode = 0;

  async spawn(options: SpawnOptions): Promise<ProcessHandle> {
    const pid = this.nextPid++;
    const process = new MockProcess(pid, this.mockOutputs, this.mockExitCode);
    this.processes.set(pid, process);
    return process.handle;
  }
  // ... other implementations
}
```

#### 11.4 Clock Interface

```typescript
// src/interfaces/clock.ts

export interface Clock {
  now(): Date;
  timestamp(): number;
  sleep(ms: number): Promise<void>;
}

// Production implementation
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  timestamp(): number {
    return Date.now();
  }
  async sleep(ms: number): Promise<void> {
    await Bun.sleep(ms);
  }
}

// Test mock
export class MockClock implements Clock {
  private currentTime: number;

  constructor(initialTime: Date = new Date('2026-01-04T12:00:00Z')) {
    this.currentTime = initialTime.getTime();
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  timestamp(): number {
    return this.currentTime;
  }

  async sleep(ms: number): Promise<void> {
    // Advance time immediately in tests
    this.currentTime += ms;
  }

  // Test helper
  advance(ms: number): void {
    this.currentTime += ms;
  }

  setTime(date: Date): void {
    this.currentTime = date.getTime();
  }
}
```

### Dependency Injection Container

```typescript
// src/container.ts

export interface Container {
  fileSystem: FileSystem;
  sessionRepository: SessionRepository;
  processManager: ProcessManager;
  clock: Clock;
  logger: Logger;
}

// Production container
export function createProductionContainer(): Container {
  const fileSystem = new BunFileSystem();
  const clock = new SystemClock();
  const logger = createLogger({ level: 'info' });

  return {
    fileSystem,
    sessionRepository: new DuckDBSessionRepository(createDuckDB(), fileSystem),
    processManager: new BunProcessManager(),
    clock,
    logger,
  };
}

// Test container
export function createTestContainer(overrides?: Partial<Container>): Container {
  return {
    fileSystem: new InMemoryFileSystem(),
    sessionRepository: new InMemorySessionRepository(),
    processManager: new MockProcessManager(),
    clock: new MockClock(),
    logger: createLogger({ level: 'silent' }),
    ...overrides,
  };
}
```

### Usage in Components

```typescript
// src/sdk/agent.ts

export class ClaudeCodeAgent {
  constructor(private container: Container) {}

  async runSession(options: RunSessionOptions): Promise<Session> {
    const { fileSystem, processManager, clock } = this.container;

    // Generate config
    const configPath = await this.generateConfig(options);
    await fileSystem.writeFile(configPath, JSON.stringify(config));

    // Spawn process
    const handle = await processManager.spawn({
      command: 'claude',
      args: ['-p', '--output-format', 'stream-json', options.prompt],
      cwd: options.projectPath,
      env: { CLAUDE_CONFIG_DIR: configPath },
      stdout: 'pipe',
    });

    // Track session
    const session: Session = {
      id: generateId(),
      createdAt: clock.now().toISOString(),
      // ...
    };

    return session;
  }
}
```

### Unit Test Example

```typescript
// src/sdk/agent.test.ts

import { describe, it, expect } from 'vitest';
import { ClaudeCodeAgent } from './agent';
import { createTestContainer } from '../container';

describe('ClaudeCodeAgent', () => {
  it('should generate config and spawn process', async () => {
    const container = createTestContainer();
    const mockProcess = container.processManager as MockProcessManager;
    mockProcess.mockOutputs = [
      '{"type":"assistant","message":"Hello"}',
      '{"type":"result","cost":0.01}',
    ];
    mockProcess.mockExitCode = 0;

    const agent = new ClaudeCodeAgent(container);
    const session = await agent.runSession({
      projectPath: '/test/project',
      prompt: 'Test prompt',
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe('completed');

    // Verify config was written
    const fs = container.fileSystem as InMemoryFileSystem;
    expect(await fs.exists('/config/path/.claude.json')).toBe(true);
  });

  it('should handle process failure', async () => {
    const container = createTestContainer();
    const mockProcess = container.processManager as MockProcessManager;
    mockProcess.mockExitCode = 1;

    const agent = new ClaudeCodeAgent(container);

    await expect(agent.runSession({
      projectPath: '/test/project',
      prompt: 'Test prompt',
    })).rejects.toThrow('Process exited with code 1');
  });
});
```

### Interface Summary

| Interface | Purpose | Production Impl | Test Mock |
|-----------|---------|-----------------|-----------|
| `FileSystem` | File/directory I/O | `BunFileSystem` | `InMemoryFileSystem` |
| `SessionRepository` | Data access | `DuckDBSessionRepository` | `InMemorySessionRepository` |
| `ProcessManager` | Subprocess control | `BunProcessManager` | `MockProcessManager` |
| `Clock` | Time operations | `SystemClock` | `MockClock` |
| `Logger` | Logging | `ConsoleLogger` | `SilentLogger` |

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
| **Testability Interfaces** | **All interfaces** | - | - |
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
