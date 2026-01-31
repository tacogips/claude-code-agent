/**
 * Tests for error types.
 */

import { describe, it, expect } from "vitest";
import {
  AgentError,
  FileNotFoundError,
  SessionNotFoundError,
  ParseError,
  ProcessError,
  BudgetExceededError,
  GroupNotFoundError,
  QueueNotFoundError,
  CircularDependencyError,
  ValidationError,
} from "./errors";

describe("AgentError", () => {
  describe("FileNotFoundError", () => {
    it("creates error with correct properties", () => {
      const error = new FileNotFoundError("/path/to/file");
      expect(error).toBeInstanceOf(AgentError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe("FILE_NOT_FOUND");
      expect(error.recoverable).toBe(false);
      expect(error.path).toBe("/path/to/file");
      expect(error.message).toContain("/path/to/file");
      expect(error.name).toBe("FileNotFoundError");
    });
  });

  describe("SessionNotFoundError", () => {
    it("creates error with correct properties", () => {
      const error = new SessionNotFoundError("session-123");
      expect(error.code).toBe("SESSION_NOT_FOUND");
      expect(error.recoverable).toBe(false);
      expect(error.sessionId).toBe("session-123");
      expect(error.message).toContain("session-123");
    });
  });

  describe("ParseError", () => {
    it("creates error with correct properties", () => {
      const error = new ParseError("file.jsonl", 42, "unexpected token");
      expect(error.code).toBe("PARSE_ERROR");
      expect(error.recoverable).toBe(true);
      expect(error.file).toBe("file.jsonl");
      expect(error.line).toBe(42);
      expect(error.details).toBe("unexpected token");
      expect(error.message).toContain("file.jsonl");
      expect(error.message).toContain("42");
    });
  });

  describe("ProcessError", () => {
    it("creates error with correct properties", () => {
      const error = new ProcessError("claude", 1, "command not found");
      expect(error.code).toBe("PROCESS_ERROR");
      expect(error.recoverable).toBe(false);
      expect(error.command).toBe("claude");
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toBe("command not found");
    });
  });

  describe("BudgetExceededError", () => {
    it("creates error with correct properties", () => {
      const error = new BudgetExceededError("session-123", 15.5, 10.0);
      expect(error.code).toBe("BUDGET_EXCEEDED");
      expect(error.recoverable).toBe(false);
      expect(error.sessionId).toBe("session-123");
      expect(error.usage).toBe(15.5);
      expect(error.limit).toBe(10.0);
      expect(error.message).toContain("15.50");
      expect(error.message).toContain("10.00");
    });
  });

  describe("GroupNotFoundError", () => {
    it("creates error with correct properties", () => {
      const error = new GroupNotFoundError("group-123");
      expect(error.code).toBe("GROUP_NOT_FOUND");
      expect(error.recoverable).toBe(false);
      expect(error.groupId).toBe("group-123");
    });
  });

  describe("QueueNotFoundError", () => {
    it("creates error with correct properties", () => {
      const error = new QueueNotFoundError("queue-123");
      expect(error.code).toBe("QUEUE_NOT_FOUND");
      expect(error.recoverable).toBe(false);
      expect(error.queueId).toBe("queue-123");
    });
  });

  describe("CircularDependencyError", () => {
    it("creates error with correct properties", () => {
      const cycle = ["a", "b", "c", "a"];
      const error = new CircularDependencyError(cycle);
      expect(error.code).toBe("CIRCULAR_DEPENDENCY");
      expect(error.recoverable).toBe(false);
      expect(error.cycle).toEqual(cycle);
      expect(error.message).toContain("a -> b -> c -> a");
    });
  });

  describe("ValidationError", () => {
    it("creates error with correct properties", () => {
      const error = new ValidationError("email", "invalid format");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.recoverable).toBe(true);
      expect(error.field).toBe("email");
      expect(error.reason).toBe("invalid format");
    });
  });

  describe("error inheritance", () => {
    it("all errors are instances of Error", () => {
      const errors = [
        new FileNotFoundError("/path"),
        new SessionNotFoundError("id"),
        new ParseError("file", 1, "details"),
        new ProcessError("cmd", 1, "stderr"),
        new BudgetExceededError("id", 1, 0),
        new GroupNotFoundError("id"),
        new QueueNotFoundError("id"),
        new CircularDependencyError(["a"]),
        new ValidationError("field", "reason"),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AgentError);
        expect(error.stack).toBeDefined();
      }
    });
  });
});
