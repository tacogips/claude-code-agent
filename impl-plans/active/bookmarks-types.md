# Bookmarks Types Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#6-bookmarks, design-docs/spec-sdk-api.md#5.3-bookmark-endpoints
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Next**: `impl-plans/active/bookmarks-manager.md` (Search, Manager, Exports)
- **Depends On**: `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 6: Bookmarks, `design-docs/spec-sdk-api.md` Section 5.3

### Summary

Define bookmark data model types and implement the repository layer for storing and retrieving bookmarks.

### Scope

**Included**:
- Bookmark data model (session, message, range types)
- Bookmark repository interface
- File-based and in-memory repository implementations

**Excluded**:
- BookmarkManager (bookmarks-manager.md)
- Search functionality (bookmarks-manager.md)
- CLI/REST integration (other plans)

---

## Modules

### 1. Bookmark Types

#### src/sdk/bookmarks/types.ts

**Status**: COMPLETED

```typescript
interface Bookmark {
  id: string;
  type: BookmarkType;
  sessionId: string;
  messageId?: string;
  messageRange?: { fromMessageId: string; toMessageId: string };
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

type BookmarkType = 'session' | 'message' | 'range';

interface CreateBookmarkOptions {
  type: BookmarkType;
  sessionId: string;
  messageId?: string;
  fromMessageId?: string;
  toMessageId?: string;
  name: string;
  description?: string;
  tags?: string[];
}

interface BookmarkFilter {
  type?: BookmarkType;
  sessionId?: string;
  tags?: string[];
  since?: Date;
  limit?: number;
  offset?: number;
}

interface BookmarkSearchResult {
  bookmark: Bookmark;
  matchType: 'metadata' | 'content';
  matchContext?: string;
  relevanceScore: number;
}
```

**Checklist**:
- [x] Bookmark interface defined with all types
- [x] BookmarkType union type defined
- [x] CreateBookmarkOptions interface defined
- [x] BookmarkFilter interface defined
- [x] BookmarkSearchResult interface defined
- [x] Type checking passes
- [x] All types exported

---

### 2. Bookmark Repository Interface

#### src/repository/bookmark-repository.ts

**Status**: NOT_STARTED

```typescript
interface BookmarkRepository {
  findById(id: string): Promise<Bookmark | null>;
  findBySession(sessionId: string): Promise<Bookmark[]>;
  list(filter?: BookmarkFilter): Promise<Bookmark[]>;
  save(bookmark: Bookmark): Promise<void>;
  update(id: string, updates: Partial<Bookmark>): Promise<void>;
  delete(id: string): Promise<void>;
  findByTag(tag: string): Promise<Bookmark[]>;
}
```

**Checklist**:
- [ ] BookmarkRepository interface defined
- [ ] All CRUD methods specified
- [ ] findByTag method specified
- [ ] Type checking passes

---

### 3. File Bookmark Repository

#### src/repository/file/bookmark-repository.ts

**Status**: NOT_STARTED

```typescript
class FileBookmarkRepository implements BookmarkRepository {
  constructor(container: Container);

  // All BookmarkRepository methods
  findById(id: string): Promise<Bookmark | null>;
  findBySession(sessionId: string): Promise<Bookmark[]>;
  list(filter?: BookmarkFilter): Promise<Bookmark[]>;
  save(bookmark: Bookmark): Promise<void>;
  update(id: string, updates: Partial<Bookmark>): Promise<void>;
  delete(id: string): Promise<void>;
  findByTag(tag: string): Promise<Bookmark[]>;

  private getBookmarkPath(id: string): string;
  private ensureDirectory(): Promise<void>;
  private readAllBookmarks(): Promise<Bookmark[]>;
}
```

**Storage**: `~/.local/claude-code-agent/metadata/bookmarks/{bookmark-id}.json`

**Checklist**:
- [ ] JSON file storage per bookmark
- [ ] Directory creation on first save
- [ ] All CRUD operations implemented
- [ ] findByTag uses linear scan or index
- [ ] list() with filter support
- [ ] Unit tests
- [ ] Type checking passes

---

### 4. In-Memory Bookmark Repository

#### src/repository/in-memory/bookmark-repository.ts

**Status**: NOT_STARTED

```typescript
class InMemoryBookmarkRepository implements BookmarkRepository {
  constructor();

  // All BookmarkRepository methods
  findById(id: string): Promise<Bookmark | null>;
  findBySession(sessionId: string): Promise<Bookmark[]>;
  list(filter?: BookmarkFilter): Promise<Bookmark[]>;
  save(bookmark: Bookmark): Promise<void>;
  update(id: string, updates: Partial<Bookmark>): Promise<void>;
  delete(id: string): Promise<void>;
  findByTag(tag: string): Promise<Bookmark[]>;

  clear(): void;  // For tests
}
```

**Checklist**:
- [ ] Map-based storage
- [ ] All repository methods implemented
- [ ] clear() method for tests
- [ ] Unit tests
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Bookmark types | `src/sdk/bookmarks/types.ts` | COMPLETED | N/A |
| Repository interface | `src/repository/bookmark-repository.ts` | NOT_STARTED | - |
| File repository | `src/repository/file/bookmark-repository.ts` | NOT_STARTED | - |
| In-memory repository | `src/repository/in-memory/bookmark-repository.ts` | NOT_STARTED | - |

---

## Subtasks

### TASK-001: Bookmark Types

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/bookmarks/types.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] Bookmark interface defined with all types
- [x] BookmarkType union type defined
- [x] CreateBookmarkOptions interface defined
- [x] BookmarkFilter interface defined
- [x] BookmarkSearchResult interface defined
- [x] Type checking passes
- [x] All types exported

---

### TASK-002: Bookmark Repository Interface

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/repository/bookmark-repository.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [ ] BookmarkRepository interface defined
- [ ] All CRUD methods specified
- [ ] findByTag method specified
- [ ] Type checking passes

---

### TASK-003: File Bookmark Repository

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/repository/file/bookmark-repository.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] JSON file storage per bookmark
- [ ] Directory creation on first save
- [ ] All CRUD operations implemented
- [ ] findByTag uses linear scan or index
- [ ] list() with filter support
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-004: In-Memory Bookmark Repository

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/repository/in-memory/bookmark-repository.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [ ] Map-based storage
- [ ] All repository methods implemented
- [ ] clear() method for tests
- [ ] Unit tests
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Interface)
    |                       |
    +-------+---------------+
            |
    +-------+-------+
    |               |
    v               v
TASK-003        TASK-004
(File)          (Memory)
    |               |
    +-------+-------+
            |
            v
   (bookmarks-manager.md)
```

Parallelizable: TASK-001, TASK-002
Then: TASK-003, TASK-004

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Types | None | Ready |
| Repository | Foundation | Available |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes

---

## Progress Log

### Session: 2026-01-06

**Tasks Completed**: TASK-001 (Bookmark Types)

**Summary**:
- Created `src/sdk/bookmarks/types.ts` with all required type definitions
- Defined `BookmarkType` union type ('session' | 'message' | 'range')
- Implemented `Bookmark` interface with all required fields
- Created `MessageRange` interface for range-type bookmarks
- Implemented `CreateBookmarkOptions` interface for bookmark creation
- Implemented `BookmarkFilter` interface for querying bookmarks
- Implemented `BookmarkSearchResult` interface with match metadata
- All types use `readonly` for immutability following project standards
- Explicit `| undefined` annotations for optional properties per `exactOptionalPropertyTypes`
- Type checking passes successfully
- All types properly exported

**Notes**:
- Followed coding standards from `.claude/skills/ts-coding-standards/`
- Used `readonly` extensively for immutability
- Used explicit `| undefined` for optional properties per strictness requirements
- JSDoc comments added for all public types and interfaces
- File formatted with prettier
- No tests needed for pure type definitions
