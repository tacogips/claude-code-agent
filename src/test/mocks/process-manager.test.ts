/**
 * Tests for MockProcessManager.
 *
 * @module test/mocks/process-manager.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockProcessManager, MockManagedProcess } from "./process-manager";

describe("MockManagedProcess", () => {
  describe("stdout", () => {
    it("should emit configured stdout lines", async () => {
      const process = new MockManagedProcess({
        pid: 123,
        stdout: ["line1", "line2", "line3"],
        exitCode: 0,
      });

      const lines: string[] = [];
      for await (const line of process.stdout) {
        lines.push(line);
      }

      expect(lines).toEqual(["line1", "line2", "line3"]);
    });

    it("should handle empty stdout", async () => {
      const process = new MockManagedProcess({
        pid: 1,
        stdout: [],
        exitCode: 0,
      });

      const lines: string[] = [];
      for await (const line of process.stdout) {
        lines.push(line);
      }

      expect(lines).toEqual([]);
    });
  });

  describe("stderr", () => {
    it("should emit configured stderr lines", async () => {
      const process = new MockManagedProcess({
        pid: 123,
        stderr: ["error1", "error2"],
        exitCode: 1,
      });

      const lines: string[] = [];
      for await (const line of process.stderr) {
        lines.push(line);
      }

      expect(lines).toEqual(["error1", "error2"]);
    });
  });

  describe("exitCode", () => {
    it("should resolve to configured exit code", async () => {
      const process = new MockManagedProcess({
        pid: 1,
        exitCode: 42,
      });

      const code = await process.exitCode;
      expect(code).toBe(42);
    });

    it("should resolve to null for killed process", async () => {
      const process = new MockManagedProcess({
        pid: 1,
        exitCode: 0,
      });

      process.kill();
      const code = await process.exitCode;
      expect(code).toBeNull();
    });
  });

  describe("kill", () => {
    it("should mark process as killed", () => {
      const process = new MockManagedProcess({ pid: 1, exitCode: 0 });
      expect(process.wasKilled()).toBe(false);

      process.kill();
      expect(process.wasKilled()).toBe(true);
    });

    it("should record kill signal", () => {
      const process = new MockManagedProcess({ pid: 1, exitCode: 0 });

      process.kill("SIGKILL");
      expect(process.getKillSignal()).toBe("SIGKILL");
    });

    it("should default to SIGTERM", () => {
      const process = new MockManagedProcess({ pid: 1, exitCode: 0 });

      process.kill();
      expect(process.getKillSignal()).toBe("SIGTERM");
    });

    it("should stop stdout iteration when killed", async () => {
      const process = new MockManagedProcess({
        pid: 1,
        stdout: ["line1", "line2", "line3"],
        exitCode: 0,
        lineDelay: 10,
      });

      const lines: string[] = [];
      const iterator = process.stdout[Symbol.asyncIterator]();

      // Get first line
      const first = await iterator.next();
      if (!first.done && first.value !== undefined) {
        lines.push(first.value);
      }

      // Kill before getting more
      process.kill();

      // Should be done
      const next = await iterator.next();
      expect(next.done).toBe(true);
    });
  });

  describe("pid", () => {
    it("should return configured PID", () => {
      const process = new MockManagedProcess({ pid: 12345, exitCode: 0 });
      expect(process.pid).toBe(12345);
    });
  });
});

describe("MockProcessManager", () => {
  let pm: MockProcessManager;

  beforeEach(() => {
    pm = new MockProcessManager();
  });

  describe("spawn", () => {
    it("should create a managed process", () => {
      const proc = pm.spawn("echo", ["hello"]);
      expect(proc.pid).toBeGreaterThan(0);
    });

    it("should record spawn in history", () => {
      pm.spawn("echo", ["hello"], { cwd: "/tmp" });

      const history = pm.getSpawnHistory();
      expect(history.length).toBe(1);
      expect(history[0]?.command).toBe("echo");
      expect(history[0]?.args).toEqual(["hello"]);
      expect(history[0]?.options?.cwd).toBe("/tmp");
    });

    it("should use configured process behavior", async () => {
      pm.setProcessConfig("mycommand", {
        stdout: ["output line"],
        exitCode: 0,
      });

      const proc = pm.spawn("mycommand", []);

      const lines: string[] = [];
      for await (const line of proc.stdout) {
        lines.push(line);
      }

      expect(lines).toEqual(["output line"]);
      expect(await proc.exitCode).toBe(0);
    });

    it("should consume configurations in order", async () => {
      pm.setProcessConfig("cmd", { stdout: ["first"], exitCode: 0 });
      pm.setProcessConfig("cmd", { stdout: ["second"], exitCode: 0 });

      const proc1 = pm.spawn("cmd", []);
      const proc2 = pm.spawn("cmd", []);

      const lines1: string[] = [];
      for await (const line of proc1.stdout) {
        lines1.push(line);
      }

      const lines2: string[] = [];
      for await (const line of proc2.stdout) {
        lines2.push(line);
      }

      expect(lines1).toEqual(["first"]);
      expect(lines2).toEqual(["second"]);
    });

    it("should use default config when no specific config", async () => {
      pm.setDefaultConfig({ exitCode: 42 });

      const proc = pm.spawn("unknown", []);
      expect(await proc.exitCode).toBe(42);
    });

    it("should assign unique PIDs", () => {
      const proc1 = pm.spawn("cmd1", []);
      const proc2 = pm.spawn("cmd2", []);
      const proc3 = pm.spawn("cmd3", []);

      expect(proc1.pid).not.toBe(proc2.pid);
      expect(proc2.pid).not.toBe(proc3.pid);
    });
  });

  describe("kill", () => {
    it("should mark process as killed", async () => {
      const proc = pm.spawn("cmd", []);
      await pm.kill(proc.pid);

      expect(pm.wasKilled(proc.pid)).toBe("SIGTERM");
    });

    it("should use specified signal", async () => {
      const proc = pm.spawn("cmd", []);
      await pm.kill(proc.pid, "SIGKILL");

      expect(pm.wasKilled(proc.pid)).toBe("SIGKILL");
    });

    it("should kill the actual process object", async () => {
      pm.setProcessConfig("cmd", { exitCode: 0 });
      const proc = pm.spawn("cmd", []);

      await pm.kill(proc.pid);

      // Exit code should be null for killed process
      const exitCode = await proc.exitCode;
      expect(exitCode).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all state", async () => {
      pm.setProcessConfig("cmd", { exitCode: 1 });
      pm.spawn("cmd", []);

      pm.clear();

      expect(pm.getSpawnHistory()).toEqual([]);

      // New spawn should use default config
      const proc = pm.spawn("cmd", []);
      expect(await proc.exitCode).toBe(0); // Default
    });
  });

  describe("getSpawnHistory", () => {
    it("should return all spawned processes", () => {
      pm.spawn("cmd1", ["a"]);
      pm.spawn("cmd2", ["b", "c"]);

      const history = pm.getSpawnHistory();
      expect(history.length).toBe(2);
      expect(history[0]?.command).toBe("cmd1");
      expect(history[1]?.command).toBe("cmd2");
    });
  });
});
