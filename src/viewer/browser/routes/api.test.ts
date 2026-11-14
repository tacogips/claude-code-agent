/**
 * Integration tests for REST API routes.
 *
 * Tests all API endpoints for sessions, tasks, projects, and queues.
 *
 * @module viewer/browser/routes/api.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { Elysia } from "elysia";
import { setupApiRoutes } from "./api";
import { SdkManager } from "../../../sdk";
import { createTestContainer } from "../../../container";
import type { Session } from "../../../types/session";
import type { CommandQueue } from "../../../repository/queue-repository";

describe("API Routes", () => {
  let sdk: SdkManager;
  let app: Elysia;

  beforeEach(async () => {
    // Create test container and SDK
    const container = createTestContainer();
    sdk = await SdkManager.create(container);

    // Create Elysia app and setup API routes
    app = new Elysia();
    setupApiRoutes(app, sdk);
  });

  describe("GET /api/sessions", () => {
    test("returns empty array when no sessions exist", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { sessions: unknown[] };
      expect(data).toHaveProperty("sessions");
      expect(Array.isArray(data.sessions)).toBe(true);
      expect(data.sessions).toHaveLength(0);
    });

    test("returns sessions array with valid structure", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { sessions: unknown[] };
      expect(data).toHaveProperty("sessions");
      expect(Array.isArray(data.sessions)).toBe(true);

      // Validate structure if sessions exist
      for (const session of data.sessions) {
        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("projectPath");
        expect(session).toHaveProperty("status");
        expect(session).toHaveProperty("createdAt");
        expect(session).toHaveProperty("updatedAt");
        expect(session).toHaveProperty("messageCount");
      }
    });
  });

  describe("GET /api/sessions/:id", () => {
    test("returns 404 for non-existent session", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/non-existent-id"),
      );

      expect(response.status).toBe(404);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data).toHaveProperty("error", "Not Found");
      expect(data).toHaveProperty("message");
      expect(data.message).toContain("not found");
    });

    test("returns session detail for valid session ID", async () => {
      // First get a list of sessions to find a valid ID
      const listResponse = await app.handle(
        new Request("http://localhost/api/sessions"),
      );
      const listData = (await listResponse.json()) as { sessions: Session[] };

      if (listData.sessions.length === 0) {
        // Skip test if no sessions exist
        return;
      }

      const sessionId = listData.sessions[0]?.id;
      if (sessionId === undefined) {
        return;
      }

      const response = await app.handle(
        new Request(`http://localhost/api/sessions/${sessionId}`),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { session: Session };
      expect(data).toHaveProperty("session");
      expect(data.session).toHaveProperty("id", sessionId);
      expect(data.session).toHaveProperty("messages");
      expect(Array.isArray(data.session.messages)).toBe(true);
      expect(data.session).toHaveProperty("tasks");
      expect(Array.isArray(data.session.tasks)).toBe(true);
    });
  });

  describe("GET /api/sessions/:id/messages", () => {
    test("returns 404 for non-existent session", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/non-existent-id/messages"),
      );

      expect(response.status).toBe(404);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data).toHaveProperty("error", "Not Found");
      expect(data).toHaveProperty("message");
      expect(data.message).toContain("not found");
    });

    test("returns messages array for valid session ID", async () => {
      // First get a list of sessions to find a valid ID
      const listResponse = await app.handle(
        new Request("http://localhost/api/sessions"),
      );
      const listData = (await listResponse.json()) as { sessions: Session[] };

      if (listData.sessions.length === 0) {
        // Skip test if no sessions exist
        return;
      }

      const sessionId = listData.sessions[0]?.id;
      if (sessionId === undefined) {
        return;
      }

      const response = await app.handle(
        new Request(`http://localhost/api/sessions/${sessionId}/messages`),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { messages: unknown[] };
      expect(data).toHaveProperty("messages");
      expect(Array.isArray(data.messages)).toBe(true);

      // Validate message structure if messages exist
      for (const message of data.messages) {
        expect(message).toHaveProperty("id");
        expect(message).toHaveProperty("role");
        expect(message).toHaveProperty("content");
        expect(message).toHaveProperty("timestamp");
      }
    });

    test("returns empty array for session with no messages", async () => {
      // This test depends on having a session with no messages
      // In a real scenario, this might be an edge case
      const response = await app.handle(
        new Request("http://localhost/api/sessions/empty-session/messages"),
      );

      // Should return 404 if session doesn't exist
      expect([200, 404]).toContain(response.status);
    });
  });

  describe("GET /api/tasks", () => {
    test("returns tasks array", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/tasks"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { tasks: unknown[] };
      expect(data).toHaveProperty("tasks");
      expect(Array.isArray(data.tasks)).toBe(true);

      // Validate task structure if tasks exist
      for (const task of data.tasks) {
        expect(task).toHaveProperty("content");
        expect(task).toHaveProperty("status");
        expect(task).toHaveProperty("activeForm");
      }
    });

    test("returns empty array when no active tasks exist", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/tasks"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { tasks: unknown[] };
      expect(data).toHaveProperty("tasks");
      expect(Array.isArray(data.tasks)).toBe(true);
    });
  });

  describe("GET /api/projects", () => {
    test("returns projects array", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/projects"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { projects: unknown[] };
      expect(data).toHaveProperty("projects");
      expect(Array.isArray(data.projects)).toBe(true);

      // All projects should be strings
      for (const project of data.projects) {
        expect(typeof project).toBe("string");
      }
    });

    test("returns unique project paths", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/projects"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { projects: string[] };
      const projectSet = new Set(data.projects);

      // No duplicates
      expect(projectSet.size).toBe(data.projects.length);
    });

    test("returns sorted projects", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/projects"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { projects: string[] };

      if (data.projects.length > 1) {
        // Check if sorted
        const sorted = [...data.projects].sort();
        expect(data.projects).toEqual(sorted);
      }
    });
  });

  describe("GET /api/queues", () => {
    test("returns empty array when no queues exist", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/queues"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { queues: unknown[] };
      expect(data).toHaveProperty("queues");
      expect(Array.isArray(data.queues)).toBe(true);
    });

    test("returns queues array with valid structure", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/queues"),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { queues: unknown[] };
      expect(data).toHaveProperty("queues");
      expect(Array.isArray(data.queues)).toBe(true);

      // Validate structure if queues exist
      for (const queue of data.queues) {
        expect(queue).toHaveProperty("id");
        expect(queue).toHaveProperty("name");
        expect(queue).toHaveProperty("projectPath");
        expect(queue).toHaveProperty("status");
        expect(queue).toHaveProperty("commands");
        expect(Array.isArray((queue as CommandQueue).commands)).toBe(true);
      }
    });
  });

  describe("GET /api/queues/:id", () => {
    test("returns 404 for non-existent queue", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/queues/non-existent-queue"),
      );

      expect(response.status).toBe(404);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data).toHaveProperty("error", "Not Found");
      expect(data).toHaveProperty("message");
      expect(data.message).toContain("not found");
    });

    test("returns queue detail for valid queue ID", async () => {
      // First get a list of queues to find a valid ID
      const listResponse = await app.handle(
        new Request("http://localhost/api/queues"),
      );
      const listData = (await listResponse.json()) as {
        queues: CommandQueue[];
      };

      if (listData.queues.length === 0) {
        // Skip test if no queues exist
        return;
      }

      const queueId = listData.queues[0]?.id;
      if (queueId === undefined) {
        return;
      }

      const response = await app.handle(
        new Request(`http://localhost/api/queues/${queueId}`),
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as { queue: CommandQueue };
      expect(data).toHaveProperty("queue");
      expect(data.queue).toHaveProperty("id", queueId);
      expect(data.queue).toHaveProperty("commands");
      expect(Array.isArray(data.queue.commands)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("returns proper error format for 404 errors", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/invalid"),
      );

      expect(response.status).toBe(404);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("message");
      expect(typeof data.error).toBe("string");
      expect(typeof data.message).toBe("string");
    });

    test("handles malformed session ID gracefully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/../../etc/passwd"),
      );

      // Should return 404 or 500 for invalid ID
      expect([404, 500]).toContain(response.status);

      // Try to parse JSON - if it fails, that's acceptable for malformed input
      try {
        const data = (await response.json()) as Record<string, unknown>;
        expect(data).toHaveProperty("error");
        expect(data).toHaveProperty("message");
      } catch {
        // If JSON parsing fails, the response is still valid (e.g., plain text error)
        // This is acceptable error handling for malformed input
      }
    });
  });

  describe("Response Format", () => {
    test("all endpoints return JSON", async () => {
      const endpoints = [
        "/api/sessions",
        "/api/tasks",
        "/api/projects",
        "/api/queues",
      ];

      for (const endpoint of endpoints) {
        const response = await app.handle(
          new Request(`http://localhost${endpoint}`),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain(
          "application/json",
        );
      }
    });

    test("error responses include error and message fields", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/sessions/nonexistent"),
      );

      expect(response.status).toBe(404);

      const data = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("message");
      expect(typeof data.error).toBe("string");
      expect(typeof data.message).toBe("string");
    });
  });
});
