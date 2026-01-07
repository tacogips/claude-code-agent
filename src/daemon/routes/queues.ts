/**
 * Command Queue REST API routes for daemon HTTP server.
 *
 * Provides HTTP endpoints for command queue management including queue CRUD,
 * command management, and queue execution control.
 *
 * @module daemon/routes/queues
 */

import type { ClaudeCodeAgent } from "../../sdk";
import type { TokenManager, AuthenticatedApp } from "../auth";
import type { SessionMode } from "../../sdk/queue/types";
import type { QueueStatus } from "../../repository/queue-repository";

/**
 * Request body for creating a new queue
 */
interface CreateQueueRequest {
  readonly name?: string;
  readonly projectPath: string;
}

/**
 * Query parameters for listing queues
 */
interface ListQueuesQuery {
  readonly projectPath?: string;
  readonly status?: string;
}

/**
 * Request body for adding a command to queue
 */
interface AddCommandRequest {
  readonly prompt: string;
  readonly sessionMode?: SessionMode;
  readonly position?: number;
}

/**
 * Request body for updating a command
 */
interface UpdateCommandRequest {
  readonly prompt?: string;
  readonly sessionMode?: SessionMode;
}

/**
 * Register all queue-related HTTP routes.
 *
 * Registers endpoints for queue CRUD, command management, and queue control.
 * All routes require authentication and queue:* permission.
 *
 * @param app - Authenticated Elysia application instance
 * @param sdk - ClaudeCodeAgent SDK instance
 * @param tokenManager - Token manager for permission checks
 */
export function queueRoutes(
  app: AuthenticatedApp,
  sdk: ClaudeCodeAgent,
  tokenManager: TokenManager,
): void {
  app.group("/api/queues", (queues) => {
    // POST /api/queues - Create command queue
    queues.post("/", async ({ body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const req = body as CreateQueueRequest;

        // Validate required fields
        if (!req.projectPath) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Missing required field: projectPath",
          };
        }

        // Create queue using QueueManager
        const queue = await sdk.queues.createQueue({
          projectPath: req.projectPath,
          name: req.name,
        });

        return queue;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/queues - List queues
    queues.get("/", async ({ query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const params = query as ListQueuesQuery;

        // Build filter from query parameters
        const filter: { projectPath?: string; status?: QueueStatus } = {};
        if (params.projectPath !== undefined) {
          filter.projectPath = params.projectPath;
        }
        if (params.status !== undefined) {
          // Validate status value
          const validStatuses: QueueStatus[] = [
            "pending",
            "running",
            "paused",
            "stopped",
            "completed",
            "failed",
          ];
          if (validStatuses.includes(params.status as QueueStatus)) {
            filter.status = params.status as QueueStatus;
          }
        }

        // List queues with optional filters
        const result = await sdk.queues.listQueues({
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        });

        return result;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/queues/:id - Get queue details
    queues.get("/:id", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;

        // Get queue details
        const queue = await sdk.queues.getQueue(queueId);

        if (!queue) {
          set.status = 404;
          return { error: "Not Found", message: `Queue not found: ${queueId}` };
        }

        return queue;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/queues/:id/commands - Add command to queue
    queues.post("/:id/commands", async ({ params, body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;
        const req = body as AddCommandRequest;

        // Validate required fields
        if (!req.prompt) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Missing required field: prompt",
          };
        }

        // Add command to queue
        const command = await sdk.queues.addCommand(queueId, {
          prompt: req.prompt,
          sessionMode: req.sessionMode ?? "continue",
          position: req.position,
        });

        return command;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // PUT /api/queues/:id/commands/:index - Update command
    queues.put("/:id/commands/:index", async ({ params, body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;
        const index = parseInt(params.index, 10);
        const req = body as UpdateCommandRequest;

        // Validate index
        if (isNaN(index) || index < 0) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Invalid command index",
          };
        }

        // At least one field must be provided
        if (!req.prompt && !req.sessionMode) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "At least one field must be provided: prompt, sessionMode",
          };
        }

        // Update command
        const command = await sdk.queues.updateCommand(queueId, index, req);

        return command;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // DELETE /api/queues/:id/commands/:index - Remove command
    queues.delete("/:id/commands/:index", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;
        const index = parseInt(params.index, 10);

        // Validate index
        if (isNaN(index) || index < 0) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Invalid command index",
          };
        }

        // Remove command
        await sdk.queues.removeCommand(queueId, index);

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/queues/:id/run - Run queue
    queues.post("/:id/run", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;

        // Check if queue exists
        const queue = await sdk.queues.getQueue(queueId);
        if (!queue) {
          set.status = 404;
          return { error: "Not Found", message: `Queue not found: ${queueId}` };
        }

        // Run queue using QueueRunner - returns QueueResult
        const result = await sdk.queueRunner.run(queueId);

        return { success: true, result };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/queues/:id/pause - Pause queue
    queues.post("/:id/pause", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;

        // Check if queue exists
        const queue = await sdk.queues.getQueue(queueId);
        if (!queue) {
          set.status = 404;
          return { error: "Not Found", message: `Queue not found: ${queueId}` };
        }

        // Pause queue using QueueRunner
        await sdk.queueRunner.pause(queueId);

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // POST /api/queues/:id/resume - Resume queue
    queues.post("/:id/resume", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "queue:*")) {
        set.status = 403;
        return { error: "Forbidden", message: "Missing permission: queue:*" };
      }

      try {
        const queueId = params.id;

        // Check if queue exists
        const queue = await sdk.queues.getQueue(queueId);
        if (!queue) {
          set.status = 404;
          return { error: "Not Found", message: `Queue not found: ${queueId}` };
        }

        // Resume queue using QueueRunner - returns QueueResult
        const result = await sdk.queueRunner.resume(queueId);

        return { success: true, result };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return queues;
  });
}
