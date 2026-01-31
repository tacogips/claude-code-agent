# CLI Other Commands Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#7-cli-command-reference
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of the complete CLI implementation, split for maintainability:
- `impl-plans/cli-core.md` - Core CLI framework, argument parsing, command structure
- `impl-plans/cli-session-commands.md` - Session-related commands
- `impl-plans/cli-group-queue.md` - Group and queue commands
- `impl-plans/cli-other.md` (this file) - Bookmark, server, daemon, token, and files commands

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 7: CLI Command Reference

### Summary

Implement bookmark, server, daemon, token, and files commands for the claude-code-agent CLI. These commands are thin wrappers around SDK methods.

### Scope

**Included**:
- Bookmark commands (add, list, search, show, delete)
- Server commands (start)
- Daemon commands (start, stop, status)
- Token commands (create, list, revoke, rotate)
- Files commands (list, search, index)

**Excluded**:
- Session commands (see cli-session-commands.md)
- Group and queue commands (see cli-group-queue.md)

---

## Implementation Overview

### Approach

Build commands as thin wrappers around SDK methods with proper error handling and output formatting.

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| CLI Core | Required | cli-core.md |
| SDK | Required | Other plans |
| Daemon | Required | daemon-and-http-api.md |
| Bookmarks | Required | bookmarks.md |

---

## Deliverables

### Deliverable 1: src/cli/commands/bookmark.ts

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

**Dependencies**: `src/sdk/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

### Deliverable 2: src/cli/commands/server.ts

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

**Dependencies**: `src/sdk/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

### Deliverable 3: src/cli/commands/daemon.ts

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

**Dependencies**: `src/daemon/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

### Deliverable 4: src/cli/commands/token.ts

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

**Dependencies**: `src/daemon/auth.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

### Deliverable 5: src/cli/commands/files.ts

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

**Dependencies**: `src/sdk/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

## Subtasks

### TASK-001: Bookmark Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

### TASK-002: Server and Daemon Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

### TASK-003: Token Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

### TASK-004: Files Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

## Task Dependency Graph

```
cli-core.md TASK-001 + TASK-002
                |
                v
        +-------+-------+-------+
        |       |       |       |
        v       v       v       v
    TASK-001 TASK-002 TASK-003 TASK-004
   (Bookmark)(Srv/Dm) (Token)  (Files)
```

Parallelizable groups:
- Group A: All tasks after cli-core.md dependencies are satisfied

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards

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
