/**
 * File-based activity store with locking for concurrent access.
 *
 * Provides persistent storage for session activity tracking using
 * JSON storage with file locking to ensure safe concurrent access.
 *
 * @module sdk/activity/store
 */
import type { ActivityStatus, ActivityEntry } from "../../types/activity";
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
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
    list(filter?: {
        status?: ActivityStatus;
    }): Promise<ActivityEntry[]>;
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
export declare function createActivityStore(fs: FileSystem, clock: Clock, options?: ActivityStoreOptions): ActivityStoreService;
//# sourceMappingURL=store.d.ts.map