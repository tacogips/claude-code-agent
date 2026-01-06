---
name: impl-plan
description: Use when creating implementation plans from design documents. Provides plan structure, status tracking, and progress logging guidelines.
allowed-tools: Read, Write, Glob, Grep
---

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
- Clear deliverables with TypeScript type definitions
- Simple status tracking tables
- Checklist-based completion criteria
- Progress tracking across sessions

## Plan Granularity

**IMPORTANT**: Implementation plans and spec files do NOT need 1:1 mapping.

| Mapping | When to Use |
|---------|-------------|
| **1:N** (one spec -> multiple plans) | Large specs should be split into smaller, focused units |
| **N:1** (multiple specs -> one plan) | Related specs sharing dependencies can be combined |
| **1:1** (one spec -> one plan) | Well-bounded features with clear scope |

**Recommended granularity**:
- Each plan should be completable in 1-3 sessions
- Each plan should have 3-10 subtasks
- Maximize parallelizable subtasks

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

### 3. Modules and Types

List each module with its TypeScript type definitions. **USE ACTUAL TYPESCRIPT CODE** for interfaces and types - not prose descriptions.

```markdown
## Modules

### 1. Core Interfaces

#### src/interfaces/filesystem.ts

**Status**: NOT_STARTED

```typescript
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  watch(path: string): AsyncIterable<WatchEvent>;
}

interface WatchEvent {
  type: 'create' | 'modify' | 'delete';
  path: string;
}
```

**Checklist**:
- [ ] Define FileSystem interface
- [ ] Define WatchEvent interface
- [ ] Export from interfaces/index.ts
- [ ] Unit tests
```

### 4. Status Tracking Table

Use simple tables for overview tracking:

```markdown
## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| FileSystem interface | `src/interfaces/filesystem.ts` | NOT_STARTED | - |
| ProcessManager interface | `src/interfaces/process-manager.ts` | NOT_STARTED | - |
| Mock implementations | `src/test/mocks/*.ts` | NOT_STARTED | - |
```

### 5. Dependencies

Simple table showing what depends on what:

```markdown
## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Phase 2: Repository | Phase 1: Interfaces | BLOCKED |
| Phase 3: Core Services | Phase 1, Phase 2 | BLOCKED |
```

### 6. Completion Criteria

Simple checklist:

```markdown
## Completion Criteria

- [ ] All modules implemented
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Integration verified
```

### 7. Progress Log

Track session-by-session progress:

```markdown
## Progress Log

### Session: YYYY-MM-DD HH:MM
**Tasks Completed**: Module 1, Module 2
**Tasks In Progress**: Module 3
**Blockers**: None
**Notes**: Discovered edge case in variable parsing
```

## Content Guidelines

### INCLUDE TypeScript Code

**ALWAYS** include actual TypeScript code for:
- Interface definitions
- Type aliases
- Class structure (public methods, constructor signature)
- Function signatures

Example:
```markdown
```typescript
interface SessionGroup {
  id: string;                    // Format: YYYYMMDD-HHMMSS-{slug}
  name: string;
  status: GroupStatus;
  sessions: GroupSession[];
  config: GroupConfig;
  createdAt: string;             // ISO timestamp
}

type GroupStatus = 'created' | 'running' | 'paused' | 'completed' | 'failed';
```
```

### DO NOT Include

- Implementation logic (function bodies)
- Private methods
- Algorithm details
- Excessive prose descriptions

### Format Comparison

**GOOD** (TypeScript-first):
```markdown
#### src/interfaces/clock.ts

```typescript
interface Clock {
  now(): Date;
  timestamp(): string;
  sleep(ms: number): Promise<void>;
}
```

**Checklist**:
- [ ] Define Clock interface
- [ ] Export from interfaces/index.ts
```

**BAD** (Prose-heavy):
```markdown
**Exports**:
| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Clock` | interface | Time operations | Caching, logging |

**Function Signatures**:
now(): Date
  Purpose: Get current date/time
  Called by: Logger, Cache
```

## Parallelization Rules

Subtasks can be parallelized when:
1. No data dependencies between tasks
2. No shared file modifications
3. No order-dependent side effects

Mark dependencies explicitly in the status table.

## Workflow Integration

### Creating a Plan
1. Read the design document
2. Identify feature boundaries
3. Define TypeScript interfaces and types
4. List modules with status tracking
5. Set completion criteria
6. Create plan file in `impl-plans/active/`

### During Implementation
1. Update module status as work progresses
2. Add progress log entries per session
3. Note blockers and decisions
4. Check off completion criteria

### Completing a Plan
1. Verify all completion criteria met
2. Update status to Completed
3. Add final progress log entry
4. Move file to `impl-plans/completed/`

## Quick Reference

| Section | Required | Format |
|---------|----------|--------|
| Header | Yes | Markdown metadata |
| Design Reference | Yes | Link + summary |
| Modules | Yes | TypeScript code blocks + checklist |
| Status Table | Yes | Simple table |
| Dependencies | Yes | Simple table |
| Completion Criteria | Yes | Checklist |
| Progress Log | Yes | Session entries |
