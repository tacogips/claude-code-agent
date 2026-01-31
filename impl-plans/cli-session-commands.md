# CLI Session Commands Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#7-cli-command-reference
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of the complete CLI implementation, split for maintainability:
- `impl-plans/cli-core.md` - Core CLI framework, argument parsing, command structure
- `impl-plans/cli-session-commands.md` (this file) - Session-related commands
- `impl-plans/cli-group-commands.md` - Group, queue, bookmark, server, daemon, token, and files commands

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 7: CLI Command Reference

### Summary

Implement session-related commands for the claude-code-agent CLI. These commands are thin wrappers around SDK methods for managing Claude Code sessions.

### Scope

**Included**:
- Session run command
- Session add command
- Session show command
- Session watch command

**Excluded**:
- Other command categories (see cli-group-commands.md)

---

## Implementation Overview

### Approach

Build session commands as thin wrappers around SDK methods with proper error handling and output formatting.

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| CLI Core | Required | cli-core.md |
| SDK | Required | Other plans |

---

## Deliverables

### Deliverable 1: src/cli/commands/session.ts

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

**Dependencies**: `src/sdk/index.ts`, `src/cli/output.ts`

**Dependents**: main.ts

---

## Subtasks

### TASK-001: Session Commands

**Status**: Not Started
**Parallelizable**: No (depends on cli-core.md TASK-001, TASK-002)
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

## Task Dependency Graph

```
cli-core.md TASK-001 + TASK-002
                |
                v
            TASK-001
         (Session Commands)
```

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] All commands work with SDK

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test each session command manually
4. Test --format json on all commands
5. Review implementation against spec-sdk-api.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

None at this time.
