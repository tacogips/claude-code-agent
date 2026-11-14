/**
 * Hono REST API Integration Example
 *
 * Demonstrates how to wire SessionReader and SessionUpdateReceiver
 * into Hono route handlers for building session monitoring REST APIs.
 *
 * Prerequisites:
 *   bun add hono claude-code-agent
 *
 * @example
 * ```bash
 * bun run examples/hono-rest-api.ts
 * ```
 */

import { Hono } from "hono";
import {
  SessionReader,
  SessionUpdateReceiver,
  type SessionUpdate,
  type TranscriptEvent,
} from "claude-code-agent/sdk";
import { createContainer } from "claude-code-agent/container";

// --- Setup ---

const app = new Hono();
const container = createContainer();
const reader = new SessionReader(container);

// --- Routes ---

/**
 * GET /sessions
 * List all sessions with optional filtering and pagination.
 *
 * Query parameters:
 *   - projectPath: Filter by project directory
 *   - offset: Skip N sessions (default: 0)
 *   - limit: Return at most N sessions (default: 50)
 */
app.get("/sessions", async (c) => {
  const projectPath = c.req.query("projectPath");
  const offset = parseInt(c.req.query("offset") ?? "0", 10);
  const limit = parseInt(c.req.query("limit") ?? "50", 10);

  const allSessions = await reader.listSessions(projectPath);

  // Apply pagination
  const paginated = allSessions.slice(offset, offset + limit);

  return c.json({
    sessions: paginated,
    total: allSessions.length,
    offset,
    limit,
  });
});

/**
 * GET /sessions/:id
 * Get full session details including messages.
 */
app.get("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");
  const session = await reader.getSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json(session);
});

/**
 * GET /sessions/:id/messages
 * Get messages for a specific session.
 */
app.get("/sessions/:id/messages", async (c) => {
  const sessionId = c.req.param("id");
  const messages = await reader.getMessages(sessionId);

  return c.json({ messages });
});

/**
 * GET /sessions/:id/transcript
 * Get raw transcript events with pagination.
 *
 * Query parameters:
 *   - offset: Skip N events (default: 0)
 *   - limit: Return at most N events (default: 100)
 */
app.get("/sessions/:id/transcript", async (c) => {
  const sessionId = c.req.param("id");
  const offset = parseInt(c.req.query("offset") ?? "0", 10);
  const limit = parseInt(c.req.query("limit") ?? "100", 10);

  const result = await reader.readTranscript(sessionId, { offset, limit });

  if (result.isErr()) {
    return c.json({ error: result.error.message }, 404);
  }

  return c.json(result.value);
});

/**
 * GET /sessions/:id/stream
 * Stream session updates via Server-Sent Events.
 * See sse-bridge.ts for the full SSE implementation.
 */
app.get("/sessions/:id/stream", async (c) => {
  const sessionId = c.req.param("id");

  return c.newResponse(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const receiver = new SessionUpdateReceiver(sessionId, {
          pollingIntervalMs: 300,
          includeExisting: true,
        });

        try {
          while (true) {
            const update: SessionUpdate | null = await receiver.receive();
            if (update === null) {
              break;
            }

            for (const event of update.events) {
              const data = JSON.stringify(event);
              controller.enqueue(
                encoder.encode(`data: ${data}\n\n`),
              );
            }
          }
        } finally {
          receiver.close();
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
});

// --- Start server ---

export default {
  port: 3000,
  fetch: app.fetch,
};
