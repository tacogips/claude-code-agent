# CLI Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#7-cli-command-reference, design-docs/DESIGN.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 7: CLI Command Reference, `design-docs/DESIGN.md` Module Structure

### Summary

Implement the command-line interface for claude-code-agent. The CLI is a thin wrapper around the SDK, providing noun-oriented commands for sessions, groups, queues, bookmarks, server/daemon control, and token management.

### Scope

**Included**:
- CLI entry point and argument parsing
- Session commands (run, add, show, watch)
- Group commands (create, list, run, pause, resume, watch)
- Queue commands (create, list, run, pause, resume, command add/edit/remove)
- Bookmark commands (add, list, search, show, delete)
- Server commands (start)
- Daemon commands (start, stop, status)
- Token commands (create, list, revoke, rotate)
- Output formatting (table, JSON)

**Excluded**:
- TUI implementation (deferred, low priority)

---

## Implementation Overview

### Approach

Build CLI using a command framework with subcommand support. Each command category (session, group, queue, etc.) has its own module that imports from SDK.

### Key Decisions

- Noun-oriented command structure: `<entity> <action> [options]`
- All commands are thin wrappers around SDK methods
- Support multiple output formats (default table, JSON with `--format json`)
- Use environment variables for common configuration overrides

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| SDK | Required | Other plans |
| Session Groups | Required | session-groups.md |
| Command Queue | Required | command-queue.md |
| Daemon | Required | daemon-and-http-api.md |
| Bookmarks | Required | bookmarks.md |

---

## Deliverables

### Deliverable 1: src/cli/main.ts

**Purpose**: CLI entry point

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `main` | function | CLI entry point | bin/claude-code-agent |
| `createCli` | function | Create CLI instance | main, tests |

**Function Signatures**:

```
main(): Promise<void>
  Purpose: Parse arguments and execute command
  Called by: bin/claude-code-agent

createCli(): Commander
  Purpose: Create and configure CLI with all commands
  Called by: main(), tests
```

**Dependencies**: `commander` or similar, all command modules

**Dependents**: Package binary entry point

---

### Deliverable 2: src/cli/commands/session.ts

**Purpose**: Session-related commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerSessionCommands` | function | Register session subcommands | main.ts |

**Commands**:

```
session run
  Options:
    --project <path>: Project directory (default: cwd)
    --prompt <text>: Prompt text
    --template <name>: Template name
    --format <format>: Output format (default, json)
  Purpose: Run a standalone session
  SDK: agent.runSession()

session add <group-id>
  Options:
    --project <path>: Project directory
    --prompt <text>: Prompt text
    --depends-on <id>: Dependency session ID
    --template <name>: Template name
  Purpose: Add session to a group
  SDK: group.addSession()

session show <session-id>
  Options:
    --parse-markdown: Parse message content
    --format <format>: Output format
  Purpose: Show session details
  SDK: agent.getSession()

session watch <session-id>
  Options:
    --format <format>: Output format (default, json)
  Purpose: Watch session progress in real-time
  SDK: session.watch()
```

**Dependencies**: `src/sdk/index.ts`

**Dependents**: main.ts

---

### Deliverable 3: src/cli/commands/group.ts

**Purpose**: Session Group commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerGroupCommands` | function | Register group subcommands | main.ts |

**Commands**:

```
group create <slug>
  Options:
    --name <name>: Human-readable name
    --description <text>: Description
  Purpose: Create a new session group
  SDK: agent.createGroup()

group list
  Options:
    --status <status>: Filter by status
    --format <format>: Output format
  Purpose: List session groups
  SDK: agent.groups.list()

group show <group-id>
  Options:
    --format <format>: Output format
  Purpose: Show group details
  SDK: agent.getGroup()

group run <group-id>
  Options:
    --concurrent <n>: Max concurrent sessions
    --respect-dependencies: Honor dependency graph
  Purpose: Run session group
  SDK: group.run()

group watch <group-id>
  Options:
    --format <format>: Output format
  Purpose: Watch group progress
  SDK: group.watch()

group pause <group-id>
  Purpose: Pause running group
  SDK: group.pause()

group resume <group-id>
  Purpose: Resume paused group
  SDK: group.resume()

group archive <group-id>
  Purpose: Archive completed group
  SDK: group.archive()

group delete <group-id>
  Options:
    --force: Skip confirmation
  Purpose: Delete group
  SDK: agent.groups.delete()
```

**Dependencies**: `src/sdk/index.ts`

**Dependents**: main.ts

---

### Deliverable 4: src/cli/commands/queue.ts

**Purpose**: Command Queue commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerQueueCommands` | function | Register queue subcommands | main.ts |

**Commands**:

```
queue create <slug>
  Options:
    --project <path>: Project directory
    --name <name>: Human-readable name
  Purpose: Create command queue
  SDK: agent.createQueue()

queue list
  Options:
    --status <status>: Filter by status
    --format <format>: Output format
  Purpose: List command queues
  SDK: agent.queues.list()

queue show <queue-id>
  Options:
    --format <format>: Output format
  Purpose: Show queue details
  SDK: agent.getQueue()

queue run <queue-id>
  Purpose: Run command queue
  SDK: queue.run()

queue pause <queue-id>
  Purpose: Pause running queue
  SDK: queue.pause()

queue resume <queue-id>
  Purpose: Resume paused queue
  SDK: queue.resume()

queue stop <queue-id>
  Purpose: Stop queue
  SDK: queue.stop()

queue delete <queue-id>
  Options:
    --force: Skip confirmation
  Purpose: Delete queue
  SDK: agent.queues.delete()

queue ui [queue-id]
  Purpose: Open Web UI for queue management
  SDK: Opens browser to viewer URL

queue command add <queue-id>
  Options:
    --prompt <text>: Prompt text
    --session-mode <mode>: 'continue' or 'new'
    --position <index>: Insert position
  Purpose: Add command to queue
  SDK: queue.addCommand()

queue command edit <queue-id> <index>
  Options:
    --prompt <text>: Updated prompt
    --session-mode <mode>: 'continue' or 'new'
  Purpose: Edit command
  SDK: queue.updateCommand()

queue command toggle-mode <queue-id> <index>
  Purpose: Toggle session mode
  SDK: queue.toggleSessionMode()

queue command remove <queue-id> <index>
  Purpose: Remove command
  SDK: queue.removeCommand()

queue command move <queue-id> <from> <to>
  Purpose: Reorder command
  SDK: queue.reorderCommand()
```

**Dependencies**: `src/sdk/index.ts`

**Dependents**: main.ts

---

### Deliverable 5: src/cli/commands/bookmark.ts

**Purpose**: Bookmark commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerBookmarkCommands` | function | Register bookmark subcommands | main.ts |

**Commands**:

```
bookmark add
  Options:
    --session <id>: Session ID
    --message <id>: Message ID (optional)
    --from <id>: Range start message ID
    --to <id>: Range end message ID
    --name <name>: Bookmark name
    --tags <tags>: Comma-separated tags
  Purpose: Create bookmark
  SDK: agent.bookmarks.add()

bookmark list
  Options:
    --tag <tag>: Filter by tag
    --format <format>: Output format
  Purpose: List bookmarks
  SDK: agent.bookmarks.list()

bookmark search <query>
  Options:
    --metadata-only: Search metadata only
    --format <format>: Output format
  Purpose: Search bookmarks
  SDK: agent.bookmarks.search()

bookmark show <bookmark-id>
  Options:
    --format <format>: Output format
  Purpose: Show bookmark details
  SDK: agent.bookmarks.get()

bookmark delete <bookmark-id>
  Purpose: Delete bookmark
  SDK: agent.bookmarks.delete()
```

**Dependencies**: `src/sdk/index.ts`

**Dependents**: main.ts

---

### Deliverable 6: src/cli/commands/server.ts

**Purpose**: Server commands (viewer only)

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerServerCommands` | function | Register server subcommands | main.ts |

**Commands**:

```
server start
  Options:
    --port <port>: Server port (default: 3000)
    --no-open: Don't auto-open browser
  Purpose: Start browser viewer server
  SDK: agent.startViewer()
```

**Dependencies**: `src/sdk/index.ts`

**Dependents**: main.ts

---

### Deliverable 7: src/cli/commands/daemon.ts

**Purpose**: Daemon commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerDaemonCommands` | function | Register daemon subcommands | main.ts |

**Commands**:

```
daemon start
  Options:
    --host <host>: Bind address (default: 0.0.0.0)
    --port <port>: Server port (default: 8443)
    --auth-token-file <path>: Path to tokens.json
    --tls-cert <path>: TLS certificate
    --tls-key <path>: TLS private key
    --with-viewer: Include browser viewer
  Purpose: Start daemon server
  SDK: daemon.start()

daemon stop
  Purpose: Stop running daemon
  SDK: daemon.stop()

daemon status
  Options:
    --format <format>: Output format
  Purpose: Show daemon status
  SDK: daemon.getStatus()
```

**Dependencies**: `src/daemon/index.ts`

**Dependents**: main.ts

---

### Deliverable 8: src/cli/commands/token.ts

**Purpose**: Token management commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerTokenCommands` | function | Register token subcommands | main.ts |

**Commands**:

```
token create
  Options:
    --name <name>: Token name
    --permissions <perms>: Comma-separated permissions
    --expires <duration>: Expiration (e.g., 365d)
  Purpose: Create API token
  SDK: tokenManager.createToken()
  Output: Full token (only time shown)

token list
  Options:
    --format <format>: Output format
  Purpose: List tokens (metadata only)
  SDK: tokenManager.listTokens()

token revoke <token-id>
  Purpose: Revoke token
  SDK: tokenManager.revokeToken()

token rotate <token-id>
  Purpose: Rotate token (create new, revoke old)
  SDK: tokenManager.rotateToken()
  Output: New token
```

**Dependencies**: `src/daemon/auth.ts`

**Dependents**: main.ts

---

### Deliverable 9: src/cli/commands/files.ts

**Purpose**: File changes commands

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `registerFilesCommands` | function | Register files subcommands | main.ts |

**Commands**:

```
files list <session-id>
  Options:
    --show-changes: Show diff details
    --format <format>: table, json, paths
    --ext <extensions>: Filter by extension
    --dir <directory>: Filter by directory
  Purpose: List files changed in session
  SDK: fileChangeService.getSessionChangedFiles()

files search <file-path>
  Options:
    --show-changes: Show diff details
    --project <path>: Filter by project
    --from <date>: Filter from date
    --to <date>: Filter to date
    --format <format>: Output format
  Purpose: Find sessions that modified file
  SDK: fileChangeService.findSessionsByFile()

files index
  Options:
    --build: Build/rebuild index
    --stats: Show index statistics
    --project <path>: Limit to project
  Purpose: Manage file change index
  SDK: fileChangeService.buildIndex(), getIndexStats()
```

**Dependencies**: `src/sdk/index.ts`

**Dependents**: main.ts

---

### Deliverable 10: src/cli/output.ts

**Purpose**: Output formatting utilities

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `formatTable` | function | Format data as table | All commands |
| `formatJson` | function | Format data as JSON | All commands |
| `printSuccess` | function | Print success message | All commands |
| `printError` | function | Print error message | All commands |
| `formatCost` | function | Format cost in USD | Session/group display |

**Function Signatures**:

```
formatTable<T>(data: T[], columns: ColumnDef<T>[]): string
  Purpose: Format array as ASCII table
  Called by: list commands

formatJson(data: unknown, pretty?: boolean): string
  Purpose: Format data as JSON
  Called by: commands with --format json

printSuccess(message: string): void
  Purpose: Print success message with color
  Called by: Mutating commands

printError(error: Error | string): void
  Purpose: Print error message with color
  Called by: Error handlers

formatCost(usd: number): string
  Purpose: Format as $X.XX
  Called by: Session/group display
```

**Dependencies**: None (uses console)

**Dependents**: All command modules

---

## Subtasks

### TASK-001: Output Utilities

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/cli/output.ts`
**Estimated Effort**: Small

**Description**:
Implement output formatting utilities for table and JSON output.

**Completion Criteria**:
- [ ] formatTable() creates ASCII tables
- [ ] formatJson() outputs formatted JSON
- [ ] printSuccess() and printError() with colors
- [ ] formatCost() formats USD
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-002: CLI Entry Point

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/cli/main.ts`
**Estimated Effort**: Small

**Description**:
Implement main CLI entry point with command registration.

**Completion Criteria**:
- [ ] Argument parsing setup
- [ ] Subcommand registration
- [ ] Global options (--format, --help, --version)
- [ ] Error handling with proper exit codes
- [ ] Type checking passes

---

### TASK-003: Session Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/session.ts`
**Estimated Effort**: Medium

**Description**:
Implement session subcommands.

**Completion Criteria**:
- [ ] session run command
- [ ] session add command
- [ ] session show command with --parse-markdown
- [ ] session watch command with streaming output
- [ ] All commands support --format json
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-004: Group Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/group.ts`
**Estimated Effort**: Medium

**Description**:
Implement session group subcommands.

**Completion Criteria**:
- [ ] All CRUD commands (create, list, show, delete)
- [ ] Execution commands (run, pause, resume)
- [ ] watch command with streaming output
- [ ] archive command
- [ ] All commands support --format json
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-005: Queue Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/queue.ts`
**Estimated Effort**: Medium

**Description**:
Implement command queue subcommands.

**Completion Criteria**:
- [ ] All queue CRUD commands
- [ ] Execution commands (run, pause, resume, stop)
- [ ] Command management (add, edit, remove, move, toggle-mode)
- [ ] ui command opens browser
- [ ] All commands support --format json
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-006: Bookmark Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/bookmark.ts`
**Estimated Effort**: Small

**Description**:
Implement bookmark subcommands.

**Completion Criteria**:
- [ ] All CRUD commands
- [ ] search command with --metadata-only
- [ ] Support for session, message, and range bookmarks
- [ ] All commands support --format json
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-007: Server and Daemon Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/server.ts`, `src/cli/commands/daemon.ts`
**Estimated Effort**: Small

**Description**:
Implement server and daemon subcommands.

**Completion Criteria**:
- [ ] server start with --port, --no-open
- [ ] daemon start with all options
- [ ] daemon stop
- [ ] daemon status
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-008: Token Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/token.ts`
**Estimated Effort**: Small

**Description**:
Implement token management subcommands.

**Completion Criteria**:
- [ ] token create (outputs full token)
- [ ] token list (metadata only)
- [ ] token revoke
- [ ] token rotate
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-009: Files Commands

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/cli/commands/files.ts`
**Estimated Effort**: Medium

**Description**:
Implement file changes subcommands.

**Completion Criteria**:
- [ ] files list with filters and --show-changes
- [ ] files search with date range filters
- [ ] files index with --build and --stats
- [ ] Output formats: table, json, paths
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-010: Binary Entry Point

**Status**: Not Started
**Parallelizable**: No (depends on all above)
**Deliverables**: `bin/claude-code-agent`, update `package.json`
**Estimated Effort**: Small

**Description**:
Create binary entry point and configure package.json.

**Completion Criteria**:
- [ ] Shebang and main() call
- [ ] package.json bin entry
- [ ] Global install works
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Output)     TASK-002 (Entry)
    |                       |
    +-------+---------------+
            |
            v
    +-------+-------+-------+-------+-------+
    |       |       |       |       |       |
    v       v       v       v       v       v
TASK-003 TASK-004 TASK-005 TASK-006 TASK-007 TASK-008 TASK-009
(Session) (Group) (Queue) (Bookmark)(Srv/Dm) (Token) (Files)
    |       |       |       |       |       |       |
    +-------+-------+-------+-------+-------+-------+
                            |
                            v
                      TASK-010 (Binary)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-003 through TASK-009 (after Group A)
- Group C: TASK-010 (after Group B)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] Global install works

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test all commands manually
4. Test --format json on all list commands
5. Review implementation against spec-sdk-api.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding shell completion support
- Consider adding interactive mode for some commands

### Future Enhancements

- Shell completion scripts
- Interactive prompts for missing required options
- Command history
