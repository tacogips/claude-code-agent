# <Feature Name> Implementation Plan

**Status**: Planning | Ready | In Progress | Completed
**Design Reference**: design-docs/<file>.md
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD

---

## Design Document Reference

**Source**: design-docs/<file>.md

### Summary

Brief description of the feature being implemented from the design document.

### Scope

**Included**:
- What is being implemented

**Excluded**:
- What is NOT part of this implementation

---

## Modules

### 1. Core Interfaces

#### src/interfaces/example.ts

**Status**: NOT_STARTED

```typescript
interface Example {
  id: string;
  name: string;
  process(): Promise<void>;
}

interface ExampleConfig {
  option1: string;
  option2?: number;
}
```

**Checklist**:
- [ ] Define Example interface
- [ ] Define ExampleConfig interface
- [ ] Export from interfaces/index.ts
- [ ] Unit tests

---

### 2. Implementation

#### src/example/manager.ts

**Status**: NOT_STARTED

```typescript
class ExampleManager {
  constructor(container: Container);

  create(options: CreateOptions): Promise<Example>;
  get(id: string): Promise<Example | null>;
  list(filter?: Filter): Promise<Example[]>;
  update(id: string, updates: Partial<Example>): Promise<Example>;
  delete(id: string): Promise<void>;
}
```

**Checklist**:
- [ ] Implement ExampleManager class
- [ ] Unit tests
- [ ] Integration tests

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Example interface | `src/interfaces/example.ts` | NOT_STARTED | - |
| ExampleManager | `src/example/manager.ts` | NOT_STARTED | - |

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| This feature | Foundation layer | Available |
| HTTP API | This feature | BLOCKED |

---

## Completion Criteria

- [ ] All modules implemented
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Type checking passes
- [ ] Code follows project standards

---

## Progress Log

### Session: YYYY-MM-DD HH:MM

**Tasks Completed**: (list)
**Tasks In Progress**: (list)
**Blockers**: None
**Notes**: (any observations)
