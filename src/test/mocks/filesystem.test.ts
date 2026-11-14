/**
 * Tests for MockFileSystem.
 *
 * @module test/mocks/filesystem.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockFileSystem } from "./filesystem";
import { FileNotFoundError } from "../../errors";

describe("MockFileSystem", () => {
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
  });

  describe("setFile and getFile", () => {
    it("should store and retrieve file content", () => {
      fs.setFile("/test.txt", "hello world");
      expect(fs.getFile("/test.txt")).toBe("hello world");
    });

    it("should return undefined for non-existent file", () => {
      expect(fs.getFile("/nonexistent.txt")).toBeUndefined();
    });

    it("should create parent directories automatically", async () => {
      fs.setFile("/a/b/c/file.txt", "content");
      expect(await fs.exists("/a")).toBe(true);
      expect(await fs.exists("/a/b")).toBe(true);
      expect(await fs.exists("/a/b/c")).toBe(true);
    });
  });

  describe("readFile", () => {
    it("should read existing file content", async () => {
      fs.setFile("/test.txt", "hello");
      const content = await fs.readFile("/test.txt");
      expect(content).toBe("hello");
    });

    it("should throw FileNotFoundError for non-existent file", async () => {
      await expect(fs.readFile("/missing.txt")).rejects.toThrow(
        FileNotFoundError,
      );
    });
  });

  describe("writeFile", () => {
    it("should write file content", async () => {
      await fs.writeFile("/test.txt", "content");
      expect(fs.getFile("/test.txt")).toBe("content");
    });

    it("should overwrite existing file", async () => {
      fs.setFile("/test.txt", "old");
      await fs.writeFile("/test.txt", "new");
      expect(fs.getFile("/test.txt")).toBe("new");
    });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      fs.setFile("/test.txt", "content");
      expect(await fs.exists("/test.txt")).toBe(true);
    });

    it("should return true for existing directory", async () => {
      fs.setDirectory("/mydir");
      expect(await fs.exists("/mydir")).toBe(true);
    });

    it("should return false for non-existent path", async () => {
      expect(await fs.exists("/missing")).toBe(false);
    });
  });

  describe("readDir", () => {
    it("should list directory contents", async () => {
      fs.setFile("/dir/a.txt", "a");
      fs.setFile("/dir/b.txt", "b");
      fs.setDirectory("/dir/subdir");

      const entries = await fs.readDir("/dir");
      expect(entries).toContain("a.txt");
      expect(entries).toContain("b.txt");
      expect(entries).toContain("subdir");
    });

    it("should return empty array for empty directory", async () => {
      fs.setDirectory("/empty");
      const entries = await fs.readDir("/empty");
      expect(entries).toEqual([]);
    });

    it("should throw for non-existent directory", async () => {
      await expect(fs.readDir("/missing")).rejects.toThrow(FileNotFoundError);
    });
  });

  describe("stat", () => {
    it("should return file stats", async () => {
      fs.setTime(1000);
      fs.setFile("/test.txt", "hello");

      const stats = await fs.stat("/test.txt");
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.size).toBe(5); // "hello" is 5 bytes
      expect(stats.mtimeMs).toBe(1000);
      expect(stats.ctimeMs).toBe(1000);
    });

    it("should return directory stats", async () => {
      fs.setDirectory("/mydir");

      const stats = await fs.stat("/mydir");
      expect(stats.isFile).toBe(false);
      expect(stats.isDirectory).toBe(true);
    });

    it("should throw for non-existent path", async () => {
      await expect(fs.stat("/missing")).rejects.toThrow(FileNotFoundError);
    });

    it("should update mtime on modification", async () => {
      fs.setTime(1000);
      fs.setFile("/test.txt", "first");

      fs.setTime(2000);
      fs.setFile("/test.txt", "second");

      const stats = await fs.stat("/test.txt");
      expect(stats.mtimeMs).toBe(2000);
      expect(stats.ctimeMs).toBe(1000); // Creation time unchanged
    });
  });

  describe("mkdir", () => {
    it("should create directory", async () => {
      await fs.mkdir("/newdir");
      expect(await fs.exists("/newdir")).toBe(true);
    });

    it("should create nested directories with recursive option", async () => {
      await fs.mkdir("/a/b/c", { recursive: true });
      expect(await fs.exists("/a/b/c")).toBe(true);
    });

    it("should fail without recursive if parent missing", async () => {
      await expect(fs.mkdir("/missing/child")).rejects.toThrow();
    });
  });

  describe("rm", () => {
    it("should remove file", async () => {
      fs.setFile("/test.txt", "content");
      await fs.rm("/test.txt");
      expect(await fs.exists("/test.txt")).toBe(false);
    });

    it("should remove empty directory", async () => {
      fs.setDirectory("/empty");
      await fs.rm("/empty");
      expect(await fs.exists("/empty")).toBe(false);
    });

    it("should remove directory recursively", async () => {
      fs.setFile("/dir/file.txt", "content");
      fs.setDirectory("/dir/subdir");

      await fs.rm("/dir", { recursive: true });
      expect(await fs.exists("/dir")).toBe(false);
    });

    it("should fail on non-empty directory without recursive", async () => {
      fs.setFile("/dir/file.txt", "content");
      await expect(fs.rm("/dir")).rejects.toThrow("not empty");
    });

    it("should not throw with force option on non-existent path", async () => {
      await fs.rm("/missing", { force: true });
    });

    it("should throw without force on non-existent path", async () => {
      await expect(fs.rm("/missing")).rejects.toThrow(FileNotFoundError);
    });
  });

  describe("clearFiles", () => {
    it("should clear all files", () => {
      fs.setFile("/a.txt", "a");
      fs.setFile("/b.txt", "b");
      fs.setDirectory("/dir");

      fs.clearFiles();

      expect(fs.getFiles().size).toBe(0);
    });
  });

  describe("getFiles", () => {
    it("should return all files", () => {
      fs.setFile("/a.txt", "a");
      fs.setFile("/b.txt", "b");

      const files = fs.getFiles();
      expect(files.size).toBe(2);
      expect(files.get("/a.txt")).toBe("a");
      expect(files.get("/b.txt")).toBe("b");
    });
  });

  describe("time operations", () => {
    it("should use setTime for file timestamps", () => {
      fs.setTime(5000);
      fs.setFile("/test.txt", "content");

      const files = fs.getFiles();
      expect(files.has("/test.txt")).toBe(true);
    });

    it("should advance time", () => {
      fs.setTime(1000);
      fs.advanceTime(500);
      fs.setFile("/test.txt", "content");

      // Time should now be 1500
    });
  });

  describe("watch", () => {
    it("should emit events when emitWatchEvent is called", async () => {
      const watcher = fs.watch("/dir");
      const iterator = watcher[Symbol.asyncIterator]();

      // Emit an event
      fs.emitWatchEvent("/dir", { eventType: "change", filename: "file.txt" });

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual({
        eventType: "change",
        filename: "file.txt",
      });

      // Clean up
      await iterator.return?.();
    });
  });

  describe("path normalization", () => {
    it("should normalize paths with trailing slashes", () => {
      fs.setFile("/test/", "content");
      expect(fs.getFile("/test")).toBe("content");
    });

    it("should normalize paths without leading slash", () => {
      fs.setFile("test.txt", "content");
      expect(fs.getFile("/test.txt")).toBe("content");
    });
  });
});
