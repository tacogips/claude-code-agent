/**
 * Transcript file watcher for real-time monitoring.
 *
 * Monitors transcript files for changes using fs.watch and emits
 * new content incrementally via async iteration. Tracks file offsets
 * to avoid re-reading existing content on each change event.
 *
 * @module polling/watcher
 */
import type { Container } from "../container";
/**
 * Configuration for TranscriptWatcher.
 */
export interface WatcherConfig {
    /** Debounce delay in milliseconds (default: 50ms) */
    readonly debounceMs?: number | undefined;
    /** Whether to emit existing content on start (default: false) */
    readonly includeExisting?: boolean | undefined;
}
/**
 * Represents new content detected in a transcript file.
 */
export interface FileChange {
    /** Absolute path to the file that changed */
    readonly path: string;
    /** New content since last read */
    readonly content: string;
    /** ISO timestamp when change was detected */
    readonly timestamp: string;
}
/**
 * Watches transcript files for changes and emits incremental content.
 *
 * Uses fs.watch for cross-platform file monitoring. Maintains file
 * offsets to read only new content on each change. Debounces rapid
 * file changes to reduce event noise.
 *
 * @example
 * ```typescript
 * const watcher = new TranscriptWatcher(container, { debounceMs: 100 });
 *
 * for await (const change of watcher.watch('/path/to/session.jsonl')) {
 *   console.log(`New content: ${change.content}`);
 * }
 * ```
 */
export declare class TranscriptWatcher {
    private readonly fileSystem;
    private readonly config;
    private readonly watchers;
    /**
     * Create a new TranscriptWatcher.
     *
     * @param container - Dependency injection container
     * @param config - Watcher configuration
     */
    constructor(container: Container, config?: WatcherConfig);
    /**
     * Watch a single transcript file for changes.
     *
     * Yields FileChange objects when new content is detected.
     * The async iterator can be stopped by calling stop() or
     * by breaking from the for-await loop.
     *
     * @param transcriptPath - Absolute path to transcript file
     * @returns Async iterable of file changes
     *
     * @example
     * ```typescript
     * for await (const change of watcher.watch('/path/to/session.jsonl')) {
     *   if (shouldStop) break;
     *   processContent(change.content);
     * }
     * ```
     */
    watch(transcriptPath: string): AsyncIterable<FileChange>;
    /**
     * Watch multiple transcript files simultaneously.
     *
     * Merges changes from all watched files into a single stream.
     * Each FileChange includes the path to identify which file changed.
     *
     * @param paths - Array of absolute paths to watch
     * @returns Async iterable of file changes from any watched file
     *
     * @example
     * ```typescript
     * const paths = ['/path/to/session1.jsonl', '/path/to/session2.jsonl'];
     * for await (const change of watcher.watchMultiple(paths)) {
     *   console.log(`File ${change.path} changed`);
     * }
     * ```
     */
    watchMultiple(paths: string[]): AsyncIterable<FileChange>;
    /**
     * Stop all active file watchers and clean up resources.
     *
     * Should be called when monitoring is no longer needed to
     * release system resources. After calling stop(), existing
     * watch iterators will complete gracefully.
     */
    stop(): void;
    /**
     * Read new content from a file since the last read.
     *
     * Updates the file offset after reading. Handles file truncation
     * by resetting offset to 0 if file is smaller than expected.
     *
     * @param path - File path to read
     * @param watchedFile - Watcher state for this file
     * @returns New content since last read
     */
    private readNewContent;
    /**
     * Read entire file content.
     *
     * @param path - File path to read
     * @returns File content as string
     */
    private readFile;
    /**
     * Clean up a watcher's resources.
     *
     * @param path - File path being watched
     * @param watchedFile - Watcher state to clean up
     */
    private cleanupWatcher;
}
//# sourceMappingURL=watcher.d.ts.map