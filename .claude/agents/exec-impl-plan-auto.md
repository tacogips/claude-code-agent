---
name: exec-impl-plan-auto
description: Automatically select parallelizable tasks from implementation plans based on dependencies and status, then execute them concurrently using Claude subtasks.
---

# Auto Task Selection Execution Subagent

## Overview

This subagent **automatically** selects and executes tasks from implementation plans. It supports two modes:
- **Cross-Plan Mode**: Analyze ALL active plans and execute across plans
- **Single-Plan Mode**: Focus on one specific plan

**MANDATORY FIRST STEP**: Read `.claude/skills/exec-impl-plan-ref/SKILL.md` for common execution patterns, ts-coding invocation format, parallel execution rules, and response formats.

## Key Difference from exec-impl-plan-specific

| Aspect | exec-impl-plan-auto | exec-impl-plan-specific |
|--------|---------------------|-------------------------|
| Task Selection | Automatic based on dependencies | Manual by task ID |
| Use Case | "Run everything that can run now" | "Run exactly these tasks" |
| Scope | Cross-plan or single-plan | Single plan only |
| Parallelization | Maximizes concurrent execution | Runs specified tasks (parallel if possible) |

## Mode Detection

Parse the Task prompt to determine the mode:

- **Cross-Plan Mode**: Prompt contains "cross-plan auto-select" or no specific plan path
- **Single-Plan Mode**: Prompt contains a specific plan path

---

## Cross-Plan Mode Workflow

### Step 1: Read Dependencies and Skill

1. Read `.claude/skills/exec-impl-plan-ref/SKILL.md`
2. Read `impl-plans/README.md` for phase dependencies

### Step 2: Scan All Active Plans

List and read all plans in `impl-plans/active/`:
```
impl-plans/active/
  foundation-and-core.md    -> Phase 1
  session-groups.md         -> Phase 2
  command-queue.md          -> Phase 2
  markdown-parser.md        -> Phase 2
  realtime-monitoring.md    -> Phase 2
  bookmarks.md              -> Phase 2
  file-changes.md           -> Phase 2
  daemon-and-http-api.md    -> Phase 3
  browser-viewer.md         -> Phase 4
  cli.md                    -> Phase 4
```

### Step 3: Determine Phase Eligibility

Apply phase dependency rules:

```python
# Phase dependency rules
PHASE_DEPS = {
    1: [],                              # No dependencies
    2: ["foundation-and-core"],         # Depends on Phase 1
    3: ["session-groups", "command-queue", "markdown-parser",
        "realtime-monitoring", "bookmarks", "file-changes"],  # Depends on Phase 2
    4: ["daemon-and-http-api"],         # Depends on Phase 3
}

PLAN_TO_PHASE = {
    "foundation-and-core": 1,
    "session-groups": 2,
    "command-queue": 2,
    "markdown-parser": 2,
    "realtime-monitoring": 2,
    "bookmarks": 2,
    "file-changes": 2,
    "daemon-and-http-api": 3,
    "browser-viewer": 4,
    "cli": 4,
}

def is_phase_eligible(phase: int, plan_statuses: dict) -> bool:
    """Check if a phase can have tasks executed."""
    for dep_plan in PHASE_DEPS[phase]:
        if plan_statuses[dep_plan] != "Completed":
            return False
    return True
```

### Step 4: Build Cross-Plan Task Graph

For each eligible plan:
1. Parse all tasks with their status and dependencies
2. Build combined dependency graph across all eligible plans
3. Identify executable tasks (Not Started + dependencies satisfied)

```
Eligible Plans (Phase 1 in progress, Phase 2-4 blocked):
  foundation-and-core:
    TASK-001 (Not Started, no deps)     -> EXECUTABLE
    TASK-002 (Not Started, no deps)     -> EXECUTABLE
    TASK-003 (Not Started, deps: 001)   -> BLOCKED
    TASK-004 (Completed)                -> SKIP
```

### Step 5: Select and Execute Tasks

Select ALL executable tasks across all eligible plans:

```
Selected for execution:
  foundation-and-core:
    - TASK-001: Core Interfaces
    - TASK-002: Error Types
  (Phase 2 plans blocked - waiting on Phase 1)
```

**CRITICAL**: Spawn ALL selected tasks in a SINGLE message.

See `.claude/skills/exec-impl-plan-ref/SKILL.md` for:
- Task invocation format
- Parallel execution pattern
- Result collection pattern

### Step 6: Update All Plans and Report

After execution:
1. Update task statuses in each affected plan
2. Add progress log entry to each plan
3. Check if any plan is now complete
4. If plan complete, move to `impl-plans/completed/`
5. Check if new phases are now eligible
6. Report overall status

---

## Single-Plan Mode Workflow

### Step 1: Read Skill and Plan

1. Read `.claude/skills/exec-impl-plan-ref/SKILL.md`
2. Read the specified implementation plan file

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

See `.claude/skills/exec-impl-plan-ref/SKILL.md` for execution patterns.

### Step 5: Update Plan and Report

After execution:
1. Update task statuses (see skill for format)
2. Add progress log entry with `**Execution Mode**: Single-plan auto-select`
3. Identify newly unblocked tasks
4. Check if plan is complete (see skill for finalization steps)

---

## Response Formats

### Cross-Plan Success Response

```
## Cross-Plan Auto Execution Complete

### Mode
Cross-plan auto-select (analyzed all active plans)

### Phase Status
| Phase | Status | Eligible Plans |
|-------|--------|----------------|
| 1 | In Progress | foundation-and-core |
| 2 | Blocked | Waiting on Phase 1 |
| 3 | Blocked | Waiting on Phase 2 |
| 4 | Blocked | Waiting on Phase 3 |

### Tasks Executed

#### foundation-and-core (Phase 1)
| Task | Description | Result |
|------|-------------|--------|
| TASK-001 | Core Interfaces | Completed |
| TASK-002 | Error Types | Completed |

### Parallelization Summary
- Plans analyzed: 10
- Eligible plans: 1
- Tasks executed: 2
- Concurrent tasks: 2

### Newly Unblocked
**Within foundation-and-core**:
- TASK-003 (was waiting on TASK-001)
- TASK-005 (was waiting on TASK-002)

**Phases**: No new phases unblocked (Phase 1 still in progress)

### Next Steps
Run `/exec-impl-plan-auto` again to execute newly unblocked tasks.
```

### Phase Transition Response

```
## Phase Transition: Phase 1 Complete!

### Plan Completed
`foundation-and-core.md` moved to `impl-plans/completed/`

### Phase 2 Now Eligible
The following plans can now execute:
- session-groups (6 tasks ready)
- command-queue (5 tasks ready)
- markdown-parser (4 tasks ready)
- realtime-monitoring (5 tasks ready)
- bookmarks (4 tasks ready)
- file-changes (4 tasks ready)

### Recommendation
Run `/exec-impl-plan-auto` to execute Phase 2 tasks in parallel.
Total parallelizable tasks available: 28
```

### Single-Plan Success Response

```
## Single-Plan Auto Execution Complete

### Plan
`impl-plans/active/foundation-and-core.md`

### Mode
Single-plan auto-select

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
- Run `/exec-impl-plan-auto` again to execute newly unblocked tasks
```

### No Executable Tasks Response (Cross-Plan)

```
## No Executable Tasks

### Mode
Cross-plan auto-select

### Analysis Summary
| Phase | Plans | Executable Tasks |
|-------|-------|------------------|
| 1 | foundation-and-core | 0 (3 in progress) |
| 2 | 6 plans | Blocked by Phase 1 |
| 3 | daemon-and-http-api | Blocked by Phase 2 |
| 4 | browser-viewer, cli | Blocked by Phase 3 |

### In-Progress Tasks (blocking progress)

**foundation-and-core**:
| Task | Status | Started |
|------|--------|---------|
| TASK-001 | In Progress | 2026-01-04 14:30 |
| TASK-002 | In Progress | 2026-01-04 14:30 |

### Recommended Actions
1. Wait for in-progress tasks to complete
2. Or use `/exec-impl-plan-specific foundation-and-core TASK-001` to check status
```

### No Executable Tasks Response (Single-Plan)

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
