/**
 * Mock FileSystem for testing.
 *
 * Provides an in-memory implementation of the FileSystem interface
 * that allows tests to control file content and simulate file operations
 * without touching the real file system.
 *
 * @module test/mocks/filesystem
 */
import type { FileSystem, FileStat, WatchEvent, MkdirOptions, RmOptions } from "../../interfaces/filesystem";
/**
 * Mock FileSystem implementation for testing.
 *
 * Stores files in memory and provides full control over
 * file system behavior for deterministic testing.
 */
export declare class MockFileSystem implements FileSystem {
    private readonly files;
    private readonly directories;
    private readonly watchCallbacks;
    private currentTime;
    /**
     * Create a new MockFileSystem.
     *
     * @param initialTime - Initial timestamp for file operations (default: now)
     */
    constructor(initialTime?: number);
    /**
     * Set the current time for file operations.
     *
     * @param time - Unix timestamp in milliseconds
     */
    setTime(time: number): void;
    /**
     * Advance the current time by the specified amount.
     *
     * @param ms - Milliseconds to advance
     */
    advanceTime(ms: number): void;
    /**
     * Add or update a file in the mock file system.
     *
     * Also creates parent directories if they don't exist.
     *
     * @param path - File path
     * @param content - File content
     */
    setFile(path: string, content: string): void;
    /**
     * Get file content if it exists.
     *
     * @param path - File path
     * @returns File content or undefined if not found
     */
    getFile(path: string): string | undefined;
    /**
     * Clear all files and directories (except root).
     */
    clearFiles(): void;
    /**
     * Get all files in the mock file system.
     *
     * @returns Map of path to content
     */
    getFiles(): Map<string, string>;
    /**
     * Synchronously write a file (for testing).
     *
     * @param path - File path
     * @param content - File content
     */
    writeFileSync(path: string, content: string): void;
    /**
     * Synchronously append to a file (for testing).
     *
     * @param path - File path
     * @param content - Content to append
     */
    appendFileSync(path: string, content: string): void;
    /**
     * Create a directory in the mock file system.
     *
     * @param path - Directory path
     */
    setDirectory(path: string): void;
    /**
     * Trigger a watch event for a path.
     *
     * @param path - Path that changed
     * @param event - Watch event to emit
     */
    emitWatchEvent(path: string, event: WatchEvent): void;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    readDir(path: string): Promise<readonly string[]>;
    watch(path: string): AsyncIterable<WatchEvent>;
    stat(path: string): Promise<FileStat>;
    mkdir(path: string, options?: MkdirOptions): Promise<void>;
    rm(path: string, options?: RmOptions): Promise<void>;
    private normalizePath;
    private getParentPath;
    private ensureDirectoryExists;
}
//# sourceMappingURL=filesystem.d.ts.map