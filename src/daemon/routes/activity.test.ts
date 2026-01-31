/**
 * Tests for Activity REST API routes.
 *
 * @module daemon/routes/activity.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { Elysia } from "elysia";
import type { ActivityManager } from "../../sdk/activity/manager";
import type { ActivityEntry } from "../../types/activity";
import { activityRoutes } from "./activity";
import type { TokenManager, AuthenticatedApp } from "../auth";
import type { ApiToken } from "../types";

/**
 * Mock ActivityManager for testing
 */
function createMockActivityManager(): ActivityManager {
  const mockEntries: ActivityEntry[] = [
    {
      sessionId: "session-1",
      status: "working",
      projectPath: "/projects/app1",
      lastUpdated: "2026-01-31T10:00:00.000Z",
    },
    {
      sessionId: "session-2",
      status: "idle",
      projectPath: "/projects/app2",
      lastUpdated: "2026-01-31T09:00:00.000Z",
    },
    {
      sessionId: "session-3",
      status: "waiting_user_response",
      projectPath: "/projects/app3",
      lastUpdated: "2026-01-31T11:00:00.000Z",
    },
  ];

  return {
    getStatus: async (sessionId: string): Promise<ActivityEntry | null> => {
      const entry = mockEntries.find((e) => e.sessionId === sessionId);
      return entry ?? null;
    },

    list: async (filter?: { status?: string }): Promise<ActivityEntry[]> => {
      if (filter?.status !== undefined) {
        return mockEntries.filter((e) => e.status === filter.status);
      }
      return mockEntries;
    },
  } as ActivityManager;
}

/**
 * Mock TokenManager for testing
 */
function createMockTokenManager(): TokenManager {
  return {
    hasPermission: (): boolean => {
      // Mock token with all permissions
      return true;
    },
  } as unknown as TokenManager;
}

/**
 * Create test app with activity routes
 */
function createTestApp(
  manager: ActivityManager,
  tokenManager: TokenManager,
): Elysia {
  const app = new Elysia();

  // Add mock authentication - attach token to context
  const authenticatedApp = app.derive(() => ({
    token: {
      id: "test-token",
      name: "Test Token",
      hash: "mock-hash",
      permissions: ["session:read"],
      createdAt: "2026-01-31T00:00:00.000Z",
      lastUsedAt: "2026-01-31T00:00:00.000Z",
    } as ApiToken,
  })) as unknown as AuthenticatedApp;

  // Register activity routes
  activityRoutes(authenticatedApp, manager, tokenManager);

  return app;
}

describe("Activity Routes", () => {
  let app: Elysia;
  let manager: ActivityManager;
  let tokenManager: TokenManager;

  beforeEach(() => {
    manager = createMockActivityManager();
    tokenManager = createMockTokenManager();
    app = createTestApp(manager, tokenManager);
  });

  describe("GET /api/activity", () => {
    test("lists all activity entries", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/activity"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { entries: ActivityEntry[] };
      expect(data.entries).toHaveLength(3);
      expect(data.entries[0]?.sessionId).toBe("session-1");
      expect(data.entries[1]?.sessionId).toBe("session-2");
      expect(data.entries[2]?.sessionId).toBe("session-3");
    });

    test("filters entries by status", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/activity?status=working"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { entries: ActivityEntry[] };
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0]?.status).toBe("working");
      expect(data.entries[0]?.sessionId).toBe("session-1");
    });

    test("filters entries by idle status", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/activity?status=idle"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { entries: ActivityEntry[] };
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0]?.status).toBe("idle");
      expect(data.entries[0]?.sessionId).toBe("session-2");
    });

    test("filters entries by waiting_user_response status", async () => {
      const response = await app.handle(
        new Request(
          "http://localhost/api/activity?status=waiting_user_response",
        ),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { entries: ActivityEntry[] };
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0]?.status).toBe("waiting_user_response");
      expect(data.entries[0]?.sessionId).toBe("session-3");
    });
  });

  describe("GET /api/activity/:sessionId", () => {
    test("returns activity entry for existing session", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/activity/session-1"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as ActivityEntry;
      expect(data.sessionId).toBe("session-1");
      expect(data.status).toBe("working");
      expect(data.projectPath).toBe("/projects/app1");
      expect(data.lastUpdated).toBe("2026-01-31T10:00:00.000Z");
    });

    test("returns 404 for non-existent session", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/activity/unknown-session"),
      );

      expect(response.status).toBe(404);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data.error).toBe("not_found");
      expect(data.message).toContain("Session not found");
    });
  });

  describe("Permission checks", () => {
    test("returns 403 when session:read permission missing for list", async () => {
      // Create token manager that denies permission
      const restrictedTokenManager = {
        hasPermission: () => false,
      } as unknown as TokenManager;

      const restrictedApp = createTestApp(manager, restrictedTokenManager);

      const response = await restrictedApp.handle(
        new Request("http://localhost/api/activity"),
      );

      expect(response.status).toBe(403);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data.error).toBe("Forbidden");
      expect(data.message).toContain("session:read");
    });

    test("returns 403 when session:read permission missing for get", async () => {
      // Create token manager that denies permission
      const restrictedTokenManager = {
        hasPermission: () => false,
      } as unknown as TokenManager;

      const restrictedApp = createTestApp(manager, restrictedTokenManager);

      const response = await restrictedApp.handle(
        new Request("http://localhost/api/activity/session-1"),
      );

      expect(response.status).toBe(403);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data.error).toBe("Forbidden");
      expect(data.message).toContain("session:read");
    });
  });
});
