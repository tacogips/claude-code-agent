# File Changes Service Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-changed-files.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Previous**: `impl-plans/active/file-changes-types.md` (Types and Extractor)
- **Depends On**: `file-changes-types.md`, `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-changed-files.md`

### Summary

Implement the file change index for reverse lookups and the high-level FileChangeService API.

### Scope

**Included**:
- File change index for fast reverse lookups
- FileChangeService with bidirectional query API
- Module exports

**Excluded**:
- Type definitions (file-changes-types.md)
- Extractor (file-changes-types.md)

---

## Modules

### 1. File Change Index

#### src/sdk/file-changes/index-manager.ts

**Status**: NOT_STARTED

```typescript
interface FileIndexEntry {
  sessionId: string;
  projectPath: string;
  gitBranch?: string;
  changeCount: number;
  firstChange: string;
  lastChange: string;
  toolsUsed: string[];
}

interface IndexMetadata {
  version: number;
  lastUpdated: string;
  totalSessions: number;
  totalFiles: number;
  totalChanges: number;
}

class FileChangeIndex {
  constructor(container: Container);

  buildIndex(projectPath?: string): Promise<IndexStats>;
  lookup(filePath: string): Promise<FileIndexEntry[]>;
  lookupPattern(pattern: string): Promise<Map<string, FileIndexEntry[]>>;
  getStats(): Promise<IndexStats>;
  invalidate(projectPath?: string): Promise<void>;

  private loadIndex(): Promise<void>;
  private saveIndex(): Promise<void>;
  private indexSession(sessionId: string): Promise<void>;
  private createIndexEntry(sessionId: string, file: ChangedFile): FileIndexEntry;
  private matchGlob(pattern: string, path: string): boolean;
}
```

**Storage Location**: `~/.local/claude-code-agent/index/file-changes.json`

**Checklist**:
- [ ] buildIndex() scans all sessions
- [ ] Index stored as JSON
- [ ] lookup() returns entries for file path
- [ ] lookupPattern() supports glob patterns
- [ ] getStats() returns index statistics
- [ ] invalidate() clears index
- [ ] Incremental update support (optional)
- [ ] Unit tests
- [ ] Type checking passes

---

### 2. File Change Service

#### src/sdk/file-changes/service.ts

**Status**: NOT_STARTED

```typescript
interface GetFilesOptions {
  includeContent?: boolean;
  extensions?: string[];
  directories?: string[];
}

interface FindOptions {
  projectPath?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  includeContent?: boolean;
}

class FileChangeService {
  constructor(container: Container);

  // Forward lookup
  getSessionChangedFiles(sessionId: string, options?: GetFilesOptions): Promise<ChangedFilesSummary>;
  getFileChangesInSession(sessionId: string, filePath: string): Promise<FileChange[]>;

  // Reverse lookup
  findSessionsByFile(filePath: string, options?: FindOptions): Promise<FileHistory>;
  findSessionsByFilePattern(pattern: string, options?: FindOptions): Promise<FileHistory[]>;

  // Index management
  buildIndex(projectPath?: string): Promise<IndexStats>;
  getIndexStats(): Promise<IndexStats>;
}
```

**Checklist**:
- [ ] getSessionChangedFiles() with options
- [ ] getFileChangesInSession() for specific file
- [ ] findSessionsByFile() with index fallback
- [ ] findSessionsByFilePattern() with glob support
- [ ] buildIndex() and getIndexStats()
- [ ] Integration tests
- [ ] Type checking passes

---

### 3. Module Exports

#### src/sdk/file-changes/index.ts

**Status**: NOT_STARTED

```typescript
// Re-export all public types
export type {
  FileChange,
  ChangedFile,
  ChangedFilesSummary,
  FileSessionMatch,
  FileHistory,
  ModifyingTool,
  FileOperation,
  IndexStats
} from './types';

export { FileChangeService } from './service';
```

**Checklist**:
- [ ] All public types exported
- [ ] FileChangeService exported
- [ ] SDK index includes file-changes
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| File change index | `src/sdk/file-changes/index-manager.ts` | NOT_STARTED | - |
| File change service | `src/sdk/file-changes/service.ts` | NOT_STARTED | - |
| Module exports | `src/sdk/file-changes/index.ts` | NOT_STARTED | - |

---

## Subtasks

### TASK-003: File Change Index

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/sdk/file-changes/index-manager.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] buildIndex() scans all sessions
- [ ] Index stored as JSON
- [ ] lookup() returns entries for file path
- [ ] lookupPattern() supports glob patterns
- [ ] getStats() returns index statistics
- [ ] invalidate() clears index
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-004: File Change Service

**Status**: Not Started
**Parallelizable**: No (depends on TASK-002, TASK-003)
**Deliverables**: `src/sdk/file-changes/service.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] getSessionChangedFiles() with options
- [ ] getFileChangesInSession() for specific file
- [ ] findSessionsByFile() with index fallback
- [ ] findSessionsByFilePattern() with glob support
- [ ] buildIndex() and getIndexStats()
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-005: Module Exports

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `src/sdk/file-changes/index.ts`, update `src/sdk/index.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [ ] All public types exported
- [ ] FileChangeService exported
- [ ] SDK index includes file-changes
- [ ] Type checking passes

---

## Task Dependency Graph

```
(file-changes-types.md)
    |
    v
TASK-003 (Index)
    |
    v
TASK-004 (Service)
    |
    v
TASK-005 (Exports)
```

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Index | TASK-001, TASK-002 | Blocked |
| Service | TASK-003 | Blocked |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes

---

## Progress Log

(To be filled during implementation)
