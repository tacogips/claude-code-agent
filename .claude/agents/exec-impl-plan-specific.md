---
name: exec-impl-plan-specific
description: Execute specific tasks by ID from implementation plans. Spawns ts-coding agents for the specified tasks, supporting parallel execution when tasks are parallelizable.
---

# Specific Task Execution Subagent

## Overview

This subagent executes **specific tasks by ID** from implementation plans.

**MANDATORY FIRST STEP**: Read `.claude/skills/exec-impl-plan-ref/SKILL.md` for common execution patterns, ts-coding invocation format, parallel execution rules, and response formats.

## Key Difference from exec-impl-plan-auto

| Aspect | exec-impl-plan-specific | exec-impl-plan-auto |
|--------|-------------------------|---------------------|
| Task Selection | Manual by task ID | Automatic based on dependencies |
| Use Case | "Run exactly these tasks" | "Run everything that can run now" |
| Required Args | Plan path + Task IDs | Plan path only |

## Required Information in Task Prompt

### Required

1. **Implementation Plan**: Path to the implementation plan (e.g., `impl-plans/active/foundation-and-core.md`)
2. **Task IDs**: Specific task IDs to execute (e.g., `TASK-001, TASK-003`)

### Optional

- **Execution Mode**: `sequential` or `parallel` (default: auto-detect based on dependencies)

### Example Invocation

```
Implementation Plan: impl-plans/active/foundation-and-core.md
Task IDs: TASK-001, TASK-002, TASK-003
Execution Mode: parallel
```

### Error Response When Required Information Missing

```
ERROR: Required information is missing from the Task prompt.

This Specific Task Execution Subagent requires:
1. Implementation Plan: Path to implementation plan in impl-plans/active/
2. Task IDs: Specific task IDs to execute (e.g., TASK-001, TASK-002)

For automatic task selection, use the exec-impl-plan-auto subagent instead.
```

---

## Specific Mode Workflow

### Step 1: Read Skill and Plan

1. Read `.claude/skills/exec-impl-plan-ref/SKILL.md`
2. Read the implementation plan file

### Step 2: Locate Specified Tasks

Find the specified TASK-XXX sections in the plan:
1. Parse task status, dependencies, deliverables, completion criteria
2. Validate all specified task IDs exist

### Step 3: Analyze Parallelization

For the specified tasks:
1. Check if they have mutual dependencies
2. Group parallelizable tasks together
3. Sequence tasks with dependencies

### Step 4: Execute Tasks

**If tasks are parallelizable**: Spawn ALL in a SINGLE message (see skill for pattern)

**If tasks have dependencies**:
1. Execute first task, wait for completion
2. Invoke `check-and-test-after-modify` agent
3. If successful, proceed to next task
4. If failed, stop and report

### Step 5: Update Plan and Report

After execution:
1. Update task statuses (see skill for format)
2. Add progress log entry
3. Check if plan is complete (see skill for finalization steps)

---

## Specific Mode Response Formats

### Success Response

```
## Implementation Execution Complete

### Plan
`impl-plans/active/<plan-name>.md`

### Tasks Executed

| Task | Status | Result |
|------|--------|--------|
| TASK-001 | Completed | Core interfaces defined |
| TASK-002 | Completed | Error types implemented |

### Parallel Execution Summary
- Tasks executed in parallel: TASK-001, TASK-002
- Tasks executed sequentially: (none)

### Next Executable Tasks
Based on updated dependency graph:
- TASK-004 (depends on TASK-001 - now available)
- TASK-005 (parallelizable)

### Plan Status
- Overall: In Progress (X/Y tasks completed)
```

### Partial Failure Response

```
## Implementation Execution Partial

### Plan
`impl-plans/active/<plan-name>.md`

### Tasks Executed

| Task | Status | Result |
|------|--------|--------|
| TASK-001 | Completed | Success |
| TASK-002 | Failed | Type errors in implementation |

### Failure Details
(See skill for format)

### Recommended Actions
1. Review failure details
2. Fix the issue
3. Re-run with: `/exec-impl-plan-specific <plan-name> TASK-002`
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
