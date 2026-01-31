/**
 * File change types for tracking file modifications from Claude Code sessions.
 *
 * Provides data models for extracting and indexing file changes from transcripts,
 * enabling search and analysis of which files were modified in which sessions.
 *
 * @module sdk/file-changes/types
 */

// ============================================================================
// Tool and Operation Types
// ============================================================================

/**
 * Modifying tools that can change file contents.
 */
export type ModifyingTool = "Edit" | "Write" | "MultiEdit" | "NotebookEdit";

/**
 * File operation type.
 */
export type FileOperation = "created" | "modified" | "deleted";

// ============================================================================
// File Change
// ============================================================================

/**
 * Single file change from a tool use.
 *
 * Represents one modification to a file from a single tool invocation.
 *
 * @example Edit tool change
 * ```json
 * {
 *   "changeId": "fc-001-edit",
 *   "tool": "Edit",
 *   "timestamp": "2026-01-10T10:15:30.000Z",
 *   "oldContent": "const token = null;",
 *   "newContent": "const token = generateToken();",
 *   "toolUseId": "toolu_01YA3fyEeDsptKYcG9g5zJne",
 *   "messageUuid": "msg-uuid-12345"
 * }
 * ```
 *
 * @example Write tool change
 * ```json
 * {
 *   "changeId": "fc-002-write",
 *   "tool": "Write",
 *   "timestamp": "2026-01-10T10:20:00.000Z",
 *   "newContent": "export function validateToken(token: string): boolean {\n  return token.startsWith('jwt_');\n}",
 *   "toolUseId": "toolu_01ABC123DEF456",
 *   "messageUuid": "msg-uuid-67890"
 * }
 * ```
 */
export interface FileChange {
  /** Unique identifier for this change */
  readonly changeId: string;

  /** File path (absolute or relative) */
  readonly filePath: string;

  /** Tool that made this change */
  readonly tool: ModifyingTool;

  /** ISO timestamp when the change occurred */
  readonly timestamp: string;

  /** Content before the change (for Edit, undefined for Write) */
  readonly oldContent?: string | undefined;

  /** Content after the change */
  readonly newContent: string;

  /** Tool use ID from the transcript */
  readonly toolUseId: string;

  /** Message UUID containing this tool use */
  readonly messageUuid: string;
}

// ============================================================================
// Changed File
// ============================================================================

/**
 * All changes to a single file in a session.
 *
 * Aggregates multiple FileChange instances for one file path.
 *
 * @example Example data
 * ```json
 * {
 *   "path": "/home/user/project/src/auth.ts",
 *   "operation": "modified",
 *   "changeCount": 3,
 *   "firstModified": "2026-01-10T10:15:30.000Z",
 *   "lastModified": "2026-01-10T10:45:00.000Z",
 *   "toolsUsed": ["Edit", "Edit", "Edit"],
 *   "changes": [
 *     {
 *       "changeId": "fc-001",
 *       "tool": "Edit",
 *       "timestamp": "2026-01-10T10:15:30.000Z",
 *       "oldContent": "const token = null;",
 *       "newContent": "const token = generateToken();",
 *       "toolUseId": "toolu_01ABC",
 *       "messageUuid": "msg-001"
 *     }
 *   ],
 *   "version": 3,
 *   "backupFileName": "auth.ts.backup.3"
 * }
 * ```
 */
export interface ChangedFile {
  /** Absolute file path */
  readonly path: string;

  /** Type of operation performed on this file */
  readonly operation: FileOperation;

  /** Number of changes to this file */
  readonly changeCount: number;

  /** ISO timestamp of first modification */
  readonly firstModified: string;

  /** ISO timestamp of last modification */
  readonly lastModified: string;

  /** All tools used on this file */
  readonly toolsUsed: readonly ModifyingTool[];

  /** All changes to this file in chronological order */
  readonly changes: readonly FileChange[];

  /** Version number from file-history-snapshot (if available) */
  readonly version?: number | undefined;

  /** Backup file name from file-history-snapshot (if available) */
  readonly backupFileName?: string | undefined;
}

// ============================================================================
// Session Summary
// ============================================================================

/**
 * Summary of all file changes in a session.
 *
 * Provides aggregated view of file modifications with statistics.
 *
 * @example Example data
 * ```json
 * {
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "projectPath": "/home/user/project",
 *   "totalFilesChanged": 5,
 *   "totalChanges": 12,
 *   "files": [
 *     {
 *       "path": "/home/user/project/src/auth.ts",
 *       "operation": "modified",
 *       "changeCount": 3,
 *       "firstModified": "2026-01-10T10:15:30.000Z",
 *       "lastModified": "2026-01-10T10:45:00.000Z",
 *       "toolsUsed": ["Edit"],
 *       "changes": []
 *     },
 *     {
 *       "path": "/home/user/project/src/utils/token.ts",
 *       "operation": "created",
 *       "changeCount": 1,
 *       "firstModified": "2026-01-10T10:20:00.000Z",
 *       "lastModified": "2026-01-10T10:20:00.000Z",
 *       "toolsUsed": ["Write"],
 *       "changes": []
 *     }
 *   ],
 *   "sessionStart": "2026-01-10T10:00:00.000Z",
 *   "sessionEnd": "2026-01-10T11:30:00.000Z",
 *   "byExtension": { "ts": 4, "json": 1 },
 *   "byDirectory": { "src": 3, "src/utils": 1, "config": 1 }
 * }
 * ```
 */
export interface ChangedFilesSummary {
  /** Session identifier */
  readonly sessionId: string;

  /** Project root path */
  readonly projectPath: string;

  /** Total number of unique files changed */
  readonly totalFilesChanged: number;

  /** Total number of individual changes across all files */
  readonly totalChanges: number;

  /** All changed files */
  readonly files: readonly ChangedFile[];

  /** ISO timestamp when the session started */
  readonly sessionStart: string;

  /** ISO timestamp when the session ended */
  readonly sessionEnd: string;

  /** Number of files changed by extension (e.g., { "ts": 5, "json": 2 }) */
  readonly byExtension: Readonly<Record<string, number>>;

  /** Number of files changed by directory (e.g., { "src/sdk": 3, "tests": 2 }) */
  readonly byDirectory: Readonly<Record<string, number>>;
}

// ============================================================================
// File History
// ============================================================================

/**
 * Session that modified a specific file.
 *
 * Used when searching for all sessions that modified a given file path.
 *
 * @example Example data
 * ```json
 * {
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "projectPath": "/home/user/project",
 *   "gitBranch": "feature/auth-refactor",
 *   "changeCount": 3,
 *   "firstChange": "2026-01-10T10:15:30.000Z",
 *   "lastChange": "2026-01-10T10:45:00.000Z",
 *   "toolsUsed": ["Edit"],
 *   "changes": []
 * }
 * ```
 */
export interface FileSessionMatch {
  /** Session identifier */
  readonly sessionId: string;

  /** Project root path */
  readonly projectPath: string;

  /** Git branch (if available) */
  readonly gitBranch?: string | undefined;

  /** Number of changes to the file in this session */
  readonly changeCount: number;

  /** ISO timestamp of first change */
  readonly firstChange: string;

  /** ISO timestamp of last change */
  readonly lastChange: string;

  /** All tools used on this file in this session */
  readonly toolsUsed: readonly ModifyingTool[];

  /** All changes to this file in this session */
  readonly changes: readonly FileChange[];
}

/**
 * Complete history of a file across all sessions.
 *
 * Aggregates all sessions that modified a specific file path.
 *
 * @example Example data
 * ```json
 * {
 *   "path": "/home/user/project/src/auth.ts",
 *   "totalSessions": 3,
 *   "totalChanges": 8,
 *   "sessions": [
 *     {
 *       "sessionId": "session-003",
 *       "projectPath": "/home/user/project",
 *       "gitBranch": "main",
 *       "changeCount": 2,
 *       "firstChange": "2026-01-12T09:00:00.000Z",
 *       "lastChange": "2026-01-12T09:30:00.000Z",
 *       "toolsUsed": ["Edit"],
 *       "changes": []
 *     },
 *     {
 *       "sessionId": "session-002",
 *       "projectPath": "/home/user/project",
 *       "gitBranch": "feature/auth-refactor",
 *       "changeCount": 3,
 *       "firstChange": "2026-01-10T10:15:30.000Z",
 *       "lastChange": "2026-01-10T10:45:00.000Z",
 *       "toolsUsed": ["Edit"],
 *       "changes": []
 *     }
 *   ],
 *   "firstModified": "2026-01-08T14:00:00.000Z",
 *   "lastModified": "2026-01-12T09:30:00.000Z"
 * }
 * ```
 */
export interface FileHistory {
  /** Absolute file path */
  readonly path: string;

  /** Total number of sessions that modified this file */
  readonly totalSessions: number;

  /** Total number of changes across all sessions */
  readonly totalChanges: number;

  /** All sessions that modified this file, sorted by date descending */
  readonly sessions: readonly FileSessionMatch[];

  /** ISO timestamp of first modification across all sessions */
  readonly firstModified: string;

  /** ISO timestamp of last modification across all sessions */
  readonly lastModified: string;
}

// ============================================================================
// Index Statistics
// ============================================================================

/**
 * Statistics about the file change index.
 *
 * Provides metadata about indexed sessions and files.
 *
 * @example Example data
 * ```json
 * {
 *   "totalSessions": 156,
 *   "totalFiles": 423,
 *   "totalChanges": 1847,
 *   "lastIndexed": "2026-01-13T11:35:36.480Z",
 *   "indexSize": 524288
 * }
 * ```
 */
export interface IndexStats {
  /** Total number of indexed sessions */
  readonly totalSessions: number;

  /** Total number of unique files across all sessions */
  readonly totalFiles: number;

  /** Total number of individual changes across all sessions */
  readonly totalChanges: number;

  /** ISO timestamp when the index was last updated */
  readonly lastIndexed: string;

  /** Index size in bytes */
  readonly indexSize: number;
}
