/**
 * FileSystem interface for abstracting file operations.
 *
 * This provides testability by allowing mock implementations
 * in tests while using real file system operations in production.
 */

/**
 * Represents file metadata returned by stat operations.
 */
export interface FileStat {
  /** Size in bytes */
  readonly size: number;
  /** Last modification time as Unix timestamp (ms) */
  readonly mtimeMs: number;
  /** Creation time as Unix timestamp (ms) */
  readonly ctimeMs: number;
  /** Whether the path is a file */
  readonly isFile: boolean;
  /** Whether the path is a directory */
  readonly isDirectory: boolean;
}

/**
 * Represents a file system watch event.
 */
export interface WatchEvent {
  /** Type of change that occurred */
  readonly eventType: "rename" | "change";
  /** Path that changed (may be relative to watched path) */
  readonly filename: string | null;
}

/**
 * Options for mkdir operation.
 */
export interface MkdirOptions {
  /** Create parent directories if they don't exist */
  readonly recursive?: boolean | undefined;
}

/**
 * Options for rm operation.
 */
export interface RmOptions {
  /** Remove directories and their contents recursively */
  readonly recursive?: boolean | undefined;
  /** Do not throw if path does not exist */
  readonly force?: boolean | undefined;
}

/**
 * Abstract interface for file system operations.
 *
 * All methods are async and return Promises for consistent
 * error handling patterns across sync and async operations.
 */
export interface FileSystem {
  /**
   * Read file content as UTF-8 string.
   *
   * @param path - Absolute path to the file
   * @returns Promise resolving to file content
   * @throws Error if file does not exist or cannot be read
   */
  readFile(path: string): Promise<string>;

  /**
   * Write content to a file.
   *
   * Creates parent directories if they don't exist.
   * Overwrites existing file if present.
   *
   * @param path - Absolute path to the file
   * @param content - UTF-8 content to write
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Check if a file or directory exists.
   *
   * @param path - Path to check
   * @returns Promise resolving to true if path exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * List directory contents.
   *
   * @param path - Path to directory
   * @returns Promise resolving to array of entry names
   * @throws Error if path is not a directory or doesn't exist
   */
  readDir(path: string): Promise<readonly string[]>;

  /**
   * Watch a file or directory for changes.
   *
   * Yields events when the watched path changes.
   * Use for-await-of to consume events.
   *
   * @param path - Path to watch
   * @returns Async iterable of watch events
   */
  watch(path: string): AsyncIterable<WatchEvent>;

  /**
   * Get file or directory metadata.
   *
   * @param path - Path to stat
   * @returns Promise resolving to file metadata
   * @throws Error if path does not exist
   */
  stat(path: string): Promise<FileStat>;

  /**
   * Create a directory.
   *
   * @param path - Path to create
   * @param options - Optional mkdir options
   * @throws Error if directory cannot be created
   */
  mkdir(path: string, options?: MkdirOptions): Promise<void>;

  /**
   * Remove a file or directory.
   *
   * @param path - Path to remove
   * @param options - Optional rm options
   * @throws Error if path cannot be removed (and force is not set)
   */
  rm(path: string, options?: RmOptions): Promise<void>;
}
