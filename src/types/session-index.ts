/**
 * Types for Claude Code's sessions-index.json files.
 *
 * Claude Code stores session metadata in ~/.claude/projects/<encoded-path>/sessions-index.json.
 * These types represent the structure of those index files.
 *
 * @module types/session-index
 */

/**
 * A single entry in the sessions-index.json file.
 */
export interface SessionIndexEntry {
  readonly sessionId: string;
  readonly fullPath: string;
  readonly firstPrompt: string;
  readonly summary: string;
  readonly modified: string;
  readonly created: string;
  readonly gitBranch: string;
  readonly projectPath: string;
}

/**
 * The complete sessions-index.json structure.
 */
export interface SessionIndex {
  readonly originalPath: string;
  readonly entries: readonly SessionIndexEntry[];
}

/**
 * Project information derived from session indexes.
 */
export interface ProjectInfo {
  readonly path: string;
  readonly encoded: string;
  readonly sessionCount: number;
  readonly lastModified: string;
}

/**
 * Paginated response for session listing.
 */
export interface SessionListResponse {
  readonly sessions: readonly SessionIndexEntry[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

/**
 * Options for listing sessions by working directory path.
 */
export interface ListSessionsByPathOptions {
  /** Absolute path to the working directory (e.g., "/g/gits/tacogips/QraftBox") */
  readonly workingDirectory: string;
  /** Optional search string to filter by firstPrompt or summary */
  readonly search?: string;
  /** Pagination offset (default: 0) */
  readonly offset?: number;
  /** Pagination limit (default: 50) */
  readonly limit?: number;
  /** Sort field (default: "modified") */
  readonly sortBy?: "modified" | "created";
  /** Sort order (default: "desc") */
  readonly sortOrder?: "asc" | "desc";
}
