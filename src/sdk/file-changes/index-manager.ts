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
import { FileChangeExtractor } from "./extractor";
import { createTaggedLogger } from "../../logger";
import path from "node:path";
import { minimatch } from "minimatch";

const logger = createTaggedLogger("file-index");

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
 * Index metadata tracking index state.
 */
interface IndexMetadata {
  /** Index schema version */
  readonly version: number;

  /** ISO timestamp when index was last updated */
  readonly lastUpdated: string;

  /** Total number of indexed sessions */
  readonly totalSessions: number;

  /** Total number of unique files */
  readonly totalFiles: number;

  /** Total number of individual changes */
  readonly totalChanges: number;
}

/**
 * Serializable index structure for JSON storage.
 */
interface IndexData {
  /** Index metadata */
  readonly metadata: IndexMetadata;

  /** File path -> array of session entries */
  readonly fileIndex: Record<string, readonly FileIndexEntry[]>;
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
export class FileChangeIndex {
  private readonly fileSystem;
  private readonly clock;
  private readonly extractor: FileChangeExtractor;
  private readonly indexPath: string;

  /** In-memory index cache */
  private fileIndex: Map<string, FileIndexEntry[]>;
  private metadata: IndexMetadata;

  /**
   * Create a new FileChangeIndex.
   *
   * @param container - Dependency injection container
   */
  constructor(container: Container) {
    this.fileSystem = container.fileSystem;
    this.clock = container.clock;
    this.extractor = new FileChangeExtractor(container);

    // Index storage location
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    this.indexPath = path.join(
      homeDir,
      ".local",
      "claude-code-agent",
      "index",
      "file-changes.json",
    );

    // Initialize empty index
    this.fileIndex = new Map();
    this.metadata = {
      version: 1,
      lastUpdated: this.clock.now().toISOString(),
      totalSessions: 0,
      totalFiles: 0,
      totalChanges: 0,
    };
  }

  /**
   * Build or rebuild the file change index.
   *
   * Scans all sessions in ~/.claude/projects and builds an index
   * mapping file paths to sessions that modified them.
   *
   * @param projectPath - Optional filter to index only one project
   * @returns Promise resolving to index statistics
   */
  async buildIndex(projectPath?: string | undefined): Promise<IndexStats> {
    logger.info(
      `Building file change index${projectPath ? ` for ${projectPath}` : ""}...`,
    );

    // Clear existing index
    this.fileIndex.clear();

    // Find all sessions
    const sessions = await this.findSessions(projectPath);
    logger.debug(`Found ${sessions.length} sessions to index`);

    let totalChanges = 0;

    // Index each session
    for (const sessionId of sessions) {
      try {
        const changes = await this.indexSession(sessionId);
        totalChanges += changes;
      } catch (error) {
        logger.warn(
          `Failed to index session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Update metadata
    this.metadata = {
      version: 1,
      lastUpdated: this.clock.now().toISOString(),
      totalSessions: sessions.length,
      totalFiles: this.fileIndex.size,
      totalChanges,
    };

    // Save index to disk
    await this.saveIndex();

    logger.info(
      `Index built: ${this.metadata.totalSessions} sessions, ${this.metadata.totalFiles} files, ${this.metadata.totalChanges} changes`,
    );

    return this.getStats();
  }

  /**
   * Lookup all sessions that modified a specific file.
   *
   * Returns index entries for all sessions that modified the given file path.
   * Automatically loads index from disk if not in memory.
   *
   * @param filePath - Absolute or relative file path
   * @returns Promise resolving to array of FileIndexEntry
   */
  async lookup(filePath: string): Promise<readonly FileIndexEntry[]> {
    // Ensure index is loaded
    await this.loadIndex();

    // Normalize path
    const normalized = path.normalize(filePath);

    // Lookup in index
    const entries = this.fileIndex.get(normalized);

    if (entries === undefined) {
      return [];
    }

    return entries;
  }

  /**
   * Lookup sessions that modified files matching a glob pattern.
   *
   * Supports glob patterns like "src/**\/*.ts" or "*.json".
   *
   * @param pattern - Glob pattern
   * @returns Promise resolving to map of file paths to index entries
   */
  async lookupPattern(
    pattern: string,
  ): Promise<ReadonlyMap<string, readonly FileIndexEntry[]>> {
    // Ensure index is loaded
    await this.loadIndex();

    const results = new Map<string, readonly FileIndexEntry[]>();

    // Match pattern against all indexed files
    for (const [filePath, entries] of this.fileIndex.entries()) {
      if (this.matchGlob(pattern, filePath)) {
        results.set(filePath, entries);
      }
    }

    return results;
  }

  /**
   * Get index statistics.
   *
   * Returns metadata about the current index state.
   *
   * @returns Promise resolving to IndexStats
   */
  async getStats(): Promise<IndexStats> {
    // Ensure index is loaded
    await this.loadIndex();

    // Calculate index size
    const indexSize = await this.calculateIndexSize();

    const stats: IndexStats = {
      totalSessions: this.metadata.totalSessions,
      totalFiles: this.metadata.totalFiles,
      totalChanges: this.metadata.totalChanges,
      lastIndexed: this.metadata.lastUpdated,
      indexSize,
    };

    return stats;
  }

  /**
   * Invalidate the index.
   *
   * Clears the index completely or for a specific project.
   *
   * @param projectPath - Optional project path to invalidate (clears all if undefined)
   * @returns Promise resolving when invalidation is complete
   */
  async invalidate(projectPath?: string | undefined): Promise<void> {
    if (projectPath === undefined) {
      // Clear entire index
      logger.info("Invalidating entire file change index");
      this.fileIndex.clear();
      this.metadata = {
        version: 1,
        lastUpdated: this.clock.now().toISOString(),
        totalSessions: 0,
        totalFiles: 0,
        totalChanges: 0,
      };
      await this.saveIndex();
    } else {
      // Clear entries for specific project
      logger.info(`Invalidating file change index for project: ${projectPath}`);
      await this.loadIndex();

      // Remove entries for this project
      for (const [filePath, entries] of this.fileIndex.entries()) {
        const filtered = entries.filter(
          (entry) => entry.projectPath !== projectPath,
        );

        if (filtered.length === 0) {
          this.fileIndex.delete(filePath);
        } else if (filtered.length !== entries.length) {
          this.fileIndex.set(filePath, filtered);
        }
      }

      // Recalculate metadata
      await this.recalculateMetadata();
      await this.saveIndex();
    }
  }

  /**
   * Load index from disk.
   *
   * Reads the index JSON file and populates in-memory structures.
   * Does nothing if index is already loaded.
   */
  private async loadIndex(): Promise<void> {
    // Skip if already loaded
    if (this.fileIndex.size > 0) {
      return;
    }

    // Check if index file exists
    const exists = await this.fileSystem.exists(this.indexPath);
    if (!exists) {
      logger.debug("Index file does not exist, starting with empty index");
      return;
    }

    try {
      // Read and parse index
      const content = await this.fileSystem.readFile(this.indexPath);
      const data = JSON.parse(content) as IndexData;

      // Populate in-memory structures
      this.metadata = data.metadata;
      this.fileIndex.clear();

      for (const [filePath, entries] of Object.entries(data.fileIndex)) {
        this.fileIndex.set(filePath, entries as FileIndexEntry[]);
      }

      logger.debug(
        `Loaded index: ${this.metadata.totalFiles} files, ${this.metadata.totalSessions} sessions`,
      );
    } catch (error) {
      logger.warn(
        `Failed to load index: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Save index to disk.
   *
   * Writes the in-memory index to JSON storage.
   */
  private async saveIndex(): Promise<void> {
    // Ensure index directory exists
    const indexDir = path.dirname(this.indexPath);
    await this.fileSystem.mkdir(indexDir, { recursive: true });

    // Convert Map to plain object for JSON serialization
    const fileIndexObject: Record<string, readonly FileIndexEntry[]> = {};
    for (const [filePath, entries] of this.fileIndex.entries()) {
      fileIndexObject[filePath] = entries;
    }

    const data: IndexData = {
      metadata: this.metadata,
      fileIndex: fileIndexObject,
    };

    // Write to disk
    const content = JSON.stringify(data, null, 2);
    await this.fileSystem.writeFile(this.indexPath, content);

    logger.debug(`Index saved to ${this.indexPath}`);
  }

  /**
   * Index a single session.
   *
   * Extracts file changes from the session and adds them to the index.
   *
   * @param sessionId - Session UUID
   * @returns Number of changes indexed
   */
  private async indexSession(sessionId: string): Promise<number> {
    // Extract changes from session
    const summary = await this.extractor.extractFromSession(sessionId);

    let changeCount = 0;

    // Add each changed file to index
    for (const file of summary.files) {
      const entry: FileIndexEntry = {
        sessionId,
        projectPath: summary.projectPath,
        gitBranch: undefined, // TODO: extract from session metadata
        changeCount: file.changeCount,
        firstChange: file.firstModified,
        lastChange: file.lastModified,
        toolsUsed: file.toolsUsed,
      };

      // Add to index
      const existing = this.fileIndex.get(file.path);
      if (existing === undefined) {
        this.fileIndex.set(file.path, [entry]);
      } else {
        this.fileIndex.set(file.path, [...existing, entry]);
      }

      changeCount += file.changeCount;
    }

    return changeCount;
  }

  /**
   * Match a glob pattern against a file path.
   *
   * Uses minimatch for glob pattern matching.
   *
   * @param pattern - Glob pattern
   * @param filePath - File path to test
   * @returns True if path matches pattern
   */
  private matchGlob(pattern: string, filePath: string): boolean {
    return minimatch(filePath, pattern, { dot: true });
  }

  /**
   * Find all sessions to index.
   *
   * Scans ~/.claude/projects directory for session subdirectories.
   *
   * @param projectPath - Optional filter for specific project
   * @returns Array of session IDs
   */
  private async findSessions(
    projectPath?: string | undefined,
  ): Promise<string[]> {
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    const projectsDir = path.join(homeDir, ".claude", "projects");

    // Check if projects directory exists
    const exists = await this.fileSystem.exists(projectsDir);
    if (!exists) {
      logger.warn(`Projects directory does not exist: ${projectsDir}`);
      return [];
    }

    // Read all session directories
    const entries = await this.fileSystem.readDir(projectsDir);
    const sessions: string[] = [];

    for (const entry of entries) {
      const sessionPath = path.join(projectsDir, entry);
      const transcriptPath = path.join(sessionPath, "session.jsonl");

      // Check if session.jsonl exists
      const transcriptExists = await this.fileSystem.exists(transcriptPath);
      if (!transcriptExists) {
        continue;
      }

      // If filtering by project, check project path
      if (projectPath !== undefined) {
        // Read session metadata to get project path
        // For now, include all sessions (TODO: filter by project)
      }

      sessions.push(entry);
    }

    return sessions;
  }

  /**
   * Calculate index file size in bytes.
   *
   * @returns Index size in bytes
   */
  private async calculateIndexSize(): Promise<number> {
    const exists = await this.fileSystem.exists(this.indexPath);
    if (!exists) {
      return 0;
    }

    try {
      const stat = await this.fileSystem.stat(this.indexPath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * Recalculate metadata after partial invalidation.
   */
  private async recalculateMetadata(): Promise<void> {
    const sessionIds = new Set<string>();
    let totalChanges = 0;

    for (const entries of this.fileIndex.values()) {
      for (const entry of entries) {
        sessionIds.add(entry.sessionId);
        totalChanges += entry.changeCount;
      }
    }

    this.metadata = {
      version: 1,
      lastUpdated: this.clock.now().toISOString(),
      totalSessions: sessionIds.size,
      totalFiles: this.fileIndex.size,
      totalChanges,
    };
  }
}
