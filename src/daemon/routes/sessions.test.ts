/**
 * Integration tests for session REST API routes.
 *
 * Tests the session routes including SSE streaming endpoint.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Elysia } from "elysia";
import { sessionRoutes } from "./sessions";
import {
  TokenManager,
  authMiddleware,
  AuthError,
  type AuthenticatedApp,
} from "../auth";
import { SdkManager } from "../../sdk";
import { createTestContainer } from "../../container";
import { MockFileSystem } from "../../test/mocks/filesystem";
import type { DaemonConfig } from "../types";

describe("Session Routes - SSE Stream", () => {
  let container: ReturnType<typeof createTestContainer>;
  let fs: MockFileSystem;
  let sdk: SdkManager;
  let tokenManager: TokenManager;
  let app: Elysia;
  let testToken: string;
  let limitedToken: string;

  beforeEach(async () => {
    container = createTestContainer();
    fs = container.fileSystem as MockFileSystem;

    // Initialize SDK and token manager
    sdk = await SdkManager.create(container);
    const config: DaemonConfig = {
      host: "127.0.0.1",
      port: 8080,
      authTokenFile: "/tmp/test-tokens.json",
    };
    tokenManager = new TokenManager(container, config.authTokenFile);
    await tokenManager.initialize();

    // Create test tokens using TokenManager
    testToken = await tokenManager.createToken({
      name: "Test Token",
      permissions: ["session:read", "session:create"],
    });

    limitedToken = await tokenManager.createToken({
      name: "Limited Token",
      permissions: ["session:create"], // No session:read
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

    // Register session routes
    sessionRoutes(authenticatedApp, sdk, tokenManager);
  });

  describe("GET /api/sessions/:id/stream", () => {
    it("requires authentication", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/test-session/stream"),
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
        new Request("http://localhost/api/sessions/test-session/stream", {
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
        new Request("http://localhost/api/sessions/test-session/stream", {
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

    it("streams events filtered by sessionId", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/test-session-123/stream", {
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
      sdk.events.emit("session_started", {
        type: "session_started",
        sessionId: "test-session-123",
        projectPath: "/test/project",
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
          type: "session_started",
          sessionId: "test-session-123",
          projectPath: "/test/project",
          timestamp: expect.any(String),
        });
      }

      // Clean up
      await reader.cancel();
    });

    it("filters out events from other sessions", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/session-A/stream", {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const body = response.body;
      expect(body).toBeInstanceOf(ReadableStream);

      // Emit event for different session
      sdk.events.emit("session_started", {
        type: "session_started",
        sessionId: "session-B", // Different session
        projectPath: "/test/project-b",
        timestamp: new Date().toISOString(),
      });

      // Emit event for target session
      sdk.events.emit("session_started", {
        type: "session_started",
        sessionId: "session-A", // Target session
        projectPath: "/test/project-a",
        timestamp: new Date().toISOString(),
      });

      // Read from stream
      const reader = body!.getReader();

      // Should only receive the event for session-A (not session-B)
      const { value, done } = await reader.read();
      expect(done).toBe(false);

      const text = new TextDecoder().decode(value);
      const dataMatch = text.match(/^data: (.*)\n\n$/);
      if (dataMatch) {
        const eventData = JSON.parse(dataMatch[1] as string);
        expect(eventData.sessionId).toBe("session-A");
      }

      // Clean up
      await reader.cancel();
    });
  });

  describe("GET /api/sessions/:id/messages", () => {
    it("passes excludeToolMessages=true to SDK getMessages", async () => {
      const getMessagesSpy = vi
        .spyOn(sdk.sessions, "getMessages")
        .mockResolvedValueOnce([]);

      const response = await app.handle(
        new Request(
          "http://localhost/api/sessions/test-session/messages?excludeToolMessages=true",
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
          },
        ),
      );

      expect(response.status).toBe(200);
      expect(getMessagesSpy).toHaveBeenCalledWith("test-session", {
        excludeToolMessages: true,
      });
    });

    it("returns only non-tool messages when excludeToolMessages=true", async () => {
      const home = process.env["HOME"] ?? "";
      const sessionPath = `${home}/.claude/projects/test-session/session.jsonl`;
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-1",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "start" },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-2",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:01Z",
          message: {
            role: "assistant",
            content: [
              { type: "tool_use", id: "tool-1", name: "Read", input: {} },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-3",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:02Z",
          message: { role: "assistant", content: "done" },
        }),
      ].join("\n");
      fs.setFile(sessionPath, sessionContent);

      const response = await app.handle(
        new Request(
          "http://localhost/api/sessions/test-session/messages?excludeToolMessages=true",
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
          },
        ),
      );

      expect(response.status).toBe(200);
      const messages = (await response.json()) as Array<{ id: string }>;
      expect(messages.map((message) => message.id)).toEqual(["msg-1", "msg-3"]);
    });

    it("filters tool_result and malformed tool blocks with parseMarkdown=true", async () => {
      const home = process.env["HOME"] ?? "";
      const sessionPath = `${home}/.claude/projects/test-session/session.jsonl`;
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-1",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "## start" },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-2",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:01Z",
          message: {
            role: "assistant",
            content: [{ type: "tool_use", name: "Read" }],
          },
        }),
        JSON.stringify({
          type: "user",
          uuid: "msg-3",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:02Z",
          message: {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "tool-1", content: "OK" },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-4",
          sessionId: "test-session",
          timestamp: "2026-01-01T00:00:03Z",
          message: { role: "assistant", content: "done" },
        }),
      ].join("\n");
      fs.setFile(sessionPath, sessionContent);

      const response = await app.handle(
        new Request(
          "http://localhost/api/sessions/test-session/messages?excludeToolMessages=true&parseMarkdown=true",
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
          },
        ),
      );

      expect(response.status).toBe(200);
      const messages = (await response.json()) as Array<{
        id: string;
        content: unknown;
      }>;
      expect(messages.map((message) => message.id)).toEqual(["msg-1", "msg-4"]);
      expect(typeof messages[0]?.content).toBe("object");
      expect(typeof messages[1]?.content).toBe("object");
    });
  });
});
