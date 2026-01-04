# Bookmarks Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#6-bookmarks, design-docs/spec-sdk-api.md#5.3-bookmark-endpoints
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 6: Bookmarks, `design-docs/spec-sdk-api.md` Section 5.3

### Summary

Implement the bookmark system for marking and retrieving important sessions and messages. Supports three bookmark types: session bookmarks, message bookmarks, and range bookmarks. Includes search functionality across both metadata and content.

### Scope

**Included**:
- Bookmark data model (session, message, range types)
- Bookmark repository (file-based storage)
- Bookmark manager with CRUD operations
- Search functionality (metadata and content)
- SDK API for bookmark operations
- CLI commands (covered in cli.md)
- REST API endpoints (covered in daemon-and-http-api.md)

**Excluded**:
- Browser UI for bookmarks (covered in browser-viewer.md)

---

## Implementation Overview

### Approach

Build bookmarks as a standalone service that can reference sessions and messages by ID. The bookmark data is stored separately from session transcripts.

### Key Decisions

- Store bookmarks in JSON files under `~/.local/claude-code-agent/metadata/bookmarks/`
- Support three bookmark types: session, message, range
- Tags are strings without hierarchical structure
- Search can query both metadata (name, tags) and content (messages)
- Content search requires loading referenced transcripts

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Foundation Layer | Required | foundation-and-core.md |
| Session Reader | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/sdk/bookmarks/types.ts

**Purpose**: Define bookmark data model types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `Bookmark` | interface | Main bookmark data structure | BookmarkManager |
| `BookmarkType` | type | Type of bookmark | Bookmark |
| `CreateBookmarkOptions` | interface | Options for creating bookmark | BookmarkManager |
| `BookmarkFilter` | interface | Filter criteria | BookmarkRepository |
| `BookmarkSearchResult` | interface | Search result with context | BookmarkManager |

**Interface Definitions**:

```
Bookmark
  Purpose: A bookmark referencing session content
  Properties:
    - id: string - Unique identifier
    - type: BookmarkType - 'session' | 'message' | 'range'
    - sessionId: string - Referenced session
    - messageId?: string - For message bookmarks
    - messageRange?: { fromMessageId: string; toMessageId: string } - For range bookmarks
    - name: string - Human-readable name
    - description?: string - Optional description
    - tags: string[] - Tag list
    - createdAt: string - ISO timestamp
    - updatedAt: string - ISO timestamp
  Used by: BookmarkManager, BookmarkRepository

BookmarkType
  Purpose: Type of bookmark
  Values: 'session' | 'message' | 'range'
  Used by: Bookmark

CreateBookmarkOptions
  Purpose: Options for creating a bookmark
  Properties:
    - type: BookmarkType
    - sessionId: string
    - messageId?: string - Required for message type
    - fromMessageId?: string - Required for range type
    - toMessageId?: string - Required for range type
    - name: string
    - description?: string
    - tags?: string[]
  Used by: BookmarkManager.add()

BookmarkFilter
  Purpose: Filter criteria for listing bookmarks
  Properties:
    - type?: BookmarkType
    - sessionId?: string
    - tags?: string[] - Match any tag
    - since?: Date
    - limit?: number
    - offset?: number
  Used by: BookmarkRepository.list()

BookmarkSearchResult
  Purpose: Search result with context
  Properties:
    - bookmark: Bookmark
    - matchType: 'metadata' | 'content'
    - matchContext?: string - Snippet of matching content
    - relevanceScore: number
  Used by: BookmarkManager.search()
```

**Dependencies**: None

**Dependents**: BookmarkManager, BookmarkRepository

---

### Deliverable 2: src/sdk/bookmarks/manager.ts

**Purpose**: Bookmark management operations

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `BookmarkManager` | class | CRUD operations for bookmarks | SDK, CLI |

**Class Definition**:

```
BookmarkManager
  Purpose: Manage bookmark lifecycle and search
  Constructor: (container: Container, repository: BookmarkRepository, sessionReader: SessionReader)
  Public Methods:
    - add(options: CreateBookmarkOptions): Promise<Bookmark>
    - get(bookmarkId: string): Promise<Bookmark | null>
    - getWithContent(bookmarkId: string): Promise<{ bookmark: Bookmark; content: Message[] }>
    - list(filter?: BookmarkFilter): Promise<Bookmark[]>
    - update(bookmarkId: string, updates: Partial<Bookmark>): Promise<Bookmark>
    - delete(bookmarkId: string): Promise<void>
    - search(query: string, options?: SearchOptions): Promise<BookmarkSearchResult[]>
    - addTag(bookmarkId: string, tag: string): Promise<Bookmark>
    - removeTag(bookmarkId: string, tag: string): Promise<Bookmark>
  Private Methods:
    - validateBookmark(options: CreateBookmarkOptions): void
    - generateId(): string
    - loadContent(bookmark: Bookmark): Promise<Message[]>
    - searchMetadata(query: string, bookmarks: Bookmark[]): BookmarkSearchResult[]
    - searchContent(query: string, bookmarks: Bookmark[]): Promise<BookmarkSearchResult[]>
  Private Properties:
    - container: Container
    - repository: BookmarkRepository
    - sessionReader: SessionReader
  Used by: SDK agent.bookmarks, CLI bookmark commands
```

**Function Signatures**:

```
add(options: CreateBookmarkOptions): Promise<Bookmark>
  Purpose: Create a new bookmark
  Called by: SDK agent.bookmarks.add(), CLI bookmark add

get(bookmarkId: string): Promise<Bookmark | null>
  Purpose: Get bookmark by ID
  Called by: SDK, CLI bookmark show

getWithContent(bookmarkId: string): Promise<{ bookmark: Bookmark; content: Message[] }>
  Purpose: Get bookmark with referenced message content
  Called by: CLI bookmark show, REST API

list(filter?: BookmarkFilter): Promise<Bookmark[]>
  Purpose: List bookmarks with optional filtering
  Called by: SDK, CLI bookmark list

search(query: string, options?: SearchOptions): Promise<BookmarkSearchResult[]>
  Purpose: Search bookmarks by query
  Called by: SDK, CLI bookmark search

SearchOptions:
  Properties:
    - metadataOnly?: boolean - Only search name, description, tags
    - limit?: number
```

**Dependencies**: `src/container.ts`, `src/repository/bookmark-repository.ts`, `src/sdk/session-reader.ts`

**Dependents**: SDK, CLI, REST API

---

### Deliverable 3: src/repository/bookmark-repository.ts

**Purpose**: Bookmark repository interface

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `BookmarkRepository` | interface | Data access for bookmarks | BookmarkManager |

**Interface Definition**:

```
BookmarkRepository
  Purpose: Data access for bookmarks
  Methods:
    - findById(id: string): Promise<Bookmark | null>
    - findBySession(sessionId: string): Promise<Bookmark[]>
    - list(filter?: BookmarkFilter): Promise<Bookmark[]>
    - save(bookmark: Bookmark): Promise<void>
    - update(id: string, updates: Partial<Bookmark>): Promise<void>
    - delete(id: string): Promise<void>
    - findByTag(tag: string): Promise<Bookmark[]>
  Used by: BookmarkManager
```

**Dependencies**: `src/sdk/bookmarks/types.ts`

**Dependents**: FileBookmarkRepository, InMemoryBookmarkRepository, BookmarkManager

---

### Deliverable 4: src/repository/file/bookmark-repository.ts

**Purpose**: File-based bookmark repository

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileBookmarkRepository` | class | File-based implementation | Production |

**Class Definition**:

```
FileBookmarkRepository implements BookmarkRepository
  Purpose: Store bookmarks as JSON files
  Constructor: (container: Container)
  Public Methods:
    - (all BookmarkRepository methods)
  Private Methods:
    - getBookmarkPath(id: string): string
    - ensureDirectory(): Promise<void>
    - readAllBookmarks(): Promise<Bookmark[]>
  Private Properties:
    - baseDir: string - ~/.local/claude-code-agent/metadata/bookmarks/
    - fileSystem: FileSystem
    - cache: Map<string, Bookmark> | null
  Used by: Production container
```

**Storage Structure**:

```
~/.local/claude-code-agent/metadata/bookmarks/
+-- {bookmark-id}.json
+-- index.json  (optional: cached list for faster queries)
```

**Dependencies**: `src/repository/bookmark-repository.ts`, `src/container.ts`

**Dependents**: Production container

---

### Deliverable 5: src/sdk/bookmarks/search.ts

**Purpose**: Bookmark search implementation

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `BookmarkSearch` | class | Search implementation | BookmarkManager |

**Class Definition**:

```
BookmarkSearch
  Purpose: Search bookmarks across metadata and content
  Constructor: (sessionReader: SessionReader)
  Public Methods:
    - searchMetadata(query: string, bookmarks: Bookmark[]): BookmarkSearchResult[]
    - searchContent(query: string, bookmarks: Bookmark[]): Promise<BookmarkSearchResult[]>
  Private Methods:
    - matchMetadata(query: string, bookmark: Bookmark): boolean
    - matchContent(query: string, messages: Message[]): { matches: boolean; context?: string }
    - calculateRelevance(bookmark: Bookmark, matchType: string, query: string): number
    - extractContext(content: string, query: string, contextLength: number): string
  Private Properties:
    - sessionReader: SessionReader
  Used by: BookmarkManager.search()
```

**Function Signatures**:

```
searchMetadata(query: string, bookmarks: Bookmark[]): BookmarkSearchResult[]
  Purpose: Search bookmark name, description, tags
  Called by: BookmarkManager.search() with metadataOnly

searchContent(query: string, bookmarks: Bookmark[]): Promise<BookmarkSearchResult[]>
  Purpose: Search actual message content
  Called by: BookmarkManager.search()
```

**Dependencies**: `src/sdk/session-reader.ts`

**Dependents**: BookmarkManager

---

### Deliverable 6: src/sdk/bookmarks/index.ts

**Purpose**: Public exports for bookmarks module

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| All public types | types | Type definitions | SDK consumers |
| `BookmarkManager` | class | Main manager class | SDK |

**Dependencies**: All bookmark modules

**Dependents**: `src/sdk/index.ts`

---

## Subtasks

### TASK-001: Bookmark Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/bookmarks/types.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for bookmarks.

**Completion Criteria**:
- [ ] Bookmark interface defined with all types
- [ ] BookmarkType union type defined
- [ ] CreateBookmarkOptions interface defined
- [ ] BookmarkFilter interface defined
- [ ] BookmarkSearchResult interface defined
- [ ] Type checking passes
- [ ] All types exported

---

### TASK-002: Bookmark Repository Interface

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/repository/bookmark-repository.ts`
**Estimated Effort**: Small

**Description**:
Define the bookmark repository interface.

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

**Description**:
Implement file-based bookmark storage.

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

**Description**:
Implement in-memory bookmark repository for testing.

**Completion Criteria**:
- [ ] Map-based storage
- [ ] All repository methods implemented
- [ ] clear() method for tests
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-005: Bookmark Search

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001)
**Deliverables**: `src/sdk/bookmarks/search.ts`
**Estimated Effort**: Medium

**Description**:
Implement bookmark search functionality.

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

**Description**:
Implement the main BookmarkManager class.

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

**Description**:
Create module exports and add to SDK.

**Completion Criteria**:
- [ ] All public types exported
- [ ] BookmarkManager exported
- [ ] SDK index includes bookmarks
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Interface)
    |                       |
    +-------+---------------+
            |
    +-------+-------+
    |       |       |
    v       v       v
TASK-003  TASK-004  TASK-005
(File)    (Memory)  (Search)
    |       |       |
    +-------+-------+
            |
            v
      TASK-006 (Manager)
            |
            v
      TASK-007 (Exports)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-003, TASK-004, TASK-005 (after Group A)
- Group C: TASK-006 (after Group B)
- Group D: TASK-007 (after TASK-006)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test all three bookmark types
4. Test search functionality
5. Review implementation against spec-viewers.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding index file for faster tag queries
- Consider caching bookmarks in memory

### Future Enhancements

- Hierarchical tags (e.g., project/feature/type)
- Bookmark export/import
- Bookmark sharing
- Full-text search index
