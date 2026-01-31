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
import {
  parseHookInput,
  isUserPromptSubmit,
  isPermissionRequest,
  isStop,
} from "./hook-types";
import type { TranscriptAnalyzer } from "./transcript-analyzer";
import { createTranscriptAnalyzer } from "./transcript-analyzer";
import type { ActivityStoreService } from "./store";
import { createActivityStore } from "./store";
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
import { createTaggedLogger } from "../../logger";

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

const logger = createTaggedLogger("activity-manager");

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
export class ActivityManager {
  private readonly store: ActivityStoreService;
  private readonly analyzer: TranscriptAnalyzer;
  private readonly clock: Clock;

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
  constructor(fs: FileSystem, clock: Clock, options?: ActivityManagerOptions) {
    this.clock = clock;

    // Create store with options
    this.store = createActivityStore(fs, clock, {
      dataDir: options?.dataDir,
      cleanupHours: options?.cleanupHours,
    });

    // Create analyzer with options
    this.analyzer = createTranscriptAnalyzer(
      options?.transcriptReadBytes !== undefined
        ? { maxReadBytes: options.transcriptReadBytes }
        : undefined,
    );
  }

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
  async updateFromHook(): Promise<void> {
    try {
      // Read all data from stdin
      const json = await this.readStdin();

      // Parse hook input
      const parseResult = parseHookInput(json);

      if (parseResult.isErr()) {
        logger.error("Failed to parse hook input:", parseResult.error);
        return;
      }

      // Update activity
      await this.update(parseResult.value);
    } catch (error) {
      // Silent failure - log but don't throw
      logger.error("Failed to update activity from hook:", error);
    }
  }

  /**
   * Read all data from stdin.
   *
   * @returns Promise resolving to stdin content as string
   */
  private async readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];

      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk: string) => chunks.push(chunk));
      process.stdin.on("end", () => resolve(chunks.join("")));
      process.stdin.on("error", reject);
    });
  }

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
  async update(input: HookInput): Promise<void> {
    try {
      // Determine status from hook event type
      const status = await this.determineStatus(input);

      // Create activity entry
      const entry: ActivityEntry = {
        sessionId: input.session_id,
        status,
        projectPath: input.cwd,
        lastUpdated: this.clock.now().toISOString(),
      };

      // Store entry
      await this.store.set(entry);

      logger.debug(`Updated activity for session ${input.session_id}:`, {
        status,
        projectPath: input.cwd,
      });
    } catch (error) {
      // Silent failure - log but don't throw
      logger.error("Failed to update activity:", error);
    }
  }

  /**
   * Determine activity status from hook input.
   *
   * @param input - Hook input
   * @returns Promise resolving to ActivityStatus
   */
  private async determineStatus(input: HookInput): Promise<ActivityStatus> {
    if (isUserPromptSubmit(input)) {
      // User submitted a prompt - session is now working
      return "working";
    }

    if (isPermissionRequest(input)) {
      // Permission requested - session is waiting for user response
      return "waiting_user_response";
    }

    if (isStop(input)) {
      // Stop event - check transcript for AskUserQuestion
      const hasAskUserQuestion = await this.analyzer.hasAskUserQuestion(
        input.transcript_path,
      );

      if (hasAskUserQuestion) {
        // Claude asked a question - waiting for user response
        return "waiting_user_response";
      }

      // Normal stop - session is idle
      return "idle";
    }

    // Should never reach here due to discriminated union
    logger.warn("Unknown hook event type:", input);
    return "idle";
  }

  /**
   * Get activity status for a session.
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving to ActivityEntry or null if not found
   */
  async getStatus(sessionId: string): Promise<ActivityEntry | null> {
    try {
      return await this.store.get(sessionId);
    } catch (error) {
      logger.error("Failed to get activity status:", error);
      return null;
    }
  }

  /**
   * List all tracked sessions.
   *
   * @param filter - Optional filter criteria
   * @returns Promise resolving to array of ActivityEntry
   */
  async list(filter?: { status?: ActivityStatus }): Promise<ActivityEntry[]> {
    try {
      return await this.store.list(filter);
    } catch (error) {
      logger.error("Failed to list activities:", error);
      return [];
    }
  }

  /**
   * Check if session is currently working.
   *
   * Convenience method for checking if a session is actively executing tasks.
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving to true if session is working
   */
  async isWorking(sessionId: string): Promise<boolean> {
    const entry = await this.getStatus(sessionId);
    return entry !== null && entry.status === "working";
  }

  /**
   * Check if session is waiting for user response.
   *
   * Convenience method for checking if a session is waiting for user input.
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving to true if session is waiting for user
   */
  async isWaitingForUser(sessionId: string): Promise<boolean> {
    const entry = await this.getStatus(sessionId);
    return entry !== null && entry.status === "waiting_user_response";
  }

  /**
   * Remove stale entries.
   *
   * Removes entries older than the configured cleanup threshold.
   *
   * @returns Promise resolving to number of entries removed
   */
  async cleanup(): Promise<number> {
    try {
      return await this.store.cleanup();
    } catch (error) {
      logger.error("Failed to cleanup activities:", error);
      return 0;
    }
  }
}
