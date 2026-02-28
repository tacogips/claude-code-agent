import { describe, test, expect } from "vitest";
import { getToolVersions } from "./tool-versions";
import { MockManagedProcess, MockProcessManager } from "../test/mocks";
import type { ProcessManager, SpawnOptions } from "../interfaces/process-manager";

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
});
