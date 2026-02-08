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
export class MockSessionUpdateReceiver implements ISessionUpdateReceiver {
  private readonly _sessionId: string;
  private _isClosed: boolean = false;
  private readonly updateQueue: SessionUpdate[] = [];
  private pendingReceive: ((value: SessionUpdate | null) => void) | null = null;

  constructor(sessionId: string) {
    this._sessionId = sessionId;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  get isClosed(): boolean {
    return this._isClosed;
  }

  async receive(): Promise<SessionUpdate | null> {
    if (this._isClosed) {
      return null;
    }

    const queued = this.updateQueue.shift();
    if (queued !== undefined) {
      return queued;
    }

    return new Promise<SessionUpdate | null>((resolve) => {
      this.pendingReceive = resolve;
    });
  }

  close(): void {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;

    if (this.pendingReceive !== null) {
      this.pendingReceive(null);
      this.pendingReceive = null;
    }

    this.updateQueue.length = 0;
  }

  // --- Mock-specific methods ---

  /**
   * Push a complete SessionUpdate into the receiver.
   *
   * If a receive() call is pending, it resolves immediately.
   * Otherwise the update is queued for the next receive() call.
   *
   * @param update - The update to inject
   * @throws Error if receiver is closed
   */
  pushUpdate(update: SessionUpdate): void {
    if (this._isClosed) {
      throw new Error("Cannot push update to closed mock receiver");
    }

    if (this.pendingReceive !== null) {
      const resolver = this.pendingReceive;
      this.pendingReceive = null;
      resolver(update);
    } else {
      this.updateQueue.push(update);
    }
  }

  /**
   * Convenience method to push events without constructing a full SessionUpdate.
   *
   * Automatically generates sessionId, timestamp, and newContent from events.
   *
   * @param events - Array of TranscriptEvent to include
   * @param content - Optional raw JSONL content override
   * @throws Error if receiver is closed
   */
  pushEvents(events: readonly TranscriptEvent[], content?: string): void {
    const newContent =
      content ?? events.map((e) => JSON.stringify(e.raw)).join("\n") + "\n";

    const update: SessionUpdate = {
      sessionId: this._sessionId,
      newContent,
      events,
      timestamp: new Date().toISOString(),
    };

    this.pushUpdate(update);
  }

  /**
   * Check if there is a pending receive() call waiting for data.
   */
  get hasPendingReceive(): boolean {
    return this.pendingReceive !== null;
  }

  /**
   * Get the number of queued updates waiting to be received.
   */
  get queueSize(): number {
    return this.updateQueue.length;
  }
}

/**
 * Factory function for creating MockSessionUpdateReceiver instances.
 *
 * @param sessionId - Session ID for the mock receiver
 * @returns New MockSessionUpdateReceiver instance
 */
export function createMockSessionReceiver(
  sessionId: string,
): MockSessionUpdateReceiver {
  return new MockSessionUpdateReceiver(sessionId);
}
