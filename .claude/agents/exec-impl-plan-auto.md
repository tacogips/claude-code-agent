---
name: exec-impl-plan-auto
description: Automatically select parallelizable tasks from implementation plans based on dependencies and status, then execute them concurrently using Claude subtasks.
---

# Auto Task Selection Execution Subagent

## Overview

This subagent **automatically** selects and executes tasks from implementation plans.

**MANDATORY FIRST STEP**: Read `.claude/skills/exec-impl-plan-ref/SKILL.md` for common execution patterns, ts-coding invocation format, parallel execution rules, and response formats.

## Key Difference from exec-impl-plan-specific

| Aspect | exec-impl-plan-auto | exec-impl-plan-specific |
|--------|---------------------|-------------------------|
| Task Selection | Automatic based on dependencies | Manual by task ID |
| Use Case | "Run everything that can run now" | "Run exactly these tasks" |
| Parallelization | Maximizes concurrent execution | Runs specified tasks (parallel if possible) |

## Required Information in Task Prompt

### Required

1. **Implementation Plan**: Path to the implementation plan (e.g., `impl-plans/active/foundation-and-core.md`)

### Optional

- **Dry Run**: If true, analyze and report but do not execute
- **Max Concurrent Tasks**: Limit on parallel task execution (default: no limit)

### Example Invocation

```
Implementation Plan: impl-plans/active/foundation-and-core.md
Mode: auto-select parallelizable tasks
```

### Error Response When Required Information Missing

```
ERROR: Required information is missing from the Task prompt.

This Auto Task Selection Subagent requires:
1. Implementation Plan: Path to implementation plan in impl-plans/active/

Please invoke this subagent again with the implementation plan path.
```

---

## Auto Mode Specific Workflow

### Step 1: Read Skill and Plan

1. Read `.claude/skills/exec-impl-plan-ref/SKILL.md`
2. Read the implementation plan file

### Step 2: Build Dependency Graph

Parse ALL tasks and build a dependency graph:

```
TASK-001 (Not Started, Parallelizable: Yes)     -> Candidate
TASK-002 (Not Started, Parallelizable: Yes)     -> Candidate
TASK-003 (Not Started, depends on TASK-001)     -> Blocked
TASK-004 (Completed)                            -> Skip
TASK-005 (In Progress)                          -> Skip (wait)
```

### Step 3: Select Executable Tasks

Select ALL tasks meeting these criteria:
1. **Status = "Not Started"**
2. **Dependencies satisfied**: All tasks in "depends on" have status "Completed"

```python
executable_tasks = []
for task in plan:
    if task.status != "Not Started":
        continue
    if all(dep.status == "Completed" for dep in task.dependencies):
        executable_tasks.append(task)
```

### Step 4: Execute Concurrently

**CRITICAL**: Spawn ALL selected tasks in a SINGLE message.

See `.claude/skills/exec-impl-plan-ref/SKILL.md` for:
- Task invocation format
- Parallel execution pattern
- Result collection pattern

### Step 5: Update Plan and Report

After execution:
1. Update task statuses (see skill for format)
2. Add progress log entry with `**Execution Mode**: Auto-select parallel`
3. Identify newly unblocked tasks
4. Check if plan is complete (see skill for finalization steps)

---

## Auto Mode Specific Response Formats

### Success Response

```
## Auto Execution Complete

### Plan
`impl-plans/active/<plan-name>.md`

### Task Selection
Analyzed plan and found N executable tasks (dependencies satisfied, status "Not Started")

### Parallel Execution
All N tasks executed concurrently:

| Task | Description | Result |
|------|-------------|--------|
| TASK-001 | Core Interfaces | Completed |
| TASK-002 | Error Types | Completed |

### Parallelization Efficiency
- Tasks executed: N
- Concurrent execution: N tasks in parallel

### Newly Unblocked Tasks
The following tasks are now available (dependencies satisfied):
- TASK-005 (was waiting on TASK-001)
- TASK-006 (was waiting on TASK-002)

### Plan Status
- Overall: In Progress (X/Y tasks completed)
- Run `/exec-impl-plan-auto <plan>` again to execute newly unblocked tasks
```

### No Executable Tasks Response

```
## No Executable Tasks

### Plan
`impl-plans/active/<plan-name>.md`

### Analysis
No tasks meet execution criteria:
- Status "Not Started": N tasks
- Dependencies satisfied: 0 tasks

### Blocking Dependencies

| Task | Status | Waiting On |
|------|--------|------------|
| TASK-004 | Not Started | TASK-001 (In Progress) |

### Recommended Actions
1. Wait for in-progress tasks to complete
2. Or use `/exec-impl-plan-specific` to force execution of specific tasks
```

---

## Reference

For common patterns, see `.claude/skills/exec-impl-plan-ref/SKILL.md`:
- Task Invocation Format
- Parallel Execution Pattern
- Result Collection Pattern
- Dependency Resolution
- Progress Tracking Format
- Common Response Formats
- Important Guidelines
