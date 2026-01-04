# Infrastructure Specification

This document describes error handling, configuration, caching, logging, and testing infrastructure.

---

## 1. Testability Architecture

### 1.1 Core Interfaces

All external dependencies are abstracted behind interfaces for testability:

```typescript
// interfaces/filesystem.ts
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readDir(path: string): Promise<string[]>;
  watch(path: string): AsyncIterable<WatchEvent>;
  stat(path: string): Promise<FileStat>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  rm(path: string, options?: { recursive?: boolean }): Promise<void>;
}

// interfaces/process-manager.ts
interface ProcessManager {
  spawn(command: string, args: string[], options: SpawnOptions): ManagedProcess;
  kill(pid: number, signal?: string): Promise<void>;
}

interface ManagedProcess {
  pid: number;
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  exitCode: Promise<number>;
  kill(signal?: string): void;
}

// interfaces/clock.ts
interface Clock {
  now(): Date;
  timestamp(): string;
  sleep(ms: number): Promise<void>;
}
```

### 1.2 Production Implementations

```typescript
// BunFileSystem - Production implementation using Bun APIs
class BunFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return Bun.file(path).text();
  }
  async writeFile(path: string, content: string): Promise<void> {
    await Bun.write(path, content);
  }
  // ...
}

// BunProcessManager - Production implementation
class BunProcessManager implements ProcessManager {
  spawn(command: string, args: string[], options: SpawnOptions): ManagedProcess {
    const proc = Bun.spawn([command, ...args], options);
    return new BunManagedProcess(proc);
  }
}

// SystemClock - Production implementation
class SystemClock implements Clock {
  now(): Date { return new Date(); }
  timestamp(): string { return new Date().toISOString(); }
  async sleep(ms: number): Promise<void> {
    await Bun.sleep(ms);
  }
}
```

### 1.3 Dependency Injection Container

```typescript
// container.ts
interface Container {
  fileSystem: FileSystem;
  processManager: ProcessManager;
  clock: Clock;
}

// Production container
const productionContainer: Container = {
  fileSystem: new BunFileSystem(),
  processManager: new BunProcessManager(),
  clock: new SystemClock(),
};

// Test container
const testContainer: Container = {
  fileSystem: new MockFileSystem(),
  processManager: new MockProcessManager(),
  clock: new MockClock(),
};
```

### 1.4 Mock Implementations

```typescript
class MockFileSystem implements FileSystem {
  private files = new Map<string, string>();

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return content;
  }
  // ...
}

class MockClock implements Clock {
  private currentTime = new Date('2026-01-04T00:00:00Z');

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  now(): Date { return this.currentTime; }
  // ...
}
```

---

## 2. Error Handling

### 2.1 Error Types

```typescript
abstract class AgentError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;
}

class FileNotFoundError extends AgentError {
  readonly code = 'FILE_NOT_FOUND';
  readonly recoverable = false;

  constructor(public readonly path: string) {
    super(`File not found: ${path}`);
  }
}

class SessionNotFoundError extends AgentError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly recoverable = false;

  constructor(public readonly sessionId: string) {
    super(`Session not found: ${sessionId}`);
  }
}

class ParseError extends AgentError {
  readonly code = 'PARSE_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly file: string,
    public readonly line: number,
    public readonly details: string
  ) {
    super(`Parse error in ${file} at line ${line}: ${details}`);
  }
}

class ProcessError extends AgentError {
  readonly code = 'PROCESS_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(`Process '${command}' failed with exit code ${exitCode}`);
  }
}

class BudgetExceededError extends AgentError {
  readonly code = 'BUDGET_EXCEEDED';
  readonly recoverable = false;

  constructor(
    public readonly sessionId: string,
    public readonly usage: number,
    public readonly limit: number
  ) {
    super(`Session ${sessionId} exceeded budget: $${usage} > $${limit}`);
  }
}
```

### 2.2 Result Type Pattern

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage
async function parseSession(path: string): Promise<Result<Session, ParseError>> {
  try {
    const content = await fs.readFile(path);
    const session = JSON.parse(content);
    return ok(session);
  } catch (e) {
    return err(new ParseError(path, 0, e.message));
  }
}
```

### 2.3 JSONL Parse Error Recovery

```typescript
async function* parseJsonlWithRecovery(
  path: string,
  onError: (error: ParseError) => void
): AsyncGenerator<object> {
  const content = await fs.readFile(path);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      yield JSON.parse(line);
    } catch (e) {
      onError(new ParseError(path, i + 1, e.message));
      // Continue to next line
    }
  }
}
```

---

## 3. Configuration System

### 3.1 Configuration File

```json
// ~/.config/claude-code-agent/config.json
{
  "version": 1,
  "defaults": {
    "model": "sonnet",
    "maxConcurrent": 3,
    "maxBudgetUsd": 10.0,
    "onBudgetExceeded": "pause"
  },
  "viewer": {
    "defaultMode": "tui",
    "port": 3000,
    "theme": "auto",
    "showThinking": false
  },
  "daemon": {
    "port": 8443,
    "host": "0.0.0.0"
  },
  "logging": {
    "level": "info",
    "file": null
  }
}
```

### 3.2 Configuration Loading

```typescript
interface Config {
  version: number;
  defaults: DefaultsConfig;
  viewer: ViewerConfig;
  daemon: DaemonConfig;
  logging: LoggingConfig;
}

async function loadConfig(container: Container): Promise<Config> {
  const configPath = getConfigPath('config.json');

  if (await container.fileSystem.exists(configPath)) {
    const content = await container.fileSystem.readFile(configPath);
    return mergeWithDefaults(JSON.parse(content));
  }

  return defaultConfig;
}
```

### 3.3 Environment Variable Overrides

| Variable | Config Path | Description |
|----------|-------------|-------------|
| `CLAUDE_CODE_AGENT_CONFIG_DIR` | - | Config directory |
| `CLAUDE_CODE_AGENT_DATA_DIR` | - | Data directory |
| `CLAUDE_CODE_AGENT_PORT` | `viewer.port` | Server port |
| `CLAUDE_CODE_AGENT_LOG_LEVEL` | `logging.level` | Log level |

---

## 4. Caching System

### 4.1 Session Cache

```typescript
interface SessionCache {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session): Promise<void>;
  invalidate(sessionId: string): Promise<void>;
  invalidateProject(projectPath: string): Promise<void>;
  clear(): Promise<void>;
}

class InMemorySessionCache implements SessionCache {
  private cache = new Map<string, { session: Session; timestamp: number }>();
  private readonly ttlMs: number;

  async get(sessionId: string): Promise<Session | null> {
    const entry = this.cache.get(sessionId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(sessionId);
      return null;
    }

    return entry.session;
  }
}
```

### 4.2 Query Result Cache

```typescript
interface QueryCache {
  getQueryResult(sql: string, params: unknown[]): Promise<QueryResult | null>;
  setQueryResult(sql: string, params: unknown[], result: QueryResult): Promise<void>;
  invalidateAll(): Promise<void>;
}
```

### 4.3 Cache Invalidation

- Session changes invalidate session cache
- New messages invalidate query cache
- File changes detected via fs.watch trigger invalidation

---

## 5. Logging System

### 5.1 Log Levels

| Level | Description |
|-------|-------------|
| `debug` | Detailed debugging information |
| `info` | General operational messages |
| `warn` | Warning conditions |
| `error` | Error conditions |

### 5.2 Logger Interface

```typescript
interface Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, error?: Error, context?: object): void;
}

class ConsoleLogger implements Logger {
  constructor(private readonly level: LogLevel) {}

  info(message: string, context?: object): void {
    if (this.level <= LogLevel.INFO) {
      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...context,
      }));
    }
  }
}
```

### 5.3 Structured Logging

```typescript
// Log format
{
  "level": "info",
  "timestamp": "2026-01-04T12:00:00.000Z",
  "message": "Session started",
  "sessionId": "abc123",
  "projectPath": "/path/to/project"
}
```

---

## 6. Testing Strategy

### 6.1 Test Categories

| Category | Description | Runner |
|----------|-------------|--------|
| Unit Tests | Test individual functions/classes | Vitest |
| Integration Tests | Test module interactions | Vitest |
| E2E Tests | Full system tests | Vitest |

### 6.2 Test Structure

```
test/
+-- mocks/
|   +-- filesystem.ts       # MockFileSystem
|   +-- process-manager.ts  # MockProcessManager
|   +-- clock.ts            # MockClock
+-- fixtures/
|   +-- sessions/           # Sample JSONL files
|   +-- configs/            # Sample config files
+-- unit/
|   +-- parser.test.ts
|   +-- session-manager.test.ts
+-- integration/
|   +-- session-group.test.ts
|   +-- daemon.test.ts
+-- e2e/
    +-- cli.test.ts
```

### 6.3 Test Utilities

```typescript
// test/helpers.ts
function createTestContainer(overrides?: Partial<Container>): Container {
  return {
    fileSystem: new MockFileSystem(),
    processManager: new MockProcessManager(),
    clock: new MockClock(),
    ...overrides,
  };
}

function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 'test-session-id',
    projectPath: '/test/project',
    status: 'completed',
    createdAt: '2026-01-04T00:00:00Z',
    ...overrides,
  };
}
```

### 6.4 Example Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../src/sdk/session';
import { createTestContainer, createMockSession } from './helpers';

describe('SessionManager', () => {
  let container: Container;
  let manager: SessionManager;

  beforeEach(() => {
    container = createTestContainer();
    manager = new SessionManager(container);
  });

  it('should list sessions for project', async () => {
    // Setup
    const session = createMockSession();
    (container.fileSystem as MockFileSystem).setFile(
      '~/.local/claude-code-agent/metadata/sessions/test-session-id.json',
      JSON.stringify(session)
    );

    // Execute
    const sessions = await manager.listSessions({ projectPath: '/test/project' });

    // Verify
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('test-session-id');
  });
});
```

---

## 7. Performance Considerations

### 7.1 Large File Handling

- Stream JSONL files instead of loading entirely
- Use offset-based reading for tailing
- Limit memory for transcript cache

### 7.2 Concurrent Session Limits

- Default max concurrent: 3
- Configurable per session group
- Rate limit awareness for API calls

### 7.3 Query Optimization

- Use DuckDB's native JSONL support
- Cache frequently used queries
- Index metadata for fast lookups

---

## 8. Security Considerations

### 8.1 File Access

- Read-only access to Claude Code transcripts
- Validate paths to prevent directory traversal
- Respect file permissions

### 8.2 API Security

- API token authentication required for daemon
- TLS for remote connections
- Token expiration and rotation support

### 8.3 Sensitive Data

- Auth tokens stored with restricted permissions
- Credential files excluded from exports
- No logging of sensitive content
