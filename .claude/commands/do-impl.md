---
description: Execute implementation tasks from an implementation plan with concurrent subtask support
argument-hint: "<plan-path> [task-ids...]"
---

## Execute Implementation Plan Command

This command executes tasks from an implementation plan, supporting concurrent execution of parallelizable tasks.

### Current Context

- Working directory: !`pwd`
- Current branch: !`git branch --show-current`

### Arguments Received

$ARGUMENTS

---

## Instructions

Invoke the `do-impl` subagent using the Task tool.

### Argument Parsing

Parse `$ARGUMENTS` to extract:

1. **Plan Path** (required): Path to implementation plan
   - Can be relative: `impl-plans/active/foundation-and-core.md`
   - Can be short name: `foundation-and-core` (auto-resolves to `impl-plans/active/foundation-and-core.md`)

2. **Task IDs** (optional): Specific tasks to execute
   - Space-separated: `TASK-001 TASK-002 TASK-003`
   - If not provided, auto-select based on dependencies and status

### Path Resolution

If plan path does not contain `/`:
- Assume it's a short name
- Resolve to: `impl-plans/active/<name>.md`

Examples:
- `foundation-and-core` -> `impl-plans/active/foundation-and-core.md`
- `impl-plans/active/session-groups.md` -> use as-is

### Invoke Subagent

```
Task tool parameters:
  subagent_type: do-impl
  prompt: |
    Implementation Plan: <resolved-plan-path>
    Task Selection: <task-ids or "auto-select based on dependencies and status">
    Execution Mode: parallel
```

### Usage Examples

**Execute all available tasks from a plan**:
```
/do-impl foundation-and-core
```
Auto-selects tasks that are "Not Started" and have dependencies satisfied.

**Execute specific tasks**:
```
/do-impl foundation-and-core TASK-001 TASK-002
```
Executes only the specified tasks (in parallel if possible).

**Execute with full path**:
```
/do-impl impl-plans/active/session-groups.md
```

**Execute single task**:
```
/do-impl foundation-and-core TASK-005
```

### List Available Plans

If no arguments provided, list available implementation plans:

```bash
# Show active plans
ls impl-plans/active/

# Show plan status summary
grep -l "Status:" impl-plans/active/*.md
```

Then display usage instructions.

### After Subagent Completes

1. Report execution results:
   - Tasks completed
   - Tasks failed (if any)
   - Tasks now available (unblocked by completed tasks)

2. Show updated plan status:
   - Overall progress (X/Y tasks completed)
   - Next executable tasks

3. If plan completed:
   - Confirm plan moved to `impl-plans/completed/`
   - Suggest next implementation plan

### Error Handling

**If no arguments provided**:
```
Usage: /do-impl <plan-path> [task-ids...]

Examples:
  /do-impl foundation-and-core              # Execute all available tasks
  /do-impl foundation-and-core TASK-001     # Execute specific task
  /do-impl session-groups TASK-001 TASK-002 # Execute multiple tasks

Available implementation plans:
  (list plans from impl-plans/active/)

Run '/do-impl <plan-name>' to see plan status and available tasks.
```

**If plan not found**:
```
Error: Implementation plan not found: <plan-path>

Searched locations:
  - impl-plans/active/<plan-path>
  - impl-plans/active/<plan-path>.md
  - <plan-path>

Available plans:
  (list plans from impl-plans/active/)
```

**If task not found**:
```
Error: Task not found in plan: <task-id>

Available tasks in <plan-name>:
  (list tasks with status)
```

### Dry Run Mode

To see what would be executed without running:
```
/do-impl foundation-and-core --dry-run
```

This shows:
- Tasks that would be selected
- Parallelization groups
- Execution order
- Dependencies blocking other tasks
