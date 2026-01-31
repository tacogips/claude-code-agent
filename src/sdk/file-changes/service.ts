/**
 * High-level file change service API.
 *
 * Provides bidirectional query support for file changes:
 * - Session -> Files: What files were changed in a session?
 * - File -> Sessions: What sessions modified a specific file?
 *
 * Combines FileChangeExtractor for on-demand extraction with
 * FileChangeIndex for fast reverse lookups.
 *
 * @module sdk/file-changes/service
 */

import type { Container } from "../../container";
import type {
  ChangedFilesSummary,
  FileChange,
  FileHistory,
  FileSessionMatch,
  IndexStats,
} from "./types";
import { FileChangeExtractor, type ExtractOptions } from "./extractor";
import { FileChangeIndex } from "./index-manager";
import { createTaggedLogger } from "../../logger";
import path from "node:path";

const logger = createTaggedLogger("file-changes-service");

/**
 * Options for getSessionChangedFiles.
 */
export interface GetFilesOptions {
  /** Include old/new content in FileChange objects (default: false) */
  readonly includeContent?: boolean | undefined;

  /** Filter by file extensions (e.g., [".ts", ".tsx"]) */
  readonly extensions?: readonly string[] | undefined;

  /** Filter by directory prefixes (e.g., ["src/", "tests/"]) */
  readonly directories?: readonly string[] | undefined;
}

/**
 * Options for findSessionsByFile.
 */
export interface FindOptions {
  /** Limit to specific project */
  readonly projectPath?: string | undefined;

  /** Filter by date range (ISO 8601) */
  readonly fromDate?: string | undefined;

  /** Filter by date range (ISO 8601) */
  readonly toDate?: string | undefined;

  /** Pagination limit */
  readonly limit?: number | undefined;

  /** Pagination offset */
  readonly offset?: number | undefined;

  /** Include change content */
  readonly includeContent?: boolean | undefined;
}

/**
 * FileChangeService provides high-level API for querying file changes.
 *
 * Supports bidirectional queries:
 * - Session -> Files: getSessionChangedFiles(), getFileChangesInSession()
 * - File -> Sessions: findSessionsByFile(), findSessionsByFilePattern()
 *
 * Uses FileChangeIndex for fast reverse lookups, falling back to
 * on-demand extraction when index is unavailable.
 *
 * Usage:
 * ```typescript
 * const service = new FileChangeService(container);
 *
 * // Get files changed in a session
 * const summary = await service.getSessionChangedFiles(sessionId);
 *
 * // Find sessions that modified a file
 * const history = await service.findSessionsByFile("/path/to/file.ts");
 * ```
 */
export class FileChangeService {
  private readonly extractor: FileChangeExtractor;
  private readonly index: FileChangeIndex;

  /**
   * Create a new FileChangeService.
   *
   * @param container - Dependency injection container
   */
  constructor(container: Container) {
    this.extractor = new FileChangeExtractor(container);
    this.index = new FileChangeIndex(container);
  }

  // ========================================
  // Session -> Files (Forward Lookup)
  // ========================================

  /**
   * Get all files changed in a session with change details.
   *
   * Extracts all file modifications from a session's transcript,
   * providing a complete summary with statistics.
   *
   * @param sessionId - Session UUID or transcript path
   * @param options - Include change content, filter by extension/directory
   * @returns Promise resolving to ChangedFilesSummary
   */
  async getSessionChangedFiles(
    sessionId: string,
    options?: GetFilesOptions | undefined,
  ): Promise<ChangedFilesSummary> {
    logger.debug(`Getting changed files for session: ${sessionId}`);

    const extractOptions: ExtractOptions | undefined = options
      ? {
          includeContent: options.includeContent,
          extensions: options.extensions,
          directories: options.directories,
        }
      : undefined;

    const summary = await this.extractor.extractFromSession(
      sessionId,
      extractOptions,
    );

    logger.debug(
      `Found ${summary.totalFilesChanged} files with ${summary.totalChanges} changes`,
    );

    return summary;
  }

  /**
   * Get changes for a specific file in a session.
   *
   * Returns all individual changes made to the specified file
   * within the given session, in chronological order.
   *
   * @param sessionId - Session UUID or transcript path
   * @param filePath - Absolute or relative file path
   * @returns Promise resolving to array of FileChange
   */
  async getFileChangesInSession(
    sessionId: string,
    filePath: string,
  ): Promise<readonly FileChange[]> {
    logger.debug(
      `Getting changes for file ${filePath} in session: ${sessionId}`,
    );

    // Extract all changes from session
    const summary = await this.extractor.extractFromSession(sessionId, {
      includeContent: true,
    });

    // Normalize the requested file path
    const normalizedRequest = path.normalize(filePath);

    // Find the matching file
    const changedFile = summary.files.find((file) => {
      const normalizedFile = path.normalize(file.path);
      return (
        normalizedFile === normalizedRequest ||
        normalizedFile.endsWith(normalizedRequest) ||
        normalizedRequest.endsWith(path.basename(file.path))
      );
    });

    if (changedFile === undefined) {
      logger.debug(`No changes found for file: ${filePath}`);
      return [];
    }

    logger.debug(`Found ${changedFile.changes.length} changes`);
    return changedFile.changes;
  }

  // ========================================
  // File -> Sessions (Reverse Lookup)
  // ========================================

  /**
   * Find all sessions that modified a specific file.
   *
   * Uses the index for fast lookup if available, otherwise falls back
   * to scanning all transcripts. Returns a complete history of all
   * sessions that modified the file.
   *
   * @param filePath - Absolute or relative file path
   * @param options - Filter and pagination options
   * @returns Promise resolving to FileHistory
   */
  async findSessionsByFile(
    filePath: string,
    options?: FindOptions | undefined,
  ): Promise<FileHistory> {
    logger.debug(`Finding sessions that modified file: ${filePath}`);

    // Normalize path
    const normalizedPath = path.normalize(filePath);

    // Try index lookup first
    const indexEntries = await this.index.lookup(normalizedPath);

    if (indexEntries.length === 0) {
      logger.debug(`No index entries found, file not in index`);
      return {
        path: normalizedPath,
        totalSessions: 0,
        totalChanges: 0,
        sessions: [],
        firstModified: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
    }

    // Filter by options
    let filteredEntries = indexEntries;

    if (options?.projectPath !== undefined) {
      filteredEntries = filteredEntries.filter(
        (entry) => entry.projectPath === options.projectPath,
      );
    }

    if (options?.fromDate !== undefined) {
      filteredEntries = filteredEntries.filter(
        (entry) => entry.lastChange >= options.fromDate!,
      );
    }

    if (options?.toDate !== undefined) {
      filteredEntries = filteredEntries.filter(
        (entry) => entry.firstChange <= options.toDate!,
      );
    }

    // Sort by most recent first
    const sortedEntries = [...filteredEntries].sort((a, b) =>
      b.lastChange.localeCompare(a.lastChange),
    );

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? sortedEntries.length;
    const paginatedEntries = sortedEntries.slice(offset, offset + limit);

    // Build FileSessionMatch for each entry
    const sessions: FileSessionMatch[] = [];

    for (const entry of paginatedEntries) {
      // Extract detailed changes if requested
      const changes =
        options?.includeContent === true
          ? await this.getFileChangesInSession(entry.sessionId, normalizedPath)
          : [];

      const match: FileSessionMatch = {
        sessionId: entry.sessionId,
        projectPath: entry.projectPath,
        gitBranch: entry.gitBranch,
        changeCount: entry.changeCount,
        firstChange: entry.firstChange,
        lastChange: entry.lastChange,
        toolsUsed: entry.toolsUsed,
        changes,
      };

      sessions.push(match);
    }

    // Calculate totals from filtered entries
    const totalSessions = filteredEntries.length;
    const totalChanges = filteredEntries.reduce(
      (sum, entry) => sum + entry.changeCount,
      0,
    );

    const timestamps = sortedEntries.flatMap((entry) => [
      entry.firstChange,
      entry.lastChange,
    ]);
    const firstModified =
      timestamps.length > 0 ? timestamps[timestamps.length - 1]! : "";
    const lastModified = timestamps.length > 0 ? timestamps[0]! : "";

    const history: FileHistory = {
      path: normalizedPath,
      totalSessions,
      totalChanges,
      sessions,
      firstModified,
      lastModified,
    };

    logger.debug(
      `Found ${totalSessions} sessions with ${totalChanges} changes`,
    );

    return history;
  }

  /**
   * Find sessions that modified files matching a pattern.
   *
   * Supports glob patterns like "src/**\/*.ts" or "*.json".
   * Uses the index for fast pattern matching.
   *
   * @param pattern - Glob pattern (e.g., "src/**\/*.ts")
   * @param options - Filter options
   * @returns Promise resolving to array of FileHistory
   */
  async findSessionsByFilePattern(
    pattern: string,
    options?: FindOptions | undefined,
  ): Promise<readonly FileHistory[]> {
    logger.debug(`Finding sessions that modified files matching: ${pattern}`);

    // Lookup pattern in index
    const matchingFiles = await this.index.lookupPattern(pattern);

    if (matchingFiles.size === 0) {
      logger.debug(`No files match pattern: ${pattern}`);
      return [];
    }

    logger.debug(`Pattern matched ${matchingFiles.size} files`);

    // Build FileHistory for each matching file
    const histories: FileHistory[] = [];

    for (const [filePath, _entries] of matchingFiles.entries()) {
      const history = await this.findSessionsByFile(filePath, options);
      histories.push(history);
    }

    // Sort by most recent modification
    const sorted = histories.sort((a, b) =>
      b.lastModified.localeCompare(a.lastModified),
    );

    return sorted;
  }

  // ========================================
  // Indexing
  // ========================================

  /**
   * Build or rebuild file change index.
   *
   * Scans all sessions and builds an index mapping file paths
   * to sessions that modified them, enabling fast reverse lookups.
   *
   * @param projectPath - Limit to specific project (optional)
   * @returns Promise resolving to index statistics
   */
  async buildIndex(projectPath?: string | undefined): Promise<IndexStats> {
    logger.info(
      `Building file change index${projectPath ? ` for ${projectPath}` : ""}`,
    );

    const stats = await this.index.buildIndex(projectPath);

    logger.info(
      `Index built: ${stats.totalSessions} sessions, ${stats.totalFiles} files`,
    );

    return stats;
  }

  /**
   * Get index statistics.
   *
   * Returns metadata about the current index state without
   * rebuilding the index.
   *
   * @returns Promise resolving to index statistics
   */
  async getIndexStats(): Promise<IndexStats> {
    return this.index.getStats();
  }
}
