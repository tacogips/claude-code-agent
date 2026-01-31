/**
 * Mock server for E2E testing.
 *
 * Provides a lightweight HTTP server that serves fixture data
 * for the browser viewer E2E tests.
 *
 * @module tests/e2e/lib/mock-server
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { Session, SessionMetadata } from "../../../src/types/session";
import type { CommandQueue } from "../../../src/repository/queue-repository";
import {
  allSessions,
  sessionMetadataList,
} from "../fixtures/sessions";
import { allQueues } from "../fixtures/queues";

/**
 * Mock server configuration.
 */
export interface MockServerConfig {
  /** Port to listen on */
  readonly port: number;
  /** Path to static files (built Svelte app) */
  readonly staticPath: string;
  /** Custom sessions (overrides fixtures) */
  readonly sessions?: readonly Session[];
  /** Custom queues (overrides fixtures) */
  readonly queues?: readonly CommandQueue[];
}

/**
 * Mock server instance.
 */
export interface MockServerInstance {
  /** Server URL */
  readonly url: string;
  /** Stop the server */
  stop(): Promise<void>;
}

/**
 * Create and start a mock server for E2E testing.
 */
export async function createMockServer(
  config: MockServerConfig,
): Promise<MockServerInstance> {
  const sessions = config.sessions ?? allSessions;
  const queues = config.queues ?? allQueues;

  // Create session metadata from sessions
  const sessionMeta: readonly SessionMetadata[] = sessions.map((s) => ({
    id: s.id,
    projectPath: s.projectPath,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messages.length,
    tokenUsage: s.tokenUsage,
    costUsd: s.costUsd,
  }));

  // Create the Elysia app
  const app = new Elysia()
    .use(cors())
    // API routes
    .get("/api/sessions", () => ({
      sessions: sessionMeta,
    }))
    .get("/api/sessions/:id", ({ params, set }) => {
      const session = sessions.find((s) => s.id === params.id);
      if (session === undefined) {
        set.status = 404;
        return { error: "Not Found", message: `Session ${params.id} not found` };
      }
      return { session };
    })
    .get("/api/sessions/:id/messages", ({ params, set }) => {
      const session = sessions.find((s) => s.id === params.id);
      if (session === undefined) {
        set.status = 404;
        return { error: "Not Found", message: `Session ${params.id} not found` };
      }
      return { messages: session.messages };
    })
    .get("/api/tasks", () => {
      const allTasks = sessions
        .filter((s) => s.status === "active")
        .flatMap((s) => s.tasks);
      return { tasks: allTasks };
    })
    .get("/api/projects", () => {
      const projectSet = new Set(sessions.map((s) => s.projectPath));
      return { projects: Array.from(projectSet).sort() };
    })
    .get("/api/queues", () => ({
      queues,
    }))
    .get("/api/queues/:id", ({ params, set }) => {
      const queue = queues.find((q) => q.id === params.id);
      if (queue === undefined) {
        set.status = 404;
        return { error: "Not Found", message: `Queue ${params.id} not found` };
      }
      return { queue };
    })
    // WebSocket endpoint (mock - just echo)
    .ws("/ws", {
      message(_ws, _message) {
        // Echo messages for testing
      },
    });

  // Serve static files if path exists
  try {
    await fs.access(config.staticPath);

    // Read and serve index.html for SPA routing
    const indexHtml = await fs.readFile(
      path.join(config.staticPath, "index.html"),
      "utf-8",
    );

    // Serve static assets
    app.get("/_app/*", async ({ params, set }) => {
      const filePath = path.join(config.staticPath, "_app", params["*"]);
      try {
        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = getContentType(ext);
        set.headers["content-type"] = contentType;
        return content;
      } catch {
        set.status = 404;
        return "Not found";
      }
    });

    // Serve other static files
    app.get("/favicon.png", async ({ set }) => {
      try {
        const content = await fs.readFile(path.join(config.staticPath, "favicon.png"));
        set.headers["content-type"] = "image/png";
        return content;
      } catch {
        set.status = 404;
        return "Not found";
      }
    });

    // SPA fallback - serve index.html for all other routes
    app.get("*", ({ set }) => {
      set.headers["content-type"] = "text/html";
      return indexHtml;
    });
  } catch {
    // Static path doesn't exist, serve a placeholder
    app.get("*", () => {
      return `<!DOCTYPE html>
<html>
<head><title>Mock Server</title></head>
<body>
  <h1>Mock Server</h1>
  <p>Static files not found at: ${config.staticPath}</p>
  <p>API endpoints are available at /api/*</p>
</body>
</html>`;
    });
  }

  // Start the server
  const server = app.listen(config.port);

  const url = `http://localhost:${config.port}`;

  return {
    url,
    async stop() {
      await server.stop();
    },
  };
}

/**
 * Get content type from file extension.
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
  };
  return types[ext] ?? "application/octet-stream";
}
