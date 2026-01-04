---
description: Generate all implementation plans from design documents in parallel
argument-hint: "[--dry-run] [--force]"
---

## Generate All Implementation Plans Command

This command generates all implementation plans from design documents by running subtasks in parallel.

### Current Context

- Working directory: !`pwd`
- Current branch: !`git branch --show-current`

### Arguments Received

$ARGUMENTS

---

## Instructions

Invoke the `batch-plan-generator` subagent using the Task tool to generate all implementation plans concurrently.

### Argument Parsing

Parse `$ARGUMENTS` to extract:

1. **--dry-run** (optional): Only list plans that would be created, do not create them
2. **--force** (optional): Regenerate plans even if they already exist

### Invoke Subagent

```
Task tool parameters:
  subagent_type: batch-plan-generator
  prompt: |
    Design Directory: design-docs/
    Output Directory: impl-plans/active/
    Dry Run: <true if --dry-run flag present>
    Force: <true if --force flag present>
```

### Usage Examples

**Generate all missing plans**:
```
/gen-all-impl-plans
```

**Preview what would be created**:
```
/gen-all-impl-plans --dry-run
```

**Regenerate all plans (including existing)**:
```
/gen-all-impl-plans --force
```

### After Subagent Completes

1. Report summary of plans created/skipped
2. List any errors that occurred
3. Update impl-plans/README.md with new entries
4. Suggest next steps

### Error Handling

If errors occur during generation:
- Report which plans failed
- Suggest using `/gen-impl-plan` for individual retries
- Continue with successful plans
