# Implementation Plan Skill

This skill provides guidelines for creating and managing implementation plans from design documents.

## When to Apply

Apply this skill when:
- Translating design documents into actionable implementation plans
- Planning multi-session implementation work
- Breaking down large features into parallelizable subtasks
- Tracking implementation progress across sessions

## Purpose

Implementation plans bridge the gap between design documents (what to build) and actual implementation (how to build). They provide:
- Clear deliverables without code
- Interface and function specifications
- Dependency mapping for concurrent execution
- Progress tracking across sessions

## Output Location

**IMPORTANT**: All implementation plans MUST be stored under `impl-plans/` subdirectories.

```
impl-plans/
├── README.md              # Index of all implementation plans
├── active/                # Currently active implementation plans
│   └── <feature>.md       # One file per feature being implemented
├── completed/             # Completed implementation plans (archive)
│   └── <feature>.md       # Completed plans for reference
└── templates/             # Plan templates
    └── plan-template.md   # Standard plan template
```

## Directory Rules

| Directory | Purpose |
|-----------|---------|
| `impl-plans/active/` | Implementation plans currently in progress |
| `impl-plans/completed/` | Archived completed plans for reference |
| `impl-plans/templates/` | Plan templates and examples |

**DO NOT** create implementation plan files outside `impl-plans/`.

## Implementation Plan Structure

Each implementation plan file MUST include:

### 1. Header Section
```markdown
# <Feature Name> Implementation Plan

**Status**: Planning | Ready | In Progress | Completed
**Design Reference**: design-docs/<file>.md#<section>
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
```

### 2. Design Document Reference
- Link to specific design document section
- Summary of what is being implemented
- Scope boundaries (what is NOT included)

### 3. Implementation Overview
- High-level approach description
- Key architectural decisions for implementation
- Dependencies on other features/systems

### 4. Deliverables

Each deliverable MUST specify:
- File path (where the code will live)
- Purpose (what this file/module does)
- Exports (functions, classes, interfaces with their purposes)
- Dependencies (what it depends on)
- Dependents (what depends on it)

**NO CODE in deliverables** - only specifications.

Example:
```markdown
### Deliverable: src/interfaces/filesystem.ts

**Purpose**: Define FileSystem interface for abstracting file operations

**Exports**:
| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileSystem` | interface | Abstract file operations | SessionReader, ConfigLoader |
| `WatchEvent` | interface | Represents a file system event | TranscriptWatcher |
| `FileStat` | interface | File metadata | FileSystem implementations |

**Dependencies**:
- None (base interface)

**Dependents**:
- `src/interfaces/bun-filesystem.ts` - Production implementation
- `src/test/mocks/filesystem.ts` - Test mock
```

### 5. Subtasks

Break implementation into subtasks that can be:
- Executed independently (for concurrent implementation)
- Tracked for progress
- Assigned completion criteria

```markdown
## Subtasks

### Task 1: Core Interface Implementation
**ID**: TASK-001
**Status**: Not Started | In Progress | Completed
**Parallelizable**: Yes | No (depends on TASK-XXX)
**Deliverables**: src/interfaces/filesystem.ts
**Completion Criteria**:
- [ ] FileSystem interface defined
- [ ] WatchEvent interface defined
- [ ] FileStat interface defined
- [ ] Unit tests written and passing
```

### 6. Completion Criteria

Overall feature completion requirements:
- All subtasks completed
- All tests passing
- Type checking passes
- Integration verified
- Documentation updated (if needed)

### 7. Progress Log

Track session-by-session progress:
```markdown
## Progress Log

### Session: YYYY-MM-DD HH:MM
**Tasks Completed**: TASK-001, TASK-002
**Tasks In Progress**: TASK-003
**Blockers**: None
**Notes**: Discovered edge case in variable parsing
```

## Content Guidelines

### What to Include
- File paths and directory structure
- Function/method signatures (name, parameters, return type)
- Interface/type definitions (name, purpose, properties)
- Class definitions (name, purpose, public methods)
- Dependency relationships
- Completion criteria

### What NOT to Include
- Actual implementation code
- Internal implementation details
- Algorithm implementations
- Private method implementations

### Signature Format

For functions/methods:
```
functionName(param1: Type1, param2: Type2): ReturnType
  Purpose: What this function does
  Called by: Which modules/functions call this
```

For interfaces:
```
InterfaceName
  Purpose: What this interface represents
  Properties:
    - propertyName: Type - description
  Used by: Which modules use this interface
```

## Parallelization Rules

Subtasks can be parallelized when:
1. No data dependencies between tasks
2. No shared file modifications
3. No order-dependent side effects

Mark dependencies explicitly:
```markdown
**Parallelizable**: No (depends on TASK-001, TASK-002)
```

## Workflow Integration

### Creating a Plan
1. Read the design document
2. Identify feature boundaries
3. Break into deliverables
4. Define subtasks with dependencies
5. Set completion criteria
6. Create plan file in `impl-plans/active/`

### During Implementation
1. Update task status as work progresses
2. Add progress log entries per session
3. Note blockers and decisions
4. Update completion criteria checkboxes

### Completing a Plan
1. Verify all completion criteria met
2. Update status to Completed
3. Add final progress log entry
4. Move file to `impl-plans/completed/`

## Quick Reference

| Section | Required | Purpose |
|---------|----------|---------|
| Header | Yes | Status, references, dates |
| Design Reference | Yes | Link to design doc |
| Overview | Yes | High-level approach |
| Deliverables | Yes | File/module specifications |
| Subtasks | Yes | Parallelizable work units |
| Completion Criteria | Yes | Definition of done |
| Progress Log | Yes | Session tracking |
