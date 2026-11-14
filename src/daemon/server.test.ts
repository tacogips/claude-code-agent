/**
 * Tests for DaemonServer
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DaemonServer } from "./server";
import { createTestContainer } from "../container";
import type { DaemonConfig } from "./types";

describe("DaemonServer", () => {
  let container: ReturnType<typeof createTestContainer>;
  let config: DaemonConfig;

  beforeEach(async () => {
    container = createTestContainer();

    // Create empty token file
    await container.fileSystem.writeFile(
      "/tmp/test-tokens.json",
      JSON.stringify({ tokens: [] }),
    );

    config = {
      host: "127.0.0.1",
      port: 8080,
      authTokenFile: "/tmp/test-tokens.json",
      withViewer: false,
    };
  });

  describe("Constructor", () => {
    it("creates server instance", () => {
      const server = new DaemonServer(config, container);
      expect(server).toBeDefined();
      expect(server.getStatus().running).toBe(false);
    });

    it("initializes with provided config", () => {
      const server = new DaemonServer(config, container);
      const status = server.getStatus();

      expect(status.host).toBe("127.0.0.1");
      expect(status.port).toBe(8080);
      expect(status.running).toBe(false);
      expect(status.uptime).toBe(0);
      expect(status.connections).toBe(0);
    });
  });

  describe("getStatus()", () => {
    it("returns status when server is not running", () => {
      const server = new DaemonServer(config, container);
      const status = server.getStatus();

      expect(status).toEqual({
        running: false,
        host: "127.0.0.1",
        port: 8080,
        uptime: 0,
        connections: 0,
      });
    });
  });

  describe("getTokenManager()", () => {
    it("returns TokenManager instance", () => {
      const server = new DaemonServer(config, container);
      const tokenManager = server.getTokenManager();
      expect(tokenManager).toBeDefined();
    });
  });

  describe("TLS Configuration", () => {
    it("validates TLS configuration - missing key", async () => {
      const tlsConfig: DaemonConfig = {
        ...config,
        tlsCert: "/path/to/cert.pem",
        // tlsKey is missing
      };

      const server = new DaemonServer(tlsConfig, container);

      await expect(server.start()).rejects.toThrow(
        "Both tlsCert and tlsKey must be provided for TLS configuration",
      );
    });

    it("validates TLS configuration - missing cert", async () => {
      const tlsConfig: DaemonConfig = {
        ...config,
        tlsKey: "/path/to/key.pem",
        // tlsCert is missing
      };

      const server = new DaemonServer(tlsConfig, container);

      await expect(server.start()).rejects.toThrow(
        "Both tlsCert and tlsKey must be provided for TLS configuration",
      );
    });
  });

  describe("Lifecycle", () => {
    it("cannot stop server that is not running", async () => {
      const server = new DaemonServer(config, container);

      await expect(server.stop()).rejects.toThrow("Server is not running");
    });

    // Note: We cannot easily test start() in unit tests because Elysia's listen()
    // requires a real network port. Integration tests would be needed for that.
  });
});
