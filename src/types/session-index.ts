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

/**
 * Role filter for transcript search.
 */
export type TranscriptSearchRole = "user" | "assistant" | "both";

/**
 * Source filter for session files.
 */
export type SessionSearchSource = "all" | "uuid" | "legacy";

/**
 * Options for searching transcript content within a session.
 */
export interface TranscriptSearchOptions {
  /** Case-sensitive match when true (default: false) */
  readonly caseSensitive?: boolean;
  /** Message role filter (default: "both") */
  readonly role?: TranscriptSearchRole;
  /** Maximum number of matches to count before stopping (default: 1) */
  readonly maxMatches?: number;
  /** Maximum bytes to scan from transcript (default: unlimited) */
  readonly maxBytes?: number;
  /** Timeout in milliseconds for scan loop (default: unlimited) */
  readonly timeoutMs?: number;
}

/**
 * Result of searching transcript content in a single session.
 */
export interface TranscriptSearchResult {
  readonly sessionId: string;
  readonly matched: boolean;
  readonly matchCount: number;
  readonly scannedBytes: number;
  readonly scannedLines: number;
  /** True when scan stopped early due to limits */
  readonly truncated: boolean;
  /** True when scan stopped due to timeout */
  readonly timedOut: boolean;
}

/**
 * Options for searching sessions by transcript content.
 */
export interface SearchSessionsOptions extends TranscriptSearchOptions {
  /** Optional project path root (defaults to ~/.claude/projects) */
  readonly projectPath?: string;
  /** Source/session format filter (default: "all") */
  readonly source?: SessionSearchSource;
  /** Pagination offset for matched session IDs (default: 0) */
  readonly offset?: number;
  /** Pagination limit for matched session IDs (default: 50) */
  readonly limit?: number;
  /** Maximum number of session files to scan (default: unlimited) */
  readonly maxSessions?: number;
}

/**
 * Paginated session search response.
 */
export interface SessionSearchResponse {
  readonly sessionIds: readonly string[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly scannedSessions: number;
  /** True when scan stopped early due to maxSessions/byte/time limits */
  readonly truncated: boolean;
  /** True when at least one scanned session timed out */
  readonly timedOut: boolean;
}
