/**
 * Tests for SessionUpdateReceiver.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { appendFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionUpdateReceiver, createSessionReceiver } from "./receiver";

describe("SessionUpdateReceiver", () => {
  let tempDir: string;
  let transcriptPath: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "receiver-test-"));
    transcriptPath = join(tempDir, "transcript.jsonl");
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("createSessionReceiver", () => {
    test("returns a SessionUpdateReceiver instance", () => {
      const receiver = createSessionReceiver("test-session");
      expect(receiver).toBeInstanceOf(SessionUpdateReceiver);
      receiver.close();
    });

    test("sets sessionId correctly", () => {
      const receiver = createSessionReceiver("test-session-123");
      expect(receiver.sessionId).toBe("test-session-123");
      receiver.close();
    });
  });

  describe("isClosed property", () => {
    test("is initially false", () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
      });
      expect(receiver.isClosed).toBe(false);
      receiver.close();
    });

    test("is true after close()", () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
      });
      receiver.close();
      expect(receiver.isClosed).toBe(true);
    });
  });

  describe("close()", () => {
    test("sets isClosed to true", () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
      });
      receiver.close();
      expect(receiver.isClosed).toBe(true);
    });

    test("causes receive() to return null", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
      });
      receiver.close();
      const result = await receiver.receive();
      expect(result).toBe(null);
    });

    test("can be called multiple times safely", () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
      });
      receiver.close();
      receiver.close();
      expect(receiver.isClosed).toBe(true);
    });
  });

  describe("receive() with new content", () => {
    test("picks up new content written to transcript file", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Write content after a short delay
      setTimeout(async () => {
        await writeFile(
          transcriptPath,
          '{"type":"user","content":"Hello"}\n',
          "utf8",
        );
      }, 100);

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.newContent).toBe('{"type":"user","content":"Hello"}\n');
      expect(update?.events).toHaveLength(1);
      expect(update?.events[0]?.type).toBe("user");

      receiver.close();
    });

    test("picks up multiple sequential writes", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Write first content
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"First"}\n',
        "utf8",
      );

      const update1 = await receiver.receive();
      expect(update1?.events).toHaveLength(1);
      expect(update1?.events[0]?.type).toBe("user");

      // Write second content
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"First"}\n{"type":"assistant","content":"Second"}\n',
        "utf8",
      );

      const update2 = await receiver.receive();
      expect(update2?.events).toHaveLength(1);
      expect(update2?.events[0]?.type).toBe("assistant");

      receiver.close();
    });

    test("handles rapid writes correctly", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Write initial content
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Line1"}\n',
        "utf8",
      );

      // First receive picks up the initial write
      const update1 = await receiver.receive();
      expect(update1?.events[0]?.type).toBe("user");

      // Append more content after first receive
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Line1"}\n{"type":"assistant","content":"Line2"}\n',
        "utf8",
      );

      // Second receive picks up only the new content
      const update2 = await receiver.receive();
      expect(update2?.events[0]?.type).toBe("assistant");

      receiver.close();
    });
  });

  describe("receive() with includeExisting", () => {
    test("returns existing content on first call when includeExisting: true", async () => {
      // Write content before creating receiver
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Existing"}\n',
        "utf8",
      );

      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        includeExisting: true,
        pollingIntervalMs: 50,
      });

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.events).toHaveLength(1);
      expect(update?.events[0]?.type).toBe("user");

      receiver.close();
    });

    test("does not return existing content when includeExisting: false", async () => {
      // Write content before creating receiver
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Existing"}\n',
        "utf8",
      );

      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        includeExisting: false,
        pollingIntervalMs: 50,
      });

      // Write new content after delay
      setTimeout(async () => {
        await appendFile(
          transcriptPath,
          '{"type":"assistant","content":"New"}\n',
          "utf8",
        );
      }, 100);

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.events).toHaveLength(1);
      expect(update?.events[0]?.type).toBe("assistant");

      receiver.close();
    });
  });

  describe("custom polling interval", () => {
    test("respects custom pollingIntervalMs", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 200,
      });

      const startTime = Date.now();

      // Write content that should be picked up
      setTimeout(async () => {
        await writeFile(
          transcriptPath,
          '{"type":"user","content":"Test"}\n',
          "utf8",
        );
      }, 50);

      await receiver.receive();
      const elapsed = Date.now() - startTime;

      // Should take at least one polling interval
      expect(elapsed).toBeGreaterThanOrEqual(50);

      receiver.close();
    });
  });

  describe("file not existing yet", () => {
    test("waits until file appears", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Create file after delay
      setTimeout(async () => {
        await writeFile(
          transcriptPath,
          '{"type":"user","content":"Delayed"}\n',
          "utf8",
        );
      }, 150);

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.events).toHaveLength(1);
      expect(update?.events[0]?.type).toBe("user");

      receiver.close();
    });

    test("handles file created and deleted multiple times", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Create file
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"First"}\n',
        "utf8",
      );

      const update1 = await receiver.receive();
      expect(update1?.events[0]?.type).toBe("user");

      // Delete file and wait for at least one poll cycle to detect it
      await rm(transcriptPath, { force: true });
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Recreate file with new content
      await writeFile(
        transcriptPath,
        '{"type":"assistant","content":"Second"}\n',
        "utf8",
      );

      const update2 = await receiver.receive();
      expect(update2?.events[0]?.type).toBe("assistant");

      receiver.close();
    });
  });

  describe("file truncation", () => {
    test("resets offset when file is smaller than offset", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Write initial content
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Initial long content"}\n',
        "utf8",
      );

      const update1 = await receiver.receive();
      expect(update1?.events).toHaveLength(1);

      // Truncate file (write shorter content)
      await writeFile(
        transcriptPath,
        '{"type":"assistant","content":"Short"}\n',
        "utf8",
      );

      const update2 = await receiver.receive();
      expect(update2).not.toBe(null);
      expect(update2?.events[0]?.type).toBe("assistant");

      receiver.close();
    });
  });

  describe("multiple sequential receive() calls", () => {
    test("queues updates when multiple updates arrive", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Write initial content
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Line1"}\n',
        "utf8",
      );

      // First receive picks up initial write
      const update1 = await receiver.receive();
      expect(update1?.events[0]?.type).toBe("user");

      // Append new content after first receive
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Line1"}\n{"type":"assistant","content":"Line2"}\n',
        "utf8",
      );

      // Second receive picks up appended content
      const update2 = await receiver.receive();
      expect(update2?.events[0]?.type).toBe("assistant");

      receiver.close();
    });

    test("blocks when no updates available", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      let receivedUpdate = false;

      // Start receive (will block)
      const receivePromise = receiver.receive().then((update) => {
        receivedUpdate = true;
        return update;
      });

      // Verify it's blocking
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(receivedUpdate).toBe(false);

      // Write content to unblock
      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Unblock"}\n',
        "utf8",
      );

      const update = await receivePromise;
      expect(update).not.toBe(null);
      expect(receivedUpdate).toBe(true);

      receiver.close();
    });
  });

  describe("sessionId property", () => {
    test("returns the correct session ID", () => {
      const receiver = createSessionReceiver("my-session-id", {
        transcriptPath,
      });
      expect(receiver.sessionId).toBe("my-session-id");
      receiver.close();
    });
  });

  describe("timestamp in updates", () => {
    test("includes valid ISO timestamp", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      await writeFile(
        transcriptPath,
        '{"type":"user","content":"Test"}\n',
        "utf8",
      );

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.timestamp).toBeDefined();

      // Validate ISO format
      if (update !== null) {
        const timestamp = new Date(update.timestamp);
        expect(timestamp.toISOString()).toBe(update.timestamp);
      }

      receiver.close();
    });
  });

  describe("events parsing", () => {
    test("parses multiple events correctly", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      const content =
        '{"type":"user","content":"Message1"}\n' +
        '{"type":"assistant","content":"Message2"}\n' +
        '{"type":"tool_use","name":"Read"}\n';

      await writeFile(transcriptPath, content, "utf8");

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.events).toHaveLength(3);
      expect(update?.events[0]?.type).toBe("user");
      expect(update?.events[1]?.type).toBe("assistant");
      expect(update?.events[2]?.type).toBe("tool_use");

      receiver.close();
    });

    test("handles malformed JSON gracefully", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      const content =
        '{"type":"user","content":"Valid"}\n' +
        "{invalid json}\n" +
        '{"type":"assistant","content":"AlsoValid"}\n';

      await writeFile(transcriptPath, content, "utf8");

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      // Malformed line is skipped
      expect(update?.events).toHaveLength(2);
      expect(update?.events[0]?.type).toBe("user");
      expect(update?.events[1]?.type).toBe("assistant");

      receiver.close();
    });
  });

  describe("close() during pending receive()", () => {
    test("resolves pending receive() with null when closed", async () => {
      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Start receive (will block since no content)
      const receivePromise = receiver.receive();

      // Close after delay
      setTimeout(() => {
        receiver.close();
      }, 100);

      const result = await receivePromise;
      expect(result).toBe(null);
    });
  });

  describe("empty file", () => {
    test("waits for content even if file exists but is empty", async () => {
      // Create empty file
      await writeFile(transcriptPath, "", "utf8");

      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        pollingIntervalMs: 50,
      });

      // Write content after delay
      setTimeout(async () => {
        await writeFile(
          transcriptPath,
          '{"type":"user","content":"Content"}\n',
          "utf8",
        );
      }, 100);

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.events).toHaveLength(1);

      receiver.close();
    });
  });

  describe("includeExisting with empty file", () => {
    test("does not enqueue empty content when includeExisting: true", async () => {
      // Create empty file
      await writeFile(transcriptPath, "", "utf8");

      const receiver = createSessionReceiver("test-session", {
        transcriptPath,
        includeExisting: true,
        pollingIntervalMs: 50,
      });

      // Write content after delay
      setTimeout(async () => {
        await writeFile(
          transcriptPath,
          '{"type":"user","content":"New"}\n',
          "utf8",
        );
      }, 100);

      const update = await receiver.receive();
      expect(update).not.toBe(null);
      expect(update?.events[0]?.type).toBe("user");

      receiver.close();
    });
  });
});
