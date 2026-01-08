# CLI Core Implementation Plan

**Status**: In Progress
**Design Reference**: design-docs/spec-sdk-api.md#7-cli-command-reference, design-docs/DESIGN.md
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of the complete CLI implementation, split for maintainability:
- `impl-plans/cli-core.md` (this file) - Core CLI framework, argument parsing, command structure
- `impl-plans/cli-session-commands.md` - Session-related commands
- `impl-plans/cli-group-commands.md` - Group, queue, bookmark, server, daemon, token, and files commands

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 7: CLI Command Reference, `design-docs/DESIGN.md` Module Structure

### Summary

Implement the core CLI framework for claude-code-agent. This includes the entry point, argument parsing, command registration infrastructure, and output formatting utilities.

### Scope

**Included**:
- CLI entry point and argument parsing
- Output formatting (table, JSON)
- Binary entry point configuration

**Excluded**:
- Command implementations (see cli-session-commands.md and cli-group-commands.md)
- TUI implementation (deferred, low priority)

---

## Implementation Overview

### Approach

Build CLI using a command framework with subcommand support. The core provides the infrastructure that all command modules use.

### Key Decisions

- Noun-oriented command structure: `<entity> <action> [options]`
- Support multiple output formats (default table, JSON with `--format json`)
- Use environment variables for common configuration overrides
- Centralized error handling and exit codes

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| SDK | Required | Other plans |

---

## Deliverables

### Deliverable 1: src/cli/output.ts

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

### Deliverable 2: src/cli/main.ts

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

### Deliverable 3: bin/claude-code-agent

**Purpose**: Binary entry point

**Exports**: None (executable script)

**Dependencies**: `src/cli/main.ts`

**Dependents**: Package installation

---

## Subtasks

### TASK-001: Output Utilities

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/cli/output.ts`
**Estimated Effort**: Small

**Description**:
Implement output formatting utilities for table and JSON output.

**Completion Criteria**:
- [x] formatTable() creates ASCII tables
- [x] formatJson() outputs formatted JSON
- [x] printSuccess() and printError() with colors
- [x] formatCost() formats USD
- [x] Unit tests (23 tests in src/cli/output.test.ts)
- [x] Type checking passes

---

### TASK-002: CLI Entry Point

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/cli/main.ts`
**Estimated Effort**: Small

**Description**:
Implement main CLI entry point with command registration.

**Completion Criteria**:
- [x] Argument parsing setup (using commander)
- [x] Subcommand registration (session, group, bookmark, server, daemon, token)
- [x] Global options (--format, --help, --version)
- [x] Error handling with proper exit codes
- [x] Type checking passes (12 tests in src/cli/main.test.ts)

---

### TASK-003: Binary Entry Point

**Status**: Not Started
**Parallelizable**: No (depends on TASK-002)
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
    |                       |
    +-----------+-----------+
                |
                v
          TASK-003 (Binary)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-003 (after TASK-002)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] Binary entry point configured
- [ ] Global install works

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test global install: `bun link && claude-code-agent --version`
4. Verify error handling with invalid commands
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
