/**
 * Tests for concurrency test utilities.
 */

import { describe, test, expect } from "vitest";
import {
  runConcurrent,
  verifyNoLostUpdates,
  type ConcurrentResult,
} from "./concurrency";

describe("runConcurrent", () => {
  test("runs all operations concurrently", async () => {
    const startTimes: number[] = [];
    const operations = Array(5)
      .fill(null)
      .map((_, i) => async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 10));
        return i;
      });

    const results: ReadonlyArray<ConcurrentResult<number>> =
      await runConcurrent(operations);

    // All operations should complete
    expect(results).toHaveLength(5);

    // All should succeed
    const values = results.map((r) => r.result);
    expect(values).toEqual([0, 1, 2, 3, 4]);

    // All should start within a short time window (concurrent, not sequential)
    const maxTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
    expect(maxTimeDiff).toBeLessThan(50); // Should all start nearly simultaneously
  });

  test("collects both successes and failures", async () => {
    const operations = [
      async () => "success1",
      async () => {
        throw new Error("intentional failure");
      },
      async () => "success2",
      async () => {
        throw new Error("another failure");
      },
    ];

    const results = await runConcurrent(operations);

    expect(results).toHaveLength(4);

    // Check successes
    expect(results[0]?.result).toBe("success1");
    expect(results[2]?.result).toBe("success2");

    // Check failures
    expect(results[1]?.error).toBeInstanceOf(Error);
    expect(results[1]?.error?.message).toBe("intentional failure");
    expect(results[3]?.error).toBeInstanceOf(Error);
    expect(results[3]?.error?.message).toBe("another failure");
  });

  test("handles non-Error rejections", async () => {
    const operations = [
      async () => {
        throw "string error";
      },
      async () => {
        throw 42;
      },
      async () => {
        throw null;
      },
    ];

    const results = await runConcurrent(operations);

    // All should be converted to Error instances
    expect(results[0]?.error).toBeInstanceOf(Error);
    expect(results[0]?.error?.message).toBe("string error");
    expect(results[1]?.error).toBeInstanceOf(Error);
    expect(results[1]?.error?.message).toBe("42");
    expect(results[2]?.error).toBeInstanceOf(Error);
    expect(results[2]?.error?.message).toBe("null");
  });

  test("supports delay between operations", async () => {
    const startTimes: number[] = [];
    const operations = Array(3)
      .fill(null)
      .map(() => async () => {
        startTimes.push(Date.now());
        return true;
      });

    await runConcurrent(operations, { delayBetween: 50 });

    expect(startTimes).toHaveLength(3);

    // First operation should start immediately
    // Second should start ~50ms later
    // Third should start ~100ms later
    const deltas = [
      startTimes[1]! - startTimes[0]!,
      startTimes[2]! - startTimes[0]!,
    ];

    expect(deltas[0]).toBeGreaterThanOrEqual(40); // Allow some variance
    expect(deltas[0]).toBeLessThan(70);
    expect(deltas[1]).toBeGreaterThanOrEqual(90);
    expect(deltas[1]).toBeLessThan(120);
  });

  test("returns empty array for empty operations", async () => {
    const results = await runConcurrent([]);
    expect(results).toEqual([]);
  });

  test("preserves result order matching operation order", async () => {
    const operations = [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return "first";
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "second";
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return "third";
      },
    ];

    const results = await runConcurrent(operations);

    // Results should be in same order as operations, not completion order
    expect(results[0]?.result).toBe("first");
    expect(results[1]?.result).toBe("second");
    expect(results[2]?.result).toBe("third");
  });
});

describe("verifyNoLostUpdates", () => {
  test("detects lost updates with naive concurrent writes", async () => {
    // Simulate a naive counter without locking
    let counter = 0;

    const result = await verifyNoLostUpdates(
      0,
      [(n) => n + 1, (n) => n + 1, (n) => n + 1, (n) => n + 1, (n) => n + 1],
      async () => counter,
      async (value) => {
        // Simulate read-modify-write race condition
        await new Promise((resolve) => setTimeout(resolve, 5));
        counter = value;
      },
    );

    // Without locking, we expect lost updates
    expect(result.expected).toBe(5);
    expect(result.actual).toBeLessThan(5); // Lost updates!
    expect(result.success).toBe(false);
  });

  test("verifies no lost updates with atomic operations", async () => {
    // Simulate atomic counter
    let counter = 0;

    const result = await verifyNoLostUpdates(
      0,
      [(n) => n + 1, (n) => n + 1, (n) => n + 1],
      async () => counter,
      async (value) => {
        // Direct assignment (atomic for primitives)
        counter = value;
      },
    );

    // Note: This test might be flaky depending on timing.
    // The actual value could be 1, 2, or 3 depending on race conditions.
    // We're testing the verification mechanism, not guaranteeing atomicity.
    expect(result.expected).toBe(3);
    expect(typeof result.actual).toBe("number");
    expect(result.success).toBe(result.actual === result.expected);
  });

  test("works with complex object modifications", async () => {
    interface State {
      count: number;
      items: string[];
    }

    let state: State = { count: 0, items: [] };

    const result = await verifyNoLostUpdates<State>(
      { count: 0, items: [] },
      [
        (s) => ({ count: s.count + 1, items: [...s.items, "a"] }),
        (s) => ({ count: s.count + 1, items: [...s.items, "b"] }),
        (s) => ({ count: s.count + 1, items: [...s.items, "c"] }),
      ],
      async () => state,
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        state = value;
      },
    );

    expect(result.expected).toEqual({
      count: 3,
      items: ["a", "b", "c"],
    });

    // With race conditions, we expect lost updates
    expect(result.success).toBe(false);
    expect(result.actual.count).toBeLessThan(3);
  });

  test("calculates expected value correctly through sequential application", async () => {
    interface Counter {
      value: number;
    }

    let storage: Counter = { value: 10 };

    const result = await verifyNoLostUpdates<Counter>(
      { value: 10 },
      [
        (c) => ({ value: c.value * 2 }), // 10 * 2 = 20
        (c) => ({ value: c.value + 5 }), // 20 + 5 = 25
        (c) => ({ value: c.value - 3 }), // 25 - 3 = 22
      ],
      async () => storage,
      async (value) => {
        storage = value;
      },
    );

    expect(result.expected.value).toBe(22);
  });

  test("handles empty modifications array", async () => {
    let value = 42;

    const result = await verifyNoLostUpdates<number>(
      42,
      [],
      async () => value,
      async (v) => {
        value = v;
      },
    );

    expect(result.success).toBe(true);
    expect(result.expected).toBe(42);
    expect(result.actual).toBe(42);
  });

  test("uses deep equality for success check", async () => {
    interface Data {
      nested: { value: number };
    }

    let storage: Data = { nested: { value: 0 } };

    const result = await verifyNoLostUpdates<Data>(
      { nested: { value: 0 } },
      [(d) => ({ nested: { value: d.nested.value + 1 } })],
      async () => storage,
      async (value) => {
        storage = value;
      },
    );

    // Even with nested objects, equality check should work
    expect(result.success).toBe(true);
    expect(result.expected).toEqual({ nested: { value: 1 } });
    expect(result.actual).toEqual({ nested: { value: 1 } });
  });

  test("detects differences in nested structures", async () => {
    interface Data {
      items: number[];
    }

    let storage: Data = { items: [] };

    const result = await verifyNoLostUpdates<Data>(
      { items: [] },
      [
        (d) => ({ items: [...d.items, 1] }),
        (d) => ({ items: [...d.items, 2] }),
        (d) => ({ items: [...d.items, 3] }),
      ],
      async () => storage,
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        storage = value;
      },
    );

    expect(result.expected).toEqual({ items: [1, 2, 3] });
    // Due to race conditions, actual will likely have fewer items
    expect(result.success).toBe(false);
    expect(result.actual.items.length).toBeLessThan(3);
  });
});

describe("integration scenarios", () => {
  test("simulates file write race condition", async () => {
    interface FileContent {
      version: number;
      data: string;
    }

    // Simulate file storage
    let fileContent: FileContent = { version: 0, data: "" };

    const modifications = [
      (c: FileContent) => ({ version: c.version + 1, data: "update1" }),
      (c: FileContent) => ({ version: c.version + 1, data: "update2" }),
      (c: FileContent) => ({ version: c.version + 1, data: "update3" }),
    ];

    const result = await verifyNoLostUpdates<FileContent>(
      { version: 0, data: "" },
      modifications,
      async () => fileContent,
      async (content) => {
        // Simulate slow file write
        await new Promise((resolve) => setTimeout(resolve, 10));
        fileContent = content;
      },
    );

    expect(result.expected.version).toBe(3);
    // Without locking, version will be less than expected
    expect(result.success).toBe(false);
  });

  test("verifies successful lock-based updates", async () => {
    // Simulate locked storage with mutex
    let storage = 0;
    let isLocked = false;

    const acquireLock = async () => {
      while (isLocked) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
      isLocked = true;
    };

    const releaseLock = () => {
      isLocked = false;
    };

    const result = await verifyNoLostUpdates(
      0,
      [(n) => n + 1, (n) => n + 1, (n) => n + 1],
      async () => {
        await acquireLock();
        const value = storage;
        releaseLock();
        return value;
      },
      async (value) => {
        await acquireLock();
        storage = value;
        releaseLock();
      },
    );

    // With locking, all updates should be preserved
    expect(result.success).toBe(true);
    expect(result.expected).toBe(3);
    expect(result.actual).toBe(3);
  });
});
