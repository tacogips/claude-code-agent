# Implementation Execution Skill

This skill provides guidelines for executing implementation plans created by the `plan-from-design` agent.

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

## Integration with Other Skills

| Skill | Relationship |
|-------|--------------|
| `impl-plan/SKILL.md` | Read plans created by this skill |
| `ts-coding-standards/` | ts-coding agent follows these |
| `design-doc/SKILL.md` | Original design reference |
