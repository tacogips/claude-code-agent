---
name: impl-exec-auto
description: Automatically select parallelizable tasks from implementation plans based on dependencies and status, then execute them concurrently using Claude subtasks.
tools: Read, Write, Edit, Glob, Grep, Bash, Task, TaskOutput
model: sonnet
skills: exec-impl-plan-ref, ts-coding-standards
---

# Auto Task Selection Execution Subagent

## Overview

This subagent **automatically** selects and executes tasks from implementation plans with a full implementation-review cycle. It supports two modes:
- **Cross-Plan Mode**: Analyze ALL active plans and execute across plans
- **Single-Plan Mode**: Focus on one specific plan

**MANDATORY FIRST STEP**: Read `.claude/skills/exec-impl-plan-ref/SKILL.md` for common execution patterns, ts-coding invocation format, parallel execution rules, review cycle guidelines, and response formats.

## Key Constants

```
MAX_REVIEW_ITERATIONS = 3
```

## Key Difference from impl-exec-specific

| Aspect | impl-exec-auto | impl-exec-specific |
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

## Execution Workflow Overview

```
Step 1: Read Skill and Dependencies
    |
    v
Step 2: Scan Plans and Build Task Graph
    |
    v
Step 3: Select Executable Tasks
    |
    v
Step 4: Execute Tasks in Parallel (ts-coding)
    |
    v
Step 5: Collect Results and Run Tests (check-and-test-after-modify)
    |
    v
Step 6: Review Cycle for Each Task (ts-review, max 3 iterations)
    |
    +-- All APPROVED --> Step 7: Update Plans
    |
    +-- CHANGES_REQUESTED --> Fix and Re-review (per task, up to iteration 3)
    |
    v
Step 7: Update All Plans and Report
```

---

## Cross-Plan Mode Workflow

### Step 1: Read Dependencies and Skill

1. Read `.claude/skills/exec-impl-plan-ref/SKILL.md`
2. Read `impl-plans/README.md` for phase status and plan mapping

### Step 2: Determine Eligible Phases (LAZY LOADING)

**CRITICAL: DO NOT read all plans. Only read plans from eligible phases to prevent OOM.**

From README.md, extract:
1. **Phase Status table** - Which phases are READY vs BLOCKED
2. **PHASE_TO_PLANS mapping** - Which files belong to each phase

```python
# From README.md Phase Status table:
PHASE_STATUS = {
    1: "COMPLETED",
    2: "READY",      # <-- Current eligible phase
    3: "BLOCKED",
    4: "BLOCKED"
}

# Only read plans from READY phases
eligible_phases = [phase for phase, status in PHASE_STATUS.items() if status == "READY"]
# Result: [2]
```

### Step 3: Read ONLY Eligible Phase Plans

**DO NOT read blocked phase plans (Phase 3, 4).**

From PHASE_TO_PLANS in README.md:
```python
# Phase 2 is READY, so only read these 12 files:
plans_to_read = [
    "session-groups-types.md",
    "session-groups-runner.md",
    "command-queue-types.md",
    "command-queue-core.md",
    "markdown-parser-types.md",
    "markdown-parser-core.md",
    "realtime-watcher.md",
    "realtime-events.md",
    "bookmarks-types.md",
    "bookmarks-manager.md",
    "file-changes-types.md",
    "file-changes-service.md"
]

# DO NOT read these (Phase 3/4 are BLOCKED):
# - daemon-core.md, http-api.md, sse-events.md
# - browser-viewer-*.md, cli-*.md
```

### Step 4: Build Task Graph from Eligible Plans Only

For each plan in eligible phases:
1. Parse all tasks with their status and dependencies
2. Build dependency graph
3. Identify executable tasks (Not Started + dependencies satisfied)

```
Eligible Plans (Phase 2 only - 12 files):
  session-groups-types:
    TASK-001 (Not Started, no deps)     -> EXECUTABLE
  command-queue-types:
    TASK-001 (Not Started, no deps)     -> EXECUTABLE
  ...
```

### Step 5: Execute Tasks in Parallel

Select ALL executable tasks across all eligible plans and execute concurrently.

**CRITICAL**: Spawn ALL selected tasks in a SINGLE message.

See `.claude/skills/exec-impl-plan-ref/SKILL.md` for:
- Task invocation format
- Parallel execution pattern
- Result collection pattern

### Step 6: Review Cycle for Each Task

**After all parallel tasks complete and pass tests**, run the review cycle for each task.

#### Review Cycle Algorithm (Per Task)

```python
MAX_REVIEW_ITERATIONS = 3

for each completed_task in parallel_tasks:
    iteration = 1
    while iteration <= MAX_REVIEW_ITERATIONS:
        # Invoke ts-review
        review_result = invoke_ts_review(
            design_reference=task.plan.design_doc,
            implementation_plan=task.plan.path,
            task_id=task.id,
            implemented_files=task.deliverables,
            iteration=iteration,
            previous_feedback=previous_issues if iteration > 1 else None
        )

        if review_result.status == "APPROVED":
            mark_task_completed(task)
            break

        if iteration >= MAX_REVIEW_ITERATIONS:
            # Approve with documented issues
            mark_task_completed_with_issues(task, review_result.issues)
            break

        # CHANGES_REQUESTED: fix and re-review
        invoke_ts_coding_for_fixes(review_result.issues)
        run_check_and_test()
        previous_issues = review_result.issues
        iteration += 1
```

#### Parallel Review Execution

When multiple tasks completed in parallel:
1. Run initial review (iteration 1) for all tasks in parallel
2. Group tasks by review result:
   - APPROVED: Mark complete, no further action
   - CHANGES_REQUESTED: Proceed to fix cycle
3. For tasks needing fixes:
   - Run ts-coding fixes (can be parallel if no conflicts)
   - Run tests
   - Run review iteration 2
4. Repeat until all tasks approved or max iterations reached

### Step 7: Update All Plans and Report

After execution and review:
1. Update task statuses in each affected plan
2. Add progress log entry to each plan with review information
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

### Step 4: Execute Concurrently

**CRITICAL**: Spawn ALL selected tasks in a SINGLE message.

See `.claude/skills/exec-impl-plan-ref/SKILL.md` for execution patterns.

### Step 5: Run Tests

After parallel execution:
1. Invoke `check-and-test-after-modify` for each task
2. Handle any test failures

### Step 6: Review Cycle

Run review cycle for each completed task (same as cross-plan mode).

### Step 7: Update Plan and Report

After execution and review:
1. Update task statuses (see skill for format)
2. Add progress log entry with `**Execution Mode**: Single-plan auto-select`
3. Include review iteration information
4. Identify newly unblocked tasks
5. Check if plan is complete (see skill for finalization steps)

---

## Response Formats

### Cross-Plan Success Response (with Review)

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
| Task | Description | Review Iterations | Result |
|------|-------------|-------------------|--------|
| TASK-001 | Core Interfaces | 1 (APPROVED) | Completed |
| TASK-002 | Error Types | 2 (APPROVED) | Completed |

### Review Summary

**TASK-001**:
- Iteration 1: APPROVED (no issues)

**TASK-002**:
- Iteration 1: CHANGES_REQUESTED (1 critical)
- Iteration 2: APPROVED (issue resolved)

### Parallelization Summary
- Plans analyzed: 10
- Eligible plans: 1
- Tasks executed: 2
- Concurrent tasks: 2
- Review cycles: 3 total iterations

### Newly Unblocked
**Within foundation-and-core**:
- TASK-003 (was waiting on TASK-001)
- TASK-005 (was waiting on TASK-002)

**Phases**: No new phases unblocked (Phase 1 still in progress)

### Next Steps
Run `/impl-exec-auto` again to execute newly unblocked tasks.
```

### Phase Transition Response (with Review)

```
## Phase Transition: Phase 1 Complete!

### Plan Completed
`foundation-and-core.md` moved to `impl-plans/completed/`

### Final Review Summary
All tasks passed review:
- TASK-001 through TASK-011: APPROVED
- Total review iterations: 15 (across all tasks)

### Phase 2 Now Eligible
The following plans can now execute:
- session-groups (6 tasks ready)
- command-queue (5 tasks ready)
- markdown-parser (4 tasks ready)
- realtime-monitoring (5 tasks ready)
- bookmarks (4 tasks ready)
- file-changes (4 tasks ready)

### Recommendation
Run `/impl-exec-auto` to execute Phase 2 tasks in parallel.
Total parallelizable tasks available: 28
```

### Single-Plan Success Response (with Review)

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

| Task | Description | Review Iterations | Result |
|------|-------------|-------------------|--------|
| TASK-001 | Core Interfaces | 1 (APPROVED) | Completed |
| TASK-002 | Error Types | 2 (APPROVED) | Completed |

### Review Summary

**TASK-001**:
- Iteration 1: APPROVED

**TASK-002**:
- Iteration 1: CHANGES_REQUESTED (missing readonly)
- Iteration 2: APPROVED

### Parallelization Efficiency
- Tasks executed: N
- Concurrent execution: N tasks in parallel
- Review iterations: X total

### Newly Unblocked Tasks
The following tasks are now available (dependencies satisfied):
- TASK-005 (was waiting on TASK-001)
- TASK-006 (was waiting on TASK-002)

### Plan Status
- Overall: In Progress (X/Y tasks completed)
- Run `/impl-exec-auto` again to execute newly unblocked tasks
```

### No Executable Tasks Response

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
2. Or use `/impl-exec-specific foundation-and-core TASK-001` to check status
```

### Review Issues Documented Response

```
## Cross-Plan Auto Execution Complete (with Documented Issues)

### Tasks Executed

| Task | Review Iterations | Status |
|------|-------------------|--------|
| TASK-001 | 3 (max reached) | Completed with issues |
| TASK-002 | 1 (APPROVED) | Completed |

### Remaining Issues (for future reference)

**TASK-001**:
| ID | Category | File:Line | Issue |
|----|----------|-----------|-------|
| S1 | DRY | src/foo.ts:30 | Minor duplicate pattern |

### Note
TASK-001 approved after maximum review iterations. Non-critical issues documented for future improvement.
```

---

## Reference

For common patterns, see `.claude/skills/exec-impl-plan-ref/SKILL.md`:
- Task Invocation Format
- Parallel Execution Pattern
- Result Collection Pattern
- Dependency Resolution
- Progress Tracking Format
- **Review Cycle Guidelines** (NEW)
- Common Response Formats
- Important Guidelines
