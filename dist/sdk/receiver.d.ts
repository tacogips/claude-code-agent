/**
 * Polling-based session update receiver.
 *
 * Provides a pull-based API for receiving updates from Claude Code session
 * transcript files. This is an alternative to the AsyncIterable patterns,
 * offering a simpler interface for applications that prefer polling.
 *
 * @module sdk/receiver
 */
import { type TranscriptEvent } from "../polling/parser";
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
export declare class SessionUpdateReceiver implements ISessionUpdateReceiver {
    private readonly _sessionId;
    private readonly options;
    private readonly legacyTranscriptPath;
    private readonly projectsRootPath;
    private resolvedTranscriptPath;
    private lastPathLookupAt;
    private _isClosed;
    private _isPolling;
    private pollingTimer;
    private fileOffset;
    private parser;
    private readonly updateQueue;
    private pendingReceive;
    private readonly firstReceiveHandled;
    /**
     * Create a new SessionUpdateReceiver.
     *
     * Polling starts lazily on the first receive() call.
     *
     * @param sessionId - Session ID to monitor
     * @param options - Receiver configuration
     */
    constructor(sessionId: string, options?: ReceiverOptions);
    /**
     * Get the session ID being monitored.
     */
    get sessionId(): string;
    /**
     * Check if the receiver is closed.
     */
    get isClosed(): boolean;
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
    receive(): Promise<SessionUpdate | null>;
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
    close(): void;
    /**
     * Start the polling mechanism.
     *
     * Handles includeExisting logic and sets up the interval timer.
     * @private
     */
    private startPolling;
    /**
     * Skip existing content when includeExisting is false.
     * Sets offset to current file size and feeds content to parser.
     * @private
     */
    private skipExistingContent;
    /**
     * Handle includeExisting: true on first receive.
     *
     * Reads entire file content and enqueues as an update if non-empty.
     * @private
     */
    private handleIncludeExisting;
    /**
     * Execute one poll cycle.
     *
     * Reads new content from the transcript file and enqueues updates.
     * Handles missing files and file truncation gracefully.
     * @private
     */
    private poll;
    /**
     * Enqueue an update or resolve pending receive() immediately.
     * @private
     */
    private enqueueOrResolvePending;
    /**
     * Resolve transcript path for current Claude Code layouts.
     *
     * Supports both legacy ~/.claude/sessions/<id>/transcript.jsonl and
     * current ~/.claude/projects/<project-hash>/<id>.jsonl layouts.
     */
    private resolveTranscriptPath;
    private fileExists;
    private findSessionFileInProjects;
    private findFileByNameDepthLimited;
    /**
     * Read a UTF-8 byte range from a file.
     */
    private readRange;
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
export declare function createSessionReceiver(sessionId: string, options?: ReceiverOptions): SessionUpdateReceiver;
//# sourceMappingURL=receiver.d.ts.map