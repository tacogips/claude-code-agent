/**
 * Activity REST API routes for daemon HTTP server.
 *
 * Provides HTTP endpoints for querying session activity status
 * including listing all activities and retrieving specific session status.
 *
 * @module daemon/routes/activity
 */

import type { ActivityManager } from "../../sdk/activity/manager";
import type { TokenManager, AuthenticatedApp } from "../auth";
import type { ActivityStatus } from "../../types/activity";

/**
 * Query parameters for listing activity entries
 */
interface ListActivityQuery {
  readonly status?: string;
}

/**
 * Register all activity-related HTTP routes.
 *
 * Registers endpoints for activity querying.
 * All routes require authentication and session:read permission.
 *
 * @param app - Authenticated Elysia application instance
 * @param manager - ActivityManager instance
 * @param tokenManager - Token manager for permission checks
 */
export function activityRoutes(
  app: AuthenticatedApp,
  manager: ActivityManager,
  tokenManager: TokenManager,
): void {
  app.group("/api/activity", (activity) => {
    // GET /api/activity - List all activity entries
    activity.get("/", async ({ query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const params = query as ListActivityQuery;

        // Build filter from query parameters
        const filter: { status?: ActivityStatus } | undefined =
          params.status !== undefined
            ? {
                status: params.status as ActivityStatus,
              }
            : undefined;

        // List activities with optional status filter
        const entries = await manager.list(filter);

        return { entries };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/activity/:sessionId - Get activity for specific session
    activity.get("/:sessionId", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const sessionId = params.sessionId;

        // Get activity status
        const entry = await manager.getStatus(sessionId);

        if (entry === null) {
          set.status = 404;
          return {
            error: "not_found",
            message: `Session not found: ${sessionId}`,
          };
        }

        return entry;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return activity;
  });
}
