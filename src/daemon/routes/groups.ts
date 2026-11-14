/**
 * Session Group REST API routes for daemon HTTP server.
 *
 * Provides HTTP endpoints for session group management including creation,
 * listing, detail retrieval, and group execution control.
 *
 * @module daemon/routes/groups
 */

import type { SdkManager } from "../../sdk";
import type { TokenManager, AuthenticatedApp } from "../auth";
import { createSSEStream } from "../sse";

/**
 * Request body for creating a new session group
 */
interface CreateGroupRequest {
  readonly name: string;
  readonly description?: string;
  readonly slug: string;
}

/**
 * Query parameters for listing groups
 */
interface ListGroupsQuery {
  readonly status?: string;
  readonly limit?: string;
}

/**
 * Request body for running a group
 */
interface RunGroupRequest {
  readonly concurrent?: number;
  readonly respectDependencies?: boolean;
}

/**
 * Register all group-related HTTP routes.
 *
 * Registers POST, GET, and control endpoints for session group management.
 * All routes require authentication and appropriate permissions.
 *
 * @param app - Authenticated Elysia application instance
 * @param sdk - SdkManager SDK instance
 * @param tokenManager - Token manager for permission checks
 */
export function groupRoutes(
  app: AuthenticatedApp,
  sdk: SdkManager,
  tokenManager: TokenManager,
): void {
  app.group("/api/groups", (groups) => {
    // POST /api/groups - Create session group
    groups.post("/", async ({ body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "group:create")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: group:create",
        };
      }

      try {
        const req = body as CreateGroupRequest;

        // Validate required fields
        if (!req.name || !req.slug) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Missing required fields: name, slug",
          };
        }

        // Create group using GroupManager
        const group = await sdk.groups.createGroup({
          name: req.name,
          description: req.description,
        });

        return group;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/groups - List groups
    groups.get("/", async ({ query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const params = query as ListGroupsQuery;

        // List all groups
        const allGroups = await sdk.groups.listGroups();

        // Apply filters
        let result = allGroups;

        // Filter by status if provided
        if (params.status) {
          result = result.filter((g) => g.status === params.status);
        }

        // Apply limit if provided
        if (params.limit) {
          const limit = parseInt(params.limit, 10);
          result = result.slice(0, limit);
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

    // GET /api/groups/:id - Get group details
    groups.get("/:id", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const groupId = params.id;

        // Get group details
        const group = await sdk.groups.getGroup(groupId);

        if (!group) {
          set.status = 404;
          return { error: "Not Found", message: `Group not found: ${groupId}` };
        }

        return group;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/groups/:id/run - Run session group
    groups.post("/:id/run", async ({ params, body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "group:run")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: group:run" };
      }

      try {
        const groupId = params.id;
        const req = body as RunGroupRequest;

        // Get the group
        const group = await sdk.groups.getGroup(groupId);
        if (!group) {
          set.status = 404;
          return { error: "Not Found", message: `Group not found: ${groupId}` };
        }

        // Run group using GroupRunner (pass group object, not ID)
        await sdk.groupRunner.run(group, {
          maxConcurrent: req.concurrent ?? 1,
          respectDependencies: req.respectDependencies ?? true,
        });

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/groups/:id/pause - Pause group
    groups.post("/:id/pause", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "group:run")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: group:run" };
      }

      try {
        const groupId = params.id;

        // Check if group exists
        const group = await sdk.groups.getGroup(groupId);
        if (!group) {
          set.status = 404;
          return { error: "Not Found", message: `Group not found: ${groupId}` };
        }

        // Pause group using GroupRunner
        await sdk.groupRunner.pause();

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/groups/:id/resume - Resume group
    groups.post("/:id/resume", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "group:run")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: group:run" };
      }

      try {
        const groupId = params.id;

        // Check if group exists
        const group = await sdk.groups.getGroup(groupId);
        if (!group) {
          set.status = 404;
          return { error: "Not Found", message: `Group not found: ${groupId}` };
        }

        // Resume group using GroupRunner
        await sdk.groupRunner.resume();

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/groups/:id/stream - SSE stream of group events
    groups.get("/:id/stream", ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "session:read")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: session:read",
        };
      }

      try {
        const groupId = params.id;

        // Create SSE stream filtered by groupId
        return createSSEStream(sdk.events, {
          groupId,
        });
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return groups;
  });
}
