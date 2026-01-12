/**
 * Tests for daemon CLI commands.
 *
 * Covers TEST-009 from cli-commands-unit test plan.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerDaemonCommands } from "./daemon";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import * as output from "../output";

describe("Daemon Commands", () => {
  let program: Command;
  let mockAgent: Partial<ClaudeCodeAgent>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let printErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create fresh program for each test
    program = new Command();
    program.exitOverride(); // Prevent actual process.exit
    program.option("--format <format>", "Output format", "table");

    // Create mock agent (unused by daemon placeholders but needed for registration)
    mockAgent = {};

    // Spy on process.exit and output functions
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});

    // Register commands
    registerDaemonCommands(program, async () => mockAgent as ClaudeCodeAgent);

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TEST-009: Daemon Start/Stop/Status", () => {
    test("starts daemon with default options", async () => {
      try {
        await program.parseAsync(["node", "test", "daemon", "start"]);
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "daemon start: Not yet implemented",
      );
      expect(printErrorSpy).toHaveBeenCalledWith(
        "Placeholder for starting the daemon server",
      );
      expect(printErrorSpy).toHaveBeenCalledWith("Host: 0.0.0.0");
      expect(printErrorSpy).toHaveBeenCalledWith("Port: 8443");
      expect(printErrorSpy).toHaveBeenCalledWith("With viewer: undefined");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("starts daemon with --host and --port", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "daemon",
          "start",
          "--host",
          "127.0.0.1",
          "--port",
          "9000",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("Host: 127.0.0.1");
      expect(printErrorSpy).toHaveBeenCalledWith("Port: 9000");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("starts daemon with --auth-token-file", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "daemon",
          "start",
          "--auth-token-file",
          "/path/to/tokens.json",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Auth token file: /path/to/tokens.json",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("starts daemon with --tls-cert and --tls-key", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "daemon",
          "start",
          "--tls-cert",
          "/path/to/cert.pem",
          "--tls-key",
          "/path/to/key.pem",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("TLS cert: /path/to/cert.pem");
      expect(printErrorSpy).toHaveBeenCalledWith("TLS key: /path/to/key.pem");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("starts daemon with --with-viewer", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "daemon",
          "start",
          "--with-viewer",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("With viewer: true");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("stops daemon", async () => {
      try {
        await program.parseAsync(["node", "test", "daemon", "stop"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "daemon stop: Not yet implemented",
      );
      expect(printErrorSpy).toHaveBeenCalledWith(
        "Placeholder for stopping the daemon server",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("shows status with format option", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "--format",
          "json",
          "daemon",
          "status",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "daemon status: Not yet implemented",
      );
      expect(printErrorSpy).toHaveBeenCalledWith(
        "Placeholder for showing daemon status",
      );
      expect(printErrorSpy).toHaveBeenCalledWith("Output format: json");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("shows status with default table format", async () => {
      try {
        await program.parseAsync(["node", "test", "daemon", "status"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("Output format: table");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("starts daemon with all options combined", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "daemon",
          "start",
          "--host",
          "localhost",
          "--port",
          "3000",
          "--auth-token-file",
          "/tokens.json",
          "--tls-cert",
          "/cert.pem",
          "--tls-key",
          "/key.pem",
          "--with-viewer",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("Host: localhost");
      expect(printErrorSpy).toHaveBeenCalledWith("Port: 3000");
      expect(printErrorSpy).toHaveBeenCalledWith(
        "Auth token file: /tokens.json",
      );
      expect(printErrorSpy).toHaveBeenCalledWith("TLS cert: /cert.pem");
      expect(printErrorSpy).toHaveBeenCalledWith("TLS key: /key.pem");
      expect(printErrorSpy).toHaveBeenCalledWith("With viewer: true");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
