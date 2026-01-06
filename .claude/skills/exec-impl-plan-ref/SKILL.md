---
name: exec-impl-plan-ref
description: Use when executing tasks from implementation plans. Provides task selection, parallel execution, progress tracking, and review cycle guidelines.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TaskOutput
---

# Implementation Execution Skill

This skill provides guidelines for executing implementation plans created by the `impl-plan` agent.

## When to Apply

Apply this skill when:
- Executing tasks from an implementation plan in `impl-plans/active/`
- Tracking progress during multi-session implementation work
- Coordinating concurrent execution of parallelizable subtasks
- Updating implementation plan status and progress logs

## Purpose

This skill bridges implementation plans (what to build) and actual code implementation. It provides:
- Task selection based on dependencies and parallelization
- Concurrent execution via Claude subtasks
- Progress tracking and plan updates
- Completion verification and plan finalization

## Execution Modes

Two execution modes are available:

### Auto Mode (`impl-exec-auto`)

Automatically selects and executes all parallelizable tasks. Supports two sub-modes:

**Cross-Plan Mode** (no argument - recommended):
```bash
/impl-exec-auto
```
Analyzes ALL active plans and executes tasks across plans based on phase dependencies.

**Single-Plan Mode** (with argument):
```bash
/impl-exec-auto foundation-and-core
```
Focuses on one specific plan only.

Use this mode when:
- Starting implementation (cross-plan mode)
- Continuing work after completing some tasks
- You want maximum parallelization across the entire project

The auto mode:
1. Reads phase dependencies from `impl-plans/README.md`
2. Analyzes all active plans (or specified plan)
3. Determines which phases/plans are eligible
4. Builds dependency graph(s)
5. Selects ALL tasks with satisfied dependencies
6. Executes them concurrently
7. Reports newly unblocked tasks and phases

### Specific Mode (`impl-exec-specific`)

Executes specific tasks by ID:

```bash
/impl-exec-specific foundation-and-core TASK-001 TASK-002
```

Use this mode when:
- Re-running a failed task
- Testing a specific implementation
- You know exactly which tasks to run

## Execution Workflow

### Phase 1: Plan Analysis

1. **Read the implementation plan**: Load from `impl-plans/active/<plan-name>.md`
2. **Parse task status**: Identify tasks by status (Not Started, In Progress, Completed)
3. **Build dependency graph**: Understand which tasks depend on others
4. **Select executable tasks**: Tasks with status "Not Started" and all dependencies satisfied

### Phase 2: Task Selection Strategy

Select tasks for execution based on:

| Criterion | Priority | Rationale |
|-----------|----------|-----------|
| Dependencies satisfied | Required | Cannot start blocked tasks |
| Marked as parallelizable | High | Can run concurrently |
| Small estimated effort | Medium | Quick wins build momentum |
| Foundation/core tasks | High | Unblock other tasks |

### Phase 3: Concurrent Execution

For parallelizable tasks with no mutual dependencies:

1. **Spawn multiple ts-coding agents** using Task tool with `run_in_background: true`
2. **Provide complete context** to each agent:
   - Purpose: From task description
   - Reference Document: The implementation plan path
   - Implementation Target: Deliverables from the task
   - Completion Criteria: From task completion criteria
3. **Collect results** using TaskOutput tool
4. **Handle failures**: If one task fails, other parallel tasks continue

### Phase 4: Progress Update

After task execution:

1. **Update task status** in the implementation plan:
   - Not Started -> In Progress (when started)
   - In Progress -> Completed (when all criteria met)
2. **Add progress log entry**:
   ```markdown
   ### Session: YYYY-MM-DD HH:MM
   **Tasks Completed**: TASK-001, TASK-002
   **Tasks In Progress**: TASK-003
   **Blockers**: None
   **Notes**: Implementation notes and decisions made
   ```
3. **Check completion criteria** for the overall plan
4. **Move to completed** if all tasks done: `impl-plans/active/` -> `impl-plans/completed/`

## Task Invocation Format

When invoking the `ts-coding` agent for a task:

```
Task tool parameters:
  subagent_type: ts-coding
  prompt: |
    Purpose: <task description from implementation plan>
    Reference Document: impl-plans/active/<plan-name>.md
    Implementation Target: <deliverables list>
    Completion Criteria:
      - <criterion 1 from task>
      - <criterion 2 from task>
      - <criterion N from task>
  run_in_background: true  # Only for parallel tasks
```

### Extracting Task Information

Extract prompt content from the task structure in the implementation plan:

```markdown
### TASK-001: Core Interfaces

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**:        <- Use for Implementation Target
- `src/interfaces/filesystem.ts`
- `src/interfaces/process-manager.ts`

**Description**:         <- Use for Purpose
Define all core interfaces for abstracting external dependencies.

**Completion Criteria**: <- Use for Completion Criteria
- [ ] FileSystem interface defined
- [ ] ProcessManager interface defined
- [ ] Type checking passes
```

## Parallel Execution Pattern

**CRITICAL**: Spawn ALL parallelizable tasks in a SINGLE message with multiple Task tool calls.

```
In a single message, invoke Task tool multiple times:

Task 1:
  subagent_type: ts-coding
  prompt: |
    Purpose: <TASK-001 description>
    Reference Document: <implementation-plan-path>
    Implementation Target: <TASK-001 deliverables>
    Completion Criteria:
      - <criterion 1>
      - <criterion 2>
  run_in_background: true

Task 2:
  subagent_type: ts-coding
  prompt: |
    Purpose: <TASK-002 description>
    Reference Document: <implementation-plan-path>
    Implementation Target: <TASK-002 deliverables>
    Completion Criteria:
      - <criterion 1>
      - <criterion 2>
  run_in_background: true
```

**All tasks run concurrently** because they are launched in a single message with `run_in_background: true`.

## Result Collection Pattern

After launching background tasks:

1. Use `TaskOutput` tool to wait for each background task
2. Parse each task's result (success/failure)
3. For each completed task:
   - Verify completion criteria are met
   - Record any issues or partial completion

## Dependency Detection

Parse dependencies from plan:
```markdown
**Parallelizable**: No (depends on TASK-001)
```
or
```markdown
**Parallelizable**: No (depends on TASK-001, TASK-002)
```

## Dependency Resolution

### Dependency Types

| Type | Example | Resolution |
|------|---------|------------|
| **Data dependency** | Types must exist before using them | Execute sequentially |
| **File dependency** | Interface before implementation | Execute sequentially |
| **None** | Independent modules | Execute in parallel |

### Dependency Graph Example

```
TASK-001 (Interfaces)     TASK-002 (Errors)     TASK-003 (Types)
    |                          |                     |
    +----------+---------------+                     |
               |                                     |
    TASK-004 (Mocks)                        TASK-007 (Repo Interfaces)
```

From this graph:
- TASK-001, TASK-002, TASK-003 can run in parallel (Group A)
- TASK-004 must wait for TASK-001
- TASK-007 must wait for TASK-003

## Parallel Execution Rules

### Safe to Parallelize

Tasks are safe to parallelize when:
- No shared file modifications between tasks
- No data dependencies (types, interfaces)
- No import dependencies
- Marked as "Parallelizable: Yes" in the plan

### Must Execute Sequentially

Tasks must be sequential when:
- Task B imports from Task A's output
- Task B implements interface defined in Task A
- Task B uses types defined in Task A
- Marked as dependencies in the plan

## Progress Tracking Format

### Task Status Values

| Status | Meaning |
|--------|---------|
| `Not Started` | Task not yet begun |
| `In Progress` | Currently being implemented |
| `Completed` | All completion criteria met |
| `Blocked` | Waiting on dependencies |

### Module Status Table

```markdown
## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Core Interfaces | `src/interfaces/*.ts` | Completed | Pass |
| Error Types | `src/errors.ts` | In Progress | - |
| Mock Implementations | `src/test/mocks/*.ts` | Not Started | - |
```

### Progress Log Entry

```markdown
### Session: 2026-01-04 14:30
**Tasks Completed**: TASK-001, TASK-002
**Tasks Started**: TASK-004
**Blockers**: None
**Notes**:
- Defined FileSystem, ProcessManager, Clock interfaces
- Added Result type with ok/err helpers
- Discovered need for additional WatchOptions type
```

## Completion Verification

### Per-Task Completion

A task is complete when:
- [ ] All deliverable files exist
- [ ] All completion criteria checkboxes can be checked
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Tests pass (if tests are part of criteria)

### Per-Plan Completion

A plan is complete when:
- [ ] All tasks have status "Completed"
- [ ] Overall completion criteria are met
- [ ] Final type check passes
- [ ] Final test run passes

### Plan Finalization

When a plan is complete:

1. Update status header to "Completed"
2. Add final progress log entry
3. Move file: `impl-plans/active/<plan>.md` -> `impl-plans/completed/<plan>.md`
4. Update `impl-plans/README.md`

## Review Cycle

After task implementation and testing, each task goes through a code review cycle using the `ts-review` agent.

### Review Workflow

```
ts-coding agent (implementation)
    |
    v
check-and-test-after-modify agent (tests pass)
    |
    v
ts-review agent (iteration 1)
    |
    +-- APPROVED --> Task complete
    |
    +-- CHANGES_REQUESTED --> ts-coding (fixes) --> check-and-test --> ts-review (iteration 2)
                                                                            |
                                                                            +-- ... (up to 3 iterations)
```

### Maximum Iterations

The review cycle is limited to **3 iterations** per task to prevent infinite loops:

| Iteration | Review Scope | Outcome |
|-----------|--------------|---------|
| 1 | Full comprehensive review | APPROVED or CHANGES_REQUESTED |
| 2 | Focus on previous issues + new issues from fixes | APPROVED or CHANGES_REQUESTED |
| 3 | Critical issues only | APPROVED (with documented remaining issues) |

### Review Agent Invocation

```
Task tool parameters:
  subagent_type: ts-review
  prompt: |
    Design Reference: <path to design document>
    Implementation Plan: impl-plans/active/<plan-name>.md
    Task ID: TASK-XXX
    Implemented Files:
      - <file path 1>
      - <file path 2>
    Iteration: 1
```

### Re-Review After Fixes

```
Task tool parameters:
  subagent_type: ts-review
  prompt: |
    Design Reference: <path to design document>
    Implementation Plan: impl-plans/active/<plan-name>.md
    Task ID: TASK-XXX
    Implemented Files:
      - <file path 1>
      - <file path 2>
    Iteration: 2
    Previous Feedback:
      - C1: Missing readonly modifiers
      - S1: Duplicate validation logic
    Focus Areas: readonly modifiers, duplicate validation
```

### Handling Review Results

**If APPROVED**:
1. Mark task as Completed
2. Update completion criteria checkboxes
3. Add review approval to progress log

**If CHANGES_REQUESTED**:
1. Check current iteration number
2. If iteration < 3:
   - Parse issue list from review
   - Invoke ts-coding with fix instructions
   - Run check-and-test
   - Invoke ts-review with iteration + 1
3. If iteration >= 3:
   - Mark task as Completed
   - Document remaining issues in progress log
   - Note: "Approved after max iterations with documented issues"

### Review Feedback to ts-coding

When re-invoking ts-coding to fix review issues:

```
Task tool parameters:
  subagent_type: ts-coding
  prompt: |
    Purpose: Fix code review issues for TASK-XXX
    Reference Document: impl-plans/active/<plan-name>.md
    Implementation Target: Fix the following review issues

    Issues to Fix:
    - C1 (Critical): src/foo.ts:25 - Missing required method X
      Suggested Fix: Add method X per design spec section Y
    - C2 (Critical): src/bar.ts:42 - Using `any` type
      Suggested Fix: Replace with `unknown` and add type guard
    - S1 (Improvement): src/foo.ts:30,45 - Duplicate validation logic
      Suggested Fix: Extract to shared validateX function

    Completion Criteria:
      - All critical issues (C1, C2) are resolved
      - Improvement suggestions addressed where reasonable
      - Type checking passes
      - Tests pass
```

### Progress Log with Review

```markdown
### Session: 2026-01-04 14:30
**Tasks Completed**: TASK-001
**Review Iterations**: 2
**Review Summary**:
- Iteration 1: 2 critical issues, 1 improvement suggestion
- Iteration 2: APPROVED (all issues resolved)
**Notes**:
- Fixed missing readonly modifiers
- Extracted duplicate validation to shared utility
```

## Error Handling

### Task Failure

If a ts-coding agent fails:

1. Record the failure in progress log
2. Keep task status as "In Progress" (not completed)
3. Document the error and recommended fix
4. Continue with other tasks if possible
5. Report failures to user for manual intervention

### Partial Completion

If only some tasks complete:

1. Update completed task statuses
2. Update progress log with what completed
3. Document blockers for incomplete tasks
4. Report partial progress to user

## Quick Reference

| Action | Tool | Parameters |
|--------|------|------------|
| Read plan | Read | `impl-plans/active/<plan>.md` |
| Execute task | Task | `subagent_type: ts-coding` |
| Parallel execution | Task | `run_in_background: true` |
| Collect results | TaskOutput | `task_id: <id>` |
| Update plan | Edit | Update status, checkboxes, log |
| Move completed | Bash | `mv impl-plans/active/ impl-plans/completed/` |

## Common Response Formats

### Plan Completed Response

```
## Implementation Plan Completed

### Plan
`impl-plans/completed/<plan-name>.md` (moved from active/)

### Final Verification
- Type checking: Pass
- Tests: Pass (X/X)

### Plan Finalization
- Status updated to: Completed
- Moved to: impl-plans/completed/
- README.md updated

### Next Steps
- Review completed implementation
- Consider integration testing
- Proceed to next implementation plan
```

### Partial Failure Response

```
### Failure Details

**TASK-XXX Failure**:
- Error: <error type>
- Details: <specific error message>
- Files affected: <file paths>

### Recommended Actions
1. Review failure details
2. Fix the issue
3. Re-run with: `/impl-exec-specific <plan-name> TASK-XXX`
```

## Important Guidelines

1. **Read this skill first**: Always read this skill before execution
2. **Maximize parallelization**: Select ALL tasks that can run concurrently
3. **Single message for parallel tasks**: Launch ALL parallel tasks in ONE message
4. **Update plan immediately**: Update progress after execution completes
5. **Fail gracefully**: Continue with other tasks if one fails
6. **Invoke check-and-test**: After ts-coding completes, invoke `check-and-test-after-modify`
7. **Run review cycle**: After tests pass, invoke `ts-review` for code review (max 3 iterations)
8. **Move completed plans**: Move to `impl-plans/completed/` when done

## Cross-Plan Execution

When running `/impl-exec-auto` without arguments, the system analyzes all active plans and respects phase dependencies.

### Phase Dependency Rules

From `impl-plans/README.md`:

```
Phase 1: foundation-and-core (no dependencies)
    |
    v
Phase 2: session-groups, command-queue, markdown-parser,
         realtime-monitoring, bookmarks, file-changes
    |    (can run in parallel with each other)
    v
Phase 3: daemon-and-http-api
    |
    v
Phase 4: browser-viewer, cli
```

### Phase Eligibility Check

```python
PHASE_DEPS = {
    1: [],                              # Always eligible
    2: ["foundation-and-core"],         # Needs Phase 1 complete
    3: ["session-groups", "command-queue", "markdown-parser",
        "realtime-monitoring", "bookmarks", "file-changes"],
    4: ["daemon-and-http-api"],
}

def is_phase_eligible(phase: int, plan_statuses: dict) -> bool:
    for dep_plan in PHASE_DEPS.get(phase, []):
        if plan_statuses.get(dep_plan) != "Completed":
            return False
    return True
```

### Cross-Plan Task Selection

1. Determine which phases are eligible
2. For each eligible plan, find executable tasks
3. Combine all executable tasks from all eligible plans
4. Execute ALL combined tasks in a single parallel batch

### Cross-Plan Progress Tracking

When updating plans after cross-plan execution:

1. Update each affected plan's task statuses
2. Add progress log to each affected plan
3. Check if any plan is now complete
4. If plan completes, check if new phases become eligible
5. Update `impl-plans/README.md` if plan moves to completed

### Phase Transition Handling

When a phase-gating plan completes (e.g., foundation-and-core):

1. Move plan to `impl-plans/completed/`
2. Update `impl-plans/README.md` status table
3. Report newly eligible plans
4. Suggest running `/impl-exec-auto` again for next phase

## Integration with Other Skills

| Skill/Agent | Relationship |
|-------------|--------------|
| `impl-plan/SKILL.md` | Read plans created by this skill |
| `ts-coding-standards/` | ts-coding agent follows these |
| `design-doc/SKILL.md` | Original design reference |
| `ts-review` agent | Code review after implementation |
| `check-and-test-after-modify` agent | Test verification before review |
