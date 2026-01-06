/**
 * Tests for Result type utilities.
 *
 * These tests verify the backward-compatible wrapper functions
 * around the neverthrow library.
 *
 * NOTE: Tests demonstrate both native method chaining (preferred)
 * and wrapper functions (backward compatible, deprecated).
 */

import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  flatMapAsync,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  all,
  tryCatch,
  tryCatchAsync,
} from "./result";

describe("Result", () => {
  describe("ok", () => {
    it("creates a successful result", () => {
      const result = ok(42);
      // Native method (preferred)
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });

    it("works with different value types", () => {
      expect(ok("hello").value).toBe("hello");
      expect(ok({ x: 1 }).value).toEqual({ x: 1 });
      expect(ok(null).value).toBeNull();
    });
  });

  describe("err", () => {
    it("creates a failed result", () => {
      const result = err("error");
      // Native method (preferred)
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe("error");
    });

    it("works with different error types", () => {
      expect(err(new Error("oops")).error).toBeInstanceOf(Error);
      expect(err({ code: 404 }).error).toEqual({ code: 404 });
    });
  });

  describe("isOk", () => {
    it("returns true for Ok results - native method preferred", () => {
      // Native method chaining (preferred)
      expect(ok(42).isOk()).toBe(true);
      // Wrapper function (backward compatible, deprecated)
      expect(isOk(ok(42))).toBe(true);
    });

    it("returns false for Err results - native method preferred", () => {
      // Native method chaining (preferred)
      expect(err("error").isOk()).toBe(false);
      // Wrapper function (backward compatible, deprecated)
      expect(isOk(err("error"))).toBe(false);
    });
  });

  describe("isErr", () => {
    it("returns true for Err results - native method preferred", () => {
      // Native method chaining (preferred)
      expect(err("error").isErr()).toBe(true);
      // Wrapper function (backward compatible, deprecated)
      expect(isErr(err("error"))).toBe(true);
    });

    it("returns false for Ok results - native method preferred", () => {
      // Native method chaining (preferred)
      expect(ok(42).isErr()).toBe(false);
      // Wrapper function (backward compatible, deprecated)
      expect(isErr(ok(42))).toBe(false);
    });
  });

  describe("map", () => {
    it("transforms successful values - native method preferred", () => {
      // Native method chaining (preferred)
      const result = ok(2).map((x) => x * 3);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(6);
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = map(ok(2), (x) => x * 3);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(6);
      }
    });

    it("passes through errors unchanged - native method preferred", () => {
      // Native method chaining (preferred)
      const result = err<number, string>("error").map((x) => x * 3);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("error");
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = map(err("error"), (_x: number) => _x * 3);
      expect(result2.isErr()).toBe(true);
    });
  });

  describe("mapErr", () => {
    it("transforms error values - native method preferred", () => {
      // Native method chaining (preferred)
      const result = err("error").mapErr((e) => e.toUpperCase());
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("ERROR");
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = mapErr(err("error"), (e) => e.toUpperCase());
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error).toBe("ERROR");
      }
    });

    it("passes through successful values unchanged - native method preferred", () => {
      // Native method chaining (preferred)
      const result = ok<number, string>(42).mapErr((e) => e.toUpperCase());
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = mapErr(ok<number, string>(42), (e) => e.toUpperCase());
      expect(result2.isOk()).toBe(true);
    });
  });

  describe("flatMap / andThen", () => {
    it("chains successful operations - native method preferred", () => {
      const divide = (n: number, d: number) =>
        d === 0 ? err("division by zero") : ok(n / d);

      // Native method chaining (preferred) - uses andThen
      const result = ok(10).andThen((x) => divide(x, 2));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = flatMap(ok(10), (x) => divide(x, 2));
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(5);
      }
    });

    it("short-circuits on first error - native method preferred", () => {
      const divide = (n: number, d: number) =>
        d === 0 ? err("division by zero") : ok(n / d);

      // Native method chaining (preferred)
      const result = ok(10).andThen((x) => divide(x, 0));
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("division by zero");
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = flatMap(ok(10), (x) => divide(x, 0));
      expect(result2.isErr()).toBe(true);
    });

    it("passes through initial error - native method preferred", () => {
      // Native method chaining (preferred)
      const result = err<number, string>("initial error").andThen((_x) =>
        ok(42),
      );
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("initial error");
      }

      // Wrapper function (backward compatible, deprecated)
      const result2 = flatMap(err("initial error"), (_x: number) => ok(42));
      expect(result2.isErr()).toBe(true);
    });
  });

  describe("flatMapAsync", () => {
    it("chains async operations", async () => {
      const asyncDivide = async (n: number, d: number) =>
        d === 0 ? err("division by zero") : ok(n / d);

      const result = await flatMapAsync(ok(10), (x) => asyncDivide(x, 2));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }
    });

    it("short-circuits on error", async () => {
      const asyncOp = async () => ok(42);
      const result = await flatMapAsync(err("error"), asyncOp);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("unwrap", () => {
    it("returns value for Ok", () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it("throws for Err", () => {
      expect(() => unwrap(err("error"))).toThrow();
    });

    it("uses custom message when provided", () => {
      expect(() => unwrap(err("error"), "custom message")).toThrow(
        "custom message",
      );
    });
  });

  describe("unwrapOr", () => {
    it("returns value for Ok - native method preferred", () => {
      // Native method chaining (preferred)
      expect(ok(42).unwrapOr(0)).toBe(42);
      // Wrapper function (backward compatible, deprecated)
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it("returns default for Err - native method preferred", () => {
      // Native method chaining (preferred)
      expect(err<number, string>("error").unwrapOr(0)).toBe(0);
      // Wrapper function (backward compatible, deprecated)
      expect(unwrapOr(err("error"), 0)).toBe(0);
    });
  });

  describe("unwrapOrElse", () => {
    it("returns value for Ok", () => {
      expect(unwrapOrElse(ok(42), () => 0)).toBe(42);
    });

    it("computes default from error for Err", () => {
      const result = unwrapOrElse(err("error"), (e) => e.length);
      expect(result).toBe(5);
    });
  });

  describe("all", () => {
    it("combines all Ok results", () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      expect(combined.isOk()).toBe(true);
      if (combined.isOk()) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it("returns first Err", () => {
      const results = [ok(1), err("error1"), err("error2")];
      const combined = all(results);
      expect(combined.isErr()).toBe(true);
      if (combined.isErr()) {
        expect(combined.error).toBe("error1");
      }
    });

    it("handles empty array", () => {
      const combined = all([]);
      expect(combined.isOk()).toBe(true);
      if (combined.isOk()) {
        expect(combined.value).toEqual([]);
      }
    });
  });

  describe("tryCatch", () => {
    it("wraps successful function in Ok", () => {
      const result = tryCatch(() => 42);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("catches thrown errors in Err", () => {
      const result = tryCatch(() => {
        throw new Error("oops");
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("tryCatchAsync", () => {
    it("wraps successful async function in Ok", async () => {
      const result = await tryCatchAsync(async () => 42);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("catches rejected promise in Err", async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error("async oops");
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});
