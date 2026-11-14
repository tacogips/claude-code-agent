/**
 * Atomic file writer using temp file + rename pattern.
 *
 * @module services/atomic-writer
 */
import type { FileSystem } from "../interfaces/filesystem";
/**
 * Atomic file writer using temp file + rename pattern.
 *
 * Ensures writes are atomic - either complete or don't happen.
 * Prevents partial/corrupted writes on crash or concurrent access.
 *
 * @example
 * ```typescript
 * const writer = new AtomicWriter(fs);
 * await writer.write("/data/config.json", jsonContent);
 * ```
 */
export declare class AtomicWriter {
    private readonly fs;
    /**
     * Create a new AtomicWriter.
     *
     * @param fs - FileSystem implementation for file operations
     */
    constructor(fs: FileSystem);
    /**
     * Write content atomically to a file.
     *
     * Uses temp file + rename pattern to ensure atomicity:
     * 1. Ensure parent directory exists
     * 2. Write to {filePath}.tmp.{random}
     * 3. Flush temp file to disk
     * 4. Rename temp file to target path (atomic on POSIX)
     * 5. Cleanup temp file on any failure
     *
     * @param filePath - Target file path
     * @param content - Content to write
     * @throws Error if write or rename fails (temp file is cleaned up)
     */
    write(filePath: string, content: string): Promise<void>;
    /**
     * Write JSON atomically with pretty printing.
     *
     * Serializes data with JSON.stringify and writes atomically.
     *
     * @param filePath - Target file path
     * @param data - Data to serialize and write
     * @throws Error if serialization, write, or rename fails
     */
    writeJson<T>(filePath: string, data: T): Promise<void>;
    /**
     * Generate a temporary file path with random suffix.
     *
     * @param filePath - Target file path
     * @returns Temporary file path in the format {filePath}.tmp.{randomHex}
     */
    private generateTempPath;
    /**
     * Get parent directory path from a file path.
     *
     * @param filePath - File path
     * @returns Parent directory path
     */
    private getParentDir;
    /**
     * Rename a file atomically.
     *
     * Uses fs.rename which is atomic on POSIX systems when available.
     * For testing with MockFileSystem, simulates rename with read+write+delete.
     *
     * @param from - Source path
     * @param to - Destination path
     */
    private renameFile;
    /**
     * Clean up a temporary file.
     *
     * Silently ignores if file doesn't exist (may have been renamed already).
     *
     * @param tempPath - Path to temp file
     */
    private cleanupTempFile;
}
//# sourceMappingURL=atomic-writer.d.ts.map