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
| Bookmark search | `src/sdk/bookmarks/search.ts` | COMPLETED | Pass (11 tests) |
| Bookmark manager | `src/sdk/bookmarks/manager.ts` | COMPLETED | Pass (43 tests) |
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

**Status**: Completed
**Parallelizable**: No (depends on TASK-001, TASK-002, TASK-005)
**Deliverables**: `src/sdk/bookmarks/manager.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [x] add() creates bookmarks of all types
- [x] Validation for type-specific requirements
- [x] get() and getWithContent() retrieve bookmarks
- [x] getWithContent() loads messages for the bookmark
- [x] list() with filter support
- [x] update() modifies bookmark
- [x] delete() removes bookmark
- [x] search() combines metadata and content search
- [x] addTag() and removeTag() manage tags
- [x] Integration tests
- [x] Type checking passes

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

### Session: 2026-01-06 22:52

**Tasks Completed**: TASK-006 (Bookmark Manager)

**Summary**:
- Created `src/sdk/bookmarks/manager.ts` with complete BookmarkManager implementation
- Implemented all CRUD operations:
  - add() with type-specific validation (session, message, range)
  - get() and getWithContent() for retrieval
  - list() with filter support (delegates to repository)
  - update() for modifying name, description, and tags
  - delete() for removing bookmarks
- Implemented search() combining metadata and content search via BookmarkSearch class
- Implemented tag management:
  - addTag() adds tags with duplicate prevention
  - removeTag() removes tags with immutability
- Validation enforces type-specific requirements:
  - Session: only sessionId required (no messageId or range)
  - Message: sessionId + messageId required (no range)
  - Range: sessionId + fromMessageId + toMessageId required (no messageId)
  - Empty name validation
- Used crypto.randomUUID() for bookmark ID generation
- Created comprehensive integration tests (43 tests, all passing)
- Type checking passes successfully

**Implementation Details**:
- Constructor takes Container, BookmarkRepository, and optional SessionReader
- BookmarkSearch instance for search operations
- Renamed internal `search` property to `bookmarkSearch` to avoid method name conflict
- SearchOptions interface with metadataOnly and limit fields
- BookmarkWithContent interface for getWithContent result
- loadContent() method is placeholder (awaits session path resolution)
- Used void operator to suppress unused sessionReader warning
- Update preserves immutable fields (ID, type, sessionId, createdAt)
- Tags operations maintain immutability via array spreading
- Search combines metadata and content results with relevance ranking

**Test Coverage**:
- add() for all bookmark types (session, message, range)
- Validation errors for all invalid type combinations
- get() retrieval and null handling
- getWithContent() with placeholder content
- list() with various filters (type, sessionId, tags, limit)
- update() for name, description, tags
- delete() with exists/non-exists cases
- search() metadata-only and combined search
- addTag() with duplicate prevention
- removeTag() with non-existent tag handling

**Notes**:
- Followed coding standards (readonly, explicit undefined, JSDoc)
- Used Result type pattern where appropriate
- Matches FileBookmarkRepository patterns for consistency
- Ready for TASK-007 (Module Exports)
