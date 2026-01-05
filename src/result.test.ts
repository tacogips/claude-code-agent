/**
 * Tests for Result type utilities.
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
      expect(result.ok).toBe(true);
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
      expect(result.ok).toBe(false);
      expect(result.error).toBe("error");
    });

    it("works with different error types", () => {
      expect(err(new Error("oops")).error).toBeInstanceOf(Error);
      expect(err({ code: 404 }).error).toEqual({ code: 404 });
    });
  });

  describe("isOk", () => {
    it("returns true for Ok results", () => {
      expect(isOk(ok(42))).toBe(true);
    });

    it("returns false for Err results", () => {
      expect(isOk(err("error"))).toBe(false);
    });
  });

  describe("isErr", () => {
    it("returns true for Err results", () => {
      expect(isErr(err("error"))).toBe(true);
    });

    it("returns false for Ok results", () => {
      expect(isErr(ok(42))).toBe(false);
    });
  });

  describe("map", () => {
    it("transforms successful values", () => {
      const result = map(ok(2), (x) => x * 3);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(6);
      }
    });

    it("passes through errors unchanged", () => {
      const result = map(err("error"), (x: number) => x * 3);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe("error");
      }
    });
  });

  describe("mapErr", () => {
    it("transforms error values", () => {
      const result = mapErr(err("error"), (e) => e.toUpperCase());
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe("ERROR");
      }
    });

    it("passes through successful values unchanged", () => {
      const result = mapErr(ok(42), (e: string) => e.toUpperCase());
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe("flatMap", () => {
    it("chains successful operations", () => {
      const divide = (n: number, d: number) =>
        d === 0 ? err("division by zero") : ok(n / d);

      const result = flatMap(ok(10), (x) => divide(x, 2));
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(5);
      }
    });

    it("short-circuits on first error", () => {
      const divide = (n: number, d: number) =>
        d === 0 ? err("division by zero") : ok(n / d);

      const result = flatMap(ok(10), (x) => divide(x, 0));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe("division by zero");
      }
    });

    it("passes through initial error", () => {
      const result = flatMap(err("initial error"), () => ok(42));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe("initial error");
      }
    });
  });

  describe("flatMapAsync", () => {
    it("chains async operations", async () => {
      const asyncDivide = async (n: number, d: number) =>
        d === 0 ? err("division by zero") : ok(n / d);

      const result = await flatMapAsync(ok(10), (x) => asyncDivide(x, 2));
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(5);
      }
    });

    it("short-circuits on error", async () => {
      const asyncOp = async () => ok(42);
      const result = await flatMapAsync(err("error"), asyncOp);
      expect(isErr(result)).toBe(true);
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
    it("returns value for Ok", () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it("returns default for Err", () => {
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
      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it("returns first Err", () => {
      const results = [ok(1), err("error1"), err("error2")];
      const combined = all(results);
      expect(isErr(combined)).toBe(true);
      if (isErr(combined)) {
        expect(combined.error).toBe("error1");
      }
    });

    it("handles empty array", () => {
      const combined = all([]);
      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        expect(combined.value).toEqual([]);
      }
    });
  });

  describe("tryCatch", () => {
    it("wraps successful function in Ok", () => {
      const result = tryCatch(() => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it("catches thrown errors in Err", () => {
      const result = tryCatch(() => {
        throw new Error("oops");
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("tryCatchAsync", () => {
    it("wraps successful async function in Ok", async () => {
      const result = await tryCatchAsync(async () => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it("catches rejected promise in Err", async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error("async oops");
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});
