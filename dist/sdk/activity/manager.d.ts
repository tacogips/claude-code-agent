/**
 * Activity Manager for Claude Code Session Tracking
 *
 * Orchestrates hook input parsing, transcript analysis, and activity store
 * operations to track session activity status in real-time.
 *
 * @module sdk/activity/manager
 */
import type { ActivityStatus, ActivityEntry } from "../../types/activity";
import type { HookInput } from "./hook-types";
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
/**
 * Options for configuring the activity manager.
 */
export interface ActivityManagerOptions {
    /** Data directory for activity storage. Default: XDG_DATA_HOME or ~/.local/share/claude-code-agent */
    readonly dataDir?: string | undefined;
    /** Stale entry threshold in hours. Default: 24 */
    readonly cleanupHours?: number | undefined;
    /** Maximum bytes to read from transcript end. Default: 10240 (10KB) */
    readonly transcriptReadBytes?: number | undefined;
}
/**
 * ActivityManager coordinates session activity tracking.
 *
 * Processes hook inputs from Claude Code to update session activity status,
 * using transcript analysis to determine if a session is waiting for user
 * response when the Stop hook is triggered.
 *
 * All errors are logged but not thrown - this ensures hooks never block
 * Claude Code execution due to activity tracking failures.
 */
export declare class ActivityManager {
    private readonly store;
    private readonly analyzer;
    private readonly clock;
    /**
     * Create a new ActivityManager.
     *
     * Uses dependency injection for FileSystem and Clock to enable testing.
     * If not provided, defaults will be used.
     *
     * @param fs - FileSystem implementation
     * @param clock - Clock implementation
     * @param options - Manager configuration options
     */
    constructor(fs: FileSystem, clock: Clock, options?: ActivityManagerOptions);
    /**
     * Update activity from hook input (reads stdin).
     *
     * Reads JSON from stdin, parses it as a HookInput, and updates
     * the activity status accordingly.
     *
     * This is the primary entry point for hook scripts.
     *
     * @example
     * ```bash
     * # In hook script:
     * cat hook_input.json | claude-code-agent activity update
     * ```
     */
    updateFromHook(): Promise<void>;
    /**
     * Read all data from stdin.
     *
     * @returns Promise resolving to stdin content as string
     */
    private readStdin;
    /**
     * Update activity from parsed hook input.
     *
     * Determines the activity status based on the hook event type:
     * - UserPromptSubmit: Sets status to "working"
     * - PermissionRequest: Sets status to "waiting_user_response"
     * - Stop: Checks transcript for AskUserQuestion to determine if
     *   the status should be "waiting_user_response" or "idle"
     *
     * @param input - Parsed hook input
     */
    update(input: HookInput): Promise<void>;
    /**
     * Determine activity status from hook input.
     *
     * @param input - Hook input
     * @returns Promise resolving to ActivityStatus
     */
    private determineStatus;
    /**
     * Get activity status for a session.
     *
     * @param sessionId - Session identifier
     * @returns Promise resolving to ActivityEntry or null if not found
     */
    getStatus(sessionId: string): Promise<ActivityEntry | null>;
    /**
     * List all tracked sessions.
     *
     * @param filter - Optional filter criteria
     * @returns Promise resolving to array of ActivityEntry
     */
    list(filter?: {
        status?: ActivityStatus;
    }): Promise<ActivityEntry[]>;
    /**
     * Check if session is currently working.
     *
     * Convenience method for checking if a session is actively executing tasks.
     *
     * @param sessionId - Session identifier
     * @returns Promise resolving to true if session is working
     */
    isWorking(sessionId: string): Promise<boolean>;
    /**
     * Check if session is waiting for user response.
     *
     * Convenience method for checking if a session is waiting for user input.
     *
     * @param sessionId - Session identifier
     * @returns Promise resolving to true if session is waiting for user
     */
    isWaitingForUser(sessionId: string): Promise<boolean>;
    /**
     * Remove stale entries.
     *
     * Removes entries older than the configured cleanup threshold.
     *
     * @returns Promise resolving to number of entries removed
     */
    cleanup(): Promise<number>;
}
//# sourceMappingURL=manager.d.ts.map