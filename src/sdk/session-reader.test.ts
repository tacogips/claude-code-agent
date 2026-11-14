/**
 * Tests for SessionReader.
 *
 * @module sdk/session-reader.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SessionReader } from "./session-reader";
import { MockFileSystem } from "../test/mocks/filesystem";
import { createTestContainer } from "../container";
import type { Container } from "../container";
import { FileNotFoundError } from "../errors";

describe("SessionReader", () => {
  let fs: MockFileSystem;
  let container: Container;
  let reader: SessionReader;

  beforeEach(() => {
    fs = new MockFileSystem();
    container = createTestContainer({ fileSystem: fs });
    reader = new SessionReader(container);
  });

  describe("readSession", () => {
    it("should read and parse a simple session file (new nested format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "user",
            content: "Hello",
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: {
            role: "assistant",
            content: "Hi there!",
          },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.id).toBe("session-123");
        expect(session.status).toBe("active");
        expect(session.createdAt).toBe("2026-01-01T00:00:00Z");
        expect(session.messages).toHaveLength(2);
        expect(session.messages[0]?.id).toBe("msg-uuid-1");
        expect(session.messages[0]?.role).toBe("user");
        expect(session.messages[0]?.content).toBe("Hello");
        expect(session.messages[1]?.id).toBe("msg-uuid-2");
        expect(session.messages[1]?.role).toBe("assistant");
        expect(session.messages[1]?.content).toBe("Hi there!");
      }
    });

    it("should read and parse a simple session file (old format - metadata only)", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          sessionId: "session-123",
          projectPath: "/home/user/project",
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
        }),
        JSON.stringify({
          id: "msg-2",
          role: "assistant",
          content: "Hi there!",
          timestamp: "2026-01-01T00:00:01Z",
        }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        // Old format: sessionId and timestamps are extracted, messages are not
        expect(session.id).toBe("session-123");
        expect(session.createdAt).toBe("2026-01-01T00:00:00Z");
        expect(session.messages).toHaveLength(0); // Old format messages no longer parsed
        // projectPath and status are no longer extracted from old format
      }
    });

    it("should handle session file with tool calls (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "I'll read the file" },
              {
                type: "tool_use",
                id: "call-1",
                name: "Read",
                input: { file_path: "/test/file.txt" },
              },
            ],
          },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(1);
        const message = session.messages[0];
        expect(message?.content).toBe("I'll read the file");
        expect(message?.toolCalls).toBeDefined();
        expect(message?.toolCalls).toHaveLength(1);
        expect(message?.toolCalls?.[0]?.id).toBe("call-1");
        expect(message?.toolCalls?.[0]?.name).toBe("Read");
        expect(message?.toolCalls?.[0]?.input).toEqual({
          file_path: "/test/file.txt",
        });
      }
    });

    it("should handle session file with tool calls", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "assistant",
          content: "I'll read the file",
          timestamp: "2026-01-01T00:00:00Z",
          sessionId: "session-123",
          projectPath: "/home/user/project",
          toolCalls: [
            {
              id: "call-1",
              name: "Read",
              input: { file_path: "/test/file.txt" },
            },
          ],
        }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(0); // Old format no longer parsed
      }
    });

    it("should handle session file with tool results (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "call-1",
                content: "File content here",
                is_error: false,
              },
            ],
          },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(1);
        const message = session.messages[0];
        expect(message?.toolResults).toBeDefined();
        expect(message?.toolResults).toHaveLength(1);
        expect(message?.toolResults?.[0]?.id).toBe("call-1");
        expect(message?.toolResults?.[0]?.output).toBe("File content here");
        expect(message?.toolResults?.[0]?.isError).toBe(false);
      }
    });

    it("should handle session file with tool results", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "system",
          content: "",
          timestamp: "2026-01-01T00:00:00Z",
          sessionId: "session-123",
          projectPath: "/home/user/project",
          toolResults: [
            {
              id: "call-1",
              output: "File content here",
              isError: false,
            },
          ],
        }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(0); // Old format no longer parsed
      }
    });

    it("should derive session ID from UUID filename when not in content", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
        }),
      ].join("\n");

      fs.setFile(
        "/claude/projects/abc123/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/claude/projects/abc123/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.id).toBe("88487b4c-f3f6-4a49-b59b-d1d4a098425f");
      }
    });

    it("should derive session ID from path when not in content", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
        }),
      ].join("\n");

      fs.setFile("/claude/projects/abc123/session.jsonl", sessionContent);

      const result = await reader.readSession(
        "/claude/projects/abc123/session.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.id).toBe("abc123");
      }
    });

    it("should handle empty session file", async () => {
      fs.setFile("/test/session.jsonl", "");

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(0);
        expect(session.status).toBe("active");
      }
    });

    it("should handle session file with empty lines (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "Hello" },
        }),
        "",
        "  ",
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: { role: "assistant", content: "Hi" },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(2);
      }
    });

    it("should handle session file with empty lines", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
        }),
        "",
        "  ",
        JSON.stringify({
          id: "msg-2",
          role: "assistant",
          content: "Hi",
          timestamp: "2026-01-01T00:00:01Z",
        }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(0); // Old format no longer parsed
      }
    });

    it("should return FileNotFoundError when file does not exist", async () => {
      const result = await reader.readSession("/nonexistent/session.jsonl");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(FileNotFoundError);
        if (result.error instanceof FileNotFoundError) {
          expect(result.error.path).toBe("/nonexistent/session.jsonl");
        }
      }
    });

    it("should return ParseError when JSONL is malformed", async () => {
      const sessionContent = [
        JSON.stringify({ id: "msg-1", role: "user", content: "Hello" }),
        "{ invalid json",
        JSON.stringify({ id: "msg-2", role: "assistant", content: "Hi" }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("PARSE_ERROR");
      }
    });

    it("should skip non-message lines gracefully (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "Hello" },
        }),
        JSON.stringify({ type: "system", name: "session_started" }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: { role: "assistant", content: "Hi" },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(2);
      }
    });

    it("should skip non-message lines gracefully", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
        }),
        JSON.stringify({ type: "event", name: "session_started" }),
        JSON.stringify({
          id: "msg-2",
          role: "assistant",
          content: "Hi",
          timestamp: "2026-01-01T00:00:01Z",
        }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.messages).toHaveLength(0); // Old format no longer parsed
      }
    });

    it("should handle different session statuses", async () => {
      // Status is always inferred as 'active' in current implementation
      // (status field is not stored in Claude Code session files)
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        `/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl`,
        sessionContent,
      );

      const result = await reader.readSession(
        `/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl`,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("active"); // Always inferred as active
      }
    });

    it("should use current timestamp when timestamps not in file", async () => {
      const beforeTest = new Date().toISOString();

      const sessionContent = JSON.stringify({
        id: "msg-1",
        role: "user",
        content: "Hello",
      });

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readSession("/test/session.jsonl");

      const afterTest = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.createdAt).toBeDefined();
        expect(session.updatedAt).toBeDefined();
        // Timestamps should be within test execution window
        expect(session.createdAt >= beforeTest).toBe(true);
        expect(session.createdAt <= afterTest).toBe(true);
      }
    });
  });

  describe("readMessages", () => {
    it("should read only messages from session file (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "Hello" },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: { role: "assistant", content: "Hi" },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readMessages(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const messages = result.value;
        expect(messages).toHaveLength(2);
        expect(messages[0]?.id).toBe("msg-uuid-1");
        expect(messages[1]?.id).toBe("msg-uuid-2");
      }
    });

    it("should read only messages from session file", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          sessionId: "session-123",
          projectPath: "/home/user/project",
        }),
        JSON.stringify({
          id: "msg-2",
          role: "assistant",
          content: "Hi",
          timestamp: "2026-01-01T00:00:01Z",
        }),
      ].join("\n");

      fs.setFile("/test/session.jsonl", sessionContent);

      const result = await reader.readMessages("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const messages = result.value;
        expect(messages).toHaveLength(0); // Old format no longer parsed
      }
    });

    it("should return FileNotFoundError when file does not exist", async () => {
      const result = await reader.readMessages("/nonexistent/session.jsonl");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(FileNotFoundError);
      }
    });

    it("should return empty array for empty session", async () => {
      fs.setFile("/test/session.jsonl", "");

      const result = await reader.readMessages("/test/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe("findSessionFiles", () => {
    it("should find UUID-named session files in directory", async () => {
      fs.setFile("/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl", "{}");
      fs.setFile("/project/12345678-1234-1234-1234-123456789abc.jsonl", "{}");

      const files = await reader.findSessionFiles("/project");

      expect(files).toHaveLength(2);
      expect(files).toContain(
        "/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );
      expect(files).toContain(
        "/project/12345678-1234-1234-1234-123456789abc.jsonl",
      );
    });

    it("should find session.jsonl in single directory", async () => {
      fs.setFile("/project/session.jsonl", "{}");

      const files = await reader.findSessionFiles("/project");

      expect(files).toHaveLength(1);
      expect(files[0]).toBe("/project/session.jsonl");
    });

    it("should find session files in nested directories", async () => {
      fs.setFile("/claude/projects/abc/session.jsonl", "{}");
      fs.setFile("/claude/projects/def/session.jsonl", "{}");
      fs.setFile("/claude/projects/ghi/session.jsonl", "{}");

      const files = await reader.findSessionFiles("/claude/projects");

      expect(files).toHaveLength(3);
      expect(files).toContain("/claude/projects/abc/session.jsonl");
      expect(files).toContain("/claude/projects/def/session.jsonl");
      expect(files).toContain("/claude/projects/ghi/session.jsonl");
    });

    it("should ignore non-session files", async () => {
      fs.setFile("/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl", "{}");
      fs.setFile("/project/other.txt", "content");
      fs.setFile("/project/data.json", "{}");
      fs.setFile("/project/agent-a01b1a4.jsonl", "{}"); // Agent files not supported yet

      const files = await reader.findSessionFiles("/project");

      expect(files).toHaveLength(1);
      expect(files[0]).toBe(
        "/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );
    });

    it("should reject malformed UUID filenames", async () => {
      fs.setFile("/project/not-a-uuid.jsonl", "{}");
      fs.setFile("/project/12345678-1234-1234-1234.jsonl", "{}"); // Too short
      fs.setFile("/project/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jsonl", "{}"); // Invalid hex

      const files = await reader.findSessionFiles("/project");

      expect(files).toHaveLength(0);
    });

    it("should return empty array when directory does not exist", async () => {
      const files = await reader.findSessionFiles("/nonexistent");

      expect(files).toHaveLength(0);
    });

    it("should return empty array when directory has no sessions", async () => {
      fs.setDirectory("/empty");

      const files = await reader.findSessionFiles("/empty");

      expect(files).toHaveLength(0);
    });

    it("should search one level deep (Claude Code structure)", async () => {
      // Claude Code structure: ~/.claude/projects/{project-hash}/{uuid}.jsonl
      fs.setFile(
        "/claude/projects/abc/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        "{}",
      );
      fs.setFile(
        "/claude/projects/def/12345678-1234-1234-1234-123456789abc.jsonl",
        "{}",
      );

      const files = await reader.findSessionFiles("/claude/projects");

      expect(files).toHaveLength(2);
      expect(files).toContain(
        "/claude/projects/abc/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );
      expect(files).toContain(
        "/claude/projects/def/12345678-1234-1234-1234-123456789abc.jsonl",
      );
    });

    it("should not search deeply nested directories (max one level)", async () => {
      // Files more than one level deep should not be found
      fs.setFile("/a/b/c/d/session.jsonl", "{}");
      fs.setFile("/a/b/e/session.jsonl", "{}");

      const files = await reader.findSessionFiles("/a");

      // Should only find files in /a/b/ (one level deep), not /a/b/c/d/ or /a/b/e/
      expect(files).toHaveLength(0);
    });

    it("should return file directly if path is UUID session file", async () => {
      fs.setFile("/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl", "{}");

      const files = await reader.findSessionFiles(
        "/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(files).toHaveLength(1);
      expect(files[0]).toBe(
        "/project/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );
    });

    it("should return file directly if path is session.jsonl file", async () => {
      fs.setFile("/project/session.jsonl", "{}");

      const files = await reader.findSessionFiles("/project/session.jsonl");

      expect(files).toHaveLength(1);
      expect(files[0]).toBe("/project/session.jsonl");
    });

    it("should return empty array if path is non-session file", async () => {
      fs.setFile("/project/other.txt", "content");

      const files = await reader.findSessionFiles("/project/other.txt");

      expect(files).toHaveLength(0);
    });

    it("should handle mixed directory structure", async () => {
      fs.setFile("/root/session.jsonl", "{}");
      fs.setFile("/root/subdir/session.jsonl", "{}");
      fs.setFile("/root/other.txt", "text");
      fs.setDirectory("/root/emptydir");

      const files = await reader.findSessionFiles("/root");

      expect(files).toHaveLength(2);
      expect(files).toContain("/root/session.jsonl");
      expect(files).toContain("/root/subdir/session.jsonl");
    });
  });

  describe("listSessions", () => {
    it("should list all sessions from specified directory (new format)", async () => {
      // Create multiple session files
      const session1 = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-abc",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Hello" },
      });

      const session2 = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-2",
        sessionId: "session-def",
        timestamp: "2026-01-02T00:00:00Z",
        message: { role: "user", content: "World" },
      });

      fs.setFile(
        "/claude/projects/abc/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        session1,
      );
      fs.setFile(
        "/claude/projects/def/12345678-1234-1234-1234-123456789abc.jsonl",
        session2,
      );

      const sessions = await reader.listSessions("/claude/projects");

      expect(sessions).toHaveLength(2);
      expect(sessions[0]?.id).toBe("session-abc");
      expect(sessions[0]?.messageCount).toBe(1);
      expect(sessions[1]?.id).toBe("session-def");
      expect(sessions[1]?.messageCount).toBe(1);
    });

    it("should list all sessions from specified directory (old format - metadata only)", async () => {
      // Create multiple session files
      const session1 = JSON.stringify({
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
        sessionId: "session-abc",
        projectPath: "/project-a",
        status: "completed",
        createdAt: "2026-01-01T00:00:00Z",
      });

      const session2 = JSON.stringify({
        id: "msg-2",
        role: "user",
        content: "World",
        timestamp: "2026-01-02T00:00:00Z",
        sessionId: "session-def",
        projectPath: "/project-b",
        status: "active",
        createdAt: "2026-01-02T00:00:00Z",
      });

      fs.setFile("/claude/projects/abc/session.jsonl", session1);
      fs.setFile("/claude/projects/def/session.jsonl", session2);

      const sessions = await reader.listSessions("/claude/projects");

      // Old format: sessions found with metadata but no messages
      expect(sessions).toHaveLength(2);
      expect(sessions[0]?.id).toBe("session-abc");
      expect(sessions[0]?.messageCount).toBe(0);
      expect(sessions[1]?.id).toBe("session-def");
      expect(sessions[1]?.messageCount).toBe(0);
    });

    it("should return empty array when no sessions exist", async () => {
      fs.setDirectory("/claude/projects");

      const sessions = await reader.listSessions("/claude/projects");

      expect(sessions).toHaveLength(0);
    });

    it("should skip sessions that fail to parse", async () => {
      const validSession = JSON.stringify({
        id: "msg-1",
        role: "user",
        content: "Valid",
        timestamp: "2026-01-01T00:00:00Z",
        sessionId: "session-valid",
        projectPath: "/project",
      });

      fs.setFile("/claude/projects/valid/session.jsonl", validSession);
      fs.setFile("/claude/projects/invalid/session.jsonl", "{ invalid json");

      const sessions = await reader.listSessions("/claude/projects");

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe("session-valid");
    });

    it("should include message count in metadata (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "session-multi",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "First" },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "session-multi",
          timestamp: "2026-01-01T00:00:01Z",
          message: { role: "assistant", content: "Second" },
        }),
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-3",
          sessionId: "session-multi",
          timestamp: "2026-01-01T00:00:02Z",
          message: { role: "user", content: "Third" },
        }),
      ].join("\n");

      fs.setFile(
        "/claude/projects/multi/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const sessions = await reader.listSessions("/claude/projects");

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messageCount).toBe(3);
    });

    it("should include message count in metadata (old format)", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "First",
          timestamp: "2026-01-01T00:00:00Z",
          sessionId: "session-multi",
        }),
        JSON.stringify({
          id: "msg-2",
          role: "assistant",
          content: "Second",
          timestamp: "2026-01-01T00:00:01Z",
        }),
        JSON.stringify({
          id: "msg-3",
          role: "user",
          content: "Third",
          timestamp: "2026-01-01T00:00:02Z",
        }),
      ].join("\n");

      fs.setFile("/claude/projects/multi/session.jsonl", sessionContent);

      const sessions = await reader.listSessions("/claude/projects");

      // Old format: session found but message count is 0
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messageCount).toBe(0);
    });
  });

  describe("getSession", () => {
    beforeEach(() => {
      // Mock HOME environment variable for default directory
      process.env["HOME"] = "/home/testuser";
    });

    it("should find and return session by ID (new format)", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "target-session",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        "/home/testuser/.claude/projects/target/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const session = await reader.getSession("target-session");

      expect(session).not.toBeNull();
      expect(session?.id).toBe("target-session");
      expect(session?.messages).toHaveLength(1);
    });

    it("should find and return session by ID (old format - metadata only)", async () => {
      const sessionContent = JSON.stringify({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: "2026-01-01T00:00:00Z",
        sessionId: "target-session",
        projectPath: "/project",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
      });

      fs.setFile(
        "/home/testuser/.claude/projects/target/session.jsonl",
        sessionContent,
      );

      const session = await reader.getSession("target-session");

      // Old format: session found with metadata but no messages
      expect(session).not.toBeNull();
      expect(session?.id).toBe("target-session");
      expect(session?.messages).toHaveLength(0);
    });

    it("should return null when session ID not found", async () => {
      const sessionContent = JSON.stringify({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: "2026-01-01T00:00:00Z",
        sessionId: "session-abc",
      });

      fs.setFile(
        "/home/testuser/.claude/projects/abc/session.jsonl",
        sessionContent,
      );

      const session = await reader.getSession("nonexistent-session");

      expect(session).toBeNull();
    });

    it("should search all sessions and return first match", async () => {
      const session1 = JSON.stringify({
        id: "msg-1",
        role: "user",
        content: "First",
        timestamp: "2026-01-01T00:00:00Z",
        sessionId: "session-1",
      });

      const session2 = JSON.stringify({
        id: "msg-2",
        role: "user",
        content: "Second",
        timestamp: "2026-01-02T00:00:00Z",
        sessionId: "session-2",
      });

      fs.setFile("/home/testuser/.claude/projects/s1/session.jsonl", session1);
      fs.setFile("/home/testuser/.claude/projects/s2/session.jsonl", session2);

      const session = await reader.getSession("session-2");

      expect(session).not.toBeNull();
      expect(session?.id).toBe("session-2");
    });

    it("should return null when projects directory does not exist", async () => {
      const session = await reader.getSession("any-session");

      expect(session).toBeNull();
    });
  });

  describe("extractTasks", () => {
    it("should extract tasks from TodoWrite tool call with single task", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "I'll track these tasks" },
            {
              type: "tool_use",
              id: "toolu_123",
              name: "TodoWrite",
              input: {
                todos: [
                  {
                    content: "Implement feature X",
                    status: "in_progress",
                    activeForm: "Working on implementation",
                  },
                ],
              },
            },
          ],
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(1);
        expect(session.tasks[0]?.content).toBe("Implement feature X");
        expect(session.tasks[0]?.status).toBe("in_progress");
        expect(session.tasks[0]?.activeForm).toBe("Working on implementation");
      }
    });

    it("should extract tasks from TodoWrite tool call with multiple tasks", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "TodoWrite",
              input: {
                todos: [
                  {
                    content: "Task 1",
                    status: "completed",
                    activeForm: "Done",
                  },
                  {
                    content: "Task 2",
                    status: "in_progress",
                    activeForm: "Working on it",
                  },
                  {
                    content: "Task 3",
                    status: "pending",
                    activeForm: "Not started",
                  },
                ],
              },
            },
          ],
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(3);
        expect(session.tasks[0]?.content).toBe("Task 1");
        expect(session.tasks[0]?.status).toBe("completed");
        expect(session.tasks[1]?.content).toBe("Task 2");
        expect(session.tasks[1]?.status).toBe("in_progress");
        expect(session.tasks[2]?.content).toBe("Task 3");
        expect(session.tasks[2]?.status).toBe("pending");
      }
    });

    it("should return empty array when no TodoWrite calls present", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "No tasks here" },
            {
              type: "tool_use",
              id: "toolu_123",
              name: "Read",
              input: { file_path: "/test/file.txt" },
            },
          ],
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(0);
      }
    });

    it("should return empty array when TodoWrite has missing input.todos", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "TodoWrite",
              input: {},
            },
          ],
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(0);
      }
    });

    it("should skip invalid task entries (missing required fields)", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "TodoWrite",
              input: {
                todos: [
                  {
                    content: "Valid task",
                    status: "pending",
                    activeForm: "Not started",
                  },
                  {
                    content: "Missing status",
                    activeForm: "No status",
                  },
                  {
                    status: "pending",
                    activeForm: "No content",
                  },
                  {
                    content: "Missing activeForm",
                    status: "completed",
                  },
                  {
                    content: "Invalid status",
                    status: "unknown",
                    activeForm: "Bad status",
                  },
                ],
              },
            },
          ],
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        // Only the valid task should be extracted
        expect(session.tasks).toHaveLength(1);
        expect(session.tasks[0]?.content).toBe("Valid task");
        expect(session.tasks[0]?.status).toBe("pending");
      }
    });

    it("should handle multiple TodoWrite calls (keeps last)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "toolu_123",
                name: "TodoWrite",
                input: {
                  todos: [
                    {
                      content: "First task list",
                      status: "pending",
                      activeForm: "First",
                    },
                  ],
                },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "toolu_456",
                name: "TodoWrite",
                input: {
                  todos: [
                    {
                      content: "Second task list",
                      status: "completed",
                      activeForm: "Second",
                    },
                  ],
                },
              },
            ],
          },
        }),
      ].join("\n");

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        // Should keep tasks from last TodoWrite call
        expect(session.tasks).toHaveLength(1);
        expect(session.tasks[0]?.content).toBe("Second task list");
        expect(session.tasks[0]?.status).toBe("completed");
      }
    });

    it("should handle message with string content (no tasks)", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: "Simple text response",
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(0);
      }
    });

    it("should handle missing message field gracefully", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        // No message field
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(0);
      }
    });

    it("should validate all three task status types", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "TodoWrite",
              input: {
                todos: [
                  {
                    content: "Pending task",
                    status: "pending",
                    activeForm: "Waiting",
                  },
                  {
                    content: "In progress task",
                    status: "in_progress",
                    activeForm: "Doing",
                  },
                  {
                    content: "Completed task",
                    status: "completed",
                    activeForm: "Done",
                  },
                ],
              },
            },
          ],
        },
      });

      fs.setFile(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/test/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tasks).toHaveLength(3);
        expect(session.tasks[0]?.status).toBe("pending");
        expect(session.tasks[1]?.status).toBe("in_progress");
        expect(session.tasks[2]?.status).toBe("completed");
      }
    });
  });

  describe("deriveProjectPath", () => {
    it("should decode dash-encoded absolute path", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        cwd: "/g/gits/tacogips/claude-code-agent",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        "/home/user/.claude/projects/-g-gits-tacogips-claude-code-agent/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/home/user/.claude/projects/-g-gits-tacogips-claude-code-agent/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectPath).toBe("/g/gits/tacogips/claude-code-agent");
      }
    });

    it("should decode simple encoded path", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        "/home/user/.claude/projects/-home-user-project/session.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/home/user/.claude/projects/-home-user-project/session.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectPath).toBe("/home/user/project");
      }
    });

    it("should handle single-level encoded path", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        "/home/user/.claude/projects/-tmp/session.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/home/user/.claude/projects/-tmp/session.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectPath).toBe("/tmp");
      }
    });

    it("should return empty string when path missing projects segment", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile("/some/other/path/session.jsonl", sessionContent);

      const result = await reader.readSession("/some/other/path/session.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectPath).toBe("");
      }
    });

    it("should return empty string when projects segment at end of path", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile("/home/user/.claude/projects", sessionContent);

      const result = await reader.readSession("/home/user/.claude/projects");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectPath).toBe("");
      }
    });

    it("should handle path without leading dash (relative path)", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        "/home/user/.claude/projects/my-project/session.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/home/user/.claude/projects/my-project/session.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        // Without leading dash, dashes are still converted to slashes
        expect(session.projectPath).toBe("my/project");
      }
    });

    it("should handle deeply nested encoded paths", async () => {
      const sessionContent = JSON.stringify({
        type: "user",
        uuid: "msg-uuid-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "Test" },
      });

      fs.setFile(
        "/home/user/.claude/projects/-a-b-c-d-e-f/session.jsonl",
        sessionContent,
      );

      const result = await reader.readSession(
        "/home/user/.claude/projects/-a-b-c-d-e-f/session.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectPath).toBe("/a/b/c/d/e/f");
      }
    });
  });

  describe("getMessages", () => {
    beforeEach(() => {
      process.env["HOME"] = "/home/testuser";
    });

    it("should return messages for session by ID (new format)", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-uuid-1",
          sessionId: "target-session",
          timestamp: "2026-01-01T00:00:00Z",
          message: { role: "user", content: "Hello" },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-uuid-2",
          sessionId: "target-session",
          timestamp: "2026-01-01T00:00:01Z",
          message: { role: "assistant", content: "Hi" },
        }),
      ].join("\n");

      fs.setFile(
        "/home/testuser/.claude/projects/target/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const messages = await reader.getMessages("target-session");

      expect(messages).toHaveLength(2);
      expect(messages[0]?.id).toBe("msg-uuid-1");
      expect(messages[0]?.content).toBe("Hello");
      expect(messages[1]?.id).toBe("msg-uuid-2");
      expect(messages[1]?.content).toBe("Hi");
    });

    it("should return messages for session by ID", async () => {
      const sessionContent = [
        JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          sessionId: "target-session",
        }),
        JSON.stringify({
          id: "msg-2",
          role: "assistant",
          content: "Hi",
          timestamp: "2026-01-01T00:00:01Z",
        }),
      ].join("\n");

      fs.setFile(
        "/home/testuser/.claude/projects/target/session.jsonl",
        sessionContent,
      );

      const messages = await reader.getMessages("target-session");

      expect(messages).toHaveLength(0); // Old format no longer parsed
    });

    it("should return empty array when session not found", async () => {
      const messages = await reader.getMessages("nonexistent-session");

      expect(messages).toHaveLength(0);
    });

    it("should return empty array when session exists but has no messages", async () => {
      fs.setFile("/home/testuser/.claude/projects/empty/session.jsonl", "");

      // First, we need to know the session ID - let's use derived ID from path
      const sessionContent = JSON.stringify({
        sessionId: "empty",
        projectPath: "/project",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
      });
      fs.setFile(
        "/home/testuser/.claude/projects/empty/session.jsonl",
        sessionContent,
      );

      const messages = await reader.getMessages("empty");

      expect(messages).toHaveLength(0);
    });
  });

  describe("token usage extraction", () => {
    it("should extract and aggregate token usage from assistant messages", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "user",
          uuid: "msg-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "user",
            content: "Hello",
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: {
            role: "assistant",
            content: "Hi there!",
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              cache_read_input_tokens: 20,
              cache_creation_input_tokens: 10,
            },
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-3",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:02Z",
          message: {
            role: "assistant",
            content: "More content",
            usage: {
              input_tokens: 200,
              output_tokens: 75,
              cache_read_input_tokens: 30,
            },
          },
        }),
      ].join("\n");

      fs.setFile("/test/session-with-usage.jsonl", sessionContent);

      const result = await reader.readSession("/test/session-with-usage.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tokenUsage).toBeDefined();
        expect(session.tokenUsage?.input).toBe(300); // 100 + 200
        expect(session.tokenUsage?.output).toBe(125); // 50 + 75
        expect(session.tokenUsage?.cacheRead).toBe(50); // 20 + 30
        expect(session.tokenUsage?.cacheWrite).toBe(10); // 10 + 0
      }
    });

    it("should handle assistant messages without usage data", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "assistant",
          uuid: "msg-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "assistant",
            content: "No usage data",
          },
        }),
      ].join("\n");

      fs.setFile("/test/session-no-usage.jsonl", sessionContent);

      const result = await reader.readSession("/test/session-no-usage.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tokenUsage).toBeUndefined();
      }
    });

    it("should return undefined for cache tokens when they are zero", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "assistant",
          uuid: "msg-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "assistant",
            content: "No cache tokens",
            usage: {
              input_tokens: 100,
              output_tokens: 50,
            },
          },
        }),
      ].join("\n");

      fs.setFile("/test/session-no-cache.jsonl", sessionContent);

      const result = await reader.readSession("/test/session-no-cache.jsonl");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tokenUsage).toBeDefined();
        expect(session.tokenUsage?.input).toBe(100);
        expect(session.tokenUsage?.output).toBe(50);
        expect(session.tokenUsage?.cacheRead).toBeUndefined();
        expect(session.tokenUsage?.cacheWrite).toBeUndefined();
      }
    });

    it("should aggregate usage across multiple messages with mixed cache tokens", async () => {
      const sessionContent = [
        JSON.stringify({
          type: "assistant",
          uuid: "msg-1",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:00Z",
          message: {
            role: "assistant",
            content: "First message",
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              cache_creation_input_tokens: 10,
            },
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-2",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:01Z",
          message: {
            role: "assistant",
            content: "Second message",
            usage: {
              input_tokens: 200,
              output_tokens: 75,
              cache_read_input_tokens: 50,
            },
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "msg-3",
          sessionId: "session-123",
          timestamp: "2026-01-01T00:00:02Z",
          message: {
            role: "assistant",
            content: "Third message - no cache",
            usage: {
              input_tokens: 150,
              output_tokens: 60,
            },
          },
        }),
      ].join("\n");

      fs.setFile("/test/session-mixed-cache.jsonl", sessionContent);

      const result = await reader.readSession(
        "/test/session-mixed-cache.jsonl",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.tokenUsage).toBeDefined();
        expect(session.tokenUsage?.input).toBe(450); // 100 + 200 + 150
        expect(session.tokenUsage?.output).toBe(185); // 50 + 75 + 60
        expect(session.tokenUsage?.cacheRead).toBe(50); // 0 + 50 + 0
        expect(session.tokenUsage?.cacheWrite).toBe(10); // 10 + 0 + 0
      }
    });

    it("should include tokenUsage in SessionMetadata when present", async () => {
      const sessionContent = JSON.stringify({
        type: "assistant",
        uuid: "msg-1",
        sessionId: "session-123",
        timestamp: "2026-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: "Content",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      });

      fs.setFile(
        "/claude/projects/abc/88487b4c-f3f6-4a49-b59b-d1d4a098425f.jsonl",
        sessionContent,
      );

      const sessions = await reader.listSessions("/claude/projects");

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.tokenUsage).toBeDefined();
      expect(sessions[0]?.tokenUsage?.input).toBe(100);
      expect(sessions[0]?.tokenUsage?.output).toBe(50);
    });
  });
});
