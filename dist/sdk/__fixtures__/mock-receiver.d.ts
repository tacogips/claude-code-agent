/**
 * Mock SessionUpdateReceiver for unit testing.
 *
 * Provides programmatic injection of session updates without filesystem dependency.
 * Follows the same queue-based receive pattern as the real SessionUpdateReceiver.
 *
 * @module sdk/__fixtures__/mock-receiver
 */
import type { TranscriptEvent } from "../../polling/parser";
import type { ISessionUpdateReceiver, SessionUpdate } from "../receiver";
/**
 * Mock SessionUpdateReceiver for unit testing.
 *
 * Simulates session update reception without polling the filesystem.
 * Updates can be injected via pushUpdate() and pushEvents() methods.
 *
 * @example
 * ```typescript
 * const mock = new MockSessionUpdateReceiver("test-session");
 *
 * // Push an update
 * mock.pushUpdate({
 *   sessionId: "test-session",
 *   newContent: '{"type":"user","content":"Hello"}\n',
 *   events: [{ type: "user", raw: { type: "user", content: "Hello" } }],
 *   timestamp: new Date().toISOString(),
 * });
 *
 * const update = await mock.receive();
 * // update contains the pushed data
 *
 * mock.close();
 * ```
 */
export declare class MockSessionUpdateReceiver implements ISessionUpdateReceiver {
    private readonly _sessionId;
    private _isClosed;
    private readonly updateQueue;
    private pendingReceive;
    constructor(sessionId: string);
    get sessionId(): string;
    get isClosed(): boolean;
    receive(): Promise<SessionUpdate | null>;
    close(): void;
    /**
     * Push a complete SessionUpdate into the receiver.
     *
     * If a receive() call is pending, it resolves immediately.
     * Otherwise the update is queued for the next receive() call.
     *
     * @param update - The update to inject
     * @throws Error if receiver is closed
     */
    pushUpdate(update: SessionUpdate): void;
    /**
     * Convenience method to push events without constructing a full SessionUpdate.
     *
     * Automatically generates sessionId, timestamp, and newContent from events.
     *
     * @param events - Array of TranscriptEvent to include
     * @param content - Optional raw JSONL content override
     * @throws Error if receiver is closed
     */
    pushEvents(events: readonly TranscriptEvent[], content?: string): void;
    /**
     * Check if there is a pending receive() call waiting for data.
     */
    get hasPendingReceive(): boolean;
    /**
     * Get the number of queued updates waiting to be received.
     */
    get queueSize(): number;
}
/**
 * Factory function for creating MockSessionUpdateReceiver instances.
 *
 * @param sessionId - Session ID for the mock receiver
 * @returns New MockSessionUpdateReceiver instance
 */
export declare function createMockSessionReceiver(sessionId: string): MockSessionUpdateReceiver;
//# sourceMappingURL=mock-receiver.d.ts.map