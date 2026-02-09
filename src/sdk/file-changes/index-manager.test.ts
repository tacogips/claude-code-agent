/**
 * Tests for FileChangeIndex.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { FileChangeIndex } from "./index-manager";
import { createTestContainer } from "../../container";
import type { Container } from "../../container";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockClock } from "../../test/mocks/clock";

describe("FileChangeIndex", () => {
  let container: Container;
  let fileSystem: MockFileSystem;
  let clock: MockClock;
  let index: FileChangeIndex;
  let originalHome: string | undefined;

  beforeEach(() => {
    // Override HOME environment variable for tests
    originalHome = process.env["HOME"];
    process.env["HOME"] = "";

    fileSystem = new MockFileSystem();
    clock = new MockClock();
    container = createTestContainer({ fileSystem, clock });
    index = new FileChangeIndex(container);

    // Set fixed time
    clock.setTime(new Date("2025-01-06T10:00:00Z"));
  });

  afterEach(() => {
    // Restore original HOME
    if (originalHome !== undefined) {
      process.env["HOME"] = originalHome;
    } else {
      delete process.env["HOME"];
    }
  });

  describe("buildIndex", () => {
    it("should build empty index when no sessions exist", async () => {
      // Setup: no projects directory (don't create it)

      const stats = await index.buildIndex();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalChanges).toBe(0);
      expect(stats.lastIndexed).toBe("2025-01-06T10:00:00.000Z");
    });

    it("should index sessions with file changes", async () => {
      // Setup: mock session with transcript
      const sessionId = "test-session-001";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/file.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      const stats = await index.buildIndex();

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalChanges).toBe(1);
    });

    it("should save index to disk", async () => {
      const sessionId = "test-session-002";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Write",
                input: {
                  file_path: "/home/user/project/README.md",
                  content: "# Project",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      await index.buildIndex();

      // Verify index file was written
      const indexPath = "/.local/claude-code-agent/index/file-changes.json";
      const indexContent = fileSystem.getFile(indexPath);

      expect(indexContent).not.toBeUndefined();

      const indexData = JSON.parse(indexContent!);
      expect(indexData.metadata.totalSessions).toBe(1);
      expect(indexData.metadata.totalFiles).toBe(1);

      // Verify the file is indexed
      const keys = Object.keys(indexData.fileIndex);
      expect(keys.length).toBe(1);

      // Get the actual indexed path (normalized by extractor)
      const indexedPath = keys[0]!;
      const entry = indexData.fileIndex[indexedPath];
      expect(entry).toHaveLength(1);
      expect(entry[0].sessionId).toBe(sessionId);
    });

    it("should handle sessions with multiple file changes", async () => {
      const sessionId = "test-session-003";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/a.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-002",
          timestamp: "2025-01-06T09:05:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-002",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/b.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      const stats = await index.buildIndex();

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalChanges).toBe(2);
    });
  });

  describe("lookup", () => {
    beforeEach(async () => {
      // Build index with test data
      const sessionId = "test-session-lookup";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/target.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      await index.buildIndex();
    });

    it("should return entries for indexed file", async () => {
      const entries = await index.lookup("/home/user/project/src/target.ts");

      expect(entries).toHaveLength(1);
      expect(entries[0]!.sessionId).toBe("test-session-lookup");
      expect(entries[0]!.projectPath).toBe("/home/user/project");
      expect(entries[0]!.changeCount).toBe(1);
    });

    it("should return empty array for non-indexed file", async () => {
      const entries = await index.lookup(
        "/home/user/project/src/nonexistent.ts",
      );

      expect(entries).toHaveLength(0);
    });

    it("should normalize file paths", async () => {
      // Lookup with different path representation
      const entries = await index.lookup("/home/user/project/src/./target.ts");

      expect(entries).toHaveLength(1);
    });
  });

  describe("lookupPattern", () => {
    beforeEach(async () => {
      // Build index with multiple files
      const sessionId = "test-session-pattern";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/a.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-002",
          timestamp: "2025-01-06T09:05:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-002",
                name: "Write",
                input: {
                  file_path: "/home/user/project/src/b.tsx",
                  content: "export {}",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-003",
          timestamp: "2025-01-06T09:10:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-003",
                name: "Write",
                input: {
                  file_path: "/home/user/project/README.md",
                  content: "# Project",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      await index.buildIndex();
    });

    it("should match files by glob pattern", async () => {
      const results = await index.lookupPattern("/home/user/project/src/*.ts");

      expect(results.size).toBe(1);
      expect(results.has("/home/user/project/src/a.ts")).toBe(true);
    });

    it("should match files with double-star pattern", async () => {
      const results = await index.lookupPattern("/home/user/project/**/*.ts*");

      expect(results.size).toBe(2); // a.ts and b.tsx
      expect(results.has("/home/user/project/src/a.ts")).toBe(true);
      expect(results.has("/home/user/project/src/b.tsx")).toBe(true);
    });

    it("should return empty map for non-matching pattern", async () => {
      const results = await index.lookupPattern("/home/user/project/**/*.py");

      expect(results.size).toBe(0);
    });

    it("should match markdown files", async () => {
      const results = await index.lookupPattern("/home/user/project/*.md");

      expect(results.size).toBe(1);
      expect(results.has("/home/user/project/README.md")).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return empty stats for new index", async () => {
      const stats = await index.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalChanges).toBe(0);
      expect(stats.indexSize).toBe(0);
    });

    it("should return correct stats after building index", async () => {
      const sessionId = "test-session-stats";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/file.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      await index.buildIndex();

      const stats = await index.getStats();

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalChanges).toBe(1);
      expect(stats.lastIndexed).toBe("2025-01-06T10:00:00.000Z");
      expect(stats.indexSize).toBeGreaterThan(0);
    });
  });

  describe("invalidate", () => {
    beforeEach(async () => {
      // Build index with test data
      const sessionId1 = "test-session-inv-1";
      const transcript1 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project1",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project1/src/a.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const sessionId2 = "test-session-inv-2";
      const transcript2 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project2",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-002",
          timestamp: "2025-01-06T09:05:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-002",
                name: "Write",
                input: {
                  file_path: "/home/user/project2/src/b.ts",
                  content: "export {}",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId1}/session.jsonl`,
        transcript1,
      );
      fileSystem.setFile(
        `/.claude/projects/${sessionId2}/session.jsonl`,
        transcript2,
      );
      fileSystem.setDirectory("/.claude/projects");

      await index.buildIndex();
    });

    it("should clear entire index when no project specified", async () => {
      await index.invalidate();

      const stats = await index.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalChanges).toBe(0);
    });

    it("should clear index for specific project", async () => {
      await index.invalidate("/home/user/project1");

      const stats = await index.getStats();

      // Should have only project2 data
      expect(stats.totalSessions).toBe(1);
      expect(stats.totalFiles).toBe(1);

      // Verify project1 file is gone
      const entries1 = await index.lookup("/home/user/project1/src/a.ts");
      expect(entries1).toHaveLength(0);

      // Verify project2 file still exists
      const entries2 = await index.lookup("/home/user/project2/src/b.ts");
      expect(entries2).toHaveLength(1);
    });

    it("should update metadata after invalidation", async () => {
      clock.setTime(new Date("2025-01-06T11:00:00Z"));

      await index.invalidate();

      const stats = await index.getStats();

      expect(stats.lastIndexed).toBe("2025-01-06T11:00:00.000Z");
    });
  });

  describe("persistence", () => {
    it("should load index from disk on first lookup", async () => {
      // Manually create index file
      const indexData = {
        metadata: {
          version: 1,
          lastUpdated: "2025-01-06T08:00:00.000Z",
          totalSessions: 1,
          totalFiles: 1,
          totalChanges: 1,
        },
        fileIndex: {
          "/home/user/project/src/persisted.ts": [
            {
              sessionId: "persisted-session",
              projectPath: "/home/user/project",
              changeCount: 1,
              firstChange: "2025-01-06T08:00:00.000Z",
              lastChange: "2025-01-06T08:00:00.000Z",
              toolsUsed: ["Edit"],
            },
          ],
        },
      };

      fileSystem.setFile(
        "/.local/claude-code-agent/index/file-changes.json",
        JSON.stringify(indexData),
      );

      // Create new index instance (simulates restart)
      const newIndex = new FileChangeIndex(container);

      const entries = await newIndex.lookup(
        "/home/user/project/src/persisted.ts",
      );

      expect(entries).toHaveLength(1);
      expect(entries[0]!.sessionId).toBe("persisted-session");
    });

    it("should not reload index if already in memory", async () => {
      const sessionId = "test-session-cache";
      const transcript = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-06T09:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tool-001",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/cached.ts",
                  old_string: "old",
                  new_string: "new",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        `/.claude/projects/${sessionId}/session.jsonl`,
        transcript,
      );
      fileSystem.setDirectory("/.claude/projects");

      await index.buildIndex();

      // The index should already be in memory, so it doesn't need to reload

      const entries = await index.lookup("/home/user/project/src/cached.ts");

      expect(entries).toHaveLength(1);
    });
  });
});
