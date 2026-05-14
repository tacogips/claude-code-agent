import { describe, expect, test } from "vitest";
import { createTestContainer } from "../../container";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockProcessManager } from "../../test/mocks/process-manager";
import { ConfigGenerator } from "./config-generator";
import { startGroupSession } from "./session-processor";
import {
  DEFAULT_GROUP_CONFIG,
  type GroupSession,
  type SessionGroup,
} from "./types";

function createSession(overrides: Partial<GroupSession> = {}): GroupSession {
  return {
    id: "001-session-id",
    projectPath: "/project/a",
    prompt: "Run the task",
    status: "pending",
    dependsOn: [],
    createdAt: "2026-01-04T14:30:00Z",
    ...overrides,
  };
}

function createGroup(overrides: Partial<SessionGroup> = {}): SessionGroup {
  return {
    id: "20260104-143000-test-group",
    name: "Test Group",
    slug: "test-group",
    status: "created",
    sessions: [],
    config: DEFAULT_GROUP_CONFIG,
    createdAt: "2026-01-04T14:30:00Z",
    updatedAt: "2026-01-04T14:30:00Z",
    ...overrides,
  };
}

describe("startGroupSession", () => {
  test("starts a new Claude session without print mode", async () => {
    const processManager = new MockProcessManager();
    const container = createTestContainer({
      fileSystem: new MockFileSystem(),
      processManager,
    });
    const configGenerator = new ConfigGenerator(container);

    await startGroupSession(
      createSession(),
      createGroup(),
      container,
      configGenerator,
      false,
    );

    const spawn = processManager.getSpawnHistory()[0];
    expect(spawn?.command).toBe("claude");
    expect(spawn?.args).toContain("--session-id");
    expect(spawn?.args).not.toContain("-p");
    expect(spawn?.args).not.toContain("--print");
    expect(spawn?.args).not.toContain("--output-format");
    expect(spawn?.args.at(-1)).toBe("Run the task");
  });

  test("resumes with an explicit Claude session id", async () => {
    const processManager = new MockProcessManager();
    const container = createTestContainer({
      fileSystem: new MockFileSystem(),
      processManager,
    });
    const configGenerator = new ConfigGenerator(container);

    await startGroupSession(
      createSession({
        claudeSessionId: "11111111-2222-4333-8444-555555555555",
      }),
      createGroup(),
      container,
      configGenerator,
      true,
    );

    const args = processManager.getSpawnHistory()[0]?.args ?? [];
    const resumeIndex = args.indexOf("--resume");
    expect(resumeIndex).toBeGreaterThan(-1);
    expect(args[resumeIndex + 1]).toBe("11111111-2222-4333-8444-555555555555");
    expect(args).not.toContain("-p");
    expect(args).not.toContain("--output-format");
  });

  test("rejects print-mode group additional args before spawn", async () => {
    const processManager = new MockProcessManager();
    const container = createTestContainer({
      fileSystem: new MockFileSystem(),
      processManager,
    });
    const configGenerator = new ConfigGenerator(container);

    await expect(
      startGroupSession(
        createSession(),
        createGroup({
          config: {
            ...DEFAULT_GROUP_CONFIG,
            additionalArgs: ["--output-format=stream-json"],
          },
        }),
        container,
        configGenerator,
        false,
      ),
    ).rejects.toThrow("group additionalArgs cannot include");

    expect(processManager.getSpawnHistory()).toHaveLength(0);
  });
});
