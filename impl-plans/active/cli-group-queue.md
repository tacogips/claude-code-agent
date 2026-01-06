# CLI Group and Queue Commands Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#7-cli-command-reference
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of the complete CLI implementation, split for maintainability:
- `impl-plans/active/cli-core.md` - Core CLI framework, argument parsing, command structure
- `impl-plans/active/cli-session-commands.md` - Session-related commands
- `impl-plans/active/cli-group-queue.md` (this file) - Group and queue commands
- `impl-plans/active/cli-other.md` - Bookmark, server, daemon, token, and files commands

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 7: CLI Command Reference

### Summary

Implement group and queue commands for the claude-code-agent CLI. These commands are thin wrappers around SDK methods.

### Scope

**Included**:
- Group commands (create, list, run, pause, resume, watch, archive, delete)
- Queue commands (create, list, run, pause, resume, stop, delete, ui, command management)

**Excluded**:
- Session commands (see cli-session-commands.md)
- Other commands (see cli-other.md)

---

## Implementation Overview

### Approach

Build commands as thin wrappers around SDK methods with proper error handling and output formatting.

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| CLI Core | Required | cli-core.md |
| SDK | Required | Other plans |
| Session Groups | Required | session-groups.md |
| Command Queue | Required | command-queue.md |

---

## Deliverables

### Deliverable 1: src/cli/commands/group.ts

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

**Dependencies**: `src/sdk/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

### Deliverable 2: src/cli/commands/queue.ts

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

**Dependencies**: `src/sdk/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

## Subtasks

### TASK-001: Group Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

### TASK-002: Queue Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

## Task Dependency Graph

```
cli-core.md TASK-001 + TASK-002
                |
                v
            +---+---+
            |       |
            v       v
        TASK-001 TASK-002
        (Group)  (Queue)
```

Parallelizable groups:
- Group A: TASK-001 and TASK-002 after cli-core.md dependencies are satisfied

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
