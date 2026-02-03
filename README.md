# claude-code-agent

A TypeScript-based monitoring, visualization, and orchestration tool for Claude Code sessions. Provides external observation of Claude Code task execution, session progress, and agent workflows.

## Overview

claude-code-agent acts as an **intermediary** between external applications and Claude Code:

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

**Key Value Proposition**: Non-invasive monitoring that maintains full compatibility without requiring Claude Code modifications.

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Session Viewer** | Browser-based session transcript viewing | In Development |
| **Real-time Monitoring** | Watch active sessions via fs.watch on transcript files | In Development |
| **Session Groups** | Orchestrate multi-project concurrent execution | Planned |
| **Command Queue** | Queue prompts for sequential execution with Web UI management | Planned |
| **Markdown Parsing** | Parse message content into structured JSON | Planned |
| **SDK** | TypeScript API for programmatic integration | In Development |
| **Daemon Mode** | HTTP API for remote execution with authentication | Planned |
| **Bookmarks** | Mark and retrieve important sessions/messages | Planned |

## Installation

### Using Nix (Recommended)

```bash
# Install directly
nix profile install github:tacogips/claude-code-agent

# Or use in a flake
{
  inputs.claude-code-agent.url = "github:tacogips/claude-code-agent";
}
```

### From Source

**Prerequisites**: Bun >= 1.0.0

```bash
git clone https://github.com/tacogips/claude-code-agent.git
cd claude-code-agent
bun install
bun run build
```

## Quick Start

### View Sessions

```bash
# Start the browser viewer
claude-code-agent server start --port 3000

# List sessions for current project
claude-code-agent session list

# List all sessions
claude-code-agent session list --all

# Show session details
claude-code-agent session show <session-id>
```

### Session Groups (Multi-Project Orchestration)

```bash
# Create a session group
claude-code-agent group create "my-refactor" \
  --name "Cross-Project Refactor" \
  --description "Refactor auth across services"

# Add sessions to the group
claude-code-agent session add my-refactor \
  --project /path/to/project-a \
  --prompt "Implement auth module"

claude-code-agent session add my-refactor \
  --project /path/to/project-b \
  --prompt "Update shared library" \
  --depends-on <previous-session-id>

# Run the group
claude-code-agent group run my-refactor --concurrent 3

# Watch progress
claude-code-agent group watch my-refactor
```

### Command Queue (Sequential Prompts)

```bash
# Create a queue
claude-code-agent queue create "feature-impl" \
  --project /path/to/project \
  --name "Implement New Feature"

# Add commands
claude-code-agent queue command add feature-impl \
  --prompt "Analyze current implementation"

claude-code-agent queue command add feature-impl \
  --prompt "Refactor the module"

claude-code-agent queue command add feature-impl \
  --prompt "Set up CI/CD" \
  --session-mode new  # Start new session for this command

# Run the queue
claude-code-agent queue run feature-impl

# Pause/resume/stop
claude-code-agent queue pause feature-impl
claude-code-agent queue resume feature-impl
claude-code-agent queue stop feature-impl
```

### Daemon Mode (Remote Execution)

```bash
# Start daemon with authentication
claude-code-agent daemon start \
  --port 8443 \
  --auth-token-file ~/.config/claude-code-agent/api-tokens.json

# Create API token
claude-code-agent token create \
  --name "CI/CD Token" \
  --permissions session:create,session:read

# Use the API
curl -X POST https://localhost:8443/api/sessions \
  -H "Authorization: Bearer cca_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/project", "prompt": "Implement feature"}'
```

## SDK Usage

```typescript
import { ClaudeCodeAgent, SessionGroup } from 'claude-code-agent';

const agent = new ClaudeCodeAgent({
  configDir: '~/.config/claude-code-agent',
  dataDir: '~/.local/claude-code-agent',
});

// Run a single session
const session = await agent.runSession({
  projectPath: '/path/to/project',
  prompt: 'Implement feature X',
  onProgress: (event) => console.log(event),
});

// Create and run a session group
const group = await agent.createGroup({
  name: 'My Task',
  maxConcurrent: 3,
});

await group.addSession({
  projectPath: '/path/to/project-a',
  prompt: 'Task A',
});

await group.run({
  onSessionComplete: (session) => { /* ... */ },
  onGroupComplete: (stats) => { /* ... */ },
});

// Create and run a command queue
const queue = await agent.createQueue({
  name: 'Feature Implementation',
  projectPath: '/path/to/project',
});

await queue.addCommand({ prompt: 'Analyze codebase' });
await queue.addCommand({ prompt: 'Implement feature' });
await queue.addCommand({ prompt: 'Write tests' });

await queue.run({
  onCommandStart: (cmd) => console.log(`Starting: ${cmd.prompt}`),
  onCommandComplete: (cmd) => console.log(`Done: ${cmd.prompt}`),
});
```

## CLI Command Reference

### Entity Commands

```bash
claude-code-agent <entity> <action> [options]
```

| Entity | Actions |
|--------|---------|
| `session` | `list`, `show`, `add`, `watch`, `pause`, `resume` |
| `group` | `create`, `list`, `show`, `run`, `watch`, `pause`, `resume`, `archive`, `delete` |
| `queue` | `create`, `list`, `show`, `run`, `pause`, `resume`, `stop`, `delete`, `ui` |
| `queue command` | `add`, `edit`, `remove`, `move`, `toggle-mode` |
| `bookmark` | `add`, `list`, `show`, `search`, `delete` |
| `server` | `start` |
| `daemon` | `start`, `stop`, `status` |
| `token` | `create`, `list`, `revoke`, `rotate` |

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create and run session |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/:id` | Get session details |
| GET | `/api/sessions/:id/stream` | SSE stream of session events |
| POST | `/api/groups` | Create session group |
| GET | `/api/groups/:id` | Get group details |
| POST | `/api/groups/:id/run` | Run session group |
| GET | `/api/groups/:id/stream` | SSE stream of group events |

## Development

### Prerequisites

- Nix with flakes enabled (recommended)
- Or: Bun >= 1.0.0, TypeScript

### Setup

```bash
# Using Nix (recommended)
nix develop

# Or manually
bun install
```

### Commands

```bash
bun run dev          # Run with watch mode
bun run build        # Build for production
bun run test         # Run tests
bun run test:watch   # Run tests in watch mode
bun run typecheck    # Type check
bun run format       # Format code
```

### Project Structure

```
src/
+-- cli/                # CLI entry point (thin wrapper around SDK)
+-- sdk/                # Core SDK (TypeScript API)
+-- viewer/             # UI layer (browser viewer)
+-- polling/            # Real-time monitoring (file watcher)
+-- repository/         # Data access layer
+-- daemon/             # HTTP daemon for remote execution
+-- interfaces/         # Abstractions for testability
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Language | TypeScript (strict mode) |
| HTTP Server | Elysia |
| Browser Viewer | SvelteKit |
| Testing | Vitest |
| Packaging | Nix flakes |

---

## For AI Agents

This section provides structured information optimized for AI agents working with this codebase.

### Project Context

**Purpose**: claude-code-agent is a monitoring and orchestration layer for Claude Code. It does NOT modify Claude Code behavior directly but provides observation, configuration generation, and execution management.

**Key Constraints**:
- Does NOT persist session content to databases (external apps handle this)
- Does NOT modify `~/.claude` directly
- Does NOT store auth tokens (only provides override capability)
- Reads transcript files written by Claude Code at `~/.claude/projects/`

### Architecture Patterns

1. **SDK-First Design**: CLI is a thin wrapper around SDK. All functionality is accessible programmatically.

2. **Event-Driven**: Uses typed events for session lifecycle, progress, and group coordination.

3. **Clean Architecture**: Repository pattern for data access with testable abstractions.

4. **Non-Invasive Monitoring**: Uses file watching on Claude Code's transcript files rather than modifying Claude Code.

### Key Abstractions

```typescript
// Core interfaces for testability
interface FileSystem { /* file operations */ }
interface ProcessManager { /* process spawning */ }
interface Clock { /* time operations */ }

// Main SDK classes
class ClaudeCodeAgent { /* orchestration entry point */ }
class SessionGroup { /* multi-session management */ }
class CommandQueue { /* sequential prompt execution */ }
```

### Event Types

```typescript
type SessionEvent =
  | { type: 'session_created'; sessionId: string; groupId: string }
  | { type: 'session_started'; sessionId: string; timestamp: string }
  | { type: 'session_completed'; sessionId: string; cost: number }
  | { type: 'message_added'; sessionId: string; message: Message }
  | { type: 'tool_executed'; sessionId: string; toolName: string }
  // ... more events
```

### Directory Conventions

| Path | Purpose |
|------|---------|
| `~/.config/claude-code-agent/` | User configuration, templates |
| `~/.local/claude-code-agent/` | Runtime data, session groups, queues |
| `~/.claude/projects/` | Claude Code transcript files (read-only) |

### Design Documentation

For detailed specifications, see `design-docs/`:

| Document | Description |
|----------|-------------|
| `DESIGN.md` | Main architecture overview |
| `spec-session-groups.md` | Session Group lifecycle and execution |
| `spec-command-queue.md` | Command Queue for sequential prompts |
| `spec-sdk-api.md` | SDK, daemon, REST API, authentication |
| `spec-viewers.md` | Browser and TUI viewer specifications |
| `DECISIONS.md` | All design decisions (Q1-Q36) |

### Implementation Plans

Implementation plans are in `impl-plans/` directory. To execute tasks:

```bash
# Auto-execute all parallelizable tasks
/impl-exec-auto <plan-name>

# Execute specific tasks
/impl-exec-specific <plan-name> TASK-001 TASK-002
```

### TypeScript Conventions

This project uses maximum TypeScript strictness. Key conventions:

- Use `neverthrow` Result types for error handling
- Use `nanoid` for ID generation
- Use `consola` for logging
- Prefer explicit types over inference for public APIs
- All async operations must handle errors explicitly

### Testing

```bash
bun run test           # Run all tests
bun run test:watch     # Watch mode
bun run test:ui        # Visual test UI
```

Tests use Vitest with mock implementations of system interfaces.

## License

MIT
