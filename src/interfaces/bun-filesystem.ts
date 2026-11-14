/**
 * Production FileSystem implementation using Bun APIs.
 *
 * This provides the real file system operations using Bun's
 * built-in file and filesystem APIs.
 *
 * @module interfaces/bun-filesystem
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { watch } from "node:fs";
import type {
  FileSystem,
  FileStat,
  WatchEvent,
  MkdirOptions,
  RmOptions,
} from "./filesystem";

/**
 * Production FileSystem implementation using Bun APIs.
 *
 * Uses Bun.file() for optimized file reading and Node.js fs
 * compatibility for other operations.
 */
export class BunFileSystem implements FileSystem {
  /**
   * Read file content as UTF-8 string.
   *
   * Uses Bun.file() for optimized reading.
   *
   * @param filePath - Absolute path to the file
   * @returns Promise resolving to file content
   * @throws Error if file does not exist or cannot be read
   */
  async readFile(filePath: string): Promise<string> {
    const bun = globalThis as {
      Bun?: { file: (path: string) => { text: () => Promise<string> } };
    };
    if (bun.Bun !== undefined) {
      return bun.Bun.file(filePath).text();
    }
    return fs.readFile(filePath, "utf8");
  }

  /**
   * Write content to a file.
   *
   * Creates parent directories if they don't exist.
   * Uses Bun.write() for optimized writing.
   *
   * @param filePath - Absolute path to the file
   * @param content - UTF-8 content to write
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const bun = globalThis as {
      Bun?: { write: (path: string, value: string) => Promise<number> };
    };
    if (bun.Bun !== undefined) {
      await bun.Bun.write(filePath, content);
      return;
    }
    await fs.writeFile(filePath, content, "utf8");
  }

  /**
   * Check if a file or directory exists.
   *
   * @param filePath - Path to check
   * @returns Promise resolving to true if path exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List directory contents.
   *
   * @param dirPath - Path to directory
   * @returns Promise resolving to array of entry names
   * @throws Error if path is not a directory or doesn't exist
   */
  async readDir(dirPath: string): Promise<readonly string[]> {
    return fs.readdir(dirPath);
  }

  /**
   * Watch a file or directory for changes.
   *
   * Yields events when the watched path changes.
   *
   * @param watchPath - Path to watch
   * @returns Async iterable of watch events
   */
  watch(watchPath: string): AsyncIterable<WatchEvent> {
    return {
      [Symbol.asyncIterator](): AsyncIterator<WatchEvent> {
        const queue: WatchEvent[] = [];
        let resolver: ((value: IteratorResult<WatchEvent>) => void) | null =
          null;
        let closed = false;

        const watcher = watch(watchPath, (eventType, filename) => {
          if (closed) return;

          const event: WatchEvent = {
            eventType: eventType as "rename" | "change",
            filename: filename,
          };

          if (resolver !== null) {
            const r = resolver;
            resolver = null;
            r({ value: event, done: false });
          } else {
            queue.push(event);
          }
        });

        return {
          async next(): Promise<IteratorResult<WatchEvent>> {
            if (closed) {
              return { value: undefined, done: true };
            }

            const queued = queue.shift();
            if (queued !== undefined) {
              return { value: queued, done: false };
            }

            return new Promise((resolve) => {
              resolver = resolve;
            });
          },

          async return(): Promise<IteratorResult<WatchEvent>> {
            closed = true;
            watcher.close();
            if (resolver !== null) {
              resolver({ value: undefined, done: true });
            }
            return { value: undefined, done: true };
          },
        };
      },
    };
  }

  /**
   * Get file or directory metadata.
   *
   * @param filePath - Path to stat
   * @returns Promise resolving to file metadata
   * @throws Error if path does not exist
   */
  async stat(filePath: string): Promise<FileStat> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      ctimeMs: stats.ctimeMs,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }

  /**
   * Create a directory.
   *
   * @param dirPath - Path to create
   * @param options - Optional mkdir options
   * @throws Error if directory cannot be created
   */
  async mkdir(dirPath: string, options?: MkdirOptions): Promise<void> {
    await fs.mkdir(dirPath, { recursive: options?.recursive ?? false });
  }

  /**
   * Remove a file or directory.
   *
   * @param targetPath - Path to remove
   * @param options - Optional rm options
   * @throws Error if path cannot be removed (and force is not set)
   */
  async rm(targetPath: string, options?: RmOptions): Promise<void> {
    await fs.rm(targetPath, {
      recursive: options?.recursive ?? false,
      force: options?.force ?? false,
    });
  }
}
