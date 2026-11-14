# claude-code-agent Design Specification

## Project Overview

**Project Name**: claude-code-agent

**Purpose**: A TypeScript-based monitoring and orchestration tool for Claude Code sessions. It observes Claude Code by reading transcript files and running Claude Code subprocesses through a local SDK/CLI boundary.

**Key Value Proposition**: Non-invasive local orchestration that maintains compatibility without requiring Claude Code modifications.

---

## Key Capabilities

| Capability | Description | Priority |
|------------|-------------|----------|
| **Session Reader** | Read Claude Code session metadata and transcript JSONL files | High |
| **Real-time Monitoring** | Watch active sessions via file-system events | High |
| **Session Groups** | Orchestrate multi-project concurrent execution | High |
| **Command Queue** | Queue prompts for sequential execution | High |
| **Markdown Parsing** | Parse message content into structured JSON | High |
| **SDK** | TypeScript API for programmatic local integration | High |
| **GraphQL CLI** | Local command-style GraphQL query surface | Medium |
| **Bookmarks** | Mark and retrieve important sessions/messages | Medium |

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                      claude-code-agent                            |
+------------------------------------------------------------------+
|                                                                  |
|  +-----------------+      +-----------------+                    |
|  | SDK Layer       |<---->| CLI             |                    |
|  +-----------------+      +-----------------+                    |
|          |                                                       |
|  +--------------------------------------------------------+      |
|  |                   Core Services                        |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  | | Session Reader | | Group Manager  | | Queue Runner  | |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  +--------------------------------------------------------+      |
|          |                                                       |
|  +--------------------------------------------------------+      |
|  |                   Local Storage                        |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  | | File Repos     | | InMemory Repos | | Token Store   | |      |
|  | +----------------+ +----------------+ +---------------+ |      |
|  +--------------------------------------------------------+      |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Module Structure

```
src/
+-- auth/                  # Local token metadata management
+-- cli/                   # CLI entry point and commands
+-- graphql/               # Local GraphQL schema/executor
+-- interfaces/            # FileSystem, ProcessManager, Clock abstractions
+-- polling/               # Transcript monitoring and parsing
+-- repository/            # File and in-memory repositories
+-- sdk/                   # Public SDK facade and managers
+-- services/              # Atomic writer and file locking services
+-- test/                  # Test utilities, mocks, and fixtures
+-- types/                 # Shared domain types
```

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Bun | Fast TypeScript execution and built-in tooling |
| Language | TypeScript (strict mode) | Type safety and maintainability |
| GraphQL | graphql | Local query execution without server runtime |
| Testing | Vitest | Fast unit and integration tests |
| Packaging | Nix flakes | Reproducible builds |
| Task Runner | go-task | Simple automation |

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [x] CLI argument parsing
- [x] Session reader implementation
- [x] JSONL parser for session files
- [x] Basic type definitions
- [x] Testability interfaces

### Phase 2: SDK and Orchestration

- [x] SDK manager facade
- [x] Session group management
- [x] Command queue management
- [x] Config generation
- [x] Concurrent session execution

### Phase 3: Local Query and Metadata Features

- [x] Local GraphQL command/query executor
- [x] Bookmark system
- [x] Activity status tracking
- [x] Changed-file extraction
- [x] Token metadata management

### Phase 4: Enhancements

- [ ] Export functionality
- [ ] Advanced transcript search
- [ ] Performance optimization
- [ ] Additional SDK examples

---

## Related Documents

| Document | Description |
|----------|-------------|
| [spec-data-storage.md](./spec-data-storage.md) | Claude Code data structures and agent storage |
| [spec-session-groups.md](./spec-session-groups.md) | Session Group architecture and lifecycle |
| [spec-command-queue.md](./spec-command-queue.md) | Command Queue for sequential prompt execution |
| [spec-sdk-api.md](./spec-sdk-api.md) | SDK, local GraphQL CLI, token metadata, and CLI interface |
| [spec-infrastructure.md](./spec-infrastructure.md) | Error handling, testing, caching |
| [spec-deployment.md](./spec-deployment.md) | Nix packaging |
| [spec-changed-files.md](./spec-changed-files.md) | Extracting changed files from session transcripts |
| [DECISIONS.md](./DECISIONS.md) | Consolidated design decisions |

---

## claude-code-agent's Role

claude-code-agent is a local intermediary between user workflows and Claude Code:

```
Local CLI/SDK  <-->  claude-code-agent  <-->  Claude Code
                         |
                         v
                    - Generates config
                    - Executes Claude Code subprocesses
                    - Watches transcripts
                    - Emits SDK/CLI events
                    - Provides local query interfaces
                    - Writes only its own metadata
```

**claude-code-agent is a local CLI/SDK package and does not expose a network listener.**
