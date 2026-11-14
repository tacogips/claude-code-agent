/**
 * Polling-based session update receiver.
 *
 * Provides a pull-based API for receiving updates from Claude Code session
 * transcript files. This is an alternative to the AsyncIterable patterns,
 * offering a simpler interface for applications that prefer polling.
 *
 * @module sdk/receiver
 */

import { open, readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { JsonlStreamParser, type TranscriptEvent } from "../polling/parser";

/**
 * SessionUpdate represents one batch of updates from a poll cycle.
 *
 * Each update contains new content read since the last poll,
 * parsed events, and a timestamp.
 */
export interface SessionUpdate {
  /** Session ID this update belongs to */
  readonly sessionId: string;
  /** Raw new JSONL content since last poll */
  readonly newContent: string;
  /** Parsed events from new content */
  readonly events: readonly TranscriptEvent[];
  /** ISO timestamp of this update */
  readonly timestamp: string;
}

/**
 * Configuration options for SessionUpdateReceiver.
 */
export interface ReceiverOptions {
  /** Polling interval in milliseconds (default: 300) */
  readonly pollingIntervalMs?: number | undefined;
  /** Whether to include existing content on first receive (default: true) */
  readonly includeExisting?: boolean | undefined;
  /** Override auto-resolved transcript path */
  readonly transcriptPath?: string | undefined;
}

/**
 * Interface for session update receivers.
 *
 * Both the real SessionUpdateReceiver and MockSessionUpdateReceiver
 * implement this interface, enabling test substitution.
 */
export interface ISessionUpdateReceiver {
  readonly sessionId: string;
  readonly isClosed: boolean;
  receive(): Promise<SessionUpdate | null>;
  close(): void;
}

/**
 * SessionUpdateReceiver provides a polling-based API for receiving session updates.
 *
 * This class polls the Claude Code session transcript file at a configurable
 * interval and returns batches of new content via the receive() method.
 *
 * Features:
 * - Lazy initialization - polling starts on first receive() call
 * - File offset tracking - only reads new content
 * - Handles missing files - waits for file to appear
 * - Handles file truncation - resets offset when detected
 * - Queue-based - multiple receive() calls are queued
 *
 * @example
 * ```typescript
 * const receiver = createSessionReceiver("session-uuid-here", {
 *   pollingIntervalMs: 300,
 * });
 *
 * while (true) {
 *   const update = await receiver.receive();
 *   if (update === null) break; // receiver closed
 *
 *   console.log(`Got ${update.events.length} new events`);
 *   for (const event of update.events) {
 *     console.log(`  ${event.type}: ${JSON.stringify(event.content)}`);
 *   }
 * }
 *
 * receiver.close();
 * ```
 */
/**
 * Internal options with all values resolved to non-undefined.
 */
interface ResolvedReceiverOptions {
  readonly pollingIntervalMs: number;
  readonly includeExisting: boolean;
  readonly transcriptPath: string | undefined;
}

export class SessionUpdateReceiver implements ISessionUpdateReceiver {
  private readonly _sessionId: string;
  private readonly options: ResolvedReceiverOptions;
  private readonly legacyTranscriptPath: string;
  private readonly projectsRootPath: string;
  private resolvedTranscriptPath: string | null = null;
  private lastPathLookupAt: number = 0;

  private _isClosed: boolean = false;
  private _isPolling: boolean = false;
  private pollingTimer: Timer | null = null;
  private fileOffset: number = 0;
  private parser: JsonlStreamParser = new JsonlStreamParser();

  private readonly updateQueue: SessionUpdate[] = [];
  private pendingReceive: ((value: SessionUpdate | null) => void) | null = null;

  private readonly firstReceiveHandled: { value: boolean } = { value: false };

  /**
   * Create a new SessionUpdateReceiver.
   *
   * Polling starts lazily on the first receive() call.
   *
   * @param sessionId - Session ID to monitor
   * @param options - Receiver configuration
   */
  constructor(sessionId: string, options?: ReceiverOptions) {
    this._sessionId = sessionId;

    const defaultTranscriptPath = join(
      homedir(),
      ".claude",
      "sessions",
      sessionId,
      "transcript.jsonl",
    );

    this.options = {
      pollingIntervalMs: options?.pollingIntervalMs ?? 300,
      includeExisting: options?.includeExisting ?? true,
      transcriptPath: options?.transcriptPath,
    };

    this.legacyTranscriptPath = defaultTranscriptPath;
    this.projectsRootPath = join(homedir(), ".claude", "projects");
    this.resolvedTranscriptPath = this.options.transcriptPath ?? null;
  }

  /**
   * Get the session ID being monitored.
   */
  get sessionId(): string {
    return this._sessionId;
  }

  /**
   * Check if the receiver is closed.
   */
  get isClosed(): boolean {
    return this._isClosed;
  }

  /**
   * Receive the next batch of updates.
   *
   * This method blocks (via Promise) until new content is available.
   * Returns null when the receiver is closed.
   *
   * On the first call:
   * - If includeExisting is true, returns existing content immediately
   * - If includeExisting is false, starts polling and waits for new content
   *
   * @returns Next update batch, or null if closed
   *
   * @example
   * ```typescript
   * const update = await receiver.receive();
   * if (update === null) {
   *   console.log("Receiver closed");
   * } else {
   *   console.log(`Received ${update.events.length} events`);
   * }
   * ```
   */
  async receive(): Promise<SessionUpdate | null> {
    if (this._isClosed) {
      return null;
    }

    // Start polling on first receive() call
    if (!this._isPolling) {
      await this.startPolling();
    }

    // Check if there are queued updates
    const queued = this.updateQueue.shift();
    if (queued !== undefined) {
      return queued;
    }

    // Wait for next update
    return new Promise<SessionUpdate | null>((resolve) => {
      this.pendingReceive = resolve;
    });
  }

  /**
   * Close the receiver and stop polling.
   *
   * Any pending receive() calls will return null.
   * After closing, subsequent receive() calls return null immediately.
   *
   * This is the recommended way to stop monitoring a session.
   *
   * @example
   * ```typescript
   * receiver.close();
   * const update = await receiver.receive(); // Returns null
   * ```
   */
  close(): void {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;
    this._isPolling = false;

    // Clear polling timer
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    // Resolve any pending receive() with null
    if (this.pendingReceive !== null) {
      this.pendingReceive(null);
      this.pendingReceive = null;
    }

    // Clear queue
    this.updateQueue.length = 0;
  }

  /**
   * Start the polling mechanism.
   *
   * Handles includeExisting logic and sets up the interval timer.
   * @private
   */
  private async startPolling(): Promise<void> {
    this._isPolling = true;

    // Handle includeExisting option
    if (!this.firstReceiveHandled.value) {
      this.firstReceiveHandled.value = true;

      if (this.options.includeExisting) {
        // includeExisting: true - return existing content immediately
        await this.handleIncludeExisting();
      } else {
        // includeExisting: false - skip existing content by setting offset
        await this.skipExistingContent();
      }
    }

    // Start polling timer
    this.pollingTimer = setInterval(() => {
      void this.poll();
    }, this.options.pollingIntervalMs);

    // Run first poll immediately
    void this.poll();
  }

  /**
   * Skip existing content when includeExisting is false.
   * Sets offset to current file size and feeds content to parser.
   * @private
   */
  private async skipExistingContent(): Promise<void> {
    try {
      const transcriptPath = await this.resolveTranscriptPath();
      const fileStat = await stat(transcriptPath);
      this.fileOffset = fileStat.size;
      // Feed existing content to parser to keep it in sync
      if (fileStat.size > 0) {
        const existingContent = await readFile(transcriptPath, "utf8");
        this.parser.feed(existingContent);
      }
    } catch {
      // File doesn't exist yet, that's okay
    }
  }

  /**
   * Handle includeExisting: true on first receive.
   *
   * Reads entire file content and enqueues as an update if non-empty.
   * @private
   */
  private async handleIncludeExisting(): Promise<void> {
    try {
      const transcriptPath = await this.resolveTranscriptPath();

      // Get file stat first
      const fileStat = await stat(transcriptPath);

      // If file is empty, just set offset and return
      if (fileStat.size === 0) {
        this.fileOffset = 0;
        return;
      }

      // Read entire file
      const content = await readFile(transcriptPath, "utf8");

      // Parse content
      const events = this.parser.feed(content);

      // Update offset BEFORE flushing, so subsequent polls read from the right place
      this.fileOffset = fileStat.size;

      // Create update
      const update: SessionUpdate = {
        sessionId: this._sessionId,
        newContent: content,
        events,
        timestamp: new Date().toISOString(),
      };

      // Enqueue or resolve pending
      this.enqueueOrResolvePending(update);
    } catch {
      // File doesn't exist yet, that's okay
      // Poll will pick it up later
    }
  }

  /**
   * Execute one poll cycle.
   *
   * Reads new content from the transcript file and enqueues updates.
   * Handles missing files and file truncation gracefully.
   * @private
   */
  private async poll(): Promise<void> {
    if (this._isClosed) {
      return;
    }

    try {
      const transcriptPath = await this.resolveTranscriptPath();

      // Check if file exists
      const fileStat = await stat(transcriptPath);

      // Handle file truncation
      if (fileStat.size < this.fileOffset) {
        this.fileOffset = 0;
        this.parser = new JsonlStreamParser();
      }

      // Check if there's new content
      if (fileStat.size === this.fileOffset) {
        return; // No new content
      }

      // Read only the new range to avoid re-reading the entire file every poll
      const newContent = await this.readRange(
        transcriptPath,
        this.fileOffset,
        fileStat.size - this.fileOffset,
      );

      if (newContent.length === 0) {
        return; // No new content
      }

      // Parse new content
      const events = this.parser.feed(newContent);

      // Update offset
      this.fileOffset = fileStat.size;

      // Create update
      const update: SessionUpdate = {
        sessionId: this._sessionId,
        newContent,
        events,
        timestamp: new Date().toISOString(),
      };

      // Enqueue or resolve pending
      this.enqueueOrResolvePending(update);
    } catch {
      // File doesn't exist yet or read error
      // Reset offset so next read starts from beginning if file reappears
      this.fileOffset = 0;
      this.parser = new JsonlStreamParser();
    }
  }

  /**
   * Enqueue an update or resolve pending receive() immediately.
   * @private
   */
  private enqueueOrResolvePending(update: SessionUpdate): void {
    if (this.pendingReceive !== null) {
      // Resolve pending receive() immediately
      const resolver = this.pendingReceive;
      this.pendingReceive = null;
      resolver(update);
    } else {
      // Queue for later
      this.updateQueue.push(update);
    }
  }

  /**
   * Resolve transcript path for current Claude Code layouts.
   *
   * Supports both legacy ~/.claude/sessions/<id>/transcript.jsonl and
   * current ~/.claude/projects/<project-hash>/<id>.jsonl layouts.
   */
  private async resolveTranscriptPath(): Promise<string> {
    if (this.options.transcriptPath !== undefined) {
      return this.options.transcriptPath;
    }

    if (this.resolvedTranscriptPath !== null) {
      return this.resolvedTranscriptPath;
    }

    const now = Date.now();
    if (now - this.lastPathLookupAt < 1000) {
      return this.legacyTranscriptPath;
    }
    this.lastPathLookupAt = now;

    if (await this.fileExists(this.legacyTranscriptPath)) {
      this.resolvedTranscriptPath = this.legacyTranscriptPath;
      return this.legacyTranscriptPath;
    }

    const projectSessionFile = await this.findSessionFileInProjects();
    if (projectSessionFile !== null) {
      this.resolvedTranscriptPath = projectSessionFile;
      return projectSessionFile;
    }

    // Fall back to legacy path. If file appears later, future polls will keep trying.
    return this.legacyTranscriptPath;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  private async findSessionFileInProjects(): Promise<string | null> {
    let projectDirs: Awaited<ReturnType<typeof readdir>>;
    try {
      projectDirs = await readdir(this.projectsRootPath, {
        withFileTypes: true,
      });
    } catch {
      return null;
    }

    const targetFile = `${this._sessionId}.jsonl`;

    for (const entry of projectDirs) {
      if (!entry.isDirectory()) {
        continue;
      }

      const directPath = join(this.projectsRootPath, entry.name, targetFile);
      if (await this.fileExists(directPath)) {
        return directPath;
      }

      // Subagent files can be nested under session directories.
      const nestedPath = await this.findFileByNameDepthLimited(
        join(this.projectsRootPath, entry.name),
        targetFile,
        3,
      );
      if (nestedPath !== null) {
        return nestedPath;
      }
    }

    return null;
  }

  private async findFileByNameDepthLimited(
    rootDir: string,
    fileName: string,
    maxDepth: number,
  ): Promise<string | null> {
    type SearchNode = { path: string; depth: number };
    const queue: SearchNode[] = [{ path: rootDir, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        continue;
      }

      let entries: Awaited<ReturnType<typeof readdir>>;
      try {
        entries = await readdir(current.path, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (entry.isFile() && entry.name === fileName) {
          return join(current.path, entry.name);
        }

        if (entry.isDirectory() && current.depth < maxDepth) {
          queue.push({
            path: join(current.path, entry.name),
            depth: current.depth + 1,
          });
        }
      }
    }

    return null;
  }

  /**
   * Read a UTF-8 byte range from a file.
   */
  private async readRange(
    path: string,
    offset: number,
    length: number,
  ): Promise<string> {
    if (length <= 0) {
      return "";
    }

    const fileHandle = await open(path, "r");
    try {
      const buffer = new Uint8Array(length);
      let totalRead = 0;

      while (totalRead < length) {
        const { bytesRead } = await fileHandle.read(
          buffer,
          totalRead,
          length - totalRead,
          offset + totalRead,
        );

        if (bytesRead === 0) {
          break;
        }

        totalRead += bytesRead;
      }

      return new TextDecoder().decode(buffer.subarray(0, totalRead));
    } finally {
      await fileHandle.close();
    }
  }
}

/**
 * Create a new SessionUpdateReceiver.
 *
 * This is a factory function that creates a receiver instance.
 * Polling starts lazily on the first receive() call.
 *
 * @param sessionId - Session ID to monitor
 * @param options - Receiver configuration
 * @returns New SessionUpdateReceiver instance
 *
 * @example
 * ```typescript
 * const receiver = createSessionReceiver("session-uuid", {
 *   pollingIntervalMs: 500,
 *   includeExisting: true,
 * });
 *
 * for await (const update of receiveUpdates(receiver)) {
 *   console.log(update);
 * }
 * ```
 */
export function createSessionReceiver(
  sessionId: string,
  options?: ReceiverOptions,
): SessionUpdateReceiver {
  return new SessionUpdateReceiver(sessionId, options);
}
