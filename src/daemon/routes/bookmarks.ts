/**
 * Bookmark REST API routes for daemon HTTP server.
 *
 * Provides HTTP endpoints for bookmark management including creation,
 * listing, retrieval, search, and deletion.
 *
 * @module daemon/routes/bookmarks
 */

import type { SdkManager } from "../../sdk";
import type { TokenManager, AuthenticatedApp } from "../auth";

/**
 * Request body for creating a new bookmark
 */
interface CreateBookmarkRequest {
  readonly sessionId: string;
  readonly messageId?: string;
  readonly name: string;
  readonly tags?: readonly string[];
}

/**
 * Query parameters for listing bookmarks
 */
interface ListBookmarksQuery {
  readonly tag?: string;
  readonly sessionId?: string;
}

/**
 * Query parameters for searching bookmarks
 */
interface SearchBookmarksQuery {
  readonly q: string;
  readonly metadataOnly?: string;
}

/**
 * Register all bookmark-related HTTP routes.
 *
 * Registers endpoints for bookmark CRUD and search operations.
 * All routes require authentication and bookmark:* permission.
 *
 * @param app - Authenticated Elysia application instance
 * @param sdk - SdkManager SDK instance
 * @param tokenManager - Token manager for permission checks
 */
export function bookmarkRoutes(
  app: AuthenticatedApp,
  sdk: SdkManager,
  tokenManager: TokenManager,
): void {
  app.group("/api/bookmarks", (bookmarks) => {
    // POST /api/bookmarks - Create bookmark
    bookmarks.post("/", async ({ body, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "bookmark:*")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: bookmark:*",
        };
      }

      try {
        const req = body as CreateBookmarkRequest;

        // Validate required fields
        if (!req.sessionId || !req.name) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Missing required fields: sessionId, name",
          };
        }

        // Create bookmark using BookmarkManager
        const bookmark = await sdk.bookmarks.add({
          type: req.messageId ? "message" : "session",
          sessionId: req.sessionId,
          messageId: req.messageId,
          name: req.name,
          tags: req.tags,
        });

        return bookmark;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/bookmarks - List bookmarks
    bookmarks.get("/", async ({ query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "bookmark:*")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: bookmark:*",
        };
      }

      try {
        const params = query as ListBookmarksQuery;

        // Build filter object
        const filter: { tag?: string; sessionId?: string } = {};
        if (params.tag) {
          filter.tag = params.tag;
        }
        if (params.sessionId) {
          filter.sessionId = params.sessionId;
        }

        // List bookmarks with filters
        const result = await sdk.bookmarks.list(filter);

        return result;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/bookmarks/search - Search bookmarks
    // NOTE: This must be registered BEFORE /:id to avoid route conflict
    bookmarks.get("/search", async ({ query, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "bookmark:*")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: bookmark:*",
        };
      }

      try {
        const params = query as SearchBookmarksQuery;

        // Validate required query parameter
        if (!params.q) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Missing required query parameter: q",
          };
        }

        // Search bookmarks
        const result = await sdk.bookmarks.search(params.q, {
          metadataOnly: params.metadataOnly === "true",
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

    // GET /api/bookmarks/:id - Get bookmark
    bookmarks.get("/:id", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "bookmark:*")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: bookmark:*",
        };
      }

      try {
        const bookmarkId = params.id;

        // Get bookmark details
        const bookmark = await sdk.bookmarks.get(bookmarkId);

        if (!bookmark) {
          set.status = 404;
          return {
            error: "Not Found",
            message: `Bookmark not found: ${bookmarkId}`,
          };
        }

        return bookmark;
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // GET /api/bookmarks/:id/content - Get bookmark with message content
    bookmarks.get("/:id/content", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "bookmark:*")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: bookmark:*",
        };
      }

      try {
        const bookmarkId = params.id;

        // Get bookmark with content
        const result = await sdk.bookmarks.getWithContent(bookmarkId);

        if (!result) {
          set.status = 404;
          return {
            error: "Not Found",
            message: `Bookmark not found: ${bookmarkId}`,
          };
        }

        return {
          bookmark: result.bookmark,
          content: result.content,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // DELETE /api/bookmarks/:id - Delete bookmark
    bookmarks.delete("/:id", async ({ params, set, token }) => {
      // Check permission
      if (!tokenManager.hasPermission(token, "bookmark:*")) {
        set.status = 403;
        return {
          error: "Forbidden",
          message: "Missing permission: bookmark:*",
        };
      }

      try {
        const bookmarkId = params.id;

        // Delete bookmark
        const deleted = await sdk.bookmarks.delete(bookmarkId);

        if (!deleted) {
          set.status = 404;
          return {
            error: "Not Found",
            message: `Bookmark not found: ${bookmarkId}`,
          };
        }

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return bookmarks;
  });
}
