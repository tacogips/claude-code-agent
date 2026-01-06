# Library Replacement Implementation Plan

## Overview

Replace custom implementations with well-known libraries to reduce maintenance burden and improve reliability.

## Status: Completed

## Dependencies to Install

```bash
bun add nanoid slugify ndjson perfect-debounce mustache
```

## Tasks

### TASK-001: Replace ID Generation with nanoid
**Status**: Completed
**Parallelizable**: Yes
**Difficulty**: Easy

**Files**:
- `src/repository/in-memory/queue-repository.ts:133`
- `src/repository/file/queue-repository.ts:242`

**Current**:
```typescript
const commandId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
```

**Target**:
```typescript
import { nanoid } from 'nanoid';
const commandId = `cmd-${nanoid(12)}`;
```

**Completion Criteria**:
- [ ] nanoid imported
- [ ] ID generation replaced in both files
- [ ] Tests pass

---

### TASK-002: Replace Slug Generation with slugify
**Status**: Completed
**Parallelizable**: Yes
**Difficulty**: Easy

**Files**:
- `src/sdk/group/manager.ts:561-567`
- `src/sdk/queue/manager.ts:611-617`

**Current**:
```typescript
private generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
```

**Target**:
```typescript
import slugify from 'slugify';

private generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true }).slice(0, 50);
}
```

**Completion Criteria**:
- [ ] slugify imported
- [ ] generateSlug replaced in both files
- [ ] Tests pass

---

### TASK-003: Replace JSONL Parsing with ndjson
**Status**: Skipped
**Reason**: Current implementation is simple and adequate. ndjson uses streaming paradigm which would require significant API changes without clear benefit.

---

### TASK-004: Remove Duplicate JSONL Parsing in Extractor
**Status**: Skipped
**Reason**: The parseTranscript method in extractor.ts has different behavior (calls parseEntry on each object). Refactoring would add complexity without clear benefit.

---

### TASK-005: Replace Debounce with perfect-debounce
**Status**: Completed
**Parallelizable**: Yes
**Difficulty**: Easy

**Files**:
- `src/polling/watcher.ts:173-186`

**Current**: Manual setTimeout/clearTimeout debounce

**Target**: Use perfect-debounce library

**Completion Criteria**:
- [ ] perfect-debounce imported
- [ ] Debounce logic replaced
- [ ] Tests pass

---

### TASK-006: Replace Template Substitution with mustache
**Status**: Completed
**Parallelizable**: Yes
**Difficulty**: Easy

**Files**:
- `src/sdk/group/config-generator.ts:142-155`

**Current**:
```typescript
let result = template;
for (const [key, value] of Object.entries(variables)) {
  result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
}
```

**Target**:
```typescript
import Mustache from 'mustache';
const result = Mustache.render(template, variables);
```

**Completion Criteria**:
- [ ] mustache imported
- [ ] Template rendering replaced
- [ ] Tests pass

---

### TASK-007: Cleanup Unused Code
**Status**: Completed
**Parallelizable**: No (depends on all other tasks)
**Difficulty**: Easy

**Description**: After all replacements, identify and remove:
- Unused utility functions
- Dead code paths
- Orphaned exports

**Completion Criteria**:
- [ ] Run `bun check` to identify unused exports
- [ ] Remove dead code
- [ ] All tests pass
- [ ] Type checking passes

---

## Execution Groups

**Group 1 (Parallel)**: TASK-001, TASK-002, TASK-005, TASK-006
**Group 2 (Sequential)**: TASK-003, then TASK-004
**Group 3**: TASK-007 (after all others complete)

## Progress Log

### Session: 2026-01-06
- Created implementation plan
- Identified 6 replacement tasks + 1 cleanup task
- Completed TASK-001: Replaced ID generation with nanoid in 2 files
- Completed TASK-002: Replaced slug generation with slugify in 2 files
- Skipped TASK-003: JSONL replacement (ndjson streaming paradigm not appropriate)
- Skipped TASK-004: Extractor deduplication (different behavior needed)
- Completed TASK-005: Replaced debounce with perfect-debounce in watcher.ts
- Completed TASK-006: Replaced template substitution with mustache in config-generator.ts
- Completed TASK-007: Cleanup verification (no dead code found)
- All 802 tests passing
- TypeScript type checking passing
