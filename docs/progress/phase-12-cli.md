# Phase 12: CLI

**Status**: NOT_STARTED

**Goal**: Implement command-line interface.

## Spec Reference

- `design-docs/DESIGN.md` - CLI section
- `design-docs/spec-sdk-api.md` - CLI commands

---

## Dependencies

- Phase 10: SDK Entry Point
- Phase 11: HTTP API (for server commands)

---

## 1. CLI Core

### 1.1 CLI Entry

**File**: `src/cli/main.ts`
**Status**: NOT_STARTED

**Features**:
- Command routing
- Argument parsing
- Help text generation

**Checklist**:
- [ ] Implement CLI entry point
- [ ] Implement command routing
- [ ] Implement help generation
- [ ] Write unit tests

### 1.2 Formatter

**File**: `src/cli/formatter.ts`
**Status**: NOT_STARTED

**Features**:
- Table formatting
- JSON formatting
- Markdown formatting
- Cost display

**Checklist**:
- [ ] Implement formatTable()
- [ ] Implement formatJson()
- [ ] Implement formatCost()
- [ ] Write unit tests

---

## 2. Commands

### 2.1 Session Commands

**File**: `src/cli/commands/session.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca session run` - Start standalone session
- `cca session list` - List sessions
- `cca session show <id>` - Show session detail
- `cca session watch <id>` - Watch session in real-time
- `cca session pause <id>` - Pause session
- `cca session resume <id>` - Resume session

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.2 Group Commands

**File**: `src/cli/commands/group.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca group create` - Create group
- `cca group list` - List groups
- `cca group show <id>` - Show group detail
- `cca group run <id>` - Run group
- `cca group pause <id>` - Pause group
- `cca group resume <id>` - Resume group
- `cca group watch <id>` - Watch group progress

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.3 Queue Commands

**File**: `src/cli/commands/queue.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca queue create` - Create queue
- `cca queue list` - List queues
- `cca queue show <id>` - Show queue detail
- `cca queue run <id>` - Run queue
- `cca queue pause <id>` - Pause queue
- `cca queue add <id>` - Add command to queue
- `cca queue edit <id>` - Edit command in queue
- `cca queue remove <id>` - Remove command from queue
- `cca queue move <id>` - Reorder command in queue

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.4 Bookmark Commands

**File**: `src/cli/commands/bookmark.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca bookmark add` - Add bookmark
- `cca bookmark list` - List bookmarks
- `cca bookmark show <id>` - Show bookmark
- `cca bookmark search` - Search bookmarks
- `cca bookmark delete <id>` - Delete bookmark

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.5 Files Commands

**File**: `src/cli/commands/files.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca files list <session-id>` - List changed files
- `cca files search <path>` - Find sessions that modified file
- `cca files index --build` - Build file index
- `cca files index --stats` - Show index stats

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.6 Server Commands

**File**: `src/cli/commands/server.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca server start` - Start viewer server
- `cca server stop` - Stop server
- `cca server status` - Show server status

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.7 Daemon Commands

**File**: `src/cli/commands/daemon.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca daemon start` - Start daemon
- `cca daemon stop` - Stop daemon
- `cca daemon status` - Show daemon status

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

### 2.8 Token Commands

**File**: `src/cli/commands/token.ts`
**Status**: NOT_STARTED

**Commands**:
- `cca token create` - Create API token
- `cca token list` - List tokens
- `cca token revoke <id>` - Revoke token
- `cca token rotate` - Rotate token

**Checklist**:
- [ ] Implement all commands
- [ ] Write unit tests

---

## Implementation Order

1. CLI core (entry, formatter)
2. Session commands (most basic)
3. Group commands
4. Queue commands
5. Server/daemon commands
6. Other commands

---

## Notes

- CLI is a thin wrapper around SDK
- Use consistent output formatting
- Support both human-readable and JSON output
- Consider using a CLI framework (commander, yargs, or custom)
