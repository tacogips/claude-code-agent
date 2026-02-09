/**
 * File-based activity store with locking for concurrent access.
 *
 * Provides persistent storage for session activity tracking using
 * JSON storage with file locking to ensure safe concurrent access.
 *
 * @module sdk/activity/store
 */

import type {
  ActivityStatus,
  ActivityEntry,
  ActivityStore,
} from "../../types/activity";
import { FileLockServiceImpl } from "../../services/file-lock";
import { AtomicWriter } from "../../services/atomic-writer";
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
import path from "node:path";

/**
 * Options for configuring the activity store.
 */
export interface ActivityStoreOptions {
  /** Data directory. Default: XDG_DATA_HOME or ~/.local/share/claude-code-agent */
  readonly dataDir?: string | undefined;
  /** Stale entry threshold in hours. Default: 24 */
  readonly cleanupHours?: number | undefined;
}

/**
 * Service interface for activity store operations.
 *
 * Provides CRUD operations for session activity entries with
 * automatic cleanup of stale entries.
 */
export interface ActivityStoreService {
  /**
   * Get activity for a session.
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving to ActivityEntry or null if not found
   */
  get(sessionId: string): Promise<ActivityEntry | null>;

  /**
   * Set activity for a session.
   *
   * Updates existing entry or creates new one.
   *
   * @param entry - Activity entry to store
   */
  set(entry: ActivityEntry): Promise<void>;

  /**
   * List all activity entries.
   *
   * @param filter - Optional filter criteria
   * @returns Promise resolving to array of ActivityEntry
   */
  list(filter?: { status?: ActivityStatus }): Promise<ActivityEntry[]>;

  /**
   * Remove activity for a session.
   *
   * Does not throw if session not found.
   *
   * @param sessionId - Session identifier
   */
  remove(sessionId: string): Promise<void>;

  /**
   * Remove stale entries older than threshold.
   *
   * Removes entries whose lastUpdated timestamp is older than
   * the configured cleanup threshold (default: 24 hours).
   *
   * @returns Promise resolving to number of entries removed
   */
  cleanup(): Promise<number>;

  /**
   * Get storage file path.
   *
   * Returns the absolute path to the activity storage file.
   *
   * @returns Absolute path to activity.json
   */
  getStoragePath(): string;
}

/**
 * File-based activity store implementation.
 *
 * Stores activity entries in a JSON file with file locking for
 * safe concurrent access. Uses atomic writes to prevent corruption.
 */
class ActivityStoreImpl implements ActivityStoreService {
  private readonly fs: FileSystem;
  private readonly clock: Clock;
  private readonly lockService: FileLockServiceImpl;
  private readonly atomicWriter: AtomicWriter;
  private readonly storagePath: string;
  private readonly cleanupHours: number;

  /**
   * Create a new ActivityStoreImpl.
   *
   * @param fs - FileSystem implementation
   * @param clock - Clock implementation
   * @param options - Store configuration options
   */
  constructor(fs: FileSystem, clock: Clock, options?: ActivityStoreOptions) {
    this.fs = fs;
    this.clock = clock;
    this.lockService = new FileLockServiceImpl(fs, clock);
    this.atomicWriter = new AtomicWriter(fs);
    this.cleanupHours = options?.cleanupHours ?? 24;

    // Determine storage path
    const dataDir = this.resolveDataDir(options?.dataDir);
    this.storagePath = path.join(dataDir, "activity.json");
  }

  /**
   * Resolve data directory with XDG_DATA_HOME support.
   *
   * @param override - Optional override directory
   * @returns Absolute path to data directory
   */
  private resolveDataDir(override?: string | undefined): string {
    if (override !== undefined) {
      return override;
    }

    const home = process.env["HOME"] ?? "/tmp";
    const xdgDataHome = process.env["XDG_DATA_HOME"];

    if (xdgDataHome !== undefined) {
      return path.join(xdgDataHome, "claude-code-agent");
    }

    return path.join(home, ".local", "share", "claude-code-agent");
  }

  getStoragePath(): string {
    return this.storagePath;
  }

  async get(sessionId: string): Promise<ActivityEntry | null> {
    return this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      const entry = store.sessions[sessionId];

      if (entry === undefined) {
        return null;
      }

      return {
        sessionId,
        status: entry.status,
        projectPath: entry.projectPath,
        lastUpdated: entry.lastUpdated,
      };
    });
  }

  async set(entry: ActivityEntry): Promise<void> {
    await this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();

      // Update or add entry
      store.sessions[entry.sessionId] = {
        status: entry.status,
        projectPath: entry.projectPath,
        lastUpdated: entry.lastUpdated,
      };

      await this.saveStore(store);
    });
  }

  async list(
    filter?: { status?: ActivityStatus } | undefined,
  ): Promise<ActivityEntry[]> {
    return this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      const entries: ActivityEntry[] = [];

      for (const [sessionId, entry] of Object.entries(store.sessions)) {
        // Apply status filter if provided
        if (filter?.status !== undefined && entry.status !== filter.status) {
          continue;
        }

        entries.push({
          sessionId,
          status: entry.status,
          projectPath: entry.projectPath,
          lastUpdated: entry.lastUpdated,
        });
      }

      return entries;
    });
  }

  async remove(sessionId: string): Promise<void> {
    await this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();

      // Remove entry if exists
      if (sessionId in store.sessions) {
        const sessions = { ...store.sessions };
        delete sessions[sessionId];

        const updatedStore: ActivityStore = {
          version: "1.0",
          sessions,
        };

        await this.saveStore(updatedStore);
      }
    });
  }

  async cleanup(): Promise<number> {
    return this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      const now = this.clock.now().getTime();
      const thresholdMs = this.cleanupHours * 60 * 60 * 1000;

      const sessions: Record<string, Omit<ActivityEntry, "sessionId">> = {};
      let removedCount = 0;

      for (const [sessionId, entry] of Object.entries(store.sessions)) {
        const lastUpdated = new Date(entry.lastUpdated).getTime();
        const age = now - lastUpdated;

        if (age > thresholdMs) {
          removedCount++;
        } else {
          sessions[sessionId] = entry;
        }
      }

      if (removedCount > 0) {
        const updatedStore: ActivityStore = {
          version: "1.0",
          sessions,
        };
        await this.saveStore(updatedStore);
      }

      return removedCount;
    });
  }

  /**
   * Load activity store from disk.
   *
   * Returns empty store if file doesn't exist or is invalid.
   *
   * @returns Promise resolving to ActivityStore
   */
  private async loadStore(): Promise<ActivityStore> {
    const exists = await this.fs.exists(this.storagePath);

    if (!exists) {
      return {
        version: "1.0",
        sessions: {},
      };
    }

    try {
      const content = await this.fs.readFile(this.storagePath);
      const parsed = JSON.parse(content) as unknown;

      // Validate store structure
      if (this.isValidStore(parsed)) {
        return parsed;
      }

      // Invalid store, return empty
      return {
        version: "1.0",
        sessions: {},
      };
    } catch (error) {
      // Error reading or parsing, return empty store
      return {
        version: "1.0",
        sessions: {},
      };
    }
  }

  /**
   * Type guard for ActivityStore validation.
   *
   * @param value - Value to check
   * @returns True if value is a valid ActivityStore
   */
  private isValidStore(value: unknown): value is ActivityStore {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    if (!("version" in value) || !("sessions" in value)) {
      return false;
    }

    if (value.version !== "1.0") {
      return false;
    }

    if (typeof value.sessions !== "object" || value.sessions === null) {
      return false;
    }

    return true;
  }

  /**
   * Save activity store to disk.
   *
   * Uses atomic writes to prevent corruption.
   *
   * @param store - ActivityStore to save
   */
  private async saveStore(store: ActivityStore): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.storagePath);
    await this.fs.mkdir(dir, { recursive: true });

    // Write atomically
    await this.atomicWriter.writeJson(this.storagePath, store);
  }
}

/**
 * Create file-based activity store with locking.
 *
 * Factory function that creates an ActivityStoreService with
 * the provided filesystem and clock implementations.
 *
 * @param fs - FileSystem implementation
 * @param clock - Clock implementation
 * @param options - Store configuration options
 * @returns ActivityStoreService instance
 *
 * @example
 * ```typescript
 * const store = createActivityStore(container.fileSystem, container.clock);
 * await store.set({ sessionId: "abc", status: "working", ... });
 * const entry = await store.get("abc");
 * ```
 */
export function createActivityStore(
  fs: FileSystem,
  clock: Clock,
  options?: ActivityStoreOptions,
): ActivityStoreService {
  return new ActivityStoreImpl(fs, clock, options);
}
