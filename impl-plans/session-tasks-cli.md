# Session Tasks CLI Implementation Plan

**Status**: Not Started
**Design Reference**: design-docs/spec-session-tasks-cli.md
**Created**: 2026-01-13

---

## Overview

Add CLI commands to expose session tasks (TodoWrite subtasks) in CLI output.

### Scope

- Add `--tasks` option to `session show` command
- Add `session tasks <session-id>` subcommand
- Update output examples documentation

### Out of Scope

- Task filtering (by status, content search)
- Task history (multiple TodoWrite snapshots)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/cli/commands/session.ts` | Add `--tasks` option and `tasks` subcommand |
| `.private/output-example/README.md` | Update documentation |
| `.private/output-example/16-session-tasks-table.txt` | New output example |
| `.private/output-example/17-session-tasks-json.json` | New output example |

---

## Tasks

### TASK-001: Add `--tasks` option to `session show`

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/cli/commands/session.ts`

**Changes**:
1. Add `.option("--tasks", "Include tasks in output")` to show command (after `--parse-markdown`)
2. Update options type: `{ parseMarkdown?: boolean; tasks?: boolean }`
3. Import `calculateTaskProgress` from `../../types/task`
4. In table format handler:
   - If `options.tasks` and `session.tasks.length > 0`:
     - Calculate progress using `calculateTaskProgress(session.tasks)`
     - Print "Tasks (X/Y completed, Z in progress):" header
     - Print task table with columns: #, Status, Content
   - If `options.tasks` and `session.tasks.length === 0`:
     - Print "No tasks found."
5. In JSON format handler:
   - If `options.tasks`:
     - Add `taskProgress` field to output object

**Completion Criteria**:
- [ ] `--tasks` option added to command definition
- [ ] Table format shows tasks section with progress summary
- [ ] JSON format includes `taskProgress` field when `--tasks` specified
- [ ] Works correctly with `--parse-markdown` option
- [ ] Empty tasks handled gracefully

---

### TASK-002: Add `session tasks` subcommand

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/cli/commands/session.ts`

**Changes**:
1. Add new command after `session show`:
   ```typescript
   sessionCmd
     .command("tasks <session-id>")
     .description("List tasks for a session")
     .action(async (sessionId: string) => { ... });
   ```
2. Implement action handler:
   - Get agent: `const agent = await getAgent();`
   - Get global options: `const globalOpts = program.opts() as GlobalOptions;`
   - Get session: `const session = await agent.sessions.getSession(sessionId);`
   - Handle null session: print error and exit 1
   - Calculate progress: `const progress = calculateTaskProgress(session.tasks);`
   - Format output based on `globalOpts.format`

**Table format output**:
```typescript
console.log(`Session: ${session.id}`);
console.log(`Project: ${session.projectPath}`);
console.log("");

if (session.tasks.length === 0) {
  console.log("No tasks found.");
  return;
}

console.log(`Progress: ${progress.completed}/${progress.total} completed (${progress.inProgress} in progress)`);
console.log("");

// Add index to tasks for table display
const tasksWithIndex = session.tasks.map((task, i) => ({
  index: i + 1,
  ...task,
}));

console.log(formatTable(tasksWithIndex, [
  { key: "index", header: "#", width: 5, align: "right" },
  { key: "status", header: "Status", width: 12 },
  { key: "content", header: "Content", width: 50 },
  { key: "activeForm", header: "Active Form", width: 40 },
]));
```

**JSON format output**:
```typescript
console.log(formatJson({
  sessionId: session.id,
  projectPath: session.projectPath,
  tasks: session.tasks,
  progress,
}));
```

**Completion Criteria**:
- [ ] `session tasks <session-id>` command registered
- [ ] Table format shows tasks with all fields (#, Status, Content, Active Form)
- [ ] JSON format returns sessionId, projectPath, tasks, progress
- [ ] Error handling for session not found
- [ ] Empty tasks handled gracefully

---

### TASK-003: Update output examples

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `.private/output-example/`

**Changes**:
1. Create `16-session-tasks-table.txt` by running:
   ```bash
   bun run src/main.ts session tasks <test-session-id>
   ```
2. Create `17-session-tasks-json.json` by running:
   ```bash
   bun run src/main.ts -f json session tasks <test-session-id>
   ```
3. Update `README.md`:
   - Remove the "Note" about tasks not being exposed
   - Add entries for new files

**Completion Criteria**:
- [ ] `16-session-tasks-table.txt` created with actual CLI output
- [ ] `17-session-tasks-json.json` created with actual CLI output
- [ ] `README.md` updated to document new commands

---

## Implementation Order

```
TASK-001 ──┐
           ├──> TASK-003
TASK-002 ──┘
```

TASK-001 and TASK-002 can be implemented in parallel.
TASK-003 depends on both being complete.

---

## Code References

- Session show command: `src/cli/commands/session.ts:112-236`
- Task types: `src/types/task.ts:21-28`
- calculateTaskProgress: `src/types/task.ts:50-75`
- formatTable: `src/cli/output.ts`
- formatJson: `src/cli/output.ts`
- SessionReader.getSession: `src/sdk/session-reader.ts:616-628`

---

## Progress Log

(To be updated during implementation)
