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
import type { ChangedFilesSummary, FileChange, FileHistory, IndexStats } from "./types";
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
export declare class FileChangeService {
    private readonly extractor;
    private readonly index;
    /**
     * Create a new FileChangeService.
     *
     * @param container - Dependency injection container
     */
    constructor(container: Container);
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
    getSessionChangedFiles(sessionId: string, options?: GetFilesOptions | undefined): Promise<ChangedFilesSummary>;
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
    getFileChangesInSession(sessionId: string, filePath: string): Promise<readonly FileChange[]>;
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
    findSessionsByFile(filePath: string, options?: FindOptions | undefined): Promise<FileHistory>;
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
    findSessionsByFilePattern(pattern: string, options?: FindOptions | undefined): Promise<readonly FileHistory[]>;
    /**
     * Build or rebuild file change index.
     *
     * Scans all sessions and builds an index mapping file paths
     * to sessions that modified them, enabling fast reverse lookups.
     *
     * @param projectPath - Limit to specific project (optional)
     * @returns Promise resolving to index statistics
     */
    buildIndex(projectPath?: string | undefined): Promise<IndexStats>;
    /**
     * Get index statistics.
     *
     * Returns metadata about the current index state without
     * rebuilding the index.
     *
     * @returns Promise resolving to index statistics
     */
    getIndexStats(): Promise<IndexStats>;
}
//# sourceMappingURL=service.d.ts.map