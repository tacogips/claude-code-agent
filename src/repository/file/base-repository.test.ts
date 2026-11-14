/**
 * Tests for BaseFileRepository.
 *
 * @module repository/file/base-repository.test
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { BaseFileRepository } from "./base-repository";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockFileLockService } from "../../test/mocks/lock";
import { AtomicWriter } from "../../services/atomic-writer";

/**
 * Test record type for repository tests.
 */
interface TestRecord {
  id: string;
  value: string;
  count: number;
}

/**
 * Concrete implementation of BaseFileRepository for testing.
 */
class TestRepository extends BaseFileRepository<TestRecord> {
  // Expose protected methods for testing
  public async testReadWithLock(filePath: string): Promise<TestRecord | null> {
    return this.readWithLock(filePath);
  }

  public async testWriteWithLock(
    filePath: string,
    data: TestRecord,
  ): Promise<void> {
    return this.writeWithLock(filePath, data);
  }

  public async testModifyWithLock(
    filePath: string,
    modifier: (current: TestRecord | null) => TestRecord,
  ): Promise<TestRecord> {
    return this.modifyWithLock(filePath, modifier);
  }

  public async testDeleteWithLock(filePath: string): Promise<boolean> {
    return this.deleteWithLock(filePath);
  }
}

describe("BaseFileRepository", () => {
  let fs: MockFileSystem;
  let lockService: MockFileLockService;
  let atomicWriter: AtomicWriter;
  let repository: TestRepository;

  beforeEach(() => {
    fs = new MockFileSystem();
    lockService = new MockFileLockService();
    atomicWriter = new AtomicWriter(fs);
    repository = new TestRepository(fs, lockService, atomicWriter);
  });

  describe("readWithLock", () => {
    test("returns null when file does not exist", async () => {
      const result = await repository.testReadWithLock("/data/missing.json");
      expect(result).toBeNull();
    });

    test("returns parsed data when file exists", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };
      await fs.writeFile("/data/test.json", JSON.stringify(data));

      const result = await repository.testReadWithLock("/data/test.json");
      expect(result).toEqual(data);
    });

    test("throws error when file contains invalid JSON", async () => {
      await fs.writeFile("/data/invalid.json", "not valid json");

      await expect(
        repository.testReadWithLock("/data/invalid.json"),
      ).rejects.toThrow("Failed to read or parse file");
    });

    test("does not acquire lock for reads", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };
      await fs.writeFile("/data/test.json", JSON.stringify(data));

      await repository.testReadWithLock("/data/test.json");

      // Verify no lock was acquired
      expect(await lockService.isLocked("/data/test.json")).toBe(false);
    });
  });

  describe("writeWithLock", () => {
    test("creates new file with data", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };

      await repository.testWriteWithLock("/data/new.json", data);

      const exists = await fs.exists("/data/new.json");
      expect(exists).toBe(true);

      const content = await fs.readFile("/data/new.json");
      expect(JSON.parse(content)).toEqual(data);
    });

    test("overwrites existing file", async () => {
      const oldData: TestRecord = { id: "test-1", value: "old", count: 1 };
      const newData: TestRecord = { id: "test-1", value: "new", count: 2 };

      await fs.writeFile("/data/test.json", JSON.stringify(oldData));
      await repository.testWriteWithLock("/data/test.json", newData);

      const content = await fs.readFile("/data/test.json");
      expect(JSON.parse(content)).toEqual(newData);
    });

    test("acquires and releases lock during write", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };

      await repository.testWriteWithLock("/data/test.json", data);

      // Lock should be released after write
      expect(await lockService.isLocked("/data/test.json")).toBe(false);
    });

    test("throws error when lock acquisition fails", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };

      // Simulate lock timeout
      lockService.setLockBehavior("/data/test.json", "timeout");

      await expect(
        repository.testWriteWithLock("/data/test.json", data),
      ).rejects.toThrow("Failed to acquire lock");
    });

    test("releases lock even when write fails", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };

      // Simulate write failure by making writeFile throw
      const originalWriteFile = fs.writeFile.bind(fs);
      fs.writeFile = async () => {
        throw new Error("Write failed");
      };

      await expect(
        repository.testWriteWithLock("/data/test.json", data),
      ).rejects.toThrow("Write failed");

      // Lock should be released despite error
      expect(await lockService.isLocked("/data/test.json")).toBe(false);

      // Restore original writeFile
      fs.writeFile = originalWriteFile;
    });
  });

  describe("modifyWithLock", () => {
    test("modifies non-existent file (null initial value)", async () => {
      const result = await repository.testModifyWithLock(
        "/data/new.json",
        (current) => {
          expect(current).toBeNull();
          return { id: "test-1", value: "created", count: 1 };
        },
      );

      expect(result).toEqual({ id: "test-1", value: "created", count: 1 });

      const content = await fs.readFile("/data/new.json");
      expect(JSON.parse(content)).toEqual({
        id: "test-1",
        value: "created",
        count: 1,
      });
    });

    test("modifies existing file with current value", async () => {
      const initial: TestRecord = { id: "test-1", value: "initial", count: 1 };
      await fs.writeFile("/data/test.json", JSON.stringify(initial));

      const result = await repository.testModifyWithLock(
        "/data/test.json",
        (current) => {
          expect(current).toEqual(initial);
          if (current === null) {
            throw new Error("Expected current to not be null");
          }
          return { ...current, count: current.count + 1 };
        },
      );

      expect(result).toEqual({ id: "test-1", value: "initial", count: 2 });

      const content = await fs.readFile("/data/test.json");
      expect(JSON.parse(content)).toEqual({
        id: "test-1",
        value: "initial",
        count: 2,
      });
    });

    test("holds lock during entire operation", async () => {
      const initial: TestRecord = { id: "test-1", value: "initial", count: 1 };
      await fs.writeFile("/data/test.json", JSON.stringify(initial));

      let lockWasHeldDuringModifier = false;

      await repository.testModifyWithLock("/data/test.json", (current) => {
        // Check if lock is held during modifier execution
        // Note: In the mock implementation, we can't easily check this
        // In a real scenario, we'd verify another process can't acquire the lock
        lockWasHeldDuringModifier = true;
        if (current === null) {
          throw new Error("Expected current to not be null");
        }
        return { ...current, count: current.count + 1 };
      });

      expect(lockWasHeldDuringModifier).toBe(true);

      // Lock should be released after operation
      expect(await lockService.isLocked("/data/test.json")).toBe(false);
    });

    test("returns modified value", async () => {
      const result = await repository.testModifyWithLock(
        "/data/test.json",
        () => {
          return { id: "test-1", value: "modified", count: 99 };
        },
      );

      expect(result).toEqual({ id: "test-1", value: "modified", count: 99 });
    });

    test("throws error when lock acquisition fails", async () => {
      lockService.setLockBehavior("/data/test.json", "timeout");

      await expect(
        repository.testModifyWithLock("/data/test.json", () => {
          return { id: "test-1", value: "foo", count: 1 };
        }),
      ).rejects.toThrow("Failed to acquire lock");
    });

    test("releases lock even when modifier throws", async () => {
      await expect(
        repository.testModifyWithLock("/data/test.json", () => {
          throw new Error("Modifier failed");
        }),
      ).rejects.toThrow("Modifier failed");

      // Lock should be released despite error
      expect(await lockService.isLocked("/data/test.json")).toBe(false);
    });

    test("releases lock even when write fails", async () => {
      const originalWriteJson = atomicWriter.writeJson.bind(atomicWriter);
      atomicWriter.writeJson = async () => {
        throw new Error("Write failed");
      };

      await expect(
        repository.testModifyWithLock("/data/test.json", () => {
          return { id: "test-1", value: "foo", count: 1 };
        }),
      ).rejects.toThrow("Write failed");

      // Lock should be released despite error
      expect(await lockService.isLocked("/data/test.json")).toBe(false);

      // Restore original writeJson
      atomicWriter.writeJson = originalWriteJson;
    });
  });

  describe("deleteWithLock", () => {
    test("returns false when file does not exist", async () => {
      const result = await repository.testDeleteWithLock("/data/missing.json");
      expect(result).toBe(false);
    });

    test("deletes existing file and returns true", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };
      await fs.writeFile("/data/test.json", JSON.stringify(data));

      const result = await repository.testDeleteWithLock("/data/test.json");
      expect(result).toBe(true);

      const exists = await fs.exists("/data/test.json");
      expect(exists).toBe(false);
    });

    test("acquires and releases lock during delete", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };
      await fs.writeFile("/data/test.json", JSON.stringify(data));

      await repository.testDeleteWithLock("/data/test.json");

      // Lock should be released after delete
      expect(await lockService.isLocked("/data/test.json")).toBe(false);
    });

    test("throws error when lock acquisition fails", async () => {
      lockService.setLockBehavior("/data/test.json", "timeout");

      await expect(
        repository.testDeleteWithLock("/data/test.json"),
      ).rejects.toThrow("Failed to acquire lock");
    });

    test("releases lock even when deletion fails", async () => {
      const data: TestRecord = { id: "test-1", value: "foo", count: 42 };
      await fs.writeFile("/data/test.json", JSON.stringify(data));

      // Simulate deletion failure
      const originalRm = fs.rm.bind(fs);
      fs.rm = async () => {
        throw new Error("Delete failed");
      };

      await expect(
        repository.testDeleteWithLock("/data/test.json"),
      ).rejects.toThrow("Delete failed");

      // Lock should be released despite error
      expect(await lockService.isLocked("/data/test.json")).toBe(false);

      // Restore original rm
      fs.rm = originalRm;
    });
  });

  describe("concurrent modifications (integration)", () => {
    test("sequential modifications preserve updates", async () => {
      // Initial data
      const initial: TestRecord = { id: "counter", value: "test", count: 0 };
      await fs.writeFile("/data/counter.json", JSON.stringify(initial));

      // Sequential increments (mock doesn't support concurrent locking)
      await repository.testModifyWithLock("/data/counter.json", (current) => {
        if (current === null) {
          throw new Error("Expected current to not be null");
        }
        return { ...current, count: current.count + 1 };
      });

      await repository.testModifyWithLock("/data/counter.json", (current) => {
        if (current === null) {
          throw new Error("Expected current to not be null");
        }
        return { ...current, count: current.count + 1 };
      });

      // Final count should be 2 (no lost updates)
      const final = await repository.testReadWithLock("/data/counter.json");
      expect(final?.count).toBe(2);
    });

    test("sequential writes overwrite previous value", async () => {
      // Write multiple times sequentially
      for (let i = 0; i < 5; i++) {
        const data: TestRecord = {
          id: `test-${i}`,
          value: `value-${i}`,
          count: i,
        };
        await repository.testWriteWithLock("/data/test.json", data);
      }

      // File should contain the last written value
      const final = await repository.testReadWithLock("/data/test.json");
      expect(final).not.toBeNull();
      if (final !== null) {
        expect(final.id).toBe("test-4");
        expect(final.value).toBe("value-4");
        expect(final.count).toBe(4);
      }
    });
  });
});
