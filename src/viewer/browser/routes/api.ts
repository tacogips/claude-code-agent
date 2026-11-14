/**
 * REST API routes for browser viewer.
 *
 * Provides HTTP endpoints for sessions, tasks, projects, and queues,
 * using the ClaudeCodeAgent SDK to query data.
 *
 * @module viewer/browser/routes/api
 */

import type { Elysia } from "elysia";
import type { ClaudeCodeAgent } from "../../../sdk";
import type { Session, SessionMetadata } from "../../../types/session";
import type { Message } from "../../../types/message";
import type { Task } from "../../../types/task";
import type { CommandQueue } from "../../../repository/queue-repository";
import { createTaggedLogger } from "../../../logger";

const logger = createTaggedLogger("api");

/**
 * Response wrapper for sessions list endpoint.
 */
interface SessionsListResponse {
  readonly sessions: readonly SessionMetadata[];
}

/**
 * Response wrapper for session detail endpoint.
 */
interface SessionDetailResponse {
  readonly session: Session;
}

/**
 * Response wrapper for messages endpoint.
 */
interface MessagesResponse {
  readonly messages: readonly Message[];
}

/**
 * Response wrapper for tasks endpoint.
 */
interface TasksResponse {
  readonly tasks: readonly Task[];
}

/**
 * Response wrapper for projects endpoint.
 */
interface ProjectsResponse {
  readonly projects: readonly string[];
}

/**
 * Response wrapper for queues list endpoint.
 */
interface QueuesListResponse {
  readonly queues: readonly CommandQueue[];
}

/**
 * Response wrapper for queue detail endpoint.
 */
interface QueueDetailResponse {
  readonly queue: CommandQueue;
}

/**
 * Error response for API endpoints.
 */
interface ErrorResponse {
  readonly error: string;
  readonly message: string;
}

/**
 * Setup REST API routes for the browser viewer.
 *
 * Configures HTTP endpoints for sessions, tasks, projects, and queues.
 * All routes use the ClaudeCodeAgent SDK to retrieve data.
 *
 * Routes:
 * - GET /api/sessions - List all sessions
 * - GET /api/sessions/:id - Get session detail
 * - GET /api/sessions/:id/messages - Get session messages
 * - GET /api/tasks - Get active tasks from all sessions
 * - GET /api/projects - List available projects
 * - GET /api/queues - List command queues
 * - GET /api/queues/:id - Get queue detail
 *
 * @param app - Elysia application instance
 * @param sdk - ClaudeCodeAgent SDK instance
 *
 * @example
 * ```typescript
 * const app = new Elysia();
 * const sdk = await ClaudeCodeAgent.create(container);
 * setupApiRoutes(app, sdk);
 * ```
 */
export function setupApiRoutes(app: Elysia, sdk: ClaudeCodeAgent): void {
  /**
   * GET /api/sessions - List all sessions
   *
   * Returns an array of session metadata objects without full message history.
   * Sessions are retrieved from the Claude projects directory.
   *
   * @response 200 - Success with sessions array
   * @response 500 - Internal server error
   */
  app.get("/api/sessions", async ({ set }) => {
    try {
      logger.debug("Listing sessions");
      const sessions = await sdk.sessions.listSessions();

      const response: SessionsListResponse = {
        sessions,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to list sessions:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to list sessions: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  /**
   * GET /api/sessions/:id - Get session detail
   *
   * Returns a complete session object including full message history.
   *
   * @param id - Session ID
   * @response 200 - Success with session object
   * @response 404 - Session not found
   * @response 500 - Internal server error
   */
  app.get("/api/sessions/:id", async ({ params, set }) => {
    try {
      const sessionId = params.id;
      logger.debug(`Getting session ${sessionId}`);

      const session = await sdk.sessions.getSession(sessionId);

      if (session === null) {
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: "Not Found",
          message: `Session ${sessionId} not found`,
        };
        return errorResponse;
      }

      const response: SessionDetailResponse = {
        session,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to get session:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to get session: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  /**
   * GET /api/sessions/:id/messages - Get session messages
   *
   * Returns the message history for a specific session.
   * Each message can be parsed using sdk.parseMarkdown() if needed.
   *
   * @param id - Session ID
   * @response 200 - Success with messages array
   * @response 404 - Session not found
   * @response 500 - Internal server error
   */
  app.get("/api/sessions/:id/messages", async ({ params, set }) => {
    try {
      const sessionId = params.id;
      logger.debug(`Getting messages for session ${sessionId}`);

      const messages = await sdk.sessions.getMessages(sessionId);

      // If messages array is empty, check if session exists
      if (messages.length === 0) {
        const session = await sdk.sessions.getSession(sessionId);
        if (session === null) {
          set.status = 404;
          const errorResponse: ErrorResponse = {
            error: "Not Found",
            message: `Session ${sessionId} not found`,
          };
          return errorResponse;
        }
      }

      const response: MessagesResponse = {
        messages,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to get messages:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to get messages: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  /**
   * GET /api/tasks - Get active tasks
   *
   * Returns tasks from all active sessions.
   * Tasks are extracted from session objects.
   *
   * @response 200 - Success with tasks array
   * @response 500 - Internal server error
   */
  app.get("/api/tasks", async ({ set }) => {
    try {
      logger.debug("Getting active tasks");

      // Get all sessions
      const sessions = await sdk.sessions.listSessions();

      // Collect tasks from all sessions
      const allTasks: Task[] = [];

      for (const sessionMeta of sessions) {
        // Only include tasks from active sessions
        if (sessionMeta.status === "active") {
          const session = await sdk.sessions.getSession(sessionMeta.id);
          if (session !== null && session.tasks.length > 0) {
            allTasks.push(...session.tasks);
          }
        }
      }

      const response: TasksResponse = {
        tasks: allTasks,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to get tasks:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to get tasks: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  /**
   * GET /api/projects - List projects
   *
   * Returns a list of unique project paths from all sessions.
   * Projects are extracted from session metadata.
   *
   * @response 200 - Success with projects array
   * @response 500 - Internal server error
   */
  app.get("/api/projects", async ({ set }) => {
    try {
      logger.debug("Listing projects");

      // Get all sessions
      const sessions = await sdk.sessions.listSessions();

      // Extract unique project paths
      const projectSet = new Set<string>();
      for (const session of sessions) {
        projectSet.add(session.projectPath);
      }

      const projects = Array.from(projectSet).sort();

      const response: ProjectsResponse = {
        projects,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to list projects:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to list projects: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  /**
   * GET /api/queues - List command queues
   *
   * Returns an array of all command queues.
   * Queues can be filtered and sorted using query parameters (future enhancement).
   *
   * @response 200 - Success with queues array
   * @response 500 - Internal server error
   */
  app.get("/api/queues", async ({ set }) => {
    try {
      logger.debug("Listing queues");

      const queues = await sdk.queues.listQueues();

      const response: QueuesListResponse = {
        queues,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to list queues:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to list queues: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  /**
   * GET /api/queues/:id - Get queue detail
   *
   * Returns a complete queue object including all commands.
   *
   * @param id - Queue ID
   * @response 200 - Success with queue object
   * @response 404 - Queue not found
   * @response 500 - Internal server error
   */
  app.get("/api/queues/:id", async ({ params, set }) => {
    try {
      const queueId = params.id;
      logger.debug(`Getting queue ${queueId}`);

      const queue = await sdk.queues.getQueue(queueId);

      if (queue === null) {
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: "Not Found",
          message: `Queue ${queueId} not found`,
        };
        return errorResponse;
      }

      const response: QueueDetailResponse = {
        queue,
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to get queue:", errorMessage);

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: `Failed to get queue: ${errorMessage}`,
      };
      return errorResponse;
    }
  });

  logger.debug("API routes configured");
}
