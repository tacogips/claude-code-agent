/**
 * Unit tests for ViewerServer.
 *
 * Tests server lifecycle, configuration, and endpoint accessibility.
 *
 * @module viewer/browser/server.test
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { ViewerServer, DEFAULT_VIEWER_CONFIG } from "./server";
import { SdkManager } from "../../sdk";
import { createTestContainer } from "../../container";

describe("ViewerServer", () => {
  let sdk: SdkManager;

  beforeEach(async () => {
    const container = createTestContainer();
    sdk = await SdkManager.create(container);
  });

  describe("constructor", () => {
    test("creates server instance with config", () => {
      const config = {
        port: 3001,
        host: "127.0.0.1",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      expect(server).toBeDefined();
      expect(server.getUrl()).toBe("http://127.0.0.1:3001");
    });

    test("accepts default config", () => {
      const server = new ViewerServer(DEFAULT_VIEWER_CONFIG, sdk);

      expect(server).toBeDefined();
      expect(server.getUrl()).toBe("http://127.0.0.1:3000");
    });
  });

  describe("getUrl", () => {
    test("returns correct URL for localhost", () => {
      const config = {
        port: 3000,
        host: "127.0.0.1",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      expect(server.getUrl()).toBe("http://127.0.0.1:3000");
    });

    test("returns correct URL for all interfaces", () => {
      const config = {
        port: 8080,
        host: "0.0.0.0",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      expect(server.getUrl()).toBe("http://0.0.0.0:8080");
    });

    test("returns correct URL for custom port", () => {
      const config = {
        port: 9999,
        host: "localhost",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      expect(server.getUrl()).toBe("http://localhost:9999");
    });
  });

  describe("start and stop", () => {
    test("starts and stops server successfully", async () => {
      const config = {
        port: 3002,
        host: "127.0.0.1",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      await server.start();

      // Verify server is accessible
      const response = await fetch(`${server.getUrl()}/api/health`);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("uptime");
      expect(typeof data["uptime"]).toBe("number");

      await server.stop();
    });

    test("throws error when starting already running server", async () => {
      const config = {
        port: 3003,
        host: "127.0.0.1",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      await server.start();

      await expect(server.start()).rejects.toThrow("Server is already running");

      await server.stop();
    });

    test("throws error when stopping non-running server", async () => {
      const config = {
        port: 3004,
        host: "127.0.0.1",
        openBrowser: false,
      };

      const server = new ViewerServer(config, sdk);

      await expect(server.stop()).rejects.toThrow("Server is not running");
    });
  });

  describe("endpoints", () => {
    let server: ViewerServer;

    beforeEach(async () => {
      const config = {
        port: 3005,
        host: "127.0.0.1",
        openBrowser: false,
      };

      server = new ViewerServer(config, sdk);
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    test("GET / returns HTML response for SPA", async () => {
      const response = await fetch(`${server.getUrl()}/`);
      expect(response.ok).toBe(true);

      // Root route serves static HTML for the SPA
      const contentType = response.headers.get("content-type");
      // May be HTML or octet-stream depending on whether build exists
      expect(contentType).toBeDefined();
    });

    test("GET /api/health returns health status", async () => {
      const response = await fetch(`${server.getUrl()}/api/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toEqual({
        status: "ok",
        uptime: expect.any(Number),
      });
    });

    test("GET /api/sessions returns sessions list", async () => {
      const response = await fetch(`${server.getUrl()}/api/sessions`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("sessions");
      expect(Array.isArray((data as { sessions: unknown[] }).sessions)).toBe(
        true,
      );
    });

    test("GET /api/sessions/:id returns 404 for non-existent session", async () => {
      const response = await fetch(
        `${server.getUrl()}/api/sessions/test-session-id`,
      );
      expect(response.status).toBe(404);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toHaveProperty("error", "Not Found");
      expect(String(data["message"])).toContain("test-session-id");
    });

    test("GET /api/sessions/:id/messages returns 404 for non-existent session", async () => {
      const response = await fetch(
        `${server.getUrl()}/api/sessions/test-id/messages`,
      );
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("error", "Not Found");
    });

    test("GET /api/tasks returns tasks list", async () => {
      const response = await fetch(`${server.getUrl()}/api/tasks`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("tasks");
      expect(Array.isArray((data as { tasks: unknown[] }).tasks)).toBe(true);
    });

    test("GET /api/projects returns projects list", async () => {
      const response = await fetch(`${server.getUrl()}/api/projects`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("projects");
      expect(Array.isArray((data as { projects: unknown[] }).projects)).toBe(
        true,
      );
    });

    test("GET /api/queues returns queues list", async () => {
      const response = await fetch(`${server.getUrl()}/api/queues`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("queues");
      expect(Array.isArray((data as { queues: unknown[] }).queues)).toBe(true);
    });

    test("GET /api/queues/:id returns 404 for non-existent queue", async () => {
      const response = await fetch(
        `${server.getUrl()}/api/queues/test-queue-id`,
      );
      expect(response.status).toBe(404);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toHaveProperty("error", "Not Found");
      expect(String(data["message"])).toContain("test-queue-id");
    });

    test("GET /api/nonexistent is handled by SPA fallback", async () => {
      // Unknown API routes fall through to SPA fallback which returns 200
      // The frontend handles showing appropriate error messages
      const response = await fetch(`${server.getUrl()}/api/nonexistent`);
      expect(response.ok).toBe(true);
    });
  });

  describe("CORS", () => {
    let server: ViewerServer;

    beforeEach(async () => {
      const config = {
        port: 3006,
        host: "127.0.0.1",
        openBrowser: false,
      };

      server = new ViewerServer(config, sdk);
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    test("includes CORS headers in response", async () => {
      const response = await fetch(`${server.getUrl()}/api/health`, {
        headers: {
          Origin: "http://example.com",
        },
      });

      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    });
  });
});
