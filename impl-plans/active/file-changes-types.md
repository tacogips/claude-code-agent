# File Changes Types Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-changed-files.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Next**: `impl-plans/active/file-changes-service.md` (Index, Service, Exports)
- **Depends On**: `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-changed-files.md`

### Summary

Define file change data model types and implement the extractor for parsing file changes from transcripts.

### Scope

**Included**:
- FileChange and ChangedFile data models
- File operation and modifying tool types
- FileChangeExtractor for transcript parsing

**Excluded**:
- Index management (file-changes-service.md)
- FileChangeService (file-changes-service.md)
- CLI/REST integration (other plans)

---

## Modules

### 1. File Change Types

#### src/sdk/file-changes/types.ts

**Status**: COMPLETED

```typescript
interface FileChange {
  changeId: string;
  tool: ModifyingTool;
  timestamp: string;
  oldContent?: string;
  newContent: string;
  toolUseId: string;
  messageUuid: string;
}

type ModifyingTool = 'Edit' | 'Write' | 'MultiEdit' | 'NotebookEdit';
type FileOperation = 'created' | 'modified' | 'deleted';

interface ChangedFile {
  path: string;
  operation: FileOperation;
  changeCount: number;
  firstModified: string;
  lastModified: string;
  toolsUsed: ModifyingTool[];
  changes: FileChange[];
  version?: number;
  backupFileName?: string;
}

interface ChangedFilesSummary {
  sessionId: string;
  projectPath: string;
  totalFilesChanged: number;
  totalChanges: number;
  files: ChangedFile[];
  sessionStart: string;
  sessionEnd: string;
  byExtension: Record<string, number>;
  byDirectory: Record<string, number>;
}

interface FileSessionMatch {
  sessionId: string;
  projectPath: string;
  gitBranch?: string;
  changeCount: number;
  firstChange: string;
  lastChange: string;
  toolsUsed: ModifyingTool[];
  changes: FileChange[];
}

interface FileHistory {
  path: string;
  totalSessions: number;
  totalChanges: number;
  sessions: FileSessionMatch[];
  firstModified: string;
  lastModified: string;
}

interface IndexStats {
  totalSessions: number;
  totalFiles: number;
  totalChanges: number;
  lastIndexed: string;
  indexSize: number;
}
```

**Checklist**:
- [x] FileChange interface defined
- [x] ChangedFile interface defined
- [x] ChangedFilesSummary interface defined
- [x] FileSessionMatch interface defined
- [x] FileHistory interface defined
- [x] ModifyingTool and FileOperation types defined
- [x] IndexStats interface defined
- [x] Type checking passes
- [x] All types exported

---

### 2. File Change Extractor

#### src/sdk/file-changes/extractor.ts

**Status**: NOT_STARTED

```typescript
interface ExtractOptions {
  includeContent?: boolean;
  extensions?: string[];
  directories?: string[];
}

class FileChangeExtractor {
  constructor(container: Container);

  extractFromSession(sessionId: string, options?: ExtractOptions): Promise<ChangedFilesSummary>;
  extractFromTranscript(transcriptPath: string, options?: ExtractOptions): Promise<ChangedFile[]>;

  private parseToolUse(entry: TranscriptEntry): FileChange | null;
  private extractFilePath(toolName: string, input: object): string | null;
  private createFileChange(toolUse: object, timestamp: string): FileChange;
  private enrichWithSnapshot(files: Map<string, ChangedFile>, snapshot: object): void;
  private buildSummary(sessionId: string, files: Map<string, ChangedFile>): ChangedFilesSummary;
  private normalizePath(filePath: string, projectPath: string): string;
}
```

**Checklist**:
- [ ] Parse Edit tool calls (old_string, new_string)
- [ ] Parse Write tool calls (full content)
- [ ] Parse MultiEdit tool calls (multiple edits)
- [ ] Parse NotebookEdit tool calls
- [ ] Handle file-history-snapshot enrichment
- [ ] Path normalization to absolute paths
- [ ] Build ChangedFilesSummary with statistics
- [ ] Filter by extension and directory
- [ ] Unit tests with sample transcripts
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| File change types | `src/sdk/file-changes/types.ts` | NOT_STARTED | - |
| File change extractor | `src/sdk/file-changes/extractor.ts` | NOT_STARTED | - |

---

## Subtasks

### TASK-001: File Change Types

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/file-changes/types.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] FileChange interface defined
- [x] ChangedFile interface defined
- [x] ChangedFilesSummary interface defined
- [x] FileSessionMatch interface defined
- [x] FileHistory interface defined
- [x] ModifyingTool and FileOperation types defined
- [x] IndexStats interface defined
- [x] Type checking passes
- [x] All types exported

---

### TASK-002: File Change Extractor

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001)
**Deliverables**: `src/sdk/file-changes/extractor.ts`
**Estimated Effort**: Large

**Completion Criteria**:
- [ ] Parse Edit tool calls (old_string, new_string)
- [ ] Parse Write tool calls (full content)
- [ ] Parse MultiEdit tool calls (multiple edits)
- [ ] Parse NotebookEdit tool calls
- [ ] Handle file-history-snapshot enrichment
- [ ] Path normalization to absolute paths
- [ ] Build ChangedFilesSummary with statistics
- [ ] Filter by extension and directory
- [ ] Unit tests with sample transcripts
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)
    |
    v
TASK-002 (Extractor)
    |
    v
(file-changes-service.md)
```

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Types | None | Ready |
| Extractor | Foundation, Session Reader | Available |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors

---

## Progress Log

### Session: 2026-01-06 15:30
**Tasks Completed**: TASK-001 (File Change Types)
**Status**: COMPLETED
**Files Modified**:
- `src/sdk/file-changes/types.ts` (already existed and fully implemented)
- `impl-plans/active/file-changes-types.md` (updated status)

**Notes**:
The file change types were already fully implemented with all required interfaces and types. Verified implementation against TypeScript coding standards:
- All properties use `readonly` modifier
- Optional properties explicitly include `| undefined` (per `exactOptionalPropertyTypes`)
- Array types use `readonly T[]` for immutability
- Record types use `Readonly<Record<...>>`
- Complete JSDoc documentation for all public types
- Zero `any` types used
- Type checking passes without errors
- Code formatted with prettier

**Next Steps**:
TASK-002 (File Change Extractor) is now unblocked and ready for implementation.
