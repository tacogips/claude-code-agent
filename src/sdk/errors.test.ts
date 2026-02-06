/**
 * Tests for SDK error types
 */

import { describe, it, expect } from "vitest";
import {
  ClaudeCodeAgentError,
  CLINotFoundError,
  CLIConnectionError,
  ToolExecutionError,
  ControlProtocolError,
  TimeoutError,
  InvalidStateError,
  isClaudeCodeAgentError,
  isCLINotFoundError,
  isCLIConnectionError,
  isToolExecutionError,
  isControlProtocolError,
  isTimeoutError,
  isInvalidStateError,
} from "./errors";

describe("ClaudeCodeAgentError", () => {
  it("should create base error with message and code", () => {
    const error = new ClaudeCodeAgentError("Test error", "TEST_CODE");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("ClaudeCodeAgentError");
  });

  it("should preserve prototype chain", () => {
    const error = new ClaudeCodeAgentError("Test", "TEST");

    expect(error instanceof ClaudeCodeAgentError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it("should have stack trace", () => {
    const error = new ClaudeCodeAgentError("Test", "TEST");

    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe("string");
  });
});

describe("CLINotFoundError", () => {
  it("should create error with path", () => {
    const error = new CLINotFoundError("/usr/bin/claude-code");

    expect(error).toBeInstanceOf(CLINotFoundError);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe(
      "Claude Code CLI not found at: /usr/bin/claude-code",
    );
    expect(error.code).toBe("CLI_NOT_FOUND");
    expect(error.path).toBe("/usr/bin/claude-code");
    expect(error.name).toBe("CLINotFoundError");
  });

  it("should preserve instanceof check", () => {
    const error = new CLINotFoundError("/path/to/cli");

    expect(error instanceof CLINotFoundError).toBe(true);
    expect(error instanceof ClaudeCodeAgentError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe("CLIConnectionError", () => {
  it("should create error with reason", () => {
    const error = new CLIConnectionError("Process spawn failed");

    expect(error).toBeInstanceOf(CLIConnectionError);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe(
      "Failed to connect to Claude Code CLI: Process spawn failed",
    );
    expect(error.code).toBe("CLI_CONNECTION");
    expect(error.reason).toBe("Process spawn failed");
    expect(error.name).toBe("CLIConnectionError");
  });

  it("should preserve instanceof check", () => {
    const error = new CLIConnectionError("Connection refused");

    expect(error instanceof CLIConnectionError).toBe(true);
    expect(error instanceof ClaudeCodeAgentError).toBe(true);
  });
});

describe("ToolExecutionError", () => {
  it("should create error with tool name and error cause", () => {
    const cause = new Error("Division by zero");
    const error = new ToolExecutionError("calculator", cause);

    expect(error).toBeInstanceOf(ToolExecutionError);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe("Tool 'calculator' failed: Division by zero");
    expect(error.code).toBe("TOOL_EXECUTION");
    expect(error.toolName).toBe("calculator");
    expect(error.cause).toBe(cause);
    expect(error.name).toBe("ToolExecutionError");
  });

  it("should create error with string cause", () => {
    const error = new ToolExecutionError("file_reader", "File not found");

    expect(error.message).toBe("Tool 'file_reader' failed: File not found");
    expect(error.toolName).toBe("file_reader");
    expect(error.cause).toBeUndefined();
  });

  it("should preserve instanceof check", () => {
    const error = new ToolExecutionError("tool", "Failed");

    expect(error instanceof ToolExecutionError).toBe(true);
    expect(error instanceof ClaudeCodeAgentError).toBe(true);
  });

  it("should handle different error types as cause", () => {
    const typeError = new TypeError("Invalid argument");
    const error = new ToolExecutionError("validator", typeError);

    expect(error.message).toBe("Tool 'validator' failed: Invalid argument");
    expect(error.cause).toBe(typeError);
  });
});

describe("ControlProtocolError", () => {
  it("should create error without request ID", () => {
    const error = new ControlProtocolError("Invalid JSON-RPC message");

    expect(error).toBeInstanceOf(ControlProtocolError);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe(
      "Control protocol error: Invalid JSON-RPC message",
    );
    expect(error.code).toBe("CONTROL_PROTOCOL");
    expect(error.requestId).toBeUndefined();
    expect(error.name).toBe("ControlProtocolError");
  });

  it("should create error with request ID", () => {
    const error = new ControlProtocolError("Request timeout", "req-123");

    expect(error.message).toBe("Control protocol error: Request timeout");
    expect(error.requestId).toBe("req-123");
  });

  it("should preserve instanceof check", () => {
    const error = new ControlProtocolError("Protocol error");

    expect(error instanceof ControlProtocolError).toBe(true);
    expect(error instanceof ClaudeCodeAgentError).toBe(true);
  });
});

describe("TimeoutError", () => {
  it("should create error with operation and timeout", () => {
    const error = new TimeoutError("tool_call", 5000);

    expect(error).toBeInstanceOf(TimeoutError);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe("Operation 'tool_call' timed out after 5000ms");
    expect(error.code).toBe("TIMEOUT");
    expect(error.operation).toBe("tool_call");
    expect(error.timeout).toBe(5000);
    expect(error.name).toBe("TimeoutError");
  });

  it("should preserve instanceof check", () => {
    const error = new TimeoutError("connect", 3000);

    expect(error instanceof TimeoutError).toBe(true);
    expect(error instanceof ClaudeCodeAgentError).toBe(true);
  });

  it("should handle different timeout values", () => {
    const error1 = new TimeoutError("short_op", 100);
    const error2 = new TimeoutError("long_op", 30000);

    expect(error1.timeout).toBe(100);
    expect(error2.timeout).toBe(30000);
  });
});

describe("InvalidStateError", () => {
  it("should create error with current and expected states", () => {
    const error = new InvalidStateError("idle", ["running", "paused"]);

    expect(error).toBeInstanceOf(InvalidStateError);
    expect(error).toBeInstanceOf(ClaudeCodeAgentError);
    expect(error.message).toBe(
      "Invalid state: idle. Expected one of: running, paused",
    );
    expect(error.code).toBe("INVALID_STATE");
    expect(error.currentState).toBe("idle");
    expect(error.expectedStates).toEqual(["running", "paused"]);
    expect(error.name).toBe("InvalidStateError");
  });

  it("should handle single expected state", () => {
    const error = new InvalidStateError("cancelled", ["running"]);

    expect(error.message).toBe(
      "Invalid state: cancelled. Expected one of: running",
    );
    expect(error.expectedStates).toEqual(["running"]);
  });

  it("should handle multiple expected states", () => {
    const error = new InvalidStateError("failed", [
      "idle",
      "running",
      "completed",
    ]);

    expect(error.message).toBe(
      "Invalid state: failed. Expected one of: idle, running, completed",
    );
    expect(error.expectedStates).toEqual(["idle", "running", "completed"]);
  });

  it("should preserve instanceof check", () => {
    const error = new InvalidStateError("state1", ["state2"]);

    expect(error instanceof InvalidStateError).toBe(true);
    expect(error instanceof ClaudeCodeAgentError).toBe(true);
  });
});

describe("Type Guards", () => {
  describe("isClaudeCodeAgentError", () => {
    it("should return true for ClaudeCodeAgentError instances", () => {
      const error = new ClaudeCodeAgentError("Test", "TEST");
      expect(isClaudeCodeAgentError(error)).toBe(true);
    });

    it("should return true for subclass instances", () => {
      expect(isClaudeCodeAgentError(new CLINotFoundError("/path"))).toBe(true);
      expect(isClaudeCodeAgentError(new CLIConnectionError("reason"))).toBe(
        true,
      );
      expect(
        isClaudeCodeAgentError(new ToolExecutionError("tool", "error")),
      ).toBe(true);
      expect(isClaudeCodeAgentError(new ControlProtocolError("error"))).toBe(
        true,
      );
      expect(isClaudeCodeAgentError(new TimeoutError("op", 1000))).toBe(true);
      expect(isClaudeCodeAgentError(new InvalidStateError("s1", ["s2"]))).toBe(
        true,
      );
    });

    it("should return false for non-ClaudeCodeAgentError", () => {
      expect(isClaudeCodeAgentError(new Error("Standard error"))).toBe(false);
      expect(isClaudeCodeAgentError("string")).toBe(false);
      expect(isClaudeCodeAgentError(null)).toBe(false);
      expect(isClaudeCodeAgentError(undefined)).toBe(false);
      expect(isClaudeCodeAgentError({})).toBe(false);
    });
  });

  describe("isCLINotFoundError", () => {
    it("should return true for CLINotFoundError instances", () => {
      const error = new CLINotFoundError("/path");
      expect(isCLINotFoundError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isCLINotFoundError(new CLIConnectionError("reason"))).toBe(false);
      expect(isCLINotFoundError(new Error("Standard error"))).toBe(false);
      expect(isCLINotFoundError(null)).toBe(false);
    });
  });

  describe("isCLIConnectionError", () => {
    it("should return true for CLIConnectionError instances", () => {
      const error = new CLIConnectionError("Connection refused");
      expect(isCLIConnectionError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isCLIConnectionError(new CLINotFoundError("/path"))).toBe(false);
      expect(isCLIConnectionError(new Error("Standard error"))).toBe(false);
    });
  });

  describe("isToolExecutionError", () => {
    it("should return true for ToolExecutionError instances", () => {
      const error = new ToolExecutionError("tool", "error");
      expect(isToolExecutionError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isToolExecutionError(new CLINotFoundError("/path"))).toBe(false);
      expect(isToolExecutionError(new Error("Standard error"))).toBe(false);
    });
  });

  describe("isControlProtocolError", () => {
    it("should return true for ControlProtocolError instances", () => {
      const error = new ControlProtocolError("Protocol error");
      expect(isControlProtocolError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isControlProtocolError(new CLINotFoundError("/path"))).toBe(false);
      expect(isControlProtocolError(new Error("Standard error"))).toBe(false);
    });
  });

  describe("isTimeoutError", () => {
    it("should return true for TimeoutError instances", () => {
      const error = new TimeoutError("operation", 5000);
      expect(isTimeoutError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isTimeoutError(new CLINotFoundError("/path"))).toBe(false);
      expect(isTimeoutError(new Error("Standard error"))).toBe(false);
    });
  });

  describe("isInvalidStateError", () => {
    it("should return true for InvalidStateError instances", () => {
      const error = new InvalidStateError("state1", ["state2"]);
      expect(isInvalidStateError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isInvalidStateError(new CLINotFoundError("/path"))).toBe(false);
      expect(isInvalidStateError(new Error("Standard error"))).toBe(false);
    });
  });
});

describe("Error Serialization", () => {
  it("should preserve error properties in JSON", () => {
    const error = new CLINotFoundError("/usr/bin/claude-code");
    const json = JSON.stringify({
      message: error.message,
      code: error.code,
      path: error.path,
      name: error.name,
    });

    const parsed = JSON.parse(json);
    expect(parsed.message).toBe(
      "Claude Code CLI not found at: /usr/bin/claude-code",
    );
    expect(parsed.code).toBe("CLI_NOT_FOUND");
    expect(parsed.path).toBe("/usr/bin/claude-code");
    expect(parsed.name).toBe("CLINotFoundError");
  });

  it("should handle cause error in ToolExecutionError", () => {
    const cause = new Error("Original error");
    const error = new ToolExecutionError("tool", cause);

    expect(error.cause).toBe(cause);
    expect(error.cause?.message).toBe("Original error");
  });
});

describe("Error Handling Patterns", () => {
  it("should support try-catch narrowing", () => {
    try {
      throw new CLINotFoundError("/path/to/cli");
    } catch (e) {
      expect(e instanceof Error).toBe(true);
      if (isCLINotFoundError(e)) {
        expect(e.path).toBe("/path/to/cli");
      } else {
        throw new Error("Type guard failed");
      }
    }
  });

  it("should support error hierarchy checking", () => {
    const error: Error = new ToolExecutionError("calc", "Divide by zero");

    if (isClaudeCodeAgentError(error)) {
      expect(error.code).toBeDefined();

      if (isToolExecutionError(error)) {
        expect(error.toolName).toBe("calc");
      }
    } else {
      throw new Error("Error hierarchy check failed");
    }
  });
});
