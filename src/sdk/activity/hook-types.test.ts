/**
 * Tests for Hook Input Types
 *
 * @module sdk/activity/hook-types.test
 */

import { describe, test, expect } from "vitest";
import {
  parseHookInput,
  isUserPromptSubmit,
  isPermissionRequest,
  isStop,
  type HookInput,
} from "./hook-types";

describe("parseHookInput", () => {
  describe("UserPromptSubmit", () => {
    test("parses valid UserPromptSubmit input", () => {
      const json = JSON.stringify({
        session_id: "test-session-123",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "UserPromptSubmit",
        prompt: "Hello, Claude!",
      });

      const result = parseHookInput(json);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hook_event_name).toBe("UserPromptSubmit");
        expect(result.value.session_id).toBe("test-session-123");
        expect(result.value.transcript_path).toBe("/path/to/transcript.jsonl");
        expect(result.value.cwd).toBe("/home/user/project");
        expect(result.value.permission_mode).toBe("ask");
        if (isUserPromptSubmit(result.value)) {
          expect(result.value.prompt).toBe("Hello, Claude!");
        }
      }
    });

    test("parses UserPromptSubmit without optional prompt", () => {
      const json = JSON.stringify({
        session_id: "test-session-456",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "auto",
        hook_event_name: "UserPromptSubmit",
      });

      const result = parseHookInput(json);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && isUserPromptSubmit(result.value)) {
        expect(result.value.prompt).toBeUndefined();
      }
    });

    test("rejects UserPromptSubmit with invalid prompt type", () => {
      const json = JSON.stringify({
        session_id: "test-session-789",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "UserPromptSubmit",
        prompt: 123, // Invalid: should be string
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Invalid prompt field");
      }
    });
  });

  describe("PermissionRequest", () => {
    test("parses valid PermissionRequest input", () => {
      const json = JSON.stringify({
        session_id: "test-session-abc",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
        tool_input: {
          command: "ls -la",
          description: "List files",
        },
      });

      const result = parseHookInput(json);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hook_event_name).toBe("PermissionRequest");
        if (isPermissionRequest(result.value)) {
          expect(result.value.tool_name).toBe("Bash");
          expect(result.value.tool_input).toEqual({
            command: "ls -la",
            description: "List files",
          });
        }
      }
    });

    test("rejects PermissionRequest with missing tool_name", () => {
      const json = JSON.stringify({
        session_id: "test-session-def",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_input: { command: "ls" },
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("tool_name");
      }
    });

    test("rejects PermissionRequest with missing tool_input", () => {
      const json = JSON.stringify({
        session_id: "test-session-ghi",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("tool_input");
      }
    });

    test("rejects PermissionRequest with invalid tool_input type", () => {
      const json = JSON.stringify({
        session_id: "test-session-jkl",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
        tool_input: "not an object", // Invalid: must be object
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("tool_input");
      }
    });
  });

  describe("Stop", () => {
    test("parses valid Stop input", () => {
      const json = JSON.stringify({
        session_id: "test-session-xyz",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "auto",
        hook_event_name: "Stop",
      });

      const result = parseHookInput(json);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hook_event_name).toBe("Stop");
        expect(isStop(result.value)).toBe(true);
      }
    });
  });

  describe("Common field validation", () => {
    test("rejects invalid JSON", () => {
      const json = "not valid json{";

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Invalid JSON");
      }
    });

    test("rejects non-object input", () => {
      const json = JSON.stringify("string");

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("must be an object");
      }
    });

    test("rejects missing session_id", () => {
      const json = JSON.stringify({
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "Stop",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("session_id");
      }
    });

    test("rejects missing transcript_path", () => {
      const json = JSON.stringify({
        session_id: "test-session",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "Stop",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("transcript_path");
      }
    });

    test("rejects missing cwd", () => {
      const json = JSON.stringify({
        session_id: "test-session",
        transcript_path: "/path/to/transcript.jsonl",
        permission_mode: "ask",
        hook_event_name: "Stop",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("cwd");
      }
    });

    test("rejects missing permission_mode", () => {
      const json = JSON.stringify({
        session_id: "test-session",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        hook_event_name: "Stop",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("permission_mode");
      }
    });

    test("rejects missing hook_event_name", () => {
      const json = JSON.stringify({
        session_id: "test-session",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("hook_event_name");
      }
    });

    test("rejects unknown hook_event_name", () => {
      const json = JSON.stringify({
        session_id: "test-session",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/home/user/project",
        permission_mode: "ask",
        hook_event_name: "UnknownEvent",
      });

      const result = parseHookInput(json);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Unknown hook_event_name");
      }
    });
  });
});

describe("Type guards", () => {
  test("isUserPromptSubmit identifies UserPromptSubmit", () => {
    const input: HookInput = {
      session_id: "test",
      transcript_path: "/path",
      cwd: "/cwd",
      permission_mode: "ask",
      hook_event_name: "UserPromptSubmit",
      prompt: "test",
    };

    expect(isUserPromptSubmit(input)).toBe(true);
    expect(isPermissionRequest(input)).toBe(false);
    expect(isStop(input)).toBe(false);
  });

  test("isPermissionRequest identifies PermissionRequest", () => {
    const input: HookInput = {
      session_id: "test",
      transcript_path: "/path",
      cwd: "/cwd",
      permission_mode: "ask",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
      tool_input: {},
    };

    expect(isUserPromptSubmit(input)).toBe(false);
    expect(isPermissionRequest(input)).toBe(true);
    expect(isStop(input)).toBe(false);
  });

  test("isStop identifies Stop", () => {
    const input: HookInput = {
      session_id: "test",
      transcript_path: "/path",
      cwd: "/cwd",
      permission_mode: "ask",
      hook_event_name: "Stop",
    };

    expect(isUserPromptSubmit(input)).toBe(false);
    expect(isPermissionRequest(input)).toBe(false);
    expect(isStop(input)).toBe(true);
  });
});
