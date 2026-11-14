/**
 * SSE Bridge Example
 *
 * Demonstrates how to bridge SessionUpdateReceiver's polling-based
 * updates into Server-Sent Events for real-time client connections.
 *
 * This pattern is useful when building web UIs that need to display
 * live session progress without client-side polling.
 *
 * Prerequisites:
 *   bun add claude-code-agent
 *
 * @example
 * ```bash
 * bun run examples/sse-bridge.ts
 * ```
 */

import {
  SessionUpdateReceiver,
  type SessionUpdate,
  type TranscriptEvent,
  type ISessionUpdateReceiver,
} from "claude-code-agent/sdk";

// --- SSE Bridge ---

/**
 * SSEBridge converts polling-based SessionUpdateReceiver into
 * a Server-Sent Events stream.
 *
 * Usage:
 * ```typescript
 * const bridge = new SSEBridge(sessionId);
 * const stream = bridge.createStream();
 * return new Response(stream, {
 *   headers: { "Content-Type": "text/event-stream" }
 * });
 * ```
 */
class SSEBridge {
  private receiver: ISessionUpdateReceiver;
  private aborted: boolean = false;

  constructor(
    sessionId: string,
    options?: {
      pollingIntervalMs?: number;
      includeExisting?: boolean;
    },
  ) {
    this.receiver = new SessionUpdateReceiver(sessionId, {
      pollingIntervalMs: options?.pollingIntervalMs ?? 300,
      includeExisting: options?.includeExisting ?? true,
    });
  }

  /**
   * Create a ReadableStream that emits SSE-formatted data.
   *
   * Each TranscriptEvent is sent as a separate SSE message with:
   *   - event: the transcript event type
   *   - data: JSON-serialized event object
   *   - id: event UUID (if available)
   */
  createStream(): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const receiver = this.receiver;
    const bridge = this;

    return new ReadableStream({
      async pull(controller) {
        if (bridge.aborted) {
          controller.close();
          return;
        }

        const update: SessionUpdate | null = await receiver.receive();
        if (update === null) {
          // Session ended or receiver closed
          controller.enqueue(
            encoder.encode("event: close\ndata: {}\n\n"),
          );
          controller.close();
          return;
        }

        for (const event of update.events) {
          const sseMessage = formatSSEMessage(event);
          controller.enqueue(encoder.encode(sseMessage));
        }
      },

      cancel() {
        bridge.abort();
      },
    });
  }

  /**
   * Stop the bridge and close the receiver.
   */
  abort(): void {
    this.aborted = true;
    this.receiver.close();
  }
}

/**
 * Format a TranscriptEvent as an SSE message string.
 *
 * @param event - Transcript event to format
 * @returns SSE-formatted string
 */
function formatSSEMessage(event: TranscriptEvent): string {
  const lines: string[] = [];

  // Set event type
  lines.push(`event: ${event.type}`);

  // Set ID if available
  if (event.uuid) {
    lines.push(`id: ${event.uuid}`);
  }

  // Set data (JSON payload)
  const data = JSON.stringify({
    type: event.type,
    uuid: event.uuid,
    timestamp: event.timestamp,
    content: event.content,
  });
  lines.push(`data: ${data}`);

  // SSE messages are terminated by double newline
  return lines.join("\n") + "\n\n";
}

// --- Standalone HTTP server using Bun.serve ---

/**
 * Manages active SSE connections per session.
 */
const activeBridges = new Map<string, SSEBridge>();

const server = Bun.serve({
  port: 3001,

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // GET /stream/:sessionId - Start SSE stream
    const match = url.pathname.match(/^\/stream\/(.+)$/);
    if (match?.[1]) {
      const sessionId = match[1];

      const bridge = new SSEBridge(sessionId, {
        pollingIntervalMs: 200,
        includeExisting: true,
      });

      activeBridges.set(sessionId, bridge);

      const stream = bridge.createStream();

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        bridge.abort();
        activeBridges.delete(sessionId);
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`SSE Bridge server running at http://localhost:${server.port}`);
console.log("Connect to: GET /stream/:sessionId");

export { SSEBridge, formatSSEMessage };
