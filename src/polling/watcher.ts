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
import type { FileSystem, WatchEvent } from "../interfaces/filesystem";

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
 * Internal state for tracking a watched file.
 */
interface WatchedFile {
  /** Async iterator from FileSystem.watch() */
  readonly iterator: AsyncIterator<WatchEvent>;
  /** Current file offset (number of bytes read) */
  offset: number;
  /** Pending timer for debouncing */
  debounceTimer: ReturnType<typeof setTimeout> | null;
  /** Whether this watcher is stopped */
  stopped: boolean;
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
export class TranscriptWatcher {
  private readonly fileSystem: FileSystem;
  private readonly config: Required<WatcherConfig>;
  private readonly watchers: Map<string, WatchedFile> = new Map();

  /**
   * Create a new TranscriptWatcher.
   *
   * @param container - Dependency injection container
   * @param config - Watcher configuration
   */
  constructor(container: Container, config?: WatcherConfig) {
    this.fileSystem = container.fileSystem;
    this.config = {
      debounceMs: config?.debounceMs ?? 50,
      includeExisting: config?.includeExisting ?? false,
    };
  }

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
  async *watch(transcriptPath: string): AsyncIterable<FileChange> {
    // Read existing content if requested
    if (this.config.includeExisting) {
      const existingContent = await this.readFile(transcriptPath);
      if (existingContent.length > 0) {
        yield {
          path: transcriptPath,
          content: existingContent,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Initialize watcher state
    const watchIterable = this.fileSystem.watch(transcriptPath);
    const iterator = watchIterable[Symbol.asyncIterator]();

    const stat = await this.fileSystem.stat(transcriptPath);
    const initialOffset = this.config.includeExisting ? stat.size : stat.size;

    const watchedFile: WatchedFile = {
      iterator,
      offset: initialOffset,
      debounceTimer: null,
      stopped: false,
    };

    this.watchers.set(transcriptPath, watchedFile);

    try {
      // Create a queue for debounced events
      const eventQueue: FileChange[] = [];
      let queueResolver: ((value: IteratorResult<FileChange>) => void) | null =
        null;

      // Process watch events
      const processChange = async (): Promise<void> => {
        if (watchedFile.stopped) return;

        try {
          const newContent = await this.readNewContent(
            transcriptPath,
            watchedFile,
          );

          if (newContent.length > 0) {
            const change: FileChange = {
              path: transcriptPath,
              content: newContent,
              timestamp: new Date().toISOString(),
            };

            // If someone is waiting, resolve immediately
            if (queueResolver !== null) {
              const resolver = queueResolver;
              queueResolver = null;
              resolver({ value: change, done: false });
            } else {
              // Otherwise queue the event
              eventQueue.push(change);
            }
          }
        } catch (error) {
          // File might have been deleted or truncated
          // Reset offset and continue watching
          watchedFile.offset = 0;
        }
      };

      // Watch event handler with debouncing
      const handleWatchEvent = (): void => {
        if (watchedFile.stopped) return;

        // Clear existing timer
        if (watchedFile.debounceTimer !== null) {
          clearTimeout(watchedFile.debounceTimer);
        }

        // Set new debounce timer
        watchedFile.debounceTimer = setTimeout(() => {
          watchedFile.debounceTimer = null;
          void processChange();
        }, this.config.debounceMs);
      };

      // Start consuming watch events in background
      void (async (): Promise<void> => {
        try {
          while (!watchedFile.stopped) {
            const result = await iterator.next();
            if (result.done === true) break;
            handleWatchEvent();
          }
        } catch (error) {
          // Watch iterator failed, stop watching
          watchedFile.stopped = true;
        }
      })();

      // Yield queued events
      while (!watchedFile.stopped) {
        const queued = eventQueue.shift();
        if (queued !== undefined) {
          yield queued;
        } else {
          // Wait for next event
          const result = await new Promise<IteratorResult<FileChange>>(
            (resolve) => {
              queueResolver = resolve;

              // Check periodically if we've been stopped
              const checkInterval = setInterval(() => {
                if (watchedFile.stopped && queueResolver === resolve) {
                  clearInterval(checkInterval);
                  queueResolver = null;
                  resolve({ value: undefined, done: true });
                }
              }, 10);
            },
          );

          if (result.done === true) break;
          yield result.value;
        }
      }
    } finally {
      // Cleanup
      await this.cleanupWatcher(transcriptPath, watchedFile);
    }
  }

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
  async *watchMultiple(paths: string[]): AsyncIterable<FileChange> {
    // Create async iterators for each path
    const asyncIterables = paths.map((path) => this.watch(path));
    const iterators = asyncIterables.map((iterable) =>
      iterable[Symbol.asyncIterator](),
    );

    // Create promises for each iterator's next value
    const nextPromises = iterators.map(async (iter, index) => {
      const result = await iter.next();
      return { index, result };
    });

    // Race promises to get next event from any file
    while (nextPromises.length > 0) {
      const { index, result } = await Promise.race(nextPromises);

      if (result.done === true) {
        // This iterator is done, remove it
        nextPromises.splice(index, 1);
        continue;
      }

      // Yield the value
      yield result.value;

      // Replace the promise with the next one from the same iterator
      const iter = iterators[index];
      if (iter !== undefined) {
        nextPromises[index] = (async (): Promise<{
          index: number;
          result: IteratorResult<FileChange>;
        }> => {
          const nextResult = await iter.next();
          return { index, result: nextResult };
        })();
      }
    }
  }

  /**
   * Stop all active file watchers and clean up resources.
   *
   * Should be called when monitoring is no longer needed to
   * release system resources. After calling stop(), existing
   * watch iterators will complete gracefully.
   */
  stop(): void {
    for (const [path, watchedFile] of this.watchers.entries()) {
      watchedFile.stopped = true;

      if (watchedFile.debounceTimer !== null) {
        clearTimeout(watchedFile.debounceTimer);
        watchedFile.debounceTimer = null;
      }

      void this.cleanupWatcher(path, watchedFile);
    }

    this.watchers.clear();
  }

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
  private async readNewContent(
    path: string,
    watchedFile: WatchedFile,
  ): Promise<string> {
    const stat = await this.fileSystem.stat(path);

    // Handle file truncation or rotation
    if (stat.size < watchedFile.offset) {
      watchedFile.offset = 0;
    }

    // No new content
    if (stat.size === watchedFile.offset) {
      return "";
    }

    // Read entire file
    const content = await this.fileSystem.readFile(path);

    // Extract new content from offset
    const newContent = content.slice(watchedFile.offset);

    // Update offset
    watchedFile.offset = stat.size;

    return newContent;
  }

  /**
   * Read entire file content.
   *
   * @param path - File path to read
   * @returns File content as string
   */
  private async readFile(path: string): Promise<string> {
    try {
      return await this.fileSystem.readFile(path);
    } catch (error) {
      // File doesn't exist yet, return empty string
      return "";
    }
  }

  /**
   * Clean up a watcher's resources.
   *
   * @param path - File path being watched
   * @param watchedFile - Watcher state to clean up
   */
  private async cleanupWatcher(
    path: string,
    watchedFile: WatchedFile,
  ): Promise<void> {
    if (watchedFile.debounceTimer !== null) {
      clearTimeout(watchedFile.debounceTimer);
    }

    // Call return() on the iterator to clean up
    if (watchedFile.iterator.return !== undefined) {
      await watchedFile.iterator.return();
    }

    this.watchers.delete(path);
  }
}
