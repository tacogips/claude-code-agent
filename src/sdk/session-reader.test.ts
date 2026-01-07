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
    it("should read and parse a simple session file", async () => {
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
        expect(session.id).toBe("session-123");
        expect(session.projectPath).toBe("/home/user/project");
        expect(session.status).toBe("active");
        expect(session.createdAt).toBe("2026-01-01T00:00:00Z");
        expect(session.messages).toHaveLength(2);
        expect(session.messages[0]?.id).toBe("msg-1");
        expect(session.messages[0]?.role).toBe("user");
        expect(session.messages[0]?.content).toBe("Hello");
        expect(session.messages[1]?.id).toBe("msg-2");
        expect(session.messages[1]?.role).toBe("assistant");
        expect(session.messages[1]?.content).toBe("Hi there!");
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
        expect(session.messages).toHaveLength(1);
        const message = session.messages[0];
        expect(message?.toolCalls).toBeDefined();
        expect(message?.toolCalls).toHaveLength(1);
        expect(message?.toolCalls?.[0]?.id).toBe("call-1");
        expect(message?.toolCalls?.[0]?.name).toBe("Read");
        expect(message?.toolCalls?.[0]?.input).toEqual({
          file_path: "/test/file.txt",
        });
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
        expect(session.messages).toHaveLength(1);
        const message = session.messages[0];
        expect(message?.toolResults).toBeDefined();
        expect(message?.toolResults).toHaveLength(1);
        expect(message?.toolResults?.[0]?.id).toBe("call-1");
        expect(message?.toolResults?.[0]?.output).toBe("File content here");
        expect(message?.toolResults?.[0]?.isError).toBe(false);
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
        expect(session.messages).toHaveLength(2);
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
        expect(session.messages).toHaveLength(2);
      }
    });

    it("should handle different session statuses", async () => {
      const statuses = ["active", "paused", "completed", "failed"] as const;

      for (const status of statuses) {
        const sessionContent = JSON.stringify({
          id: "msg-1",
          role: "user",
          content: "Test",
          timestamp: "2026-01-01T00:00:00Z",
          status,
          sessionId: `session-${status}`,
        });

        fs.setFile(`/test/${status}.jsonl`, sessionContent);

        const result = await reader.readSession(`/test/${status}.jsonl`);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.status).toBe(status);
        }
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
        expect(messages).toHaveLength(2);
        expect(messages[0]?.id).toBe("msg-1");
        expect(messages[1]?.id).toBe("msg-2");
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
      fs.setFile("/project/session.jsonl", "{}");
      fs.setFile("/project/other.txt", "content");
      fs.setFile("/project/data.json", "{}");

      const files = await reader.findSessionFiles("/project");

      expect(files).toHaveLength(1);
      expect(files[0]).toBe("/project/session.jsonl");
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

    it("should handle deeply nested directories", async () => {
      fs.setFile("/a/b/c/d/session.jsonl", "{}");
      fs.setFile("/a/b/e/session.jsonl", "{}");

      const files = await reader.findSessionFiles("/a");

      expect(files).toHaveLength(2);
      expect(files).toContain("/a/b/c/d/session.jsonl");
      expect(files).toContain("/a/b/e/session.jsonl");
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
    it("should list all sessions from specified directory", async () => {
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

      expect(sessions).toHaveLength(2);
      expect(sessions[0]?.id).toBe("session-abc");
      expect(sessions[0]?.projectPath).toBe("/project-a");
      expect(sessions[0]?.messageCount).toBe(1);
      expect(sessions[1]?.id).toBe("session-def");
      expect(sessions[1]?.projectPath).toBe("/project-b");
      expect(sessions[1]?.messageCount).toBe(1);
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

    it("should include message count in metadata", async () => {
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

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messageCount).toBe(3);
    });
  });

  describe("getSession", () => {
    beforeEach(() => {
      // Mock HOME environment variable for default directory
      process.env["HOME"] = "/home/testuser";
    });

    it("should find and return session by ID", async () => {
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

      expect(session).not.toBeNull();
      expect(session?.id).toBe("target-session");
      expect(session?.projectPath).toBe("/project");
      expect(session?.messages).toHaveLength(1);
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

  describe("getMessages", () => {
    beforeEach(() => {
      process.env["HOME"] = "/home/testuser";
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

      expect(messages).toHaveLength(2);
      expect(messages[0]?.id).toBe("msg-1");
      expect(messages[0]?.content).toBe("Hello");
      expect(messages[1]?.id).toBe("msg-2");
      expect(messages[1]?.content).toBe("Hi");
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
});
