import { describe, test, expect } from "vitest";
import { getToolVersions } from "./tool-versions";
import { MockManagedProcess, MockProcessManager } from "../test/mocks";
import type {
  ProcessManager,
  SpawnOptions,
} from "../interfaces/process-manager";

function getExpectedClaudeFallbackShell(): string {
  if (process.platform === "win32") {
    return process.env["ComSpec"]?.trim() || "cmd.exe";
  }

  return process.env["SHELL"]?.trim() || "sh";
}

describe("getToolVersions", () => {
  test("returns parsed versions for all tools on success", async () => {
    const processManager = new MockProcessManager();
    processManager.setProcessConfig("claude", {
      stdout: ["Claude CLI 1.2.3"],
      exitCode: 0,
    });
    processManager.setProcessConfig("codex", {
      stdout: ["codex 0.45.1"],
      exitCode: 0,
    });
    processManager.setProcessConfig("git", {
      stdout: ["git version 2.43.0"],
      exitCode: 0,
    });

    const versions = await getToolVersions(processManager);

    expect(versions).toEqual({
      claude: { version: "1.2.3", error: null },
      codex: { version: "0.45.1", error: null },
      git: { version: "2.43.0", error: null },
    });
  });

  test("returns command error for missing executable", async () => {
    const processManager: ProcessManager = {
      spawn(
        command: string,
        _args: readonly string[],
        _options?: SpawnOptions,
      ) {
        if (command === "claude") {
          throw new Error("spawn claude ENOENT");
        }
        return new MockManagedProcess({
          pid: 1,
          stdout: [`${command} 1.0.0`],
          stderr: [],
          exitCode: 0,
        });
      },
      async kill(_pid: number, _signal?: string): Promise<void> {},
    };

    const versions = await getToolVersions(processManager);

    expect(versions.claude.version).toBeNull();
    expect(versions.claude.error).toContain("ENOENT");
    expect(versions.codex).toEqual({ version: "1.0.0", error: null });
    expect(versions.git).toEqual({ version: "1.0.0", error: null });
  });

  test("returns stderr error for non-zero exit", async () => {
    const processManager = new MockProcessManager();
    processManager.setProcessConfig("claude", {
      stderr: ["command failed"],
      exitCode: 127,
    });
    processManager.setProcessConfig("codex", {
      stdout: ["codex 0.45.1"],
      exitCode: 0,
    });
    processManager.setProcessConfig("git", {
      stdout: ["git version 2.43.0"],
      exitCode: 0,
    });

    const versions = await getToolVersions(processManager);

    expect(versions.claude).toEqual({
      version: null,
      error: "command failed",
    });
  });

  test("returns malformed error when output has no parseable version", async () => {
    const processManager = new MockProcessManager();
    processManager.setProcessConfig("claude", {
      stdout: ["Claude CLI version unknown"],
      exitCode: 0,
    });
    processManager.setProcessConfig("codex", {
      stdout: ["codex 0.45.1"],
      exitCode: 0,
    });
    processManager.setProcessConfig("git", {
      stdout: ["git version 2.43.0"],
      exitCode: 0,
    });

    const versions = await getToolVersions(processManager);

    expect(versions.claude.version).toBeNull();
    expect(versions.claude.error).toContain("malformed");
  });

  test("falls back to a shell-wrapped Claude probe when direct output is empty", async () => {
    const processManager = new MockProcessManager();
    const fallbackShell = getExpectedClaudeFallbackShell();

    processManager.setProcessConfig("claude", {
      stdout: [],
      stderr: [],
      exitCode: 0,
    });
    processManager.setProcessConfig(fallbackShell, {
      stdout: ["2.1.86 (Claude Code)"],
      exitCode: 0,
    });
    processManager.setProcessConfig("codex", {
      stdout: ["codex 0.45.1"],
      exitCode: 0,
    });
    processManager.setProcessConfig("git", {
      stdout: ["git version 2.43.0"],
      exitCode: 0,
    });

    const versions = await getToolVersions(processManager);

    expect(versions.claude).toEqual({ version: "2.1.86", error: null });

    const fallbackRecord = processManager
      .getSpawnHistory()
      .find((record) => record.command === fallbackShell);

    expect(fallbackRecord).toBeDefined();
    expect(fallbackRecord?.args.at(-1)).toContain("claude --version");
  });

  test("returns a fallback error when shell-wrapped Claude probe also fails", async () => {
    const processManager = new MockProcessManager();
    const fallbackShell = getExpectedClaudeFallbackShell();

    processManager.setProcessConfig("claude", {
      stdout: [],
      stderr: [],
      exitCode: 0,
    });
    processManager.setProcessConfig(fallbackShell, {
      stderr: ["shell probe failed"],
      exitCode: 127,
    });
    processManager.setProcessConfig("codex", {
      stdout: ["codex 0.45.1"],
      exitCode: 0,
    });
    processManager.setProcessConfig("git", {
      stdout: ["git version 2.43.0"],
      exitCode: 0,
    });

    const versions = await getToolVersions(processManager);

    expect(versions.claude.version).toBeNull();
    expect(versions.claude.error).toBe(
      "claude produced empty output; shell fallback failed: shell probe failed",
    );
  });
});
