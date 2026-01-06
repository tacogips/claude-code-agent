/**
 * Mock FileSystem for testing.
 *
 * Provides an in-memory implementation of the FileSystem interface
 * that allows tests to control file content and simulate file operations
 * without touching the real file system.
 *
 * @module test/mocks/filesystem
 */

import type {
  FileSystem,
  FileStat,
  WatchEvent,
  MkdirOptions,
  RmOptions,
} from "../../interfaces/filesystem";
import { FileNotFoundError } from "../../errors";

/**
 * In-memory file entry with content and metadata.
 */
interface FileEntry {
  content: string;
  mtimeMs: number;
  ctimeMs: number;
}

/**
 * Mock FileSystem implementation for testing.
 *
 * Stores files in memory and provides full control over
 * file system behavior for deterministic testing.
 */
export class MockFileSystem implements FileSystem {
  private readonly files: Map<string, FileEntry> = new Map();
  private readonly directories: Set<string> = new Set(["/"]); // Root always exists
  private readonly watchCallbacks: Map<
    string,
    ((event: WatchEvent) => void)[]
  > = new Map();
  private currentTime: number;

  /**
   * Create a new MockFileSystem.
   *
   * @param initialTime - Initial timestamp for file operations (default: now)
   */
  constructor(initialTime: number = Date.now()) {
    this.currentTime = initialTime;
  }

  /**
   * Set the current time for file operations.
   *
   * @param time - Unix timestamp in milliseconds
   */
  setTime(time: number): void {
    this.currentTime = time;
  }

  /**
   * Advance the current time by the specified amount.
   *
   * @param ms - Milliseconds to advance
   */
  advanceTime(ms: number): void {
    this.currentTime += ms;
  }

  /**
   * Add or update a file in the mock file system.
   *
   * Also creates parent directories if they don't exist.
   *
   * @param path - File path
   * @param content - File content
   */
  setFile(path: string, content: string): void {
    const normalizedPath = this.normalizePath(path);
    const parentDir = this.getParentPath(normalizedPath);

    // Ensure parent directories exist
    this.ensureDirectoryExists(parentDir);

    const existingEntry = this.files.get(normalizedPath);
    this.files.set(normalizedPath, {
      content,
      mtimeMs: this.currentTime,
      ctimeMs: existingEntry?.ctimeMs ?? this.currentTime,
    });
  }

  /**
   * Get file content if it exists.
   *
   * @param path - File path
   * @returns File content or undefined if not found
   */
  getFile(path: string): string | undefined {
    const normalizedPath = this.normalizePath(path);
    const entry = this.files.get(normalizedPath);
    return entry?.content;
  }

  /**
   * Clear all files and directories (except root).
   */
  clearFiles(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add("/");
  }

  /**
   * Get all files in the mock file system.
   *
   * @returns Map of path to content
   */
  getFiles(): Map<string, string> {
    const result = new Map<string, string>();
    for (const [path, entry] of this.files) {
      result.set(path, entry.content);
    }
    return result;
  }

  /**
   * Create a directory in the mock file system.
   *
   * @param path - Directory path
   */
  setDirectory(path: string): void {
    this.ensureDirectoryExists(this.normalizePath(path));
  }

  /**
   * Trigger a watch event for a path.
   *
   * @param path - Path that changed
   * @param event - Watch event to emit
   */
  emitWatchEvent(path: string, event: WatchEvent): void {
    const normalizedPath = this.normalizePath(path);
    const callbacks = this.watchCallbacks.get(normalizedPath);
    if (callbacks !== undefined) {
      for (const callback of callbacks) {
        callback(event);
      }
    }
  }

  // FileSystem interface implementation

  async readFile(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    const entry = this.files.get(normalizedPath);
    if (entry === undefined) {
      throw new FileNotFoundError(path);
    }
    return entry.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.setFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    return (
      this.files.has(normalizedPath) || this.directories.has(normalizedPath)
    );
  }

  async readDir(path: string): Promise<readonly string[]> {
    const normalizedPath = this.normalizePath(path);

    if (!this.directories.has(normalizedPath)) {
      throw new FileNotFoundError(path);
    }

    const entries: string[] = [];
    const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";

    // Find files in this directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.slice(prefix.length);
        const firstSlash = relativePath.indexOf("/");
        const entryName =
          firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (entryName.length > 0 && !entries.includes(entryName)) {
          entries.push(entryName);
        }
      }
    }

    // Find subdirectories
    for (const dirPath of this.directories) {
      if (dirPath !== normalizedPath && dirPath.startsWith(prefix)) {
        const relativePath = dirPath.slice(prefix.length);
        const firstSlash = relativePath.indexOf("/");
        const entryName =
          firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (entryName.length > 0 && !entries.includes(entryName)) {
          entries.push(entryName);
        }
      }
    }

    return entries.sort();
  }

  watch(path: string): AsyncIterable<WatchEvent> {
    const normalizedPath = this.normalizePath(path);
    const self = this;

    return {
      [Symbol.asyncIterator](): AsyncIterator<WatchEvent> {
        const queue: WatchEvent[] = [];
        let resolver: ((value: IteratorResult<WatchEvent>) => void) | null =
          null;
        let done = false;

        const callback = (event: WatchEvent): void => {
          if (done) return;

          if (resolver !== null) {
            const r = resolver;
            resolver = null;
            r({ value: event, done: false });
          } else {
            queue.push(event);
          }
        };

        // Register callback
        const callbacks = self.watchCallbacks.get(normalizedPath);
        if (callbacks !== undefined) {
          callbacks.push(callback);
        } else {
          self.watchCallbacks.set(normalizedPath, [callback]);
        }

        return {
          async next(): Promise<IteratorResult<WatchEvent>> {
            if (done) {
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
            done = true;
            // Remove callback
            const cbs = self.watchCallbacks.get(normalizedPath);
            if (cbs !== undefined) {
              const index = cbs.indexOf(callback);
              if (index !== -1) {
                cbs.splice(index, 1);
              }
            }
            return { value: undefined, done: true };
          },
        };
      },
    };
  }

  async stat(path: string): Promise<FileStat> {
    const normalizedPath = this.normalizePath(path);

    const entry = this.files.get(normalizedPath);
    if (entry !== undefined) {
      return {
        size: Buffer.byteLength(entry.content, "utf-8"),
        mtimeMs: entry.mtimeMs,
        ctimeMs: entry.ctimeMs,
        isFile: true,
        isDirectory: false,
      };
    }

    if (this.directories.has(normalizedPath)) {
      return {
        size: 0,
        mtimeMs: this.currentTime,
        ctimeMs: this.currentTime,
        isFile: false,
        isDirectory: true,
      };
    }

    throw new FileNotFoundError(path);
  }

  async mkdir(path: string, options?: MkdirOptions): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    if (options?.recursive === true) {
      this.ensureDirectoryExists(normalizedPath);
    } else {
      const parentPath = this.getParentPath(normalizedPath);
      if (parentPath !== "/" && !this.directories.has(parentPath)) {
        throw new FileNotFoundError(parentPath);
      }
      this.directories.add(normalizedPath);
    }
  }

  async rm(path: string, options?: RmOptions): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    // Check if it's a file
    if (this.files.has(normalizedPath)) {
      this.files.delete(normalizedPath);
      return;
    }

    // Check if it's a directory
    if (this.directories.has(normalizedPath)) {
      if (options?.recursive === true) {
        // Remove all files and directories under this path
        const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";

        for (const filePath of [...this.files.keys()]) {
          if (filePath.startsWith(prefix)) {
            this.files.delete(filePath);
          }
        }

        for (const dirPath of [...this.directories]) {
          if (dirPath.startsWith(prefix) || dirPath === normalizedPath) {
            this.directories.delete(dirPath);
          }
        }
      } else {
        // Check if directory is empty
        const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";
        for (const filePath of this.files.keys()) {
          if (filePath.startsWith(prefix)) {
            throw new Error(`Directory not empty: ${path}`);
          }
        }
        for (const dirPath of this.directories) {
          if (dirPath !== normalizedPath && dirPath.startsWith(prefix)) {
            throw new Error(`Directory not empty: ${path}`);
          }
        }
        this.directories.delete(normalizedPath);
      }
      return;
    }

    // Path doesn't exist
    if (options?.force !== true) {
      throw new FileNotFoundError(path);
    }
  }

  // Helper methods

  private normalizePath(path: string): string {
    // Remove trailing slashes (except for root)
    let normalized = path.replace(/\/+$/, "") || "/";
    // Ensure path starts with /
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized;
    }
    return normalized;
  }

  private getParentPath(path: string): string {
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash <= 0) {
      return "/";
    }
    return path.slice(0, lastSlash);
  }

  private ensureDirectoryExists(path: string): void {
    if (path === "/" || this.directories.has(path)) {
      return;
    }

    // Create parent directories first
    const parentPath = this.getParentPath(path);
    this.ensureDirectoryExists(parentPath);

    this.directories.add(path);
  }
}
