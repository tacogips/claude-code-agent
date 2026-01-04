# Design: TUI and Browser Viewer for Claude Sessions/Tasks

## Overview

This document describes the design for viewing Claude Code sessions and tasks through two interfaces:
1. **TUI (Terminal User Interface)**: Default mode for terminal-based viewing
2. **Browser/HTML**: Web-based viewer launched via `--browser` flag with configurable HTTP server

## Background

### Use Cases

| Mode | Use Case |
|------|----------|
| **TUI** | Quick inspection in terminal, SSH environments, minimal resource usage |
| **Browser** | Rich visualization, multiple sessions comparison, interactive exploration |

### Why Both Modes?

- TUI provides fast, lightweight access for developers in terminal workflows
- Browser mode enables richer UI, better formatting, and shareable views
- Different contexts require different tools (remote server vs local workstation)

## CLI Interface

### Basic Usage

```bash
# TUI mode (default)
claude-viewer                     # View current project sessions
claude-viewer --session <id>      # View specific session
claude-viewer --tasks             # View task list

# Browser mode
claude-viewer --browser           # Open in default browser
claude-viewer --browser --port 8080  # Custom port
```

### Command Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--browser` | `-b` | Launch HTML viewer in browser | false |
| `--port` | `-p` | HTTP server port for browser mode | 3000 |
| `--session` | `-s` | Target session ID | latest |
| `--tasks` | `-t` | Show tasks view | false |
| `--project` | | Project path | current directory |
| `--no-open` | | Start server without opening browser | false |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_VIEWER_PORT` | Default port for HTTP server | 3000 |
| `CLAUDE_VIEWER_HOST` | Bind host for HTTP server | 127.0.0.1 |

### Port Resolution Priority

1. `--port` CLI argument (highest priority)
2. `CLAUDE_VIEWER_PORT` environment variable
3. Default value: 3000

## Architecture

### Component Overview

```
+------------------+
|   CLI Entry      |
|   (main.ts)      |
+------------------+
        |
        v
+------------------+     +-------------------+
|   Mode Router    |---->|   TUI Renderer    |
|                  |     |   (ink/blessed)   |
+------------------+     +-------------------+
        |
        v
+------------------+     +-------------------+
|   HTTP Server    |---->|   HTML/JS Assets  |
|   (browser mode) |     |   (static files)  |
+------------------+     +-------------------+
        |
        v
+------------------+
|  Session Reader  |
|  (shared logic)  |
+------------------+
        |
        v
+---------------------------------------+
| ~/.claude/projects/{path}/{id}.jsonl  |
+---------------------------------------+
```

### Module Structure

```
src/
  cli/
    main.ts           # CLI entry point, argument parsing
    commands/
      view.ts         # Main view command
  viewer/
    session-reader.ts # Session/task data loading
    tui/
      index.ts        # TUI entry
      components/     # TUI components
        session-list.ts
        session-detail.ts
        task-list.ts
    browser/
      server.ts       # HTTP server
      routes/
        api.ts        # JSON API endpoints
      static/         # HTML/CSS/JS assets
        index.html
        styles.css
        app.js
```

## TUI Mode

### Technology Options

| Library | Pros | Cons |
|---------|------|------|
| **Ink** | React-like, familiar patterns | Larger bundle |
| **blessed** | Feature-rich, mature | Complex API |
| **terminal-kit** | Lightweight | Less abstraction |

**Recommendation**: Ink for React-like component model

### TUI Views

#### Session List View

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

#### Session Detail View

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

#### Task List View

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

### Keyboard Shortcuts

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

## Browser Mode

### HTTP Server (Elysia)

```typescript
import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';

interface ServerConfig {
  port: number;        // Default: 3000 or env
  host: string;        // Default: 127.0.0.1
  openBrowser: boolean; // Default: true
}

async function startServer(config: ServerConfig): Promise<void> {
  const app = new Elysia()
    .use(staticPlugin({ prefix: '/', assets: 'static' }))
    .get('/api/sessions', () => listSessions())
    .get('/api/sessions/:id', ({ params }) => getSession(params.id))
    .get('/api/sessions/:id/messages', ({ params }) => getSessionMessages(params.id))
    .get('/api/tasks', () => getTasks())
    .get('/api/projects', () => listProjects())
    .listen({ port: config.port, hostname: config.host });

  console.log(`Server running at http://${config.host}:${config.port}`);

  if (config.openBrowser) {
    await open(`http://${config.host}:${config.port}`);
  }
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/:id` | Get session detail |
| GET | `/api/sessions/:id/messages` | Get session messages |
| GET | `/api/tasks` | Get current tasks |
| GET | `/api/projects` | List available projects |

### API Response Examples

```typescript
// GET /api/sessions
interface SessionListResponse {
  sessions: Array<{
    id: string;
    projectPath: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
    totalCost: number;
    model: string;
  }>;
}

// GET /api/sessions/:id
interface SessionDetailResponse {
  id: string;
  projectPath: string;
  messages: Array<{
    uuid: string;
    type: "user" | "assistant" | "system";
    timestamp: string;
    content: string | ContentBlock[];
  }>;
  metadata: {
    model: string;
    totalCost: number;
    tokenUsage: TokenUsage;
  };
}
```

### HTML View Features

- Session list with search/filter
- Message timeline with syntax highlighting
- Token usage visualization
- Cost tracking charts
- Export functionality (JSON, Markdown)
- Dark/light theme toggle

### Static Assets Structure

```
static/
  index.html      # Single page app shell
  styles.css      # Styles (or Tailwind)
  app.js          # Client-side JavaScript
  components/
    session-list.js
    message-view.js
    task-board.js
```

## Data Layer

### Session Reader

```typescript
interface SessionReader {
  // List sessions for a project
  listSessions(projectPath: string): Promise<SessionSummary[]>;

  // Get full session with messages
  getSession(projectPath: string, sessionId: string): Promise<Session>;

  // Get active tasks from session
  getTasks(projectPath: string, sessionId?: string): Promise<Task[]>;

  // Watch for changes (for live updates)
  watchSession(
    projectPath: string,
    sessionId: string,
    callback: (event: SessionEvent) => void
  ): () => void;
}
```

### Shared Types

```typescript
interface Session {
  id: string;
  projectPath: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata: SessionMetadata;
}

interface Message {
  uuid: string;
  parentUuid: string | null;
  type: "user" | "assistant" | "system" | "thinking";
  timestamp: Date;
  content: string | ContentBlock[];
  model?: string;
  usage?: TokenUsage;
}

interface Task {
  content: string;
  status: "pending" | "in_progress" | "completed";
  sessionId: string;
  createdAt: Date;
}
```

## Technology Investigation: JSON Query Libraries

Session data is stored in JSONL format. For filtering and querying sessions by specific fields (similar to AWS Athena for S3), the following tools were investigated.

**Decision Status**: TBD - To be determined based on implementation requirements.

### CLI Tools Comparison

| Tool | Type | Query Style | Pros | Cons |
|------|------|-------------|------|------|
| **jq** | Filter/Transform | jq expression | Ubiquitous, lightweight, powerful | Learning curve, complex for SQL users |
| **gron** | Transform | grep-friendly | Makes JSON greppable as `path=value` | Preprocessing step required |
| **DuckDB** | Database | SQL | Full SQL, Athena-like, fast | Binary dependency, larger footprint |
| **sqlite-utils** | Database | SQL | Python ecosystem, flexible | Requires Python |
| **jnv** | Interactive | jq + TUI | Interactive exploration | Not for programmatic use |
| **dasel** | Query | Path syntax | Multi-format (JSON/YAML/TOML) | Less powerful than jq |
| **fx** | Interactive | JavaScript | Interactive, JS expressions | Not for batch processing |
| **Miller (mlr)** | Transform | DSL | Great for CSV/JSON records | Different paradigm |

### Detailed Analysis

#### jq (Recommended for Simple Queries)

```bash
# Filter by message type
jq 'select(.type == "user")' session.jsonl

# Extract specific fields
jq '{uuid, type, timestamp}' session.jsonl

# Complex filtering
jq 'select(.type == "assistant" and .message.usage.output_tokens > 1000)' session.jsonl

# Aggregate
jq -s '[.[] | select(.type == "assistant")] | length' session.jsonl
```

**Pros**:
- Pre-installed on most systems
- No external dependencies for deployment
- Streaming support for large files
- Well-documented, large community

**Cons**:
- Syntax unfamiliar to SQL users
- Complex aggregations are verbose

#### DuckDB (Recommended for Complex Queries)

```sql
-- Query JSONL files directly with SQL
SELECT * FROM read_json_auto('~/.claude/projects/*/*.jsonl')
WHERE type = 'assistant';

-- Nested field access
SELECT
  uuid,
  message.content[1].text as first_content,
  message.usage.output_tokens as tokens
FROM read_json_auto('session.jsonl')
WHERE type = 'assistant';

-- Aggregation across sessions
SELECT
  sessionId,
  COUNT(*) as message_count,
  SUM(message.usage.output_tokens) as total_tokens
FROM read_json_auto('~/.claude/projects/**/*.jsonl')
WHERE type = 'assistant'
GROUP BY sessionId;

-- Glob pattern support
SELECT * FROM read_json_auto('~/.claude/projects/-g-gits-*/*.jsonl');
```

**Pros**:
- Familiar SQL syntax (Athena/Presto-like)
- Excellent performance (columnar, vectorized)
- Direct JSONL file querying without import
- Glob pattern support for multiple files
- Rich analytics functions
- Available as CLI and library (Node.js bindings exist)

**Cons**:
- Binary dependency (~50MB)
- Additional installation step
- Overkill for simple field filtering

#### gron (For grep workflows)

```bash
# Convert JSON to greppable format
gron session.jsonl | grep "type.*assistant"

# Output:
# json[0].type = "assistant";
# json[1].type = "assistant";

# Convert back to JSON
gron session.jsonl | grep "message.content" | gron -u
```

**Pros**:
- Integrates with existing grep/awk workflows
- Simple concept

**Cons**:
- Two-step process (gron | grep | gron -u)
- Not efficient for large files

### Use Case Recommendations

| Use Case | Recommended Tool | Reason |
|----------|------------------|--------|
| Simple field filtering | jq | Lightweight, no deps |
| Complex SQL queries | DuckDB | Athena-like experience |
| Interactive exploration | jnv or fx | TUI for discovery |
| CI/CD scripts | jq | Universal availability |
| Analytics/reporting | DuckDB | Aggregation, joins |
| Integration in TypeScript | DuckDB (duckdb-async) or custom jq wrapper | Library support |

### Integration Options for This Project

#### Option A: jq via child process

```typescript
import { spawn } from 'child_process';

async function queryJsonl(file: string, filter: string): Promise<unknown[]> {
  const proc = spawn('jq', ['-c', filter, file]);
  // Parse stdout line by line
}
```

#### Option B: DuckDB with Node.js bindings

```typescript
import { Database } from 'duckdb-async';

async function queryJsonl(pattern: string, sql: string) {
  const db = await Database.create(':memory:');
  return await db.all(`
    SELECT * FROM read_json_auto('${pattern}')
    WHERE ${sql}
  `);
}
```

#### Option C: Pure TypeScript (no external deps)

```typescript
// Custom JSONL parser with filter function
async function* filterJsonl<T>(
  file: string,
  predicate: (record: T) => boolean
): AsyncGenerator<T> {
  const stream = createReadStream(file);
  for await (const line of readline.createInterface({ input: stream })) {
    const record = JSON.parse(line) as T;
    if (predicate(record)) yield record;
  }
}
```

### References

- jq Manual: https://jqlang.github.io/jq/manual/
- DuckDB JSON: https://duckdb.org/docs/data/json/overview
- DuckDB Node.js: https://duckdb.org/docs/api/nodejs/overview
- gron: https://github.com/tomnomnom/gron
- jnv: https://github.com/ynqa/jnv

## Implementation Phases

### Phase 1: Core Infrastructure

- CLI argument parsing with port/browser options
- Session reader implementation
- Basic TUI session list view

### Phase 2: TUI Completion

- Session detail view
- Task list view
- Keyboard navigation
- Search functionality

### Phase 3: Browser Mode

- HTTP server with Elysia
- API endpoints implementation
- Static HTML/JS viewer
- Browser auto-open

### Phase 4: Enhancements

- Live updates (file watching)
- Export functionality
- Theme support
- Performance optimization

## Configuration

### Project Configuration (optional)

```jsonc
// .claude-viewer.json or in package.json
{
  "viewer": {
    "defaultPort": 8080,
    "defaultMode": "tui",  // or "browser"
    "theme": "dark"
  }
}
```

## Security Considerations

- HTTP server binds to localhost only by default
- No external network access unless explicitly configured
- Session data read-only (no modification via viewer)
- Sanitize HTML output to prevent XSS

## References

- Session file format: See `design-cli-execution-approach.md`
- Claude config paths: See `design-claude-code-config-paths.md`
- Bun HTTP server: https://bun.sh/docs/api/http
- Ink (TUI library): https://github.com/vadimdemedes/ink
