/**
 * Tests for FileChangeService.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { FileChangeService } from "./service";
import { createTestContainer } from "../../container";
import type { Container } from "../../container";
import { MockFileSystem } from "../../test/mocks/filesystem";
import path from "node:path";

describe("FileChangeService", () => {
  let container: Container;
  let fileSystem: MockFileSystem;
  let service: FileChangeService;

  // Helper to get the expected transcript path for a session ID
  const getTranscriptPath = (sessionId: string): string => {
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    return path.join(
      homeDir,
      ".claude",
      "projects",
      sessionId,
      "session.jsonl",
    );
  };

  beforeEach(() => {
    container = createTestContainer();
    fileSystem = container.fileSystem as MockFileSystem;
    service = new FileChangeService(container);
  });

  // ============================================================================
  // Session -> Files (Forward Lookup)
  // ============================================================================

  describe("getSessionChangedFiles", () => {
    test("returns summary of all changed files in a session", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-001",
          timestamp: "2025-01-01T10:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_001",
                name: "Edit",
                input: {
                  file_path: "src/file1.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-002",
          timestamp: "2025-01-01T11:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_002",
                name: "Write",
                input: {
                  file_path: "src/file2.ts",
                  content: "new file",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = getTranscriptPath("session-001");
      fileSystem.setFile(transcriptPath, transcriptContent);

      const summary = await service.getSessionChangedFiles("session-001");

      expect(summary.sessionId).toBe("session-001");
      expect(summary.totalFilesChanged).toBe(2);
      expect(summary.totalChanges).toBe(2);
      expect(summary.files).toHaveLength(2);
      expect(summary.sessionStart).toBe("2025-01-01T10:00:00.000Z");
      expect(summary.sessionEnd).toBe("2025-01-01T11:00:00.000Z");
    });

    test("applies filters to changed files", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-003",
          timestamp: "2025-01-01T12:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_003",
                name: "Write",
                input: {
                  file_path: "src/file1.ts",
                  content: "typescript",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-004",
          timestamp: "2025-01-01T13:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_004",
                name: "Write",
                input: {
                  file_path: "README.md",
                  content: "markdown",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = getTranscriptPath("session-002");
      fileSystem.setFile(transcriptPath, transcriptContent);

      const summary = await service.getSessionChangedFiles("session-002", {
        extensions: [".ts"],
      });

      expect(summary.totalFilesChanged).toBe(1);
      expect(summary.files[0]!.path).toContain(".ts");
    });

    test("includes content when requested", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-005",
          timestamp: "2025-01-01T14:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_005",
                name: "Edit",
                input: {
                  file_path: "src/test.ts",
                  old_string: "const x = 1;",
                  new_string: "const x = 2;",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = getTranscriptPath("session-003");
      fileSystem.setFile(transcriptPath, transcriptContent);

      const summary = await service.getSessionChangedFiles("session-003", {
        includeContent: true,
      });

      expect(summary.files).toHaveLength(1);
      const change = summary.files[0]!.changes[0];
      expect(change).toBeDefined();
      expect(change!.oldContent).toBe("const x = 1;");
      expect(change!.newContent).toBe("const x = 2;");
    });
  });

  describe("getFileChangesInSession", () => {
    test("returns changes for a specific file in session", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-006",
          timestamp: "2025-01-01T15:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_006",
                name: "Edit",
                input: {
                  file_path: "src/test.ts",
                  old_string: "x",
                  new_string: "y",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-007",
          timestamp: "2025-01-01T16:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_007",
                name: "Edit",
                input: {
                  file_path: "src/test.ts",
                  old_string: "y",
                  new_string: "z",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-008",
          timestamp: "2025-01-01T17:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_008",
                name: "Write",
                input: {
                  file_path: "src/other.ts",
                  content: "other file",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = getTranscriptPath("session-004");
      fileSystem.setFile(transcriptPath, transcriptContent);

      const changes = await service.getFileChangesInSession(
        "session-004",
        "src/test.ts",
      );

      expect(changes).toHaveLength(2);
      expect(changes[0]!.tool).toBe("Edit");
      expect(changes[0]!.timestamp).toBe("2025-01-01T15:00:00.000Z");
      expect(changes[1]!.timestamp).toBe("2025-01-01T16:00:00.000Z");
    });

    test("returns empty array if file not modified in session", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-009",
          timestamp: "2025-01-01T18:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_009",
                name: "Write",
                input: {
                  file_path: "src/file1.ts",
                  content: "content",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = getTranscriptPath("session-005");
      fileSystem.setFile(transcriptPath, transcriptContent);

      const changes = await service.getFileChangesInSession(
        "session-005",
        "src/nonexistent.ts",
      );

      expect(changes).toHaveLength(0);
    });

    test("matches file by relative path", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-010",
          timestamp: "2025-01-01T19:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_010",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/test.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = getTranscriptPath("session-006");
      fileSystem.setFile(transcriptPath, transcriptContent);

      const changes = await service.getFileChangesInSession(
        "session-006",
        "test.ts",
      );

      expect(changes).toHaveLength(1);
    });
  });

  // ============================================================================
  // File -> Sessions (Reverse Lookup)
  // ============================================================================

  describe("findSessionsByFile", () => {
    test("returns history of all sessions that modified a file", async () => {
      // Setup index with mock data
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      // Create two sessions that modified the same file
      const session1 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-011",
          timestamp: "2025-01-01T20:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_011",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/shared.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const session2 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-012",
          timestamp: "2025-01-02T10:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_012",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/shared.ts",
                  old_string: "b",
                  new_string: "c",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        path.join(projectsDir, "session-007", "session.jsonl"),
        session1,
      );
      fileSystem.setFile(
        path.join(projectsDir, "session-008", "session.jsonl"),
        session2,
      );

      // Build index
      await service.buildIndex();

      // Find sessions by file
      const history = await service.findSessionsByFile(
        "/home/user/project/src/shared.ts",
      );

      expect(history.path).toBe(
        path.normalize("/home/user/project/src/shared.ts"),
      );
      expect(history.totalSessions).toBe(2);
      expect(history.totalChanges).toBe(2);
      expect(history.sessions).toHaveLength(2);

      // Should be sorted by most recent first
      expect(history.sessions[0]!.sessionId).toBe("session-008");
      expect(history.sessions[1]!.sessionId).toBe("session-007");
    });

    test("returns empty history for file not in index", async () => {
      await service.buildIndex();

      const history = await service.findSessionsByFile(
        "/home/user/project/src/nonexistent.ts",
      );

      expect(history.totalSessions).toBe(0);
      expect(history.totalChanges).toBe(0);
      expect(history.sessions).toHaveLength(0);
    });

    test("filters by project path", async () => {
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      // Create sessions in different projects
      const session1 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project-a",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-013",
          timestamp: "2025-01-01T21:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_013",
                name: "Edit",
                input: {
                  file_path: "/home/user/project-a/src/shared.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const session2 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project-b",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-014",
          timestamp: "2025-01-02T11:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_014",
                name: "Edit",
                input: {
                  file_path: "/home/user/project-b/src/shared.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        path.join(projectsDir, "session-009", "session.jsonl"),
        session1,
      );
      fileSystem.setFile(
        path.join(projectsDir, "session-010", "session.jsonl"),
        session2,
      );

      await service.buildIndex();

      // Filter by project-a
      const history = await service.findSessionsByFile(
        "/home/user/project-a/src/shared.ts",
        {
          projectPath: "/home/user/project-a",
        },
      );

      expect(history.totalSessions).toBe(1);
      expect(history.sessions[0]!.sessionId).toBe("session-009");
      expect(history.sessions[0]!.projectPath).toBe("/home/user/project-a");
    });

    test("filters by date range", async () => {
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      // Create sessions at different times
      const session1 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-015",
          timestamp: "2025-01-01T10:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_015",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/test.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const session2 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-016",
          timestamp: "2025-01-05T10:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_016",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/test.ts",
                  old_string: "b",
                  new_string: "c",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        path.join(projectsDir, "session-011", "session.jsonl"),
        session1,
      );
      fileSystem.setFile(
        path.join(projectsDir, "session-012", "session.jsonl"),
        session2,
      );

      await service.buildIndex();

      // Filter by date range
      const history = await service.findSessionsByFile(
        "/home/user/project/src/test.ts",
        {
          fromDate: "2025-01-03T00:00:00.000Z",
          toDate: "2025-01-06T00:00:00.000Z",
        },
      );

      expect(history.totalSessions).toBe(1);
      expect(history.sessions[0]!.sessionId).toBe("session-012");
    });

    test("applies pagination", async () => {
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      // Create 3 sessions
      for (let i = 0; i < 3; i++) {
        const session = [
          JSON.stringify({
            type: "session",
            projectPath: "/home/user/project",
          }),
          JSON.stringify({
            type: "assistant",
            uuid: `msg-${i}`,
            timestamp: `2025-01-0${i + 1}T10:00:00.000Z`,
            message: {
              content: [
                {
                  type: "tool_use",
                  id: `toolu_${i}`,
                  name: "Edit",
                  input: {
                    file_path: "/home/user/project/src/test.ts",
                    old_string: "a",
                    new_string: "b",
                  },
                },
              ],
            },
          }),
        ].join("\n");

        fileSystem.setFile(
          path.join(projectsDir, `session-${13 + i}`, "session.jsonl"),
          session,
        );
      }

      await service.buildIndex();

      // Get first 2 sessions
      const history = await service.findSessionsByFile(
        "/home/user/project/src/test.ts",
        {
          limit: 2,
          offset: 0,
        },
      );

      expect(history.totalSessions).toBe(3); // Total count
      expect(history.sessions).toHaveLength(2); // Paginated result
    });

    test("includes change content when requested", async () => {
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      const session = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-017",
          timestamp: "2025-01-01T22:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_017",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/test.ts",
                  old_string: "const x = 1;",
                  new_string: "const x = 2;",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        path.join(projectsDir, "session-016", "session.jsonl"),
        session,
      );

      await service.buildIndex();

      const history = await service.findSessionsByFile(
        "/home/user/project/src/test.ts",
        {
          includeContent: true,
        },
      );

      expect(history.sessions).toHaveLength(1);
      expect(history.sessions[0]!.changes).toHaveLength(1);
      const change = history.sessions[0]!.changes[0];
      expect(change).toBeDefined();
      expect(change!.oldContent).toBe("const x = 1;");
      expect(change!.newContent).toBe("const x = 2;");
    });
  });

  describe("findSessionsByFilePattern", () => {
    test("finds sessions matching glob pattern", async () => {
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      // Create sessions with different file types
      const session1 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-018",
          timestamp: "2025-01-01T23:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_018",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/file1.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const session2 = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-019",
          timestamp: "2025-01-02T00:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_019",
                name: "Write",
                input: {
                  file_path: "/home/user/project/README.md",
                  content: "markdown",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        path.join(projectsDir, "session-017", "session.jsonl"),
        session1,
      );
      fileSystem.setFile(
        path.join(projectsDir, "session-018", "session.jsonl"),
        session2,
      );

      await service.buildIndex();

      // Find all .ts files
      const histories = await service.findSessionsByFilePattern("**/*.ts");

      expect(histories.length).toBeGreaterThan(0);
      expect(histories.some((h) => h.path.endsWith(".ts"))).toBe(true);
    });

    test("returns empty array if no files match pattern", async () => {
      await service.buildIndex();

      const histories =
        await service.findSessionsByFilePattern("**/*.nonexistent");

      expect(histories).toHaveLength(0);
    });
  });

  // ============================================================================
  // Indexing
  // ============================================================================

  describe("buildIndex", () => {
    test("builds index from all sessions", async () => {
      const homeDir = process.env["HOME"] ?? "/home/user";
      const projectsDir = path.join(homeDir, ".claude", "projects");

      const session = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-020",
          timestamp: "2025-01-02T01:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_020",
                name: "Edit",
                input: {
                  file_path: "/home/user/project/src/test.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
            ],
          },
        }),
      ].join("\n");

      fileSystem.setFile(
        path.join(projectsDir, "session-019", "session.jsonl"),
        session,
      );

      const stats = await service.buildIndex();

      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalChanges).toBeGreaterThan(0);
    });
  });

  describe("getIndexStats", () => {
    test("returns index statistics", async () => {
      await service.buildIndex();

      const stats = await service.getIndexStats();

      expect(stats).toHaveProperty("totalSessions");
      expect(stats).toHaveProperty("totalFiles");
      expect(stats).toHaveProperty("totalChanges");
      expect(stats).toHaveProperty("lastIndexed");
      expect(stats).toHaveProperty("indexSize");
    });
  });
});
