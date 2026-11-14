/**
 * Integration tests for group REST API routes.
 *
 * Tests the group routes including SSE streaming endpoint.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Elysia } from "elysia";
import { groupRoutes } from "./groups";
import {
  TokenManager,
  authMiddleware,
  AuthError,
  type AuthenticatedApp,
} from "../auth";
import { SdkManager } from "../../sdk";
import { createTestContainer } from "../../container";
import type { DaemonConfig } from "../types";

describe("Group Routes - SSE Stream", () => {
  let container: ReturnType<typeof createTestContainer>;
  let sdk: SdkManager;
  let tokenManager: TokenManager;
  let app: Elysia;
  let testToken: string;
  let limitedToken: string;

  beforeEach(async () => {
    container = createTestContainer();

    // Initialize SDK and token manager
    sdk = await SdkManager.create(container);
    const config: DaemonConfig = {
      host: "127.0.0.1",
      port: 8080,
      authTokenFile: "/tmp/test-tokens.json",
      withViewer: false,
    };
    tokenManager = new TokenManager(container, config.authTokenFile);
    await tokenManager.initialize();

    // Create test tokens using TokenManager
    testToken = await tokenManager.createToken({
      name: "Test Token",
      permissions: ["session:read", "group:create"],
    });

    limitedToken = await tokenManager.createToken({
      name: "Limited Token",
      permissions: ["group:create"], // No session:read
    });

    // Create Elysia app with error handling
    app = new Elysia();

    // Add error handling middleware (matching DaemonServer)
    app.onError(({ code, error, set }) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle authentication errors
      if (error instanceof AuthError) {
        set.status = error.statusCode;
        return { error: "Unauthorized", message: errorMessage };
      }

      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: "Not Found", message: errorMessage };
      }

      if (code === "VALIDATION") {
        set.status = 400;
        return { error: "Bad Request", message: errorMessage };
      }

      if (code === "PARSE") {
        set.status = 400;
        return { error: "Bad Request", message: "Invalid JSON" };
      }

      // Internal server error
      set.status = 500;
      return { error: "Internal Server Error", message: errorMessage };
    });

    // Add auth middleware
    const authenticatedApp = app.derive(
      authMiddleware(tokenManager),
    ) as unknown as AuthenticatedApp;

    // Register group routes
    groupRoutes(authenticatedApp, sdk, tokenManager);
  });

  describe("GET /api/groups/:id/stream", () => {
    it("requires authentication", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/groups/test-group/stream"),
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({
        error: "Unauthorized",
        message: expect.stringContaining("Missing Authorization header"),
      });
    });

    it("requires session:read permission", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/groups/test-group/stream", {
          headers: {
            Authorization: `Bearer ${limitedToken}`,
          },
        }),
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({
        error: "Forbidden",
        message: "Missing permission: session:read",
      });
    });

    it("returns SSE stream with correct headers", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/groups/test-group/stream", {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
      expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    });

    it("streams events filtered by groupId", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/groups/test-group-456/stream", {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      // Verify it's a readable stream
      const body = response.body;
      expect(body).toBeInstanceOf(ReadableStream);

      // Emit a test event
      sdk.events.emit("group_started", {
        type: "group_started",
        groupId: "test-group-456",
        totalSessions: 5,
        maxConcurrent: 3,
        timestamp: new Date().toISOString(),
      });

      // Read first chunk from stream
      const reader = body!.getReader();
      const { value, done } = await reader.read();

      expect(done).toBe(false);
      expect(value).toBeDefined();

      // Decode and verify SSE format
      const text = new TextDecoder().decode(value);
      expect(text).toMatch(/^data: {.*}\n\n$/);

      // Parse the event data
      const dataMatch = text.match(/^data: (.*)\n\n$/);
      expect(dataMatch).toBeDefined();
      if (dataMatch) {
        const eventData = JSON.parse(dataMatch[1] as string);
        expect(eventData).toEqual({
          type: "group_started",
          groupId: "test-group-456",
          totalSessions: 5,
          maxConcurrent: 3,
          timestamp: expect.any(String),
        });
      }

      // Clean up
      await reader.cancel();
    });

    it("filters out events from other groups", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/groups/group-A/stream", {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body = response.body;
      expect(body).toBeDefined();

      // Create a reader
      const reader = body!.getReader();

      // Emit event for different group
      sdk.events.emit("group_started", {
        type: "group_started",
        groupId: "group-B",
        totalSessions: 3,
        maxConcurrent: 2,
        timestamp: new Date().toISOString(),
      });

      // Wait briefly for event to potentially propagate
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Try to read - should timeout because event was filtered out
      const readPromise = reader.read();
      const timeoutPromise = new Promise<{ value: undefined; done: true }>(
        (resolve) =>
          setTimeout(() => resolve({ value: undefined, done: true }), 100),
      );

      const result = await Promise.race([readPromise, timeoutPromise]);

      // If we got a timeout (done: true), that's expected - event was filtered
      // If we got data, it should NOT be the group-B event
      if (result.value) {
        const text = new TextDecoder().decode(result.value);
        expect(text).not.toContain("group-B");
      }

      // Clean up
      await reader.cancel();
    });
  });
});
