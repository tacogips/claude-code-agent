/**
 * Tests for MockClock.
 *
 * @module test/mocks/clock.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockClock } from "./clock";

describe("MockClock", () => {
  let clock: MockClock;

  beforeEach(() => {
    clock = new MockClock(new Date("2026-01-01T00:00:00.000Z"));
  });

  describe("now", () => {
    it("should return the initial time", () => {
      const date = clock.now();
      expect(date.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });

    it("should return a copy of the date", () => {
      const date1 = clock.now();
      const date2 = clock.now();
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe("timestamp", () => {
    it("should return ISO timestamp string", () => {
      expect(clock.timestamp()).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("setTime", () => {
    it("should update the current time", () => {
      clock.setTime(new Date("2026-06-15T12:30:00.000Z"));
      expect(clock.timestamp()).toBe("2026-06-15T12:30:00.000Z");
    });
  });

  describe("setTimeFromString", () => {
    it("should update time from ISO string", () => {
      clock.setTimeFromString("2026-12-25T08:00:00.000Z");
      expect(clock.timestamp()).toBe("2026-12-25T08:00:00.000Z");
    });
  });

  describe("advance", () => {
    it("should advance time by milliseconds", () => {
      clock.advance(5000);
      expect(clock.timestamp()).toBe("2026-01-01T00:00:05.000Z");
    });

    it("should accumulate advances", () => {
      clock.advance(1000);
      clock.advance(2000);
      clock.advance(3000);
      expect(clock.timestamp()).toBe("2026-01-01T00:00:06.000Z");
    });
  });

  describe("getTimeMs", () => {
    it("should return time as Unix timestamp", () => {
      const expectedMs = new Date("2026-01-01T00:00:00.000Z").getTime();
      expect(clock.getTimeMs()).toBe(expectedMs);
    });
  });

  describe("sleep with manual advance", () => {
    it("should block until advance is called", async () => {
      let resolved = false;
      const sleepPromise = clock.sleep(1000).then(() => {
        resolved = true;
      });

      // Not resolved yet
      expect(resolved).toBe(false);

      // Advance time
      clock.advance(1000);

      await sleepPromise;
      expect(resolved).toBe(true);
    });

    it("should resolve multiple sleeps based on duration", async () => {
      // Queue three sleeps with different durations
      // They are resolved in order as time advances
      const order: number[] = [];

      const sleep1 = clock.sleep(100).then(() => order.push(1));
      const sleep2 = clock.sleep(100).then(() => order.push(2)); // Same duration, queued after
      const sleep3 = clock.sleep(100).then(() => order.push(3)); // Same duration, queued after

      // Advance 100ms - should resolve first sleep
      clock.advance(100);
      await sleep1;
      expect(order).toEqual([1]);

      // Advance another 100ms - should resolve second sleep
      clock.advance(100);
      await sleep2;
      expect(order).toEqual([1, 2]);

      // Advance another 100ms - should resolve third sleep
      clock.advance(100);
      await sleep3;
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("sleep with auto-advance", () => {
    it("should resolve immediately when auto-advance enabled", async () => {
      clock.enableAutoAdvance();

      const startTime = clock.getTimeMs();
      await clock.sleep(5000);
      const endTime = clock.getTimeMs();

      expect(endTime - startTime).toBe(5000);
    });

    it("should advance time by sleep duration", async () => {
      clock.enableAutoAdvance();

      await clock.sleep(1000);
      expect(clock.timestamp()).toBe("2026-01-01T00:00:01.000Z");

      await clock.sleep(2000);
      expect(clock.timestamp()).toBe("2026-01-01T00:00:03.000Z");
    });
  });

  describe("advanceToNextSleep", () => {
    it("should advance to next pending sleep", async () => {
      let resolved = false;
      const sleepPromise = clock.sleep(500).then(() => {
        resolved = true;
      });

      clock.advanceToNextSleep();

      await sleepPromise;
      expect(resolved).toBe(true);
      expect(clock.timestamp()).toBe("2026-01-01T00:00:00.500Z");
    });

    it("should do nothing if no pending sleeps", () => {
      clock.advanceToNextSleep();
      expect(clock.timestamp()).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("flushAllSleeps", () => {
    it("should resolve all pending sleeps", async () => {
      const results: number[] = [];

      const sleep1 = clock.sleep(100).then(() => results.push(1));
      const sleep2 = clock.sleep(200).then(() => results.push(2));
      const sleep3 = clock.sleep(300).then(() => results.push(3));

      clock.flushAllSleeps();

      await Promise.all([sleep1, sleep2, sleep3]);
      expect(results.length).toBe(3);
    });

    it("should advance time by total sleep duration", async () => {
      clock.sleep(100);
      clock.sleep(200);
      clock.sleep(300);

      clock.flushAllSleeps();

      // Total: 100 + 200 + 300 = 600ms
      expect(clock.timestamp()).toBe("2026-01-01T00:00:00.600Z");
    });
  });

  describe("getPendingSleepCount", () => {
    it("should return number of pending sleeps", () => {
      expect(clock.getPendingSleepCount()).toBe(0);

      clock.sleep(100);
      expect(clock.getPendingSleepCount()).toBe(1);

      clock.sleep(200);
      expect(clock.getPendingSleepCount()).toBe(2);

      clock.flushAllSleeps();
      expect(clock.getPendingSleepCount()).toBe(0);
    });
  });

  describe("enableAutoAdvance and disableAutoAdvance", () => {
    it("should toggle auto-advance mode", () => {
      expect(clock.isAutoAdvanceEnabled()).toBe(false);

      clock.enableAutoAdvance();
      expect(clock.isAutoAdvanceEnabled()).toBe(true);

      clock.disableAutoAdvance();
      expect(clock.isAutoAdvanceEnabled()).toBe(false);
    });

    it("should flush pending sleeps when enabling auto-advance", async () => {
      clock.sleep(100);
      clock.sleep(200);

      clock.enableAutoAdvance();

      expect(clock.getPendingSleepCount()).toBe(0);
    });
  });

  describe("default constructor", () => {
    it("should default to 2026-01-01", () => {
      const defaultClock = new MockClock();
      expect(defaultClock.timestamp()).toBe("2026-01-01T00:00:00.000Z");
    });
  });
});
