/**
 * File change index manager for fast reverse lookups.
 *
 * Builds and maintains an index mapping file paths to sessions that modified them,
 * enabling O(1) reverse lookups (file -> sessions) without scanning all transcripts.
 *
 * @module sdk/file-changes/index-manager
 */
import type { Container } from "../../container";
import type { IndexStats, ModifyingTool } from "./types";
/**
 * Index entry for a single file in a session.
 *
 * Stored in the index for fast lookup without loading full transcript.
 */
export interface FileIndexEntry {
    /** Session identifier */
    readonly sessionId: string;
    /** Project root path */
    readonly projectPath: string;
    /** Git branch (if available) */
    readonly gitBranch?: string | undefined;
    /** Number of changes to this file in this session */
    readonly changeCount: number;
    /** ISO timestamp of first change */
    readonly firstChange: string;
    /** ISO timestamp of last change */
    readonly lastChange: string;
    /** Tools used to modify this file */
    readonly toolsUsed: readonly ModifyingTool[];
}
/**
 * FileChangeIndex manages the file-to-session index.
 *
 * Provides fast reverse lookups by maintaining a persistent index
 * of which sessions modified which files.
 *
 * Usage:
 * ```typescript
 * const index = new FileChangeIndex(container);
 * await index.buildIndex(); // Build/rebuild index
 * const entries = await index.lookup("/path/to/file.ts");
 * ```
 */
export declare class FileChangeIndex {
    private readonly fileSystem;
    private readonly clock;
    private readonly extractor;
    private readonly indexPath;
    private readonly lockService;
    private readonly atomicWriter;
    /** In-memory index cache */
    private fileIndex;
    private metadata;
    /**
     * Create a new FileChangeIndex.
     *
     * @param container - Dependency injection container
     */
    constructor(container: Container);
    /**
     * Build or rebuild the file change index.
     *
     * Scans all sessions in ~/.claude/projects and builds an index
     * mapping file paths to sessions that modified them.
     *
     * @param projectPath - Optional filter to index only one project
     * @returns Promise resolving to index statistics
     */
    buildIndex(projectPath?: string | undefined): Promise<IndexStats>;
    /**
     * Lookup all sessions that modified a specific file.
     *
     * Returns index entries for all sessions that modified the given file path.
     * Automatically loads index from disk if not in memory.
     *
     * @param filePath - Absolute or relative file path
     * @returns Promise resolving to array of FileIndexEntry
     */
    lookup(filePath: string): Promise<readonly FileIndexEntry[]>;
    /**
     * Lookup sessions that modified files matching a glob pattern.
     *
     * Supports glob patterns like "src/**\/*.ts" or "*.json".
     *
     * @param pattern - Glob pattern
     * @returns Promise resolving to map of file paths to index entries
     */
    lookupPattern(pattern: string): Promise<ReadonlyMap<string, readonly FileIndexEntry[]>>;
    /**
     * Get index statistics.
     *
     * Returns metadata about the current index state.
     *
     * @returns Promise resolving to IndexStats
     */
    getStats(): Promise<IndexStats>;
    /**
     * Invalidate the index.
     *
     * Clears the index completely or for a specific project.
     *
     * @param projectPath - Optional project path to invalidate (clears all if undefined)
     * @returns Promise resolving when invalidation is complete
     */
    invalidate(projectPath?: string | undefined): Promise<void>;
    /**
     * Load index from disk.
     *
     * Reads the index JSON file and populates in-memory structures.
     * Does nothing if index is already loaded.
     */
    private loadIndex;
    /**
     * Save index to disk.
     *
     * Writes the in-memory index to JSON storage with locking and atomic writes.
     */
    private saveIndex;
    /**
     * Index a single session.
     *
     * Extracts file changes from the session and adds them to the index.
     *
     * @param sessionId - Session UUID
     * @returns Number of changes indexed
     */
    private indexSession;
    /**
     * Match a glob pattern against a file path.
     *
     * Uses minimatch for glob pattern matching.
     *
     * @param pattern - Glob pattern
     * @param filePath - File path to test
     * @returns True if path matches pattern
     */
    private matchGlob;
    /**
     * Find all sessions to index.
     *
     * Scans ~/.claude/projects directory for session subdirectories.
     *
     * @param projectPath - Optional filter for specific project
     * @returns Array of session IDs
     */
    private findSessions;
    /**
     * Calculate index file size in bytes.
     *
     * @returns Index size in bytes
     */
    private calculateIndexSize;
    /**
     * Recalculate metadata after partial invalidation.
     */
    private recalculateMetadata;
}
//# sourceMappingURL=index-manager.d.ts.map