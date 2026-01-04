# claude-code-agent Design Specification

## Project Overview

**Project Name**: claude-code-agent

**Purpose**: A TypeScript-based monitoring, visualization, and orchestration tool for Claude Code sessions. Provides external observation of Claude Code task execution, session progress, and agent workflows by reading transcript files stored in `~/.claude/projects/`.

**Key Value Proposition**: Non-invasive monitoring that maintains full compatibility without requiring Claude Code modifications.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Session Viewer** | TUI and browser-based session transcript viewing |
| **Real-time Monitoring** | Watch active sessions via fs.watch on transcript files |
| **Session Groups** | Orchestrate multi-project concurrent execution |
| **Command Queue** | Queue prompts for sequential execution with TUI management |
| **Markdown Parsing** | Parse message content into structured JSON (sections, paragraphs) |
| **SDK** | TypeScript API for programmatic integration |
| **Daemon Mode** | HTTP API for remote execution with authentication |
| **Bookmarks** | Mark and retrieve important sessions/messages |

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                      claude-code-agent                            |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------------+                                              |
|  | SDK Layer       |  <-- TypeScript API for embedding           |
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
|  | | DuckDB Adapter | | InMemory       | | (Future)      | |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  +--------------------------------------------------------+      |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Module Structure

```
src/
+-- interfaces/             # Abstractions for testability
|   +-- filesystem.ts      # FileSystem interface + BunFileSystem
|   +-- process-manager.ts # ProcessManager interface + BunProcessManager
|   +-- clock.ts           # Clock interface + SystemClock
|   +-- index.ts           # Re-exports
|
+-- container.ts           # Dependency injection container
|
+-- cli/                    # CLI entry point (thin wrapper around SDK)
|   +-- main.ts
|   +-- commands/
|       +-- group.ts        # Session group commands
|       +-- session.ts      # Session commands
|       +-- queue.ts        # Command queue commands
|       +-- bookmark.ts     # Bookmark commands
|       +-- server.ts       # Browser viewer server
|       +-- daemon.ts       # Daemon mode commands
|
+-- sdk/                    # Core SDK (TypeScript API)
|   +-- index.ts           # Public exports
|   +-- agent.ts           # ClaudeCodeAgent class
|   +-- session.ts         # Session management
|   +-- group.ts           # SessionGroup management
|   +-- queue/             # Command Queue
|   |   +-- types.ts       # Queue and command interfaces
|   |   +-- storage.ts     # Queue persistence
|   |   +-- runner.ts      # Execution engine
|   +-- markdown-parser/   # Markdown-to-JSON parsing
|   |   +-- parser.ts      # Core parsing logic
|   |   +-- types.ts       # ParsedMarkdown interfaces
|   +-- bookmarks.ts       # Bookmark functionality
|   +-- config/            # Configuration
|   +-- events.ts          # Event emitter
|
+-- viewer/                # UI layer
|   +-- session-reader.ts  # JSONL parsing
|   +-- types.ts           # Shared types
|   +-- tui/              # TUI components (Ink)
|   |   +-- index.ts
|   |   +-- components/
|   |   +-- queue-list.tsx     # Queue list TUI component
|   |   +-- queue-detail.tsx   # Queue detail/edit TUI component
|   +-- browser/          # Browser viewer (SvelteKit)
|       +-- server.ts
|       +-- routes/
|       +-- static/
|
+-- polling/              # Real-time monitoring
|   +-- watcher.ts        # File watcher (fs.watch)
|   +-- parser.ts         # JSONL stream parser
|   +-- state.ts          # State manager
|
+-- repository/           # Data access layer (Clean Architecture)
|   +-- session-repository.ts     # Interface
|   +-- duckdb-impl.ts            # DuckDB implementation
|   +-- in-memory-impl.ts         # For testing
|
+-- daemon/              # HTTP daemon for remote execution
|   +-- server.ts        # Elysia HTTP server
|   +-- routes/          # API endpoints
|   +-- auth.ts          # API key authentication
|
+-- test/                # Test utilities
    +-- mocks/           # Mock implementations
    +-- fixtures/        # Sample JSONL files
```

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Bun | Fast TypeScript execution, built-in testing |
| Language | TypeScript (strict mode) | Type safety, IDE support |
| TUI | Ink | React-like component model |
| HTTP Server | Elysia | Type-safe, ergonomic API, Bun-optimized |
| Browser Viewer | SvelteKit | Full-stack SSR, file-based routing, small bundle |
| Query Engine | DuckDB (bundled) | SQL queries on JSONL, Athena-like experience |
| Testing | Vitest | Fast, compatible with Bun |
| Packaging | Nix flakes | Reproducible builds |
| Task Runner | go-task | Simple automation |

---

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)

- [ ] CLI argument parsing
- [ ] Session reader implementation
- [ ] JSONL parser for session files
- [ ] Basic type definitions
- [ ] Testability interfaces (FileSystem, ProcessManager, Clock)

### Phase 2: TUI Viewer

- [ ] Session list view (table display)
- [ ] Session detail view (message timeline)
- [ ] Task list view
- [ ] Keyboard navigation
- [ ] Search functionality

### Phase 3: SDK and Session Groups

- [ ] ClaudeCodeAgent class
- [ ] Session Group management
- [ ] Config generation (CLAUDE.md, etc.)
- [ ] Concurrent session execution

### Phase 4: Browser Mode

- [ ] HTTP server with Elysia
- [ ] API endpoints implementation
- [ ] SvelteKit viewer
- [ ] Browser auto-open

### Phase 5: Daemon and Remote Execution

- [ ] Daemon mode with authentication
- [ ] REST API for remote execution
- [ ] SSE for event streaming
- [ ] Token management

### Phase 6: Command Queue

- [ ] Queue data model types
- [ ] Queue storage/persistence
- [ ] CLI commands (create, list, run, pause, resume, stop)
- [ ] Command management (add, edit, remove, move)
- [ ] Execution runner with --resume
- [ ] Queue TUI (list and detail views)

### Phase 7: Markdown Parsing

- [ ] Parser implementation
- [ ] Section and content block types
- [ ] CLI flag integration (--parse-markdown)
- [ ] REST API query parameter

### Phase 8: Enhancements

- [ ] Bookmark system
- [ ] Export functionality (JSON, Markdown)
- [ ] Theme support
- [ ] Performance optimization
- [ ] DuckDB query integration

---

## Related Documents

| Document | Description |
|----------|-------------|
| [spec-data-storage.md](./spec-data-storage.md) | Claude Code data structures and agent storage |
| [spec-session-groups.md](./spec-session-groups.md) | Session Group architecture and lifecycle |
| [spec-command-queue.md](./spec-command-queue.md) | Command Queue for sequential prompt execution |
| [spec-sdk-api.md](./spec-sdk-api.md) | SDK, daemon, REST API, authentication, markdown parsing |
| [spec-viewers.md](./spec-viewers.md) | TUI, browser viewer, transcript monitoring |
| [spec-infrastructure.md](./spec-infrastructure.md) | Error handling, testing, caching |
| [spec-deployment.md](./spec-deployment.md) | Nix packaging |
| [DECISIONS.md](./DECISIONS.md) | Consolidated design decisions (Q1-Q36) |

---

## claude-code-agent's Role (Important)

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
- Persist session content to databases (external apps handle this)
- Modify ~/.claude directly
- Store auth tokens (only provides override capability)

---

## References

- `references/README.md` - External references and design materials
- `archive/` - Historical Q&A files with decision rationale
