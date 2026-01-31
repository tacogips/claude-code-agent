/**
 * Tests for ActivityManager class.
 *
 * @module sdk/activity/manager.test
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { ActivityManager } from "./manager";
import type { HookInput } from "./hook-types";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockClock } from "../../test/mocks/clock";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

describe("ActivityManager", () => {
  let fs: MockFileSystem;
  let clock: MockClock;
  let manager: ActivityManager;
  let testDir: string;
  let transcriptPath: string;

  beforeEach(async () => {
    fs = new MockFileSystem();
    clock = new MockClock();

    // Create temp directory for real transcript files
    testDir = join(tmpdir(), `activity-manager-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    transcriptPath = join(testDir, "transcript.jsonl");

    manager = new ActivityManager(fs, clock, {
      dataDir: "/tmp/test-activity",
    });
  });

  afterEach(async () => {
    // Clean up transcript file
    try {
      await unlink(transcriptPath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  });

  describe("update", () => {
    test("sets working status on UserPromptSubmit", async () => {
      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-1",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
        prompt: "test prompt",
      };

      await manager.update(input);

      const status = await manager.getStatus("session-1");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("working");
      expect(status?.sessionId).toBe("session-1");
      expect(status?.projectPath).toBe("/project/path");
    });

    test("sets waiting_user_response on PermissionRequest", async () => {
      const input: HookInput = {
        hook_event_name: "PermissionRequest",
        session_id: "session-2",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
        tool_name: "Bash",
        tool_input: { command: "ls" },
      };

      await manager.update(input);

      const status = await manager.getStatus("session-2");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("waiting_user_response");
    });

    test("sets idle on Stop without AskUserQuestion", async () => {
      // Create empty transcript file
      await writeFile(transcriptPath, "");

      const input: HookInput = {
        hook_event_name: "Stop",
        session_id: "session-3",
        transcript_path: transcriptPath,
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      const status = await manager.getStatus("session-3");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("idle");
    });

    test("sets waiting_user_response on Stop with AskUserQuestion", async () => {
      // Create transcript with AskUserQuestion
      const transcriptContent = [
        '{"type":"user","content":"test"}',
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "Let me ask you" },
              {
                type: "tool_use",
                id: "toolu_123",
                name: "AskUserQuestion",
                input: { questions: [] },
              },
            ],
          },
        }),
      ].join("\n");

      await writeFile(transcriptPath, transcriptContent);

      const input: HookInput = {
        hook_event_name: "Stop",
        session_id: "session-4",
        transcript_path: transcriptPath,
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      const status = await manager.getStatus("session-4");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("waiting_user_response");
    });

    test("updates existing entry", async () => {
      const input1: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-5",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input1);

      // First update
      const status1 = await manager.getStatus("session-5");
      expect(status1?.status).toBe("working");

      // Advance time
      clock.advance(1000);

      // Second update
      await writeFile(transcriptPath, "");
      const input2: HookInput = {
        hook_event_name: "Stop",
        session_id: "session-5",
        transcript_path: transcriptPath,
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input2);

      const status2 = await manager.getStatus("session-5");
      expect(status2?.status).toBe("idle");
      expect(status2?.lastUpdated).not.toBe(status1?.lastUpdated);
    });
  });

  describe("getStatus", () => {
    test("returns null for unknown session", async () => {
      const status = await manager.getStatus("unknown-session");
      expect(status).toBeNull();
    });

    test("returns entry for known session", async () => {
      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-6",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      const status = await manager.getStatus("session-6");
      expect(status).not.toBeNull();
      expect(status?.sessionId).toBe("session-6");
    });
  });

  describe("list", () => {
    test("returns empty array when no entries", async () => {
      const entries = await manager.list();
      expect(entries).toEqual([]);
    });

    test("returns all entries without filter", async () => {
      const input1: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-7",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      const input2: HookInput = {
        hook_event_name: "PermissionRequest",
        session_id: "session-8",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
        tool_name: "Bash",
        tool_input: {},
      };

      await manager.update(input1);
      await manager.update(input2);

      const entries = await manager.list();
      expect(entries).toHaveLength(2);
    });

    test("filters by status", async () => {
      const input1: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-9",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      const input2: HookInput = {
        hook_event_name: "PermissionRequest",
        session_id: "session-10",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
        tool_name: "Bash",
        tool_input: {},
      };

      await manager.update(input1);
      await manager.update(input2);

      const workingEntries = await manager.list({ status: "working" });
      expect(workingEntries).toHaveLength(1);
      expect(workingEntries[0]?.sessionId).toBe("session-9");

      const waitingEntries = await manager.list({
        status: "waiting_user_response",
      });
      expect(waitingEntries).toHaveLength(1);
      expect(waitingEntries[0]?.sessionId).toBe("session-10");
    });
  });

  describe("isWorking", () => {
    test("returns true for working session", async () => {
      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-11",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      const isWorking = await manager.isWorking("session-11");
      expect(isWorking).toBe(true);
    });

    test("returns false for non-working session", async () => {
      const input: HookInput = {
        hook_event_name: "PermissionRequest",
        session_id: "session-12",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
        tool_name: "Bash",
        tool_input: {},
      };

      await manager.update(input);

      const isWorking = await manager.isWorking("session-12");
      expect(isWorking).toBe(false);
    });

    test("returns false for unknown session", async () => {
      const isWorking = await manager.isWorking("unknown-session");
      expect(isWorking).toBe(false);
    });
  });

  describe("isWaitingForUser", () => {
    test("returns true for waiting session", async () => {
      const input: HookInput = {
        hook_event_name: "PermissionRequest",
        session_id: "session-13",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
        tool_name: "Bash",
        tool_input: {},
      };

      await manager.update(input);

      const isWaiting = await manager.isWaitingForUser("session-13");
      expect(isWaiting).toBe(true);
    });

    test("returns false for non-waiting session", async () => {
      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-14",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      const isWaiting = await manager.isWaitingForUser("session-14");
      expect(isWaiting).toBe(false);
    });

    test("returns false for unknown session", async () => {
      const isWaiting = await manager.isWaitingForUser("unknown-session");
      expect(isWaiting).toBe(false);
    });
  });

  describe("cleanup", () => {
    test("removes stale entries", async () => {
      // Create entry
      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-15",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      // Advance time beyond cleanup threshold (default 24 hours)
      clock.advance(25 * 60 * 60 * 1000); // 25 hours

      // Run cleanup
      const removed = await manager.cleanup();
      expect(removed).toBe(1);

      // Verify entry is gone
      const status = await manager.getStatus("session-15");
      expect(status).toBeNull();
    });

    test("does not remove recent entries", async () => {
      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-16",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await manager.update(input);

      // Advance time within cleanup threshold
      clock.advance(1 * 60 * 60 * 1000); // 1 hour

      // Run cleanup
      const removed = await manager.cleanup();
      expect(removed).toBe(0);

      // Verify entry still exists
      const status = await manager.getStatus("session-16");
      expect(status).not.toBeNull();
    });

    test("uses custom cleanup threshold", async () => {
      // Create manager with 1 hour threshold
      const customManager = new ActivityManager(fs, clock, {
        dataDir: "/tmp/test-activity",
        cleanupHours: 1,
      });

      const input: HookInput = {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-17",
        transcript_path: "/path/to/transcript.jsonl",
        cwd: "/project/path",
        permission_mode: "auto",
      };

      await customManager.update(input);

      // Advance time beyond 1 hour threshold
      clock.advance(2 * 60 * 60 * 1000); // 2 hours

      // Run cleanup
      const removed = await customManager.cleanup();
      expect(removed).toBe(1);
    });
  });

  describe("error handling", () => {
    test("handles missing transcript gracefully", async () => {
      // Don't create transcript file - use non-existent path
      const nonExistentPath = join(testDir, "does-not-exist.jsonl");

      const input: HookInput = {
        hook_event_name: "Stop",
        session_id: "session-18",
        transcript_path: nonExistentPath,
        cwd: "/project/path",
        permission_mode: "auto",
      };

      // Should not throw
      await manager.update(input);

      // Should set idle status (no AskUserQuestion detected)
      const status = await manager.getStatus("session-18");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("idle");
    });

    test("handles invalid transcript gracefully", async () => {
      // Create invalid transcript
      const invalidPath = join(testDir, "invalid.jsonl");
      await writeFile(invalidPath, "invalid json");

      const input: HookInput = {
        hook_event_name: "Stop",
        session_id: "session-19",
        transcript_path: invalidPath,
        cwd: "/project/path",
        permission_mode: "auto",
      };

      // Should not throw
      await manager.update(input);

      // Should set idle status (no AskUserQuestion detected)
      const status = await manager.getStatus("session-19");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("idle");
    });
  });
});
