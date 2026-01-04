# File Changes Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-changed-files.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-changed-files.md`

### Summary

Implement the file changes extraction feature for bidirectional lookup between sessions and file modifications. Provides: (1) Session -> Files: list all files changed in a session, and (2) File -> Sessions: find all sessions that modified a specific file. Includes indexing for efficient reverse lookups.

### Scope

**Included**:
- FileChange and ChangedFile data models
- Forward lookup: extract changed files from session transcript
- Reverse lookup: find sessions by file path
- File change indexing for fast reverse lookups
- SDK API (FileChangeService)
- CLI commands (covered in cli.md)
- REST API endpoints (covered in daemon-and-http-api.md)

**Excluded**:
- Git correlation (future enhancement)
- Unified diff generation (future enhancement)

---

## Implementation Overview

### Approach

Build file change extraction by:
1. Parsing tool_use and toolUseResult from transcripts
2. Extracting file paths and change content from Edit, Write, MultiEdit, NotebookEdit tools
3. Building an index for reverse lookups
4. Providing bidirectional query API

### Key Decisions

- Extract from tool_use (request) and toolUseResult (response) entries
- Support Edit, Write, MultiEdit, NotebookEdit tools
- Index stored as JSON with file path -> session references
- Normalize file paths to absolute paths
- Content extraction is optional (off by default for performance)

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Foundation Layer | Required | foundation-and-core.md |
| Session Reader | Required | foundation-and-core.md |
| JSONL Parser | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/sdk/file-changes/types.ts

**Purpose**: Define file change data model types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileChange` | interface | Individual file change | ChangedFile |
| `ChangedFile` | interface | File with all changes | ChangedFilesSummary |
| `ChangedFilesSummary` | interface | Session file summary | FileChangeService |
| `FileSessionMatch` | interface | Reverse lookup result | FileHistory |
| `FileHistory` | interface | File across sessions | FileChangeService |
| `FileOperation` | type | Operation type | FileChange |
| `ModifyingTool` | type | Tools that modify files | FileChange |

**Interface Definitions**:

```
FileChange
  Purpose: Represents a single file modification
  Properties:
    - changeId: string - Unique identifier
    - tool: ModifyingTool - Tool that made the change
    - timestamp: string - ISO timestamp
    - oldContent?: string - Content before change (Edit only)
    - newContent: string - Content after change
    - toolUseId: string - Tool use ID from transcript
    - messageUuid: string - Message containing this change
  Used by: ChangedFile, extraction logic

ModifyingTool
  Purpose: Tools that can modify files
  Values: 'Edit' | 'Write' | 'MultiEdit' | 'NotebookEdit'
  Used by: FileChange

FileOperation
  Purpose: Type of file operation
  Values: 'created' | 'modified' | 'deleted'
  Used by: ChangedFile

ChangedFile
  Purpose: A file with all its changes in a session
  Properties:
    - path: string - Absolute file path
    - operation: FileOperation - Overall operation type
    - changeCount: number - Number of modifications
    - firstModified: string - First change timestamp
    - lastModified: string - Last change timestamp
    - toolsUsed: ModifyingTool[] - Tools used
    - changes: FileChange[] - Individual changes
    - version?: number - File history version
    - backupFileName?: string - Backup file name
  Used by: ChangedFilesSummary

ChangedFilesSummary
  Purpose: Summary of all changes in a session
  Properties:
    - sessionId: string
    - projectPath: string
    - totalFilesChanged: number
    - totalChanges: number
    - files: ChangedFile[]
    - sessionStart: string
    - sessionEnd: string
    - byExtension: Record<string, number>
    - byDirectory: Record<string, number>
  Used by: FileChangeService.getSessionChangedFiles()

FileSessionMatch
  Purpose: Session that modified a file (reverse lookup)
  Properties:
    - sessionId: string
    - projectPath: string
    - gitBranch?: string
    - changeCount: number
    - firstChange: string
    - lastChange: string
    - toolsUsed: ModifyingTool[]
    - changes: FileChange[]
  Used by: FileHistory

FileHistory
  Purpose: Complete history of a file across sessions
  Properties:
    - path: string - Absolute file path
    - totalSessions: number
    - totalChanges: number
    - sessions: FileSessionMatch[]
    - firstModified: string
    - lastModified: string
  Used by: FileChangeService.findSessionsByFile()

IndexStats
  Purpose: Index statistics
  Properties:
    - totalSessions: number
    - totalFiles: number
    - totalChanges: number
    - lastIndexed: string
    - indexSize: number
  Used by: FileChangeService.getIndexStats()
```

**Dependencies**: None

**Dependents**: FileChangeService, extraction logic, index

---

### Deliverable 2: src/sdk/file-changes/extractor.ts

**Purpose**: Extract file changes from transcripts

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileChangeExtractor` | class | Extract changes from transcript | FileChangeService |

**Class Definition**:

```
FileChangeExtractor
  Purpose: Extract file changes from session transcript
  Constructor: (container: Container)
  Public Methods:
    - extractFromSession(sessionId: string, options?: ExtractOptions): Promise<ChangedFilesSummary>
    - extractFromTranscript(transcriptPath: string, options?: ExtractOptions): Promise<ChangedFile[]>
  Private Methods:
    - parseToolUse(entry: TranscriptEntry): FileChange | null
    - extractFilePath(toolName: string, input: object): string | null
    - createFileChange(toolUse: object, timestamp: string): FileChange
    - enrichWithSnapshot(files: Map<string, ChangedFile>, snapshot: object): void
    - buildSummary(sessionId: string, files: Map<string, ChangedFile>): ChangedFilesSummary
    - normalizePath(filePath: string, projectPath: string): string
  Private Properties:
    - container: Container
    - sessionReader: SessionReader
  Used by: FileChangeService

ExtractOptions
  Purpose: Options for extraction
  Properties:
    - includeContent?: boolean - Include old/new content (default: false)
    - extensions?: string[] - Filter by extensions
    - directories?: string[] - Filter by directory prefixes
  Used by: extractFromSession()
```

**Function Signatures**:

```
extractFromSession(sessionId: string, options?: ExtractOptions): Promise<ChangedFilesSummary>
  Purpose: Extract all file changes from a session
  Called by: FileChangeService.getSessionChangedFiles()

extractFromTranscript(transcriptPath: string, options?: ExtractOptions): Promise<ChangedFile[]>
  Purpose: Extract from transcript file directly
  Called by: Index builder

parseToolUse(entry: TranscriptEntry): FileChange | null
  Purpose: Parse tool_use entry for file change
  Called by: extraction loop
```

**Dependencies**: `src/container.ts`, `src/sdk/session-reader.ts`

**Dependents**: FileChangeService

---

### Deliverable 3: src/sdk/file-changes/index-manager.ts

**Purpose**: Manage file change index for reverse lookups

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileChangeIndex` | class | Index for reverse lookups | FileChangeService |

**Class Definition**:

```
FileChangeIndex
  Purpose: Index for fast file -> sessions lookup
  Constructor: (container: Container)
  Public Methods:
    - buildIndex(projectPath?: string): Promise<IndexStats>
    - lookup(filePath: string): Promise<FileIndexEntry[]>
    - lookupPattern(pattern: string): Promise<Map<string, FileIndexEntry[]>>
    - getStats(): Promise<IndexStats>
    - invalidate(projectPath?: string): Promise<void>
  Private Methods:
    - loadIndex(): Promise<void>
    - saveIndex(): Promise<void>
    - indexSession(sessionId: string): Promise<void>
    - createIndexEntry(sessionId: string, file: ChangedFile): FileIndexEntry
    - matchGlob(pattern: string, path: string): boolean
  Private Properties:
    - container: Container
    - index: Map<string, FileIndexEntry[]>
    - metadata: IndexMetadata
    - indexPath: string
  Used by: FileChangeService

FileIndexEntry
  Purpose: Index entry for a file in a session
  Properties:
    - sessionId: string
    - projectPath: string
    - gitBranch?: string
    - changeCount: number
    - firstChange: string
    - lastChange: string
    - toolsUsed: string[]
  Used by: FileChangeIndex

IndexMetadata
  Purpose: Index metadata
  Properties:
    - version: number
    - lastUpdated: string
    - totalSessions: number
    - totalFiles: number
    - totalChanges: number
  Used by: FileChangeIndex
```

**Function Signatures**:

```
buildIndex(projectPath?: string): Promise<IndexStats>
  Purpose: Build or rebuild the file change index
  Called by: CLI files index --build

lookup(filePath: string): Promise<FileIndexEntry[]>
  Purpose: Look up sessions that modified a file
  Called by: FileChangeService.findSessionsByFile()

lookupPattern(pattern: string): Promise<Map<string, FileIndexEntry[]>>
  Purpose: Look up by glob pattern
  Called by: FileChangeService.findSessionsByFilePattern()

getStats(): Promise<IndexStats>
  Purpose: Get index statistics
  Called by: CLI files index --stats
```

**Storage Location**:

```
~/.local/claude-code-agent/index/file-changes.json
```

**Dependencies**: `src/container.ts`, `src/sdk/file-changes/extractor.ts`

**Dependents**: FileChangeService

---

### Deliverable 4: src/sdk/file-changes/service.ts

**Purpose**: High-level file change service API

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `FileChangeService` | class | Main service class | SDK, CLI |

**Class Definition**:

```
FileChangeService
  Purpose: High-level API for file change operations
  Constructor: (container: Container)
  Public Methods:
    // Forward lookup
    - getSessionChangedFiles(sessionId: string, options?: GetFilesOptions): Promise<ChangedFilesSummary>
    - getFileChangesInSession(sessionId: string, filePath: string): Promise<FileChange[]>

    // Reverse lookup
    - findSessionsByFile(filePath: string, options?: FindOptions): Promise<FileHistory>
    - findSessionsByFilePattern(pattern: string, options?: FindOptions): Promise<FileHistory[]>

    // Index management
    - buildIndex(projectPath?: string): Promise<IndexStats>
    - getIndexStats(): Promise<IndexStats>
  Private Properties:
    - extractor: FileChangeExtractor
    - index: FileChangeIndex
  Used by: SDK agent.files, CLI files commands

GetFilesOptions
  Purpose: Options for getting changed files
  Properties:
    - includeContent?: boolean
    - extensions?: string[]
    - directories?: string[]
  Used by: getSessionChangedFiles()

FindOptions
  Purpose: Options for finding sessions
  Properties:
    - projectPath?: string
    - fromDate?: string
    - toDate?: string
    - limit?: number
    - offset?: number
    - includeContent?: boolean
  Used by: findSessionsByFile()
```

**Function Signatures**:

```
getSessionChangedFiles(sessionId: string, options?: GetFilesOptions): Promise<ChangedFilesSummary>
  Purpose: Get all files changed in a session
  Called by: CLI files list

findSessionsByFile(filePath: string, options?: FindOptions): Promise<FileHistory>
  Purpose: Find all sessions that modified a file
  Called by: CLI files search

buildIndex(projectPath?: string): Promise<IndexStats>
  Purpose: Build the file change index
  Called by: CLI files index --build
```

**Dependencies**: `src/sdk/file-changes/extractor.ts`, `src/sdk/file-changes/index-manager.ts`

**Dependents**: SDK, CLI, REST API

---

### Deliverable 5: src/sdk/file-changes/index.ts

**Purpose**: Public exports for file changes module

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| All public types | types | Type definitions | SDK consumers |
| `FileChangeService` | class | Main service class | SDK |

**Dependencies**: All file-changes modules

**Dependents**: `src/sdk/index.ts`

---

## Subtasks

### TASK-001: File Change Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/file-changes/types.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for file changes.

**Completion Criteria**:
- [ ] FileChange interface defined
- [ ] ChangedFile interface defined
- [ ] ChangedFilesSummary interface defined
- [ ] FileSessionMatch interface defined
- [ ] FileHistory interface defined
- [ ] ModifyingTool and FileOperation types defined
- [ ] IndexStats interface defined
- [ ] Type checking passes
- [ ] All types exported

---

### TASK-002: File Change Extractor

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001)
**Deliverables**: `src/sdk/file-changes/extractor.ts`
**Estimated Effort**: Large

**Description**:
Implement extraction of file changes from transcripts.

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

### TASK-003: File Change Index

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/sdk/file-changes/index-manager.ts`
**Estimated Effort**: Medium

**Description**:
Implement the file change index for reverse lookups.

**Completion Criteria**:
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

### TASK-004: File Change Service

**Status**: Not Started
**Parallelizable**: No (depends on TASK-002, TASK-003)
**Deliverables**: `src/sdk/file-changes/service.ts`
**Estimated Effort**: Medium

**Description**:
Implement the high-level FileChangeService.

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

**Description**:
Create module exports and add to SDK.

**Completion Criteria**:
- [ ] All public types exported
- [ ] FileChangeService exported
- [ ] SDK index includes file-changes
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
TASK-003 (Index)
    |
    v
TASK-004 (Service)
    |
    v
TASK-005 (Exports)
```

All tasks are sequential due to dependencies.

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
3. Test with actual Claude Code transcripts
4. Test index build and lookup
5. Review implementation against spec-changed-files.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider DuckDB for complex queries
- Consider incremental index updates via file watcher

### Future Enhancements

- Unified diff generation
- Git commit correlation
- Change blame (which session introduced specific lines)
- Change revert using file-history backups
- Visual change timeline
