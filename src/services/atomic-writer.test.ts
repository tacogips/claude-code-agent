/**
 * Tests for AtomicWriter.
 *
 * @module services/atomic-writer.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { AtomicWriter } from "./atomic-writer";
import { MockFileSystem } from "../test/mocks/filesystem";

describe("AtomicWriter", () => {
  let fs: MockFileSystem;
  let writer: AtomicWriter;

  beforeEach(() => {
    fs = new MockFileSystem();
    writer = new AtomicWriter(fs);
  });

  describe("write", () => {
    test("writes content atomically to a new file", async () => {
      const filePath = "/data/config.txt";
      const content = "Hello, World!";

      await writer.write(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    test("overwrites existing file atomically", async () => {
      const filePath = "/data/config.txt";
      fs.setFile(filePath, "Old content");

      await writer.write(filePath, "New content");

      const result = await fs.readFile(filePath);
      expect(result).toBe("New content");
    });

    test("creates parent directories if they don't exist", async () => {
      const filePath = "/data/nested/deep/config.txt";
      const content = "Nested content";

      await writer.write(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
      expect(await fs.exists("/data/nested/deep")).toBe(true);
    });

    test("handles empty content", async () => {
      const filePath = "/data/empty.txt";

      await writer.write(filePath, "");

      const result = await fs.readFile(filePath);
      expect(result).toBe("");
    });

    test("handles large content", async () => {
      const filePath = "/data/large.txt";
      const largeContent = "x".repeat(10000);

      await writer.write(filePath, largeContent);

      const result = await fs.readFile(filePath);
      expect(result).toBe(largeContent);
      expect(result.length).toBe(10000);
    });

    test("handles special characters and unicode", async () => {
      const filePath = "/data/special.txt";
      const content = "Hello 世界! 🌍 \n\t Special: <>&\"'";

      await writer.write(filePath, content);

      const result = await fs.readFile(filePath);
      expect(result).toBe(content);
    });

    test("does not leave temp files after successful write", async () => {
      const filePath = "/data/config.txt";

      await writer.write(filePath, "content");

      // Check that no .tmp files exist
      const files = fs.getFiles();
      const tempFiles = Array.from(files.keys()).filter((path) =>
        path.includes(".tmp."),
      );
      expect(tempFiles).toHaveLength(0);
    });

    test("multiple writes to same file succeed", async () => {
      const filePath = "/data/config.txt";

      await writer.write(filePath, "First write");
      await writer.write(filePath, "Second write");
      await writer.write(filePath, "Third write");

      const result = await fs.readFile(filePath);
      expect(result).toBe("Third write");
    });

    test("concurrent writes to different files succeed", async () => {
      const writes = [
        writer.write("/data/file1.txt", "content1"),
        writer.write("/data/file2.txt", "content2"),
        writer.write("/data/file3.txt", "content3"),
      ];

      await Promise.all(writes);

      expect(await fs.readFile("/data/file1.txt")).toBe("content1");
      expect(await fs.readFile("/data/file2.txt")).toBe("content2");
      expect(await fs.readFile("/data/file3.txt")).toBe("content3");
    });
  });

  describe("writeJson", () => {
    test("writes JSON with pretty printing", async () => {
      const filePath = "/data/config.json";
      const data = {
        name: "Test",
        version: 1,
        settings: {
          enabled: true,
          count: 42,
        },
      };

      await writer.writeJson(filePath, data);

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
      expect(content).toContain("\n"); // Pretty printed
      expect(content).toContain("  "); // Indented with 2 spaces
    });

    test("writes array as JSON", async () => {
      const filePath = "/data/items.json";
      const data = [1, 2, 3, 4, 5];

      await writer.writeJson(filePath, data);

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
    });

    test("writes null as JSON", async () => {
      const filePath = "/data/null.json";

      await writer.writeJson(filePath, null);

      const content = await fs.readFile(filePath);
      expect(content).toBe("null");
    });

    test("writes complex nested structure", async () => {
      const filePath = "/data/complex.json";
      const data = {
        users: [
          { id: 1, name: "Alice", roles: ["admin", "user"] },
          { id: 2, name: "Bob", roles: ["user"] },
        ],
        metadata: {
          version: "1.0.0",
          timestamp: "2026-01-31T00:00:00Z",
        },
      };

      await writer.writeJson(filePath, data);

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0]?.roles).toEqual(["admin", "user"]);
    });

    test("overwrites existing JSON file", async () => {
      const filePath = "/data/config.json";
      fs.setFile(filePath, JSON.stringify({ old: "data" }));

      await writer.writeJson(filePath, { new: "data" });

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      expect(parsed).toEqual({ new: "data" });
    });

    test("handles undefined properties correctly", async () => {
      const filePath = "/data/with-undefined.json";
      const data = {
        name: "Test",
        optionalValue: undefined,
      };

      await writer.writeJson(filePath, data);

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      // JSON.stringify omits undefined values
      expect(parsed).toEqual({ name: "Test" });
      expect("optionalValue" in parsed).toBe(false);
    });

    test("preserves number precision", async () => {
      const filePath = "/data/numbers.json";
      const data = {
        integer: 42,
        float: 3.14159,
        large: 9007199254740991, // Number.MAX_SAFE_INTEGER
        negative: -123.456,
      };

      await writer.writeJson(filePath, data);

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
      expect(parsed.float).toBe(3.14159);
      expect(parsed.large).toBe(9007199254740991);
    });

    test("concurrent JSON writes succeed", async () => {
      const writes = [
        writer.writeJson("/data/a.json", { id: "a" }),
        writer.writeJson("/data/b.json", { id: "b" }),
        writer.writeJson("/data/c.json", { id: "c" }),
      ];

      await Promise.all(writes);

      const a = JSON.parse(await fs.readFile("/data/a.json"));
      const b = JSON.parse(await fs.readFile("/data/b.json"));
      const c = JSON.parse(await fs.readFile("/data/c.json"));

      expect(a.id).toBe("a");
      expect(b.id).toBe("b");
      expect(c.id).toBe("c");
    });
  });

  describe("error handling", () => {
    test("cleans up temp file on write failure", async () => {
      // Create a mock filesystem that throws on writeFile for temp files
      const failingFs = new MockFileSystem();
      const originalWriteFile = failingFs.writeFile.bind(failingFs);
      failingFs.writeFile = async (path: string, content: string) => {
        if (path.includes(".tmp.")) {
          throw new Error("Write failed");
        }
        return originalWriteFile(path, content);
      };

      const failingWriter = new AtomicWriter(failingFs);

      await expect(
        failingWriter.write("/data/fail.txt", "content"),
      ).rejects.toThrow("Write failed");

      // Verify no temp files remain
      const files = failingFs.getFiles();
      const tempFiles = Array.from(files.keys()).filter((path) =>
        path.includes(".tmp."),
      );
      expect(tempFiles).toHaveLength(0);
    });

    test("propagates errors from failed write", async () => {
      const failingFs = new MockFileSystem();
      const testError = new Error("Disk full");
      failingFs.writeFile = async () => {
        throw testError;
      };

      const failingWriter = new AtomicWriter(failingFs);

      await expect(
        failingWriter.write("/data/fail.txt", "content"),
      ).rejects.toThrow("Disk full");
    });

    test("handles serialization errors in writeJson", async () => {
      const filePath = "/data/circular.json";
      const circular: { self?: unknown } = {};
      circular.self = circular; // Circular reference

      await expect(writer.writeJson(filePath, circular)).rejects.toThrow();
    });
  });

  describe("atomicity verification", () => {
    test("concurrent writes to same file complete without error", async () => {
      const filePath = "/data/concurrent.txt";

      // Start multiple writes concurrently
      await Promise.all([
        writer.write(filePath, "write1"),
        writer.write(filePath, "write2"),
        writer.write(filePath, "write3"),
      ]);

      // Verify final file exists and contains valid content
      const result = await fs.readFile(filePath);
      expect(["write1", "write2", "write3"]).toContain(result);
    });

    test("final file contains one of the concurrent writes", async () => {
      const filePath = "/data/race.txt";

      await Promise.all([
        writer.write(filePath, "A"),
        writer.write(filePath, "B"),
        writer.write(filePath, "C"),
      ]);

      const result = await fs.readFile(filePath);

      // Final content should be one of the writes (not corrupted)
      expect(["A", "B", "C"]).toContain(result);
    });

    test("no temp files remain after concurrent operations", async () => {
      const filePath = "/data/cleanup-test.txt";

      await Promise.all([
        writer.write(filePath, "content1"),
        writer.write(filePath, "content2"),
      ]);

      // Verify no temp files exist
      const files = fs.getFiles();
      const tempFiles = Array.from(files.keys()).filter((path) =>
        path.includes(".tmp."),
      );
      expect(tempFiles).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    test("handles paths with special characters", async () => {
      const filePath = "/data/file-with-dashes_and_underscores.txt";

      await writer.write(filePath, "content");

      const result = await fs.readFile(filePath);
      expect(result).toBe("content");
    });

    test("handles absolute paths correctly", async () => {
      const filePath = "/var/log/app.log";

      await writer.write(filePath, "log entry");

      const result = await fs.readFile(filePath);
      expect(result).toBe("log entry");
    });

    test("writeJson handles object with toJSON method", async () => {
      const filePath = "/data/custom.json";
      const data = {
        name: "Test",
        date: new Date("2026-01-31T00:00:00.000Z"),
      };

      await writer.writeJson(filePath, data);

      const content = await fs.readFile(filePath);
      const parsed = JSON.parse(content);

      expect(parsed.name).toBe("Test");
      expect(parsed.date).toBe("2026-01-31T00:00:00.000Z");
    });
  });
});
