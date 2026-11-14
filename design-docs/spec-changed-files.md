# Changed Files Extraction Specification

This document specifies the feature for extracting and searching file modifications across Claude Code sessions.

---

## Overview

**Purpose**: Provide bidirectional lookup between sessions and file modifications:
1. **Session -> Files**: List all files changed in a session with change details
2. **File -> Sessions**: Find all sessions that modified a specific file

**Use Cases**:
- Display summary of files changed in a session with diffs
- Find which sessions modified a specific file (audit trail)
- Track file change history across multiple sessions
- Support session review and debugging workflows
- Integration with external tools (git, file watchers)

---

## Data Sources

Claude Code provides multiple ways to identify changed files in transcripts:

### 1. Tool Call Records (`tool_use`)

When Claude modifies files, the transcript records the tool invocation:

```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01...",
        "name": "Edit",
        "input": {
          "file_path": "/path/to/file.ts",
          "old_string": "original content",
          "new_string": "new content"
        }
      }
    ]
  },
  "timestamp": "2025-12-10T10:00:00.000Z"
}
```

**Relevant Tools for File Modifications**:

| Tool | Input Field | Description |
|------|-------------|-------------|
| `Edit` | `input.file_path` | Single file edits (old_string -> new_string) |
| `Write` | `input.file_path` | Full file creation/overwrite |
| `MultiEdit` | `input.edits[].file_path` | Batch edits to multiple files |
| `NotebookEdit` | `input.notebook_path` | Jupyter notebook modifications |

### 2. Tool Result Records (`toolUseResult`)

Tool results contain confirmation of file operations with full content:

```json
{
  "type": "user",
  "toolUseResult": {
    "filePath": "/path/to/file.ts",
    "oldString": "original",
    "newString": "modified",
    "originalFile": "full file content after edit"
  }
}
```

### 3. File History Snapshots (`file-history-snapshot`)

Claude Code tracks file modifications with versioned backups:

```json
{
  "type": "file-history-snapshot",
  "snapshot": {
    "trackedFileBackups": {
      "/path/to/file.ts": {
        "backupFileName": "hash@v1",
        "version": 1,
        "backupTime": "2025-12-10T12:29:10.260Z"
      }
    }
  }
}
```

### 4. File History Directory

Physical backup files are stored at:
```
~/.claude/file-history/<session-uuid>/<hash>@v<N>
```

---

## Data Model

### FileChange Interface (Individual Change)

```typescript
interface FileChange {
  /** Unique identifier for this change */
  changeId: string;

  /** Tool that made the change */
  tool: "Edit" | "Write" | "MultiEdit" | "NotebookEdit";

  /** Timestamp of the change (ISO 8601) */
  timestamp: string;

  /** Content before the change (for Edit tool) */
  oldContent?: string;

  /** Content after the change (for Edit tool) / Full content (for Write) */
  newContent: string;

  /** Tool use ID from transcript */
  toolUseId: string;

  /** Message UUID containing this change */
  messageUuid: string;
}
```

### ChangedFile Interface (File with All Changes)

```typescript
interface ChangedFile {
  /** Absolute path to the modified file */
  path: string;

  /** Type of overall operation */
  operation: "created" | "modified" | "deleted";

  /** Number of times the file was modified in this session */
  changeCount: number;

  /** First modification timestamp (ISO 8601) */
  firstModified: string;

  /** Last modification timestamp (ISO 8601) */
  lastModified: string;

  /** Tools used to modify the file */
  toolsUsed: ("Edit" | "Write" | "MultiEdit" | "NotebookEdit")[];

  /** List of individual changes (chronological order) */
  changes: FileChange[];

  /** File history version (if available from snapshot) */
  version?: number;

  /** Backup file name in file-history directory (if available) */
  backupFileName?: string;
}
```

### ChangedFilesSummary Interface (Session Summary)

```typescript
interface ChangedFilesSummary {
  /** Session ID */
  sessionId: string;

  /** Project path */
  projectPath: string;

  /** Total number of unique files changed */
  totalFilesChanged: number;

  /** Total number of individual changes */
  totalChanges: number;

  /** List of changed files with details */
  files: ChangedFile[];

  /** Session start timestamp */
  sessionStart: string;

  /** Session end timestamp (or current time if active) */
  sessionEnd: string;

  /** Breakdown by file extension */
  byExtension: Record<string, number>;

  /** Breakdown by directory */
  byDirectory: Record<string, number>;
}
```

### FileSessionMatch Interface (Reverse Lookup Result)

```typescript
interface FileSessionMatch {
  /** Session ID that modified the file */
  sessionId: string;

  /** Project path where session ran */
  projectPath: string;

  /** Git branch during session */
  gitBranch?: string;

  /** Number of changes to this file in this session */
  changeCount: number;

  /** First change timestamp */
  firstChange: string;

  /** Last change timestamp */
  lastChange: string;

  /** Tools used */
  toolsUsed: ("Edit" | "Write" | "MultiEdit" | "NotebookEdit")[];

  /** Individual changes to this file in this session */
  changes: FileChange[];
}
```

### FileHistory Interface (File Across All Sessions)

```typescript
interface FileHistory {
  /** Absolute file path */
  path: string;

  /** Total sessions that modified this file */
  totalSessions: number;

  /** Total changes across all sessions */
  totalChanges: number;

  /** Sessions that modified this file (sorted by most recent first) */
  sessions: FileSessionMatch[];

  /** First ever modification */
  firstModified: string;

  /** Most recent modification */
  lastModified: string;
}
```

---

## API Design

### SDK Methods

```typescript
class FileChangeService {
  // ========================================
  // Session -> Files (Forward Lookup)
  // ========================================

  /**
   * Get all files changed in a session with change details
   * @param sessionId - Session UUID or transcript path
   * @param options - Include change content, filter by extension/directory
   */
  async getSessionChangedFiles(
    sessionId: string,
    options?: {
      includeContent?: boolean;  // Include old/new content (default: false)
      extensions?: string[];     // Filter by extensions
      directories?: string[];    // Filter by directory prefixes
    }
  ): Promise<ChangedFilesSummary>;

  /**
   * Get changes for a specific file in a session
   * @param sessionId - Session UUID
   * @param filePath - Absolute file path
   */
  async getFileChangesInSession(
    sessionId: string,
    filePath: string
  ): Promise<FileChange[]>;

  // ========================================
  // File -> Sessions (Reverse Lookup)
  // ========================================

  /**
   * Find all sessions that modified a specific file
   * @param filePath - Absolute or relative file path
   * @param options - Filter and pagination options
   */
  async findSessionsByFile(
    filePath: string,
    options?: {
      projectPath?: string;      // Limit to specific project
      fromDate?: string;         // Filter by date range
      toDate?: string;
      limit?: number;            // Pagination
      offset?: number;
      includeContent?: boolean;  // Include change content
    }
  ): Promise<FileHistory>;

  /**
   * Find sessions that modified files matching a pattern
   * @param pattern - Glob pattern (e.g., "src/**\/*.ts")
   * @param options - Filter options
   */
  async findSessionsByFilePattern(
    pattern: string,
    options?: {
      projectPath?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    }
  ): Promise<FileHistory[]>;

  // ========================================
  // Indexing
  // ========================================

  /**
   * Build/rebuild file change index for faster reverse lookups
   * @param projectPath - Limit to specific project (optional)
   */
  async buildIndex(projectPath?: string): Promise<IndexStats>;

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<IndexStats>;
}

interface IndexStats {
  totalSessions: number;
  totalFiles: number;
  totalChanges: number;
  lastIndexed: string;
  indexSize: number;  // bytes
}
```

### CLI Commands

```bash
# ========================================
# Session -> Files (Forward Lookup)
# ========================================

# List all files changed in a session
claude-code-agent files list <session-id>

# With change details (shows diffs)
claude-code-agent files list <session-id> --show-changes

# Output formats
claude-code-agent files list <session-id> --format=table    # default
claude-code-agent files list <session-id> --format=json
claude-code-agent files list <session-id> --format=paths    # just paths

# Filter options
claude-code-agent files list <session-id> --ext=.ts,.tsx
claude-code-agent files list <session-id> --dir=src/

# ========================================
# File -> Sessions (Reverse Lookup)
# ========================================

# Find sessions that modified a specific file
claude-code-agent files search <file-path>

# With change details
claude-code-agent files search <file-path> --show-changes

# Filter by project
claude-code-agent files search <file-path> --project=/path/to/project

# Filter by date range
claude-code-agent files search <file-path> --from=2025-01-01 --to=2025-12-31

# Search by glob pattern
claude-code-agent files search "src/**/*.ts"

# Output formats
claude-code-agent files search <file-path> --format=table   # default
claude-code-agent files search <file-path> --format=json

# ========================================
# Index Management
# ========================================

# Build/rebuild index for faster reverse lookups
claude-code-agent files index --build

# Show index statistics
claude-code-agent files index --stats

# Build index for specific project only
claude-code-agent files index --build --project=/path/to/project
```

### REST API

```
# ========================================
# Session -> Files
# ========================================

GET /api/sessions/{sessionId}/files
  Query Parameters:
    - includeContent: boolean (default: false)
    - extensions: comma-separated list
    - directories: comma-separated list

  Response: ChangedFilesSummary

GET /api/sessions/{sessionId}/files/{encodedFilePath}/changes
  Response: FileChange[]

# ========================================
# File -> Sessions (Reverse Lookup)
# ========================================

GET /api/files/search
  Query Parameters:
    - path: string (required) - file path or glob pattern
    - project: string (optional) - project path filter
    - from: string (optional) - ISO 8601 date
    - to: string (optional) - ISO 8601 date
    - includeContent: boolean (default: false)
    - limit: number (default: 50)
    - offset: number (default: 0)

  Response: FileHistory

# ========================================
# Index Management
# ========================================

POST /api/files/index/build
  Body: { projectPath?: string }
  Response: IndexStats

GET /api/files/index/stats
  Response: IndexStats
```

---

## Indexing Strategy

### Why Indexing is Needed

Reverse lookup (file -> sessions) requires scanning all transcripts, which is expensive. An index provides O(1) lookup.

### Index Structure

```typescript
interface FileChangeIndex {
  // Primary index: file path -> session references
  fileIndex: Map<string, FileIndexEntry[]>;

  // Metadata
  metadata: {
    version: number;
    lastUpdated: string;
    totalSessions: number;
    totalFiles: number;
    totalChanges: number;
  };
}

interface FileIndexEntry {
  sessionId: string;
  projectPath: string;
  gitBranch?: string;
  changeCount: number;
  firstChange: string;
  lastChange: string;
  toolsUsed: string[];
  // Note: actual change content not stored in index
  // Retrieved on-demand from transcript
}
```

### Index Storage

```
~/.local/claude-code-agent/
  index/
    file-changes.json       # Main index file
    file-changes.db         # (Future) DuckDB for complex queries
```

### Index Update Strategy

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **On-Demand** | Build when first query made | Development, low usage |
| **Background** | Periodic rebuild (cron/daemon) | Production, high usage |
| **Incremental** | Watch transcript changes, update delta | Real-time monitoring |

### Recommended Approach

1. **Initial**: On-demand with caching
2. **Production**: Background rebuild every N minutes
3. **Active Sessions**: Incremental updates via file watcher

---

## Extraction Algorithm

### Forward Lookup (Session -> Files)

```
function extractChangedFiles(sessionId: string): ChangedFilesSummary {
  transcriptPath = resolveTranscriptPath(sessionId)
  entries = parseJSONL(transcriptPath)

  changedFiles = Map<string, ChangedFile>()

  for each entry in entries:
    if entry.type == "assistant":
      for each content in entry.message.content:
        if content.type == "tool_use" and content.name in WRITE_TOOLS:
          filePath = extractFilePath(content.name, content.input)
          change = createFileChange(content, entry.timestamp)
          addOrUpdateFile(changedFiles, filePath, change)

    // Enrich with file-history-snapshot data
    if entry.type == "file-history-snapshot":
      for each [path, info] in entry.snapshot.trackedFileBackups:
        enrichWithSnapshot(changedFiles, path, info)

  return buildSummary(sessionId, changedFiles)
}
```

### Reverse Lookup (File -> Sessions)

```
function findSessionsByFile(filePath: string): FileHistory {
  // Check index first
  if indexExists() and indexFresh():
    entries = index.fileIndex.get(normalizedPath)
    return enrichWithChangeDetails(entries)  // Load from transcripts on-demand

  // Fallback: scan all transcripts
  results = []
  for each project in listProjects():
    for each session in listSessions(project):
      changes = extractChangesForFile(session, filePath)
      if changes.length > 0:
        results.push(createFileSessionMatch(session, changes))

  return buildFileHistory(filePath, results)
}
```

---

## Implementation Notes

### Change Content Extraction

For `Edit` tool, extract old/new content:

```typescript
function extractEditChange(toolUse: ToolUse, toolResult: ToolResult): FileChange {
  return {
    changeId: toolUse.id,
    tool: "Edit",
    timestamp: entry.timestamp,
    oldContent: toolUse.input.old_string,
    newContent: toolUse.input.new_string,
    toolUseId: toolUse.id,
    messageUuid: entry.uuid
  };
}
```

For `Write` tool:

```typescript
function extractWriteChange(toolUse: ToolUse, toolResult: ToolResult): FileChange {
  return {
    changeId: toolUse.id,
    tool: "Write",
    timestamp: entry.timestamp,
    oldContent: undefined,  // Write replaces entire file
    newContent: toolUse.input.content,
    toolUseId: toolUse.id,
    messageUuid: entry.uuid
  };
}
```

### Path Normalization

File paths must be normalized for consistent indexing:

```typescript
function normalizePath(filePath: string, projectPath: string): string {
  // Resolve to absolute path
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectPath, filePath);

  // Normalize path separators and resolve symlinks
  return path.normalize(absolute);
}
```

### Handling Edge Cases

1. **Deleted Files**: Track via `Write` with empty content
2. **Renamed Files**: Appears as delete + create (no direct tracking)
3. **Binary Files**: Flag as binary, don't store content in index
4. **Large Files**: Truncate content in API response, full content via file-history
5. **Concurrent Sessions**: Same file modified by multiple sessions - show all

### Performance Considerations

| Concern | Solution |
|---------|----------|
| Large transcripts | Stream-process JSONL, don't load all in memory |
| Many sessions | Index for reverse lookup, pagination |
| Large changes | Truncate content display, reference file-history for full |
| Real-time updates | Incremental index updates via file watcher |

---

## CLI Output Examples

### Forward Lookup: `files list`

```
$ claude-code-agent files list abc123-def456

Session: abc123-def456
Project: /home/user/my-project
Branch:  feature/auth
Period:  2025-12-10 10:00 - 2025-12-10 12:30

Changed Files (5 files, 12 changes):

  PATH                          CHANGES  FIRST CHANGE          TOOLS
  src/auth/login.ts             4        2025-12-10 10:05:23   Edit
  src/auth/logout.ts            2        2025-12-10 10:15:42   Edit, Write
  src/models/user.ts            3        2025-12-10 10:22:11   Edit
  tests/auth.test.ts            2        2025-12-10 11:45:33   Write
  README.md                     1        2025-12-10 12:28:01   Edit

By Extension: .ts (4), .md (1)
By Directory: src/auth/ (2), src/models/ (1), tests/ (1)
```

### Forward Lookup with Changes: `files list --show-changes`

```
$ claude-code-agent files list abc123 --show-changes

Session: abc123-def456
...

=== src/auth/login.ts (4 changes) ===

[1] 2025-12-10 10:05:23 (Edit)
  - const token = generateToken();
  + const token = generateToken(user.id, { expiresIn: '1h' });

[2] 2025-12-10 10:08:15 (Edit)
  - return { success: true };
  + return { success: true, token };

...
```

### Reverse Lookup: `files search`

```
$ claude-code-agent files search src/auth/login.ts

File: src/auth/login.ts
Modified by 3 sessions:

  SESSION ID       PROJECT                 BRANCH          CHANGES  LAST MODIFIED
  abc123-def456    /home/user/my-project   feature/auth    4        2025-12-10 12:30
  xyz789-uvw012    /home/user/my-project   main            2        2025-12-08 15:22
  mno345-pqr678    /home/user/my-project   fix/login-bug   1        2025-12-05 09:15

Total: 7 changes across 3 sessions
```

---

## Future Enhancements

1. **Unified Diff Format**: Generate standard diff output
2. **Git Correlation**: Link changes to git commits
3. **Change Blame**: Show which session/change introduced specific lines
4. **Change Revert**: Restore file to pre-session state using file-history
5. **Change Timeline**: Visual timeline of file modifications
6. **DuckDB Integration**: SQL queries across all file changes

---

## Related Documents

- [spec-data-storage.md](./spec-data-storage.md) - Claude Code data structures
- [reference-claude-code-internals.md](./reference-claude-code-internals.md) - Tool specifications
- [spec-sdk-api.md](./spec-sdk-api.md) - SDK and API design patterns
