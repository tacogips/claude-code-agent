/**
 * Session REST API routes for daemon HTTP server.
 *
 * Provides HTTP endpoints for session management including creation,
 * listing, detail retrieval, message access, and session control.
 *
 * @module daemon/routes/sessions
 */

import type { ClaudeCodeAgent } from "../../sdk";
import type { TokenManager, AuthenticatedApp } from "../auth";

/**
 * Request body for creating a new session
 */
interface CreateSessionRequest {
  readonly projectPath: string;
  readonly prompt: string;
  readonly template?: string;
  readonly groupId?: string;
}

/**
 * Query parameters for listing sessions
 */
interface ListSessionsQuery {
  readonly projectPath?: string;
  readonly status?: string;
  readonly limit?: string;
  readonly offset?: string;
}

/**
 * Query parameters for getting session messages
 */
interface GetMessagesQuery {
  readonly parseMarkdown?: string;
}

/**
 * Register all session-related HTTP routes.
 *
 * Registers POST, GET, and control endpoints for session management.
 * All routes require authentication and appropriate permissions.
 *
 * @param app - Authenticated Elysia application instance
 * @param sdk - ClaudeCodeAgent SDK instance
 * @param tokenManager - Token manager for permission checks
 */
export function sessionRoutes(
  app: AuthenticatedApp,
  sdk: ClaudeCodeAgent,
  tokenManager: TokenManager,
): void {
  app.group("/api/sessions", (sessions) => {
    // POST /api/sessions - Create and run session
    sessions.post("/", async ({ body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:create")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:create",
        };
      }

      try {
        const req = body as CreateSessionRequest;

        // Validate required fields
        if (!req.projectPath || !req.prompt) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Missing required fields: projectPath, prompt",
          };
        }

        // For now, we'll return a minimal response
        // Full session running implementation will be in Phase 3 daemon-core plan
        set.status = 501;
        return {
          error: "Not Implemented",
          message:
            "Session creation will be implemented in daemon-core (TASK-005)",
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/sessions - List sessions
    sessions.get("/", async ({ query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const params = query as ListSessionsQuery;

        // Parse query parameters
        const projectPath = params.projectPath;
        const limit = params.limit ? parseInt(params.limit, 10) : undefined;
        const offset = params.offset ? parseInt(params.offset, 10) : undefined;

        // List sessions using SessionReader
        const sessions = await sdk.sessions.listSessions(projectPath);

        // Apply pagination if provided
        let result = sessions;
        if (offset !== undefined) {
          result = result.slice(offset);
        }
        if (limit !== undefined) {
          result = result.slice(0, limit);
        }

        // Filter by status if provided
        if (params.status) {
          result = result.filter((s) => s.status === params.status);
        }

        return result;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/sessions/:id - Get session details
    sessions.get("/:id", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const sessionId = params.id;

        // Get session details
        const session = await sdk.sessions.getSession(sessionId);

        if (!session) {
          set.status = 404;
          return {
            error: "Not Found",
            message: `Session not found: ${sessionId}`,
          };
        }

        return session;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/sessions/:id/messages - Get session messages
    sessions.get("/:id/messages", async ({ params, query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const sessionId = params.id;
        const queryParams = query as GetMessagesQuery;
        const parseMarkdown = queryParams.parseMarkdown === "true";

        // Get session messages
        const messages = await sdk.sessions.getMessages(sessionId);

        // Parse markdown if requested
        if (parseMarkdown) {
          return messages.map((msg) => ({
            ...msg,
            content:
              typeof msg.content === "string"
                ? sdk.parseMarkdown(msg.content)
                : msg.content,
          }));
        }

        return messages;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/sessions/:id/cancel - Cancel running session
    sessions.post("/:id/cancel", async ({ set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:cancel")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:cancel",
        };
      }

      try {
        // Session cancellation will be implemented in daemon-core (TASK-005)
        set.status = 501;
        return {
          error: "Not Implemented",
          message:
            "Session cancellation will be implemented in daemon-core (TASK-005)",
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/sessions/:id/pause - Pause session
    sessions.post("/:id/pause", async ({ set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:cancel")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:cancel",
        };
      }

      try {
        // Session pause will be implemented in daemon-core (TASK-005)
        set.status = 501;
        return {
          error: "Not Implemented",
          message:
            "Session pause will be implemented in daemon-core (TASK-005)",
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/sessions/:id/resume - Resume session
    sessions.post("/:id/resume", async ({ set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:create")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:create",
        };
      }

      try {
        // Session resume will be implemented in daemon-core (TASK-005)
        set.status = 501;
        return {
          error: "Not Implemented",
          message:
            "Session resume will be implemented in daemon-core (TASK-005)",
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return sessions;
  });
}
