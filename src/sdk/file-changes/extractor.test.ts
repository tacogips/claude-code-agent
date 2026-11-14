/**
 * Tests for FileChangeExtractor.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { FileChangeExtractor } from "./extractor";
import { createTestContainer } from "../../container";
import type { Container } from "../../container";
import { MockFileSystem } from "../../test/mocks/filesystem";

describe("FileChangeExtractor", () => {
  let container: Container;
  let fileSystem: MockFileSystem;
  let extractor: FileChangeExtractor;

  beforeEach(() => {
    container = createTestContainer();
    fileSystem = container.fileSystem as MockFileSystem;
    extractor = new FileChangeExtractor(container);
  });

  describe("extractFromTranscript", () => {
    test("parses Edit tool calls", async () => {
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
                  file_path: "src/test.ts",
                  old_string: "const x = 1;",
                  new_string: "const x = 2;",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath);

      expect(result.changedFiles).toHaveLength(1);
      const changedFile = result.changedFiles[0];
      expect(changedFile).toBeDefined();
      expect(changedFile!.path).toContain("src/test.ts");
      expect(changedFile!.changeCount).toBe(1);
      expect(changedFile!.toolsUsed).toContain("Edit");
      expect(changedFile!.changes).toHaveLength(1);
      expect(changedFile!.changes[0]!.tool).toBe("Edit");
    });

    test("parses Write tool calls", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
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
                  file_path: "src/new.ts",
                  content: "export const value = 42;",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath);

      expect(result.changedFiles).toHaveLength(1);
      const changedFile = result.changedFiles[0];
      expect(changedFile).toBeDefined();
      expect(changedFile!.path).toContain("src/new.ts");
      expect(changedFile!.changeCount).toBe(1);
      expect(changedFile!.toolsUsed).toContain("Write");
      expect(changedFile!.operation).toBe("created");
    });

    test("parses MultiEdit tool calls", async () => {
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
                name: "MultiEdit",
                input: {
                  edits: [
                    {
                      file_path: "src/file1.ts",
                      old_string: "a",
                      new_string: "b",
                    },
                    {
                      file_path: "src/file2.ts",
                      old_string: "c",
                      new_string: "d",
                    },
                  ],
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath);

      expect(result.changedFiles).toHaveLength(2);
      expect(result.changedFiles.some((f) => f.path.includes("file1.ts"))).toBe(
        true,
      );
      expect(result.changedFiles.some((f) => f.path.includes("file2.ts"))).toBe(
        true,
      );
    });

    test("aggregates multiple changes to same file", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
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
                  old_string: "y",
                  new_string: "z",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath);

      expect(result.changedFiles).toHaveLength(1);
      const changedFile = result.changedFiles[0];
      expect(changedFile).toBeDefined();
      expect(changedFile!.changeCount).toBe(2);
      expect(changedFile!.changes).toHaveLength(2);
      expect(changedFile!.firstModified).toBe("2025-01-01T13:00:00.000Z");
      expect(changedFile!.lastModified).toBe("2025-01-01T14:00:00.000Z");
    });

    test("enriches with file-history-snapshot data", async () => {
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
                  file_path: "/home/user/project/src/test.ts",
                  old_string: "x",
                  new_string: "y",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "file-history-snapshot",
          snapshot: {
            trackedFileBackups: {
              "/home/user/project/src/test.ts": {
                version: 3,
                backupFileName: "hash@v3",
                backupTime: "2025-01-01T15:00:10.000Z",
              },
            },
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath);

      expect(result.changedFiles).toHaveLength(1);
      const changedFile = result.changedFiles[0];
      expect(changedFile).toBeDefined();
      expect(changedFile!.version).toBe(3);
      expect(changedFile!.backupFileName).toBe("hash@v3");
    });

    test("includes content when requested", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
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
                  old_string: "const x = 1;",
                  new_string: "const x = 2;",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath, {
        includeContent: true,
      });

      expect(result.changedFiles).toHaveLength(1);
      const changedFile = result.changedFiles[0];
      expect(changedFile).toBeDefined();
      const change = changedFile!.changes[0];
      expect(change).toBeDefined();
      expect(change!.oldContent).toBe("const x = 1;");
      expect(change!.newContent).toBe("const x = 2;");
    });

    test("filters by extension", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
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
                  file_path: "src/test.ts",
                  content: "typescript",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-009",
          timestamp: "2025-01-01T17:05:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_009",
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

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath, {
        extensions: [".ts"],
      });

      expect(result.changedFiles).toHaveLength(1);
      expect(result.changedFiles[0]!.path).toContain(".ts");
    });

    test("filters by directory", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-010",
          timestamp: "2025-01-01T18:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_010",
                name: "Write",
                input: {
                  file_path: "/home/user/project/src/file1.ts",
                  content: "in src",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-011",
          timestamp: "2025-01-01T18:05:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_011",
                name: "Write",
                input: {
                  file_path: "/home/user/project/tests/file2.ts",
                  content: "in tests",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath, {
        directories: ["/home/user/project/src"],
      });

      expect(result.changedFiles).toHaveLength(1);
      expect(result.changedFiles[0]!.path).toContain("/src/");
    });

    test("handles empty transcript", async () => {
      const transcriptPath = "/tmp/empty.jsonl";
      fileSystem.setFile(transcriptPath, "");

      const result = await extractor.extractFromTranscript(transcriptPath);

      expect(result.changedFiles).toHaveLength(0);
    });

    test("handles malformed JSON lines gracefully", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        "{ this is not valid json",
        JSON.stringify({
          type: "assistant",
          uuid: "msg-012",
          timestamp: "2025-01-01T19:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_012",
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
      ].join("\n");

      const transcriptPath = "/tmp/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const result = await extractor.extractFromTranscript(transcriptPath);

      // Should still parse valid lines
      expect(result.changedFiles).toHaveLength(1);
    });
  });

  describe("extractFromSession", () => {
    test("builds complete summary with statistics", async () => {
      const transcriptContent = [
        JSON.stringify({
          type: "session",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-013",
          timestamp: "2025-01-01T20:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_013",
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
          uuid: "msg-014",
          timestamp: "2025-01-01T21:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_014",
                name: "Write",
                input: {
                  file_path: "src/file2.ts",
                  content: "new file",
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-015",
          timestamp: "2025-01-01T22:00:00.000Z",
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_015",
                name: "Edit",
                input: {
                  file_path: "README.md",
                  old_string: "x",
                  new_string: "y",
                },
              },
            ],
          },
        }),
      ].join("\n");

      const transcriptPath = "/tmp/test-session/session.jsonl";
      fileSystem.setFile(transcriptPath, transcriptContent);

      const summary = await extractor.extractFromSession(transcriptPath);

      expect(summary.totalFilesChanged).toBe(3);
      expect(summary.totalChanges).toBe(3);
      expect(summary.files).toHaveLength(3);
      expect(summary.sessionStart).toBe("2025-01-01T20:00:00.000Z");
      expect(summary.sessionEnd).toBe("2025-01-01T22:00:00.000Z");
      expect(summary.byExtension[".ts"]).toBe(2);
      expect(summary.byExtension[".md"]).toBe(1);
    });
  });
});
