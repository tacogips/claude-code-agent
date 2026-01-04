# Claude Code Agent - Feature Summary and Design Status

## Project Overview

**Project Name**: claude-code-agent

**Purpose**: A TypeScript-based monitoring and visualization tool for Claude Code sessions. Provides external observation of Claude Code task execution, session progress, and agent workflows by reading transcript files stored in `~/.claude/projects/`.

**Key Value Proposition**: Non-invasive monitoring that maintains full compatibility without requiring Claude Code modifications.

---

## Current Implementation Status

### Implemented (Minimal)

| Component | Status | Files |
|-----------|--------|-------|
| Project scaffolding | Done | `package.json`, `tsconfig.json` |
| Nix development environment | Done | `flake.nix`, `.envrc` |
| Test infrastructure | Done | `vitest.config.ts` |
| CLI entry point stub | Stub only | `src/main.ts` |
| Basic utilities | Stub only | `src/lib.ts` |

### Design Documentation (Comprehensive)

| Document | Purpose | Status |
|----------|---------|--------|
| `design-claude-code-data-structures.md` | Claude Code internal data formats | Complete |
| `design-transcript-polling.md` | Real-time file monitoring system | Complete |
| `design-tui-browser-viewer.md` | TUI and browser interface design | Complete |
| `design-cli-execution-approach.md` | CLI integration with Claude Code | Complete |
| `design-nix-installation.md` | Nix packaging approach | Complete |
| `design-claude-code-config-paths.md` | Configuration path specifications | Complete |

---

## Feature Catalog

### Core Features (MVP)

#### 1. Session Reader

**Purpose**: Load and parse Claude Code session data from JSONL files.

**Capabilities**:
- List sessions for a project
- Parse session messages (user, assistant, system, thinking)
- Extract metadata (cost, tokens, model, timestamps)
- Track session-agent relationships

**Data Sources**:
- `~/.claude/projects/{project-id}/*.jsonl` - Main sessions
- `~/.claude/projects/{project-id}/agent-*.jsonl` - Subagent sessions

**Design Status**: Documented, not implemented

#### 2. TUI Viewer

**Purpose**: Terminal-based session viewer for quick inspection.

**Views**:
- Session list (table with ID, date, messages, cost)
- Session detail (message timeline)
- Task list (todo status tracking)

**Keyboard Navigation**:
- `j/k` - Navigate up/down
- `Enter` - Select/view details
- `q/Esc` - Back/quit
- `/` - Search
- `t` - Toggle tasks view

**Technology**: Ink (React-like TUI library)

**Design Status**: Documented, not implemented

#### 3. Browser Viewer

**Purpose**: Web-based rich visualization with HTTP server.

**Features**:
- Session list with search/filter
- Message timeline with syntax highlighting
- Token usage visualization
- Cost tracking charts
- Export functionality (JSON, Markdown)
- Dark/light theme toggle

**API Endpoints**:
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Session detail
- `GET /api/sessions/:id/messages` - Session messages
- `GET /api/tasks` - Current tasks
- `GET /api/projects` - Available projects

**Technology**: Bun.serve HTTP server

**Design Status**: Documented, not implemented

### Advanced Features

#### 4. Transcript Polling (Real-time Monitoring)

**Purpose**: Monitor active Claude Code sessions in real-time.

**Architecture**:
- File watcher (inotify/polling)
- JSONL stream parser
- State manager (task tree)
- Event output (TUI/JSON stream)

**Capabilities**:
- Detect new messages as they're written
- Track tool execution progress
- Monitor subagent spawning
- Handle file locking gracefully

**Design Status**: Documented, not implemented

#### 5. Session-Agent Hierarchy

**Purpose**: Track parent-child relationships between sessions and subagents.

**Implementation**:
- Match `sessionId` field across files
- Extract `agentId` and `slug` from agent files
- Build task tree for visualization

**Design Status**: Documented, not implemented

#### 6. JSON Query Support

**Purpose**: Enable filtering and analysis of session data.

**Options Considered**:
| Tool | Use Case |
|------|----------|
| jq | Simple field filtering, CI/CD scripts |
| DuckDB | Complex SQL queries, analytics |
| Pure TypeScript | No external dependencies |

**Design Status**: Options documented, decision pending

### Planned Features (Post-MVP)

#### 7. CLI Execution Integration

**Purpose**: Execute Claude Code CLI and capture responses programmatically.

**Capabilities**:
- Spawn claude-code process with arguments
- Parse stream-json output
- Manage session IDs programmatically

**Design Status**: Documented, not implemented

#### 8. Export Functionality

**Purpose**: Export session data in various formats.

**Formats**:
- JSON (full transcript)
- Markdown (human-readable)
- CSV (for spreadsheet analysis)

**Design Status**: Mentioned, not detailed

#### 9. Live Updates via WebSocket

**Purpose**: Push real-time updates to browser viewer.

**Design Status**: Not documented

#### 10. Multi-Project Dashboard

**Purpose**: Overview of all projects with sessions.

**Design Status**: Not documented

---

## Architecture Overview

```
+------------------+
|   CLI Entry      |
|   (main.ts)      |
+------------------+
        |
        v
+------------------+     +-------------------+
|   Mode Router    |---->|   TUI Renderer    |
|                  |     |   (ink)           |
+------------------+     +-------------------+
        |
        v
+------------------+     +-------------------+
|   HTTP Server    |---->|   HTML/JS Assets  |
|   (Bun.serve)    |     |   (static files)  |
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

---

## Module Structure (Proposed)

```
src/
  cli/
    main.ts           # CLI entry point, argument parsing
    commands/
      view.ts         # Main view command
  viewer/
    session-reader.ts # Session/task data loading
    types.ts          # Shared type definitions
    tui/
      index.ts        # TUI entry
      components/
        session-list.ts
        session-detail.ts
        task-list.ts
    browser/
      server.ts       # HTTP server
      routes/
        api.ts        # JSON API endpoints
      static/
        index.html
        styles.css
        app.js
  polling/
    watcher.ts        # File watcher
    parser.ts         # JSONL parser
    state.ts          # State manager
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)

- [ ] CLI argument parsing (--browser, --port, --session, --project)
- [ ] Session reader implementation
- [ ] JSONL parser for session files
- [ ] Basic type definitions

### Phase 2: TUI Completion

- [ ] Session list view (table display)
- [ ] Session detail view (message timeline)
- [ ] Task list view
- [ ] Keyboard navigation
- [ ] Search functionality

### Phase 3: Browser Mode

- [ ] HTTP server with Elysia
- [ ] API endpoints implementation
- [ ] Static HTML/JS viewer
- [ ] Browser auto-open

### Phase 4: Real-time Features

- [ ] File watcher for live updates
- [ ] WebSocket support for browser push
- [ ] Streaming output for TUI

### Phase 5: Enhancements

- [ ] Export functionality (JSON, Markdown)
- [ ] Theme support
- [ ] Performance optimization
- [ ] Query filtering (jq/DuckDB integration)

---

## Data Discovery Summary

### What Claude Code Stores (Available for Reading)

| Data Type | Location | Format |
|-----------|----------|--------|
| Session transcripts | `~/.claude/projects/{id}/*.jsonl` | JSONL |
| Agent transcripts | `~/.claude/projects/{id}/agent-*.jsonl` | JSONL |
| Usage statistics | `~/.claude/stats-cache.json` | JSON |
| Project settings | `~/.claude.json` (projects field) | JSON |
| Prompt history | `~/.claude/history.jsonl` | JSONL |
| File edit history | `~/.claude/file-history/` | Raw files |
| Todo data | `~/.claude/todos/` | JSON |

### Data Not Exposed by Claude Code UI

These are available in files but not shown by any built-in command:

- Session-Agent hierarchy
- Full thinking content
- Per-message token usage
- Tool call input/output details
- Hook execution logs
- Cache efficiency statistics
- Per-session cost breakdown

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Bun | Fast TypeScript execution, built-in testing |
| Language | TypeScript (strict mode) | Type safety, IDE support |
| TUI | Ink | React-like component model |
| HTTP Server | Elysia | Type-safe, ergonomic API, Bun-optimized |
| Testing | Vitest | Fast, compatible with Bun |
| Packaging | Nix flakes | Reproducible builds |
| Task Runner | go-task | Simple automation |

---

## References

- `design-claude-code-data-structures.md` - Complete data format documentation
- `design-transcript-polling.md` - Real-time monitoring architecture
- `design-tui-browser-viewer.md` - UI design and CLI options
- `design-cli-execution-approach.md` - CLI integration patterns
