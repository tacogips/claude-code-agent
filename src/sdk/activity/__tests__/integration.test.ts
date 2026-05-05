/**
 * Integration tests for Activity tracking lifecycle operations.
 *
 * Tests the complete activity tracking lifecycle including:
 * - ActivityManager processes hook inputs and updates status
 * - Activity store persists and retrieves entries correctly
 * - CLI commands work end-to-end with actual filesystem
 * - Full flow: hook update -> query status -> list entries
 *
 * @module sdk/activity/__tests__/integration.test
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ActivityManager } from "../manager";
import type { HookInput } from "../hook-types";
import { BunFileSystem } from "../../../interfaces/bun-filesystem";
import { SystemClock } from "../../../interfaces/system-clock";

/**
 * Create a mock transcript file with or without AskUserQuestion.
 *
 * Creates a JSONL transcript file with proper format matching Claude Code
 * transcript structure. Optionally includes an AskUserQuestion tool use.
 */
async function createMockTranscript(
  path: string,
  hasAskUserQuestion: boolean,
): Promise<void> {
  const lines: string[] = [];

  // Add user message (JSONL format)
  lines.push(JSON.stringify({ type: "user", content: "Test prompt" }));

  // Add assistant message
  lines.push(
    JSON.stringify({ type: "assistant", content: "Working on it..." }),
  );

  // Optionally add AskUserQuestion tool use event
  if (hasAskUserQuestion) {
    // First format: direct tool_use event
    lines.push(
      JSON.stringify({
        type: "tool_use",
        id: "toolu_test123",
        name: "AskUserQuestion",
        input: {
          questions: ["Should I proceed?"],
        },
      }),
    );
  }

  // Ensure directory exists before writing
  const dir = join(path, "..");
  await mkdir(dir, { recursive: true });

  await writeFile(path, lines.join("\n"));
}

describe("Activity Integration Tests", () => {
  let tempDir: string;
  let dataDir: string;
  let transcriptDir: string;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = await mkdtemp(join(tmpdir(), "activity-integration-test-"));
    dataDir = join(tempDir, "data");
    transcriptDir = join(tempDir, "transcripts");
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  describe("ActivityManager Integration", () => {
    test("processes UserPromptSubmit hook and sets status to working", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      const transcriptPath = join(transcriptDir, "transcript-1.jsonl");
      await createMockTranscript(transcriptPath, false);

      const hookInput: HookInput = {
        session_id: "test-session-1",
        transcript_path: transcriptPath,
        cwd: "/projects/test",
        permission_mode: "auto",
        hook_event_name: "UserPromptSubmit",
        prompt: "Test prompt",
      };

      await manager.update(hookInput);

      const status = await manager.getStatus("test-session-1");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("working");
      expect(status?.sessionId).toBe("test-session-1");
      expect(status?.projectPath).toBe("/projects/test");
    });

    test("processes PermissionRequest hook and sets status to waiting_user_response", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      const transcriptPath = join(transcriptDir, "transcript-2.jsonl");
      await createMockTranscript(transcriptPath, false);

      const hookInput: HookInput = {
        session_id: "test-session-2",
        transcript_path: transcriptPath,
        cwd: "/projects/test2",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
        tool_input: { command: "ls" },
      };

      await manager.update(hookInput);

      const status = await manager.getStatus("test-session-2");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("waiting_user_response");
      expect(status?.sessionId).toBe("test-session-2");
    });

    test("processes Stop hook without AskUserQuestion and sets status to idle", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      const transcriptPath = join(transcriptDir, "transcript-3.jsonl");
      await createMockTranscript(transcriptPath, false);

      const hookInput: HookInput = {
        session_id: "test-session-3",
        transcript_path: transcriptPath,
        cwd: "/projects/test3",
        permission_mode: "auto",
        hook_event_name: "Stop",
      };

      await manager.update(hookInput);

      const status = await manager.getStatus("test-session-3");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("idle");
    });

    test("processes Stop hook with AskUserQuestion and sets status to waiting_user_response", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      const transcriptPath = join(transcriptDir, "transcript-4.jsonl");
      await createMockTranscript(transcriptPath, true);

      const hookInput: HookInput = {
        session_id: "test-session-4",
        transcript_path: transcriptPath,
        cwd: "/projects/test4",
        permission_mode: "auto",
        hook_event_name: "Stop",
      };

      await manager.update(hookInput);

      const status = await manager.getStatus("test-session-4");
      expect(status).not.toBeNull();
      expect(status?.status).toBe("waiting_user_response");
    });

    test("lists all activities after multiple updates", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      // Create multiple sessions
      for (let i = 1; i <= 3; i++) {
        const transcriptPath = join(
          transcriptDir,
          `transcript-list-${i}.jsonl`,
        );
        await createMockTranscript(transcriptPath, false);

        const hookInput: HookInput = {
          session_id: `session-list-${i}`,
          transcript_path: transcriptPath,
          cwd: `/projects/test${i}`,
          permission_mode: "auto",
          hook_event_name: "UserPromptSubmit",
        };

        await manager.update(hookInput);
      }

      const entries = await manager.list();
      expect(entries).toHaveLength(3);

      const sessionIds = entries.map((e) => e.sessionId).sort();
      expect(sessionIds).toEqual([
        "session-list-1",
        "session-list-2",
        "session-list-3",
      ]);
    });

    test("filters activities by status", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      // Create working session
      const transcript1 = join(transcriptDir, "transcript-filter-1.jsonl");
      await createMockTranscript(transcript1, false);
      await manager.update({
        session_id: "filter-working",
        transcript_path: transcript1,
        cwd: "/projects/work",
        permission_mode: "auto",
        hook_event_name: "UserPromptSubmit",
      });

      // Create idle session
      const transcript2 = join(transcriptDir, "transcript-filter-2.jsonl");
      await createMockTranscript(transcript2, false);
      await manager.update({
        session_id: "filter-idle",
        transcript_path: transcript2,
        cwd: "/projects/idle",
        permission_mode: "auto",
        hook_event_name: "Stop",
      });

      // Create waiting session
      const transcript3 = join(transcriptDir, "transcript-filter-3.jsonl");
      await createMockTranscript(transcript3, true);
      await manager.update({
        session_id: "filter-waiting",
        transcript_path: transcript3,
        cwd: "/projects/waiting",
        permission_mode: "auto",
        hook_event_name: "Stop",
      });

      // Filter by working
      const workingEntries = await manager.list({ status: "working" });
      expect(workingEntries).toHaveLength(1);
      expect(workingEntries[0]?.sessionId).toBe("filter-working");

      // Filter by idle
      const idleEntries = await manager.list({ status: "idle" });
      expect(idleEntries).toHaveLength(1);
      expect(idleEntries[0]?.sessionId).toBe("filter-idle");

      // Filter by waiting_user_response
      const waitingEntries = await manager.list({
        status: "waiting_user_response",
      });
      expect(waitingEntries).toHaveLength(1);
      expect(waitingEntries[0]?.sessionId).toBe("filter-waiting");
    });

    test("convenience methods isWorking and isWaitingForUser", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      const transcript1 = join(transcriptDir, "transcript-conv-1.jsonl");
      await createMockTranscript(transcript1, false);

      // Create working session
      await manager.update({
        session_id: "conv-working",
        transcript_path: transcript1,
        cwd: "/projects/conv",
        permission_mode: "auto",
        hook_event_name: "UserPromptSubmit",
      });

      expect(await manager.isWorking("conv-working")).toBe(true);
      expect(await manager.isWaitingForUser("conv-working")).toBe(false);

      // Update to waiting
      await manager.update({
        session_id: "conv-working",
        transcript_path: transcript1,
        cwd: "/projects/conv",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
        tool_input: {},
      });

      expect(await manager.isWorking("conv-working")).toBe(false);
      expect(await manager.isWaitingForUser("conv-working")).toBe(true);
    });

    test("returns null for non-existent session", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      const status = await manager.getStatus("non-existent");
      expect(status).toBeNull();

      expect(await manager.isWorking("non-existent")).toBe(false);
      expect(await manager.isWaitingForUser("non-existent")).toBe(false);
    });
  });

  describe("End-to-End Flow", () => {
    test("full flow: hook update -> query status -> list entries", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();
      const manager = new ActivityManager(fs, clock, { dataDir });

      // Step 1: Simulate hook updating activity (UserPromptSubmit)
      const transcript1 = join(transcriptDir, "transcript-e2e-1.jsonl");
      await createMockTranscript(transcript1, false);

      const hookInput1: HookInput = {
        session_id: "e2e-session-1",
        transcript_path: transcript1,
        cwd: "/projects/e2e1",
        permission_mode: "auto",
        hook_event_name: "UserPromptSubmit",
        prompt: "Build a feature",
      };

      await manager.update(hookInput1);

      // Step 2: Query status
      const status1 = await manager.getStatus("e2e-session-1");
      expect(status1).not.toBeNull();
      expect(status1?.status).toBe("working");
      expect(status1?.projectPath).toBe("/projects/e2e1");

      // Step 3: Simulate another hook (PermissionRequest)
      await manager.update({
        session_id: "e2e-session-1",
        transcript_path: transcript1,
        cwd: "/projects/e2e1",
        permission_mode: "ask",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
        tool_input: { command: "npm install" },
      });

      // Step 4: Query updated status
      const status2 = await manager.getStatus("e2e-session-1");
      expect(status2?.status).toBe("waiting_user_response");

      // Step 5: Add second session
      const transcript2 = join(transcriptDir, "transcript-e2e-2.jsonl");
      await createMockTranscript(transcript2, true);

      await manager.update({
        session_id: "e2e-session-2",
        transcript_path: transcript2,
        cwd: "/projects/e2e2",
        permission_mode: "auto",
        hook_event_name: "Stop",
      });

      // Step 6: List all entries
      const allEntries = await manager.list();
      expect(allEntries).toHaveLength(2);

      const session1Entry = allEntries.find(
        (e) => e.sessionId === "e2e-session-1",
      );
      const session2Entry = allEntries.find(
        (e) => e.sessionId === "e2e-session-2",
      );

      expect(session1Entry?.status).toBe("waiting_user_response");
      expect(session2Entry?.status).toBe("waiting_user_response");

      // Step 7: Filter by status
      const waitingEntries = await manager.list({
        status: "waiting_user_response",
      });
      expect(waitingEntries).toHaveLength(2);

      // Step 8: Complete the session (Stop without AskUserQuestion)
      const transcript3 = join(transcriptDir, "transcript-e2e-3.jsonl");
      await createMockTranscript(transcript3, false);

      await manager.update({
        session_id: "e2e-session-1",
        transcript_path: transcript3,
        cwd: "/projects/e2e1",
        permission_mode: "auto",
        hook_event_name: "Stop",
      });

      const finalStatus = await manager.getStatus("e2e-session-1");
      expect(finalStatus?.status).toBe("idle");

      // Verify convenience methods
      expect(await manager.isWorking("e2e-session-1")).toBe(false);
      expect(await manager.isWaitingForUser("e2e-session-1")).toBe(false);
    });

    test("activity persists across manager instances", async () => {
      const fs = new BunFileSystem();
      const clock = new SystemClock();

      // Create first manager and add entry
      const manager1 = new ActivityManager(fs, clock, { dataDir });

      const transcript = join(transcriptDir, "transcript-persist.jsonl");
      await createMockTranscript(transcript, false);

      await manager1.update({
        session_id: "persist-session",
        transcript_path: transcript,
        cwd: "/projects/persist",
        permission_mode: "auto",
        hook_event_name: "UserPromptSubmit",
      });

      const status1 = await manager1.getStatus("persist-session");
      expect(status1).not.toBeNull();

      // Create second manager with same dataDir
      const manager2 = new ActivityManager(fs, clock, { dataDir });

      // Should be able to read entry from first manager
      const status2 = await manager2.getStatus("persist-session");
      expect(status2).not.toBeNull();
      expect(status2?.sessionId).toBe("persist-session");
      expect(status2?.status).toBe("working");
      expect(status2?.projectPath).toBe("/projects/persist");
    });
  });
});
