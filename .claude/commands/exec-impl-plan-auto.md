---
description: Automatically select and execute parallelizable tasks from an implementation plan
argument-hint: "<plan-path>"
---

## Execute Implementation Plan (Auto-Select) Command

This command **automatically analyzes** an implementation plan and selects tasks that can be executed concurrently based on:
- Task status (Not Started)
- Dependency satisfaction (all dependencies completed)
- Parallelization markers (Parallelizable: Yes)

For executing specific tasks by ID, use `/exec-impl-plan-specific` instead.

### Current Context

- Working directory: !`pwd`
- Current branch: !`git branch --show-current`

### Arguments Received

$ARGUMENTS

---

## Instructions

Invoke the `exec-impl-plan-auto` subagent using the Task tool.

### Argument Parsing

Parse `$ARGUMENTS` to extract:

1. **Plan Path** (required): Path to implementation plan
   - Can be relative: `impl-plans/active/foundation-and-core.md`
   - Can be short name: `foundation-and-core` (auto-resolves to `impl-plans/active/foundation-and-core.md`)

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
  subagent_type: exec-impl-plan-auto
  prompt: |
    Implementation Plan: <resolved-plan-path>
    Mode: auto-select parallelizable tasks
```

### Usage Examples

**Execute all available parallelizable tasks**:
```
/exec-impl-plan-auto foundation-and-core
```
Analyzes the plan, finds all tasks that:
- Have status "Not Started"
- Have all dependencies satisfied
- Are marked as parallelizable

Then executes them concurrently using Claude subtasks.

**Execute with full path**:
```
/exec-impl-plan-auto impl-plans/active/session-groups.md
```

### What the Subagent Does

1. **Reads the implementation plan**
2. **Builds dependency graph** from task definitions
3. **Identifies executable tasks**:
   - Status = "Not Started"
   - All dependencies = "Completed"
   - Parallelizable = "Yes" (or no dependencies on other not-started tasks)
4. **Groups tasks for concurrent execution**
5. **Spawns ts-coding agents** in parallel for each group
6. **Collects results** and updates the plan
7. **Reports** what was completed and what's now available

### Error Handling

**If no arguments provided**:
```
Usage: /exec-impl-plan-auto <plan-path>

This command automatically selects and executes parallelizable tasks.

Examples:
  /exec-impl-plan-auto foundation-and-core
  /exec-impl-plan-auto impl-plans/active/session-groups.md

For executing specific tasks, use:
  /exec-impl-plan-specific foundation-and-core TASK-001 TASK-002

Available implementation plans:
  (list plans from impl-plans/active/)
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

**If no executable tasks**:
```
No executable tasks found in plan: <plan-name>

Current status:
- Completed: X tasks
- In Progress: Y tasks
- Blocked: Z tasks (waiting on dependencies)

Blocked tasks and their dependencies:
  TASK-004: waiting on TASK-001, TASK-002
  TASK-005: waiting on TASK-003

Consider:
1. Complete in-progress tasks first
2. Use /exec-impl-plan-specific to run specific blocked tasks if dependencies are actually met
```

### After Subagent Completes

1. Report execution results:
   - Tasks selected for execution
   - Tasks completed successfully
   - Tasks failed (if any)
   - Tasks now unblocked (available for next run)

2. Show updated plan status:
   - Overall progress (X/Y tasks completed)
   - Parallelization efficiency (N tasks ran concurrently)

3. If more tasks available:
   - List next executable tasks
   - Suggest re-running `/exec-impl-plan-auto` for next batch

4. If plan completed:
   - Confirm plan moved to `impl-plans/completed/`
   - Suggest next implementation plan

### Dry Run Mode

To see what would be executed without running:
```
/exec-impl-plan-auto foundation-and-core --dry-run
```

This shows:
- Tasks that would be selected
- Parallelization groups
- Execution order
- Dependencies blocking other tasks
