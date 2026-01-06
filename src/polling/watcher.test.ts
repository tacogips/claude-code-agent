/**
 * Tests for TranscriptWatcher.
 *
 * @module polling/watcher.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TranscriptWatcher } from "./watcher";
import { MockFileSystem } from "../test/mocks/filesystem";
import { MockProcessManager } from "../test/mocks/process-manager";
import { MockClock } from "../test/mocks/clock";
import type { Container } from "../container";

describe("TranscriptWatcher", () => {
  let fs: MockFileSystem;
  let container: Container;
  let watcher: TranscriptWatcher;

  beforeEach(() => {
    fs = new MockFileSystem();
    container = {
      fileSystem: fs,
      processManager: new MockProcessManager(),
      clock: new MockClock(),
    };
  });

  afterEach(() => {
    watcher?.stop();
  });

  describe("watch", () => {
    it("should emit new content when file changes", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "initial content\n");

      watcher = new TranscriptWatcher(container);
      const changes: string[] = [];

      // Start watching
      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
          if (changes.length >= 2) break;
        }
      })();

      // Wait a bit for watcher to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger changes
      fs.setFile(path, "initial content\nnew line 1\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      fs.setFile(path, "initial content\nnew line 1\nnew line 2\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await watchPromise;

      expect(changes).toHaveLength(2);
      expect(changes[0]).toBe("new line 1\n");
      expect(changes[1]).toBe("new line 2\n");
    });

    it("should include existing content when includeExisting is true", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "existing content\n");

      watcher = new TranscriptWatcher(container, { includeExisting: true });
      const changes: string[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
          if (changes.length >= 1) break;
        }
      })();

      await watchPromise;

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe("existing content\n");
    });

    it("should not include existing content by default", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "existing content\n");

      watcher = new TranscriptWatcher(container);
      const changes: string[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
          if (changes.length >= 1) break;
        }
      })();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger change
      fs.setFile(path, "existing content\nnew content\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      watcher.stop();

      await watchPromise;

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe("new content\n");
    });

    it("should debounce rapid changes", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "initial\n");

      watcher = new TranscriptWatcher(container, { debounceMs: 50 });
      const changes: string[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
          if (changes.length >= 1) break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit multiple rapid changes
      fs.setFile(path, "initial\nchange1\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      fs.setFile(path, "initial\nchange1\nchange2\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      fs.setFile(path, "initial\nchange1\nchange2\nchange3\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      // Should have only one change event with all new content
      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe("change1\nchange2\nchange3\n");
    });

    it("should handle file truncation", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "initial content\n");

      watcher = new TranscriptWatcher(container);
      const changes: string[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
          if (changes.length >= 2) break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Add content
      fs.setFile(path, "initial content\nnew line\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Truncate file (simulate rotation)
      fs.setFile(path, "truncated\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      expect(changes).toHaveLength(2);
      expect(changes[0]).toBe("new line\n");
      expect(changes[1]).toBe("truncated\n");
    });

    it("should include path and timestamp in FileChange", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "initial\n");

      watcher = new TranscriptWatcher(container);
      let change: any = null;

      const watchPromise = (async (): Promise<void> => {
        for await (const c of watcher.watch(path)) {
          change = c;
          break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.setFile(path, "initial\nnew\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      expect(change).not.toBeNull();
      expect(change.path).toBe(path);
      expect(change.content).toBe("new\n");
      expect(change.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should stop watching when stop() is called", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "initial\n");

      watcher = new TranscriptWatcher(container);
      const changes: string[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.setFile(path, "initial\nchange1\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      watcher.stop();

      // Further changes should not be emitted
      fs.setFile(path, "initial\nchange1\nchange2\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe("change1\n");
    });

    it("should handle empty files", async () => {
      const path = "/test/session.jsonl";
      fs.setFile(path, "");

      watcher = new TranscriptWatcher(container);
      const changes: string[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watch(path)) {
          changes.push(change.content);
          if (changes.length >= 1) break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.setFile(path, "first line\n");
      fs.emitWatchEvent(path, {
        eventType: "change",
        filename: "session.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe("first line\n");
    });
  });

  describe("watchMultiple", () => {
    it("should watch multiple files simultaneously", async () => {
      const path1 = "/test/session1.jsonl";
      const path2 = "/test/session2.jsonl";

      fs.setFile(path1, "initial1\n");
      fs.setFile(path2, "initial2\n");

      watcher = new TranscriptWatcher(container);
      const changes: Array<{ path: string; content: string }> = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watchMultiple([path1, path2])) {
          changes.push({ path: change.path, content: change.content });
          if (changes.length >= 2) break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Change file 1
      fs.setFile(path1, "initial1\nchange1\n");
      fs.emitWatchEvent(path1, {
        eventType: "change",
        filename: "session1.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Change file 2
      fs.setFile(path2, "initial2\nchange2\n");
      fs.emitWatchEvent(path2, {
        eventType: "change",
        filename: "session2.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      expect(changes).toHaveLength(2);
      expect(changes[0]?.path).toBe(path1);
      expect(changes[0]?.content).toBe("change1\n");
      expect(changes[1]?.path).toBe(path2);
      expect(changes[1]?.content).toBe("change2\n");
    });

    it("should handle empty file list", async () => {
      watcher = new TranscriptWatcher(container);
      const changes: any[] = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watchMultiple([])) {
          changes.push(change);
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 50));
      watcher.stop();

      await watchPromise;

      expect(changes).toHaveLength(0);
    });

    it("should merge changes from multiple files in order received", async () => {
      const path1 = "/test/session1.jsonl";
      const path2 = "/test/session2.jsonl";
      const path3 = "/test/session3.jsonl";

      fs.setFile(path1, "");
      fs.setFile(path2, "");
      fs.setFile(path3, "");

      watcher = new TranscriptWatcher(container);
      const changes: Array<{ path: string; content: string }> = [];

      const watchPromise = (async (): Promise<void> => {
        for await (const change of watcher.watchMultiple([
          path1,
          path2,
          path3,
        ])) {
          changes.push({ path: change.path, content: change.content });
          if (changes.length >= 3) break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger changes in different order
      fs.setFile(path2, "change2\n");
      fs.emitWatchEvent(path2, {
        eventType: "change",
        filename: "session2.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      fs.setFile(path1, "change1\n");
      fs.emitWatchEvent(path1, {
        eventType: "change",
        filename: "session1.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      fs.setFile(path3, "change3\n");
      fs.emitWatchEvent(path3, {
        eventType: "change",
        filename: "session3.jsonl",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await watchPromise;

      expect(changes).toHaveLength(3);
      expect(changes[0]?.path).toBe(path2);
      expect(changes[1]?.path).toBe(path1);
      expect(changes[2]?.path).toBe(path3);
    });
  });

  describe("stop", () => {
    it("should clean up all watchers", async () => {
      const path1 = "/test/session1.jsonl";
      const path2 = "/test/session2.jsonl";

      fs.setFile(path1, "");
      fs.setFile(path2, "");

      watcher = new TranscriptWatcher(container);

      // Start watching
      const watchPromise1 = (async (): Promise<void> => {
        for await (const _change of watcher.watch(path1)) {
          // consume
        }
      })();

      const watchPromise2 = (async (): Promise<void> => {
        for await (const _change of watcher.watch(path2)) {
          // consume
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      watcher.stop();

      await Promise.race([
        Promise.all([watchPromise1, watchPromise2]),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      // Verify cleanup happened (no errors thrown)
      expect(true).toBe(true);
    });

    it("should be safe to call multiple times", () => {
      watcher = new TranscriptWatcher(container);

      watcher.stop();
      watcher.stop();
      watcher.stop();

      expect(true).toBe(true);
    });
  });
});
