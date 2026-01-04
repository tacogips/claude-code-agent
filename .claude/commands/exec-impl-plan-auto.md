---
description: Automatically select and execute parallelizable tasks from implementation plan(s)
argument-hint: "[plan-path]"
---

## Execute Implementation Plan (Auto-Select) Command

This command **automatically analyzes** implementation plan(s) and selects tasks that can be executed concurrently based on:
- Task status (Not Started)
- Dependency satisfaction (all dependencies completed)
- Cross-plan dependencies (phase-based ordering from impl-plans/README.md)
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

Parse `$ARGUMENTS`:

1. **If no argument provided**: Analyze ALL active plans and auto-select executable tasks across plans
2. **If plan path provided**: Focus on that specific plan only
   - Can be relative: `impl-plans/active/foundation-and-core.md`
   - Can be short name: `foundation-and-core` (auto-resolves to `impl-plans/active/foundation-and-core.md`)
3. **If `--dry-run` flag present**: Analyze and report but do not execute

### Path Resolution

If plan path does not contain `/`:
- Assume it's a short name
- Resolve to: `impl-plans/active/<name>.md`

Examples:
- `foundation-and-core` -> `impl-plans/active/foundation-and-core.md`
- `impl-plans/active/session-groups.md` -> use as-is
- (no argument) -> analyze all plans in `impl-plans/active/`

### Invoke Subagent

**When no argument provided (cross-plan mode)**:
```
Task tool parameters:
  subagent_type: exec-impl-plan-auto
  prompt: |
    Mode: cross-plan auto-select
    Analyze ALL plans in impl-plans/active/
    Respect cross-plan dependencies from impl-plans/README.md
```

**When plan path provided (single-plan mode)**:
```
Task tool parameters:
  subagent_type: exec-impl-plan-auto
  prompt: |
    Implementation Plan: <resolved-plan-path>
    Mode: single-plan auto-select parallelizable tasks
```

### Usage Examples

**Execute across ALL plans (recommended)**:
```
/exec-impl-plan-auto
```
Analyzes all active plans, finds all tasks that:
- Belong to plans whose phase dependencies are satisfied
- Have status "Not Started"
- Have all task-level dependencies satisfied
- Are marked as parallelizable

Then executes them concurrently using Claude subtasks.

**Execute within a specific plan**:
```
/exec-impl-plan-auto foundation-and-core
```
Focuses on tasks within the specified plan only.

**Dry run (preview without executing)**:
```
/exec-impl-plan-auto --dry-run
/exec-impl-plan-auto foundation-and-core --dry-run
```

### What the Subagent Does

#### Cross-Plan Mode (no argument)

1. **Reads impl-plans/README.md** for phase dependencies
2. **Scans all plans in impl-plans/active/**
3. **Determines phase eligibility**:
   - Phase 1 (foundation-and-core): Always eligible
   - Phase 2: Eligible when Phase 1 plan is Completed
   - Phase 3: Eligible when Phase 2 plans have critical tasks Completed
   - Phase 4: Eligible when Phase 3 is Completed
4. **Builds cross-plan dependency graph**
5. **Selects executable tasks from ALL eligible plans**
6. **Spawns ts-coding agents** concurrently for selected tasks
7. **Updates each plan's progress log and status**
8. **Reports** overall progress and newly unblocked tasks/plans

#### Single-Plan Mode (with argument)

1. **Reads the implementation plan file**
2. **Builds dependency graph** from task definitions
3. **Identifies executable tasks** within that plan only
4. **Spawns ts-coding agents** in parallel
5. **Updates plan status**

### Cross-Plan Dependencies (from impl-plans/README.md)

```
Phase 1: foundation-and-core (no dependencies)
    |
    v
Phase 2: session-groups, command-queue, markdown-parser,
         realtime-monitoring, bookmarks, file-changes
    |    (can run in parallel)
    v
Phase 3: daemon-and-http-api
    |
    v
Phase 4: browser-viewer, cli
```

### Error Handling

**If no executable tasks across all plans**:
```
No executable tasks found across all active plans.

Current status by phase:

Phase 1:
- foundation-and-core: In Progress (X/Y tasks)
  - In Progress: TASK-001, TASK-002
  - Blocked: TASK-003 (waiting on TASK-001)

Phase 2: (blocked by Phase 1)
- session-groups: Blocked (waiting on foundation-and-core)
- command-queue: Blocked (waiting on foundation-and-core)
...

Recommended Actions:
1. Wait for in-progress tasks to complete
2. Use /exec-impl-plan-specific to run specific tasks
```

### After Subagent Completes

1. Report execution results:
   - Plans analyzed
   - Tasks selected for execution (grouped by plan)
   - Tasks completed successfully
   - Tasks failed (if any)
   - Tasks/Plans now unblocked

2. Show updated status:
   - Overall progress by phase
   - Parallelization efficiency

3. If more tasks available:
   - List next executable tasks/plans
   - Suggest re-running `/exec-impl-plan-auto`

4. If a plan completed:
   - Confirm plan moved to `impl-plans/completed/`
   - Note newly unblocked plans

5. If all plans completed:
   - Congratulate on implementation completion
