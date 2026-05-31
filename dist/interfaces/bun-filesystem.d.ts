/**
 * Production FileSystem implementation using Bun APIs.
 *
 * This provides the real file system operations using Bun's
 * built-in file and filesystem APIs.
 *
 * @module interfaces/bun-filesystem
 */
import type { FileSystem, FileStat, WatchEvent, MkdirOptions, RmOptions } from "./filesystem";
/**
 * Production FileSystem implementation using Bun APIs.
 *
 * Uses Bun.file() for optimized file reading and Node.js fs
 * compatibility for other operations.
 */
export declare class BunFileSystem implements FileSystem {
    /**
     * Read file content as UTF-8 string.
     *
     * Uses Bun.file() for optimized reading.
     *
     * @param filePath - Absolute path to the file
     * @returns Promise resolving to file content
     * @throws Error if file does not exist or cannot be read
     */
    readFile(filePath: string): Promise<string>;
    /**
     * Write content to a file.
     *
     * Creates parent directories if they don't exist.
     * Uses Bun.write() for optimized writing.
     *
     * @param filePath - Absolute path to the file
     * @param content - UTF-8 content to write
     */
    writeFile(filePath: string, content: string): Promise<void>;
    /**
     * Check if a file or directory exists.
     *
     * @param filePath - Path to check
     * @returns Promise resolving to true if path exists
     */
    exists(filePath: string): Promise<boolean>;
    /**
     * List directory contents.
     *
     * @param dirPath - Path to directory
     * @returns Promise resolving to array of entry names
     * @throws Error if path is not a directory or doesn't exist
     */
    readDir(dirPath: string): Promise<readonly string[]>;
    /**
     * Watch a file or directory for changes.
     *
     * Yields events when the watched path changes.
     *
     * @param watchPath - Path to watch
     * @returns Async iterable of watch events
     */
    watch(watchPath: string): AsyncIterable<WatchEvent>;
    /**
     * Get file or directory metadata.
     *
     * @param filePath - Path to stat
     * @returns Promise resolving to file metadata
     * @throws Error if path does not exist
     */
    stat(filePath: string): Promise<FileStat>;
    /**
     * Create a directory.
     *
     * @param dirPath - Path to create
     * @param options - Optional mkdir options
     * @throws Error if directory cannot be created
     */
    mkdir(dirPath: string, options?: MkdirOptions): Promise<void>;
    /**
     * Remove a file or directory.
     *
     * @param targetPath - Path to remove
     * @param options - Optional rm options
     * @throws Error if path cannot be removed (and force is not set)
     */
    rm(targetPath: string, options?: RmOptions): Promise<void>;
}
//# sourceMappingURL=bun-filesystem.d.ts.map