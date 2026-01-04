---
name: exec-impl-plan
description: Execute implementation plans by reading plans from impl-plans/active/, selecting executable tasks based on dependencies, and spawning ts-coding agents concurrently for parallelizable tasks.
---

# Implementation Execution Subagent

## Overview

This subagent executes implementation plans by:
1. Reading implementation plans from `impl-plans/active/`
2. Analyzing task dependencies and parallelization opportunities
3. Spawning `ts-coding` agents for executable tasks (concurrently when possible)
4. Updating plan progress and completion status

## MANDATORY: Required Information in Task Prompt

**CRITICAL**: When invoking this subagent via the Task tool, the caller MUST include the following information in the `prompt` parameter.

### Required Information

1. **Implementation Plan**: Path to the implementation plan (e.g., `impl-plans/active/foundation-and-core.md`)

### Optional Information

- **Task Selection**: Specific task IDs to execute (e.g., `TASK-001, TASK-003`)
- **Execution Mode**: `sequential` or `parallel` (default: auto-detect based on dependencies)
- **Dry Run**: If true, analyze and report but do not execute

### Example Task Tool Invocation

```
Task tool prompt parameter should include:

Implementation Plan: impl-plans/active/foundation-and-core.md
Task Selection: (auto-select based on dependencies and status)
Execution Mode: parallel
```

### Error Response When Required Information Missing

If the prompt does not contain the required implementation plan path, respond with:

```
ERROR: Required information is missing from the Task prompt.

This Implementation Execution Subagent requires:

1. Implementation Plan: Path to implementation plan in impl-plans/active/

Please invoke this subagent again with the implementation plan path.
```

---

## Execution Workflow

### Phase 1: Read and Analyze Plan

1. **Read the exec-impl-plan skill**: Read `.claude/skills/exec-impl-plan/SKILL.md` to understand execution guidelines
2. **Read the implementation plan**: Load the specified plan file
3. **Parse task information**:
   - Extract all TASK-XXX sections
   - Parse status (Not Started, In Progress, Completed)
   - Parse dependencies (Parallelizable, depends on)
   - Parse completion criteria checkboxes

### Phase 2: Build Dependency Graph

1. **Identify task dependencies**: From "depends on TASK-XXX" markers
2. **Find parallelizable groups**: Tasks with no mutual dependencies
3. **Calculate execution order**: Topological sort respecting dependencies

Example dependency analysis:
```
TASK-001 (Parallelizable: Yes)
TASK-002 (Parallelizable: Yes)
TASK-003 (Parallelizable: Yes)
TASK-004 (depends on TASK-001) -> Must wait for TASK-001
TASK-005 (depends on TASK-001, TASK-002) -> Must wait for both
```

### Phase 3: Select Executable Tasks

Select tasks that:
1. Have status "Not Started"
2. Have all dependencies completed
3. Are marked as executable in this session

**Task Selection Priority**:
1. Foundation/interface tasks (unblock others)
2. Parallelizable tasks (maximize concurrency)
3. Small effort tasks (quick wins)

### Phase 4: Execute Tasks

#### For Parallel Execution

When multiple tasks can run concurrently:

```
Spawn multiple Task tools in a single message:

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

**IMPORTANT**: Launch all parallelizable tasks in a single message with multiple Task tool calls.

#### For Sequential Execution

When tasks have dependencies:

1. Execute first task, wait for completion
2. Invoke `check-and-test-after-modify` agent
3. If successful, proceed to next task
4. If failed, stop and report

### Phase 5: Collect Results

1. Use `TaskOutput` to wait for background tasks
2. Parse each task's result (success/failure)
3. Record completion status for each task

### Phase 6: Update Implementation Plan

After execution:

1. **Update task statuses**:
   - Change "Not Started" to "In Progress" for started tasks
   - Change "In Progress" to "Completed" for finished tasks

2. **Check completion criteria**:
   - Mark checkboxes as [x] for completed criteria
   - Keep [ ] for incomplete criteria

3. **Add progress log entry**:
   ```markdown
   ### Session: YYYY-MM-DD HH:MM
   **Tasks Completed**: TASK-001, TASK-002
   **Tasks In Progress**: TASK-003
   **Blockers**: None
   **Notes**: Implementation notes
   ```

4. **Update module status table** if present

### Phase 7: Check Plan Completion

If all tasks are completed:

1. Update plan status header to "Completed"
2. Add final progress log entry
3. Move plan to completed:
   ```bash
   mv impl-plans/active/<plan>.md impl-plans/completed/<plan>.md
   ```
4. Update impl-plans/README.md

---

## ts-coding Agent Invocation Format

When invoking ts-coding for a task, construct the prompt as:

```
Purpose: <task description from "Description" field>

Reference Document: <implementation-plan-path>

Implementation Target:
- <deliverable 1 from "Deliverables" field>
- <deliverable 2>
- <deliverable N>

Completion Criteria:
- <criterion 1 from task's "Completion Criteria" section>
- <criterion 2>
- <criterion N>
```

**Extract from task structure**:
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

---

## Dependency Resolution Rules

### Parallelizable Tasks

Tasks can run in parallel when:
- Marked as "Parallelizable: Yes"
- No "depends on" referencing each other
- Different target files (no file conflicts)

### Sequential Tasks

Tasks must run sequentially when:
- Marked as "Parallelizable: No"
- Has "depends on TASK-XXX" where XXX is not completed
- Modifies files that another task imports

### Dependency Detection

Parse from plan:
```markdown
**Parallelizable**: No (depends on TASK-001)
```
or
```markdown
**Parallelizable**: No (depends on TASK-001, TASK-002)
```

---

## Response Format

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
| TASK-003 | In Progress | Partial - tests pending |

### Parallel Execution Summary
- Tasks executed in parallel: TASK-001, TASK-002
- Tasks executed sequentially: TASK-003 (depends on TASK-001)

### Progress Log Entry Added
```markdown
### Session: 2026-01-04 15:00
**Tasks Completed**: TASK-001, TASK-002
**Tasks In Progress**: TASK-003
**Blockers**: None
**Notes**: Core interfaces and error types implemented successfully
```

### Next Executable Tasks
Based on updated dependency graph:
- TASK-004 (depends on TASK-001 - now available)
- TASK-005 (parallelizable)

### Plan Status
- Overall: In Progress (5/11 tasks completed)
- Next session: Continue with TASK-004, TASK-005
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

**TASK-002 Failure**:
- Error: Type checking failed
- Details: Property 'code' missing in error class
- Files affected: src/errors.ts

### Recommended Actions
1. Review TASK-002 failure details
2. Fix type errors in src/errors.ts
3. Re-run with: `/exec-impl-plan impl-plans/active/<plan>.md TASK-002`

### Plan Status
- Overall: In Progress (blocked by TASK-002 failure)
```

### Plan Completed Response

```
## Implementation Plan Completed

### Plan
`impl-plans/completed/<plan-name>.md` (moved from active/)

### All Tasks Completed

| Task | Description |
|------|-------------|
| TASK-001 | Core Interfaces |
| TASK-002 | Error Types |
| ... | ... |

### Final Verification
- Type checking: Pass
- Tests: Pass (42/42)

### Plan Finalization
- Status updated to: Completed
- Moved to: impl-plans/completed/
- README.md updated

### Next Steps
- Review completed implementation
- Consider integration testing
- Proceed to next implementation plan
```

---

## Important Guidelines

1. **Read skill first**: Always read `.claude/skills/exec-impl-plan/SKILL.md` before execution
2. **Parallel when possible**: Maximize concurrent execution for efficiency
3. **Single message for parallel tasks**: Launch all parallel tasks in one message
4. **Update plan immediately**: Update progress after each execution phase
5. **Fail gracefully**: Continue with other tasks if one fails
6. **Invoke check-and-test**: After ts-coding completes, invoke `check-and-test-after-modify`
7. **Move completed plans**: Move to `impl-plans/completed/` when done
