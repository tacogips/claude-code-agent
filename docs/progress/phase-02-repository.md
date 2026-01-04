# Phase 2: Repository Layer

**Status**: NOT_STARTED

**Goal**: Implement data access layer with repository pattern. Start with in-memory implementation.

## Spec Reference

- `design-docs/DESIGN.md` Repository Layer (Clean Architecture)
- `design-docs/spec-infrastructure.md` Section 6 (Testing Strategy)

---

## Dependencies

- Phase 1: Foundation Layer (interfaces, types, errors)

---

## 1. Repository Interfaces

### 1.1 SessionRepository

**File**: `src/repository/session-repository.ts`
**Status**: NOT_STARTED

```typescript
interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByProject(projectPath: string): Promise<Session[]>;
  list(filter?: SessionFilter): Promise<Session[]>;
  save(session: SessionMetadata): Promise<void>;
  delete(id: string): Promise<void>;
}
```

**Checklist**:
- [ ] Define SessionRepository interface
- [ ] Define SessionFilter type
- [ ] Export from repository/index.ts

### 1.2 BookmarkRepository

**File**: `src/repository/bookmark-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Define BookmarkRepository interface
- [ ] Define BookmarkFilter type

### 1.3 GroupRepository

**File**: `src/repository/group-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Define GroupRepository interface
- [ ] Define GroupFilter type

### 1.4 QueueRepository

**File**: `src/repository/queue-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Define QueueRepository interface
- [ ] Define QueueFilter type

---

## 2. In-Memory Implementations

### 2.1 InMemorySessionRepository

**File**: `src/repository/in-memory/session-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using Map<string, Session>
- [ ] Implement all filter operations
- [ ] Write unit tests

### 2.2 InMemoryBookmarkRepository

**File**: `src/repository/in-memory/bookmark-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using Map
- [ ] Write unit tests

### 2.3 InMemoryGroupRepository

**File**: `src/repository/in-memory/group-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using Map
- [ ] Write unit tests

### 2.4 InMemoryQueueRepository

**File**: `src/repository/in-memory/queue-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using Map
- [ ] Write unit tests

---

## 3. File-Based Implementations

### 3.1 FileSessionRepository

**File**: `src/repository/file/session-repository.ts`
**Status**: NOT_STARTED

**Implementation Notes**:
- Uses FileSystem interface
- Stores metadata in `~/.local/claude-code-agent/metadata/sessions/`
- Reads transcripts from `~/.claude/projects/`

**Checklist**:
- [ ] Implement file-based storage
- [ ] Implement directory scanning
- [ ] Write integration tests

### 3.2 FileBookmarkRepository

**File**: `src/repository/file/bookmark-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using JSON files
- [ ] Write integration tests

### 3.3 FileGroupRepository

**File**: `src/repository/file/group-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using JSON files
- [ ] Write integration tests

### 3.4 FileQueueRepository

**File**: `src/repository/file/queue-repository.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement using JSON files
- [ ] Write integration tests

---

## Implementation Order

1. Repository interfaces (all 4)
2. InMemorySessionRepository (needed for testing Phase 3)
3. Other in-memory repositories
4. File-based implementations (as needed)

---

## Notes

- In-memory implementations are the primary focus for initial development
- File-based implementations use the FileSystem interface for testability
- All repositories are accessed through the Container
