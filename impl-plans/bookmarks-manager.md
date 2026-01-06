# Bookmarks Manager Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#6-bookmarks, design-docs/spec-sdk-api.md#5.3-bookmark-endpoints
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Previous**: `impl-plans/bookmarks-types.md` (Types and Repository)
- **Depends On**: `bookmarks-types.md`, `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 6: Bookmarks, `design-docs/spec-sdk-api.md` Section 5.3

### Summary

Implement the bookmark search functionality and main BookmarkManager class.

### Scope

**Included**:
- Bookmark search (metadata and content)
- BookmarkManager with CRUD and search operations
- Module exports

**Excluded**:
- Type definitions (bookmarks-types.md)
- Repository implementations (bookmarks-types.md)

---

## Modules

### 1. Bookmark Search

#### src/sdk/bookmarks/search.ts

**Status**: NOT_STARTED

```typescript
class BookmarkSearch {
  constructor(sessionReader: SessionReader);

  searchMetadata(query: string, bookmarks: Bookmark[]): BookmarkSearchResult[];
  searchContent(query: string, bookmarks: Bookmark[]): Promise<BookmarkSearchResult[]>;

  private matchMetadata(query: string, bookmark: Bookmark): boolean;
  private matchContent(query: string, messages: Message[]): { matches: boolean; context?: string };
  private calculateRelevance(bookmark: Bookmark, matchType: string, query: string): number;
  private extractContext(content: string, query: string, contextLength: number): string;
}
```

**Checklist**:
- [ ] searchMetadata() searches name, description, tags
- [ ] searchContent() loads messages and searches content
- [ ] Case-insensitive search
- [ ] extractContext() returns snippet around match
- [ ] calculateRelevance() scores results
- [ ] Unit tests
- [ ] Type checking passes

---

### 2. Bookmark Manager

#### src/sdk/bookmarks/manager.ts

**Status**: NOT_STARTED

```typescript
interface SearchOptions {
  metadataOnly?: boolean;
  limit?: number;
}

class BookmarkManager {
  constructor(
    container: Container,
    repository: BookmarkRepository,
    sessionReader: SessionReader
  );

  add(options: CreateBookmarkOptions): Promise<Bookmark>;
  get(bookmarkId: string): Promise<Bookmark | null>;
  getWithContent(bookmarkId: string): Promise<{ bookmark: Bookmark; content: Message[] }>;
  list(filter?: BookmarkFilter): Promise<Bookmark[]>;
  update(bookmarkId: string, updates: Partial<Bookmark>): Promise<Bookmark>;
  delete(bookmarkId: string): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<BookmarkSearchResult[]>;
  addTag(bookmarkId: string, tag: string): Promise<Bookmark>;
  removeTag(bookmarkId: string, tag: string): Promise<Bookmark>;

  private validateBookmark(options: CreateBookmarkOptions): void;
  private generateId(): string;
  private loadContent(bookmark: Bookmark): Promise<Message[]>;
}
```

**Checklist**:
- [ ] add() creates bookmarks of all types
- [ ] Validation for type-specific requirements
- [ ] get() and getWithContent() retrieve bookmarks
- [ ] getWithContent() loads messages for the bookmark
- [ ] list() with filter support
- [ ] update() modifies bookmark
- [ ] delete() removes bookmark
- [ ] search() combines metadata and content search
- [ ] addTag() and removeTag() manage tags
- [ ] Integration tests
- [ ] Type checking passes

---

### 3. Module Exports

#### src/sdk/bookmarks/index.ts

**Status**: NOT_STARTED

```typescript
// Re-export all public types
export type {
  Bookmark,
  BookmarkType,
  CreateBookmarkOptions,
  BookmarkFilter,
  BookmarkSearchResult
} from './types';

export { BookmarkManager } from './manager';
```

**Checklist**:
- [ ] All public types exported
- [ ] BookmarkManager exported
- [ ] SDK index includes bookmarks
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Bookmark search | `src/sdk/bookmarks/search.ts` | NOT_STARTED | - |
| Bookmark manager | `src/sdk/bookmarks/manager.ts` | NOT_STARTED | - |
| Module exports | `src/sdk/bookmarks/index.ts` | NOT_STARTED | - |

---

## Subtasks

### TASK-005: Bookmark Search

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001)
**Deliverables**: `src/sdk/bookmarks/search.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] searchMetadata() searches name, description, tags
- [ ] searchContent() loads messages and searches content
- [ ] Case-insensitive search
- [ ] extractContext() returns snippet around match
- [ ] calculateRelevance() scores results
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-006: Bookmark Manager

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002, TASK-005)
**Deliverables**: `src/sdk/bookmarks/manager.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] add() creates bookmarks of all types
- [ ] Validation for type-specific requirements
- [ ] get() and getWithContent() retrieve bookmarks
- [ ] getWithContent() loads messages for the bookmark
- [ ] list() with filter support
- [ ] update() modifies bookmark
- [ ] delete() removes bookmark
- [ ] search() combines metadata and content search
- [ ] addTag() and removeTag() manage tags
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-007: Module Exports

**Status**: Not Started
**Parallelizable**: No (depends on TASK-006)
**Deliverables**: `src/sdk/bookmarks/index.ts`, update `src/sdk/index.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [ ] All public types exported
- [ ] BookmarkManager exported
- [ ] SDK index includes bookmarks
- [ ] Type checking passes

---

## Task Dependency Graph

```
(bookmarks-types.md)
    |
    v
TASK-005 (Search)
    |
    v
TASK-006 (Manager)
    |
    v
TASK-007 (Exports)
```

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Search | TASK-001, Session Reader | Blocked on TASK-001 |
| Manager | TASK-002, TASK-005 | Blocked |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes

---

## Progress Log

(To be filled during implementation)
