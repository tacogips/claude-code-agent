import { describe, expect, test } from "vitest";
import { getTokenExpiryTimestamp, parseTokenDurationMs } from "./duration";

describe("token duration helpers", () => {
  test("parses supported duration units into milliseconds", () => {
    expect(parseTokenDurationMs("15m")).toBe(15 * 60 * 1000);
    expect(parseTokenDurationMs("2h")).toBe(2 * 60 * 60 * 1000);
    expect(parseTokenDurationMs("3d")).toBe(3 * 24 * 60 * 60 * 1000);
    expect(parseTokenDurationMs("4w")).toBe(4 * 7 * 24 * 60 * 60 * 1000);
    expect(parseTokenDurationMs("1y")).toBe(365 * 24 * 60 * 60 * 1000);
  });

  test("rejects invalid and unsafe duration values", () => {
    expect(() => parseTokenDurationMs("0d")).toThrow("Invalid duration format");
    expect(() => parseTokenDurationMs("01d")).toThrow(
      "Invalid duration format",
    );
    expect(() => parseTokenDurationMs("1s")).toThrow("Invalid duration format");
    expect(() => parseTokenDurationMs("999999999999999999999y")).toThrow(
      "Duration is too large",
    );
  });

  test("computes expiration from injected current time", () => {
    expect(
      getTokenExpiryTimestamp("30m", new Date("2026-05-05T00:00:00.000Z")),
    ).toBe("2026-05-05T00:30:00.000Z");
  });

  test("rejects invalid current time", () => {
    expect(() => getTokenExpiryTimestamp("1h", new Date("invalid"))).toThrow(
      "Current time is outside the supported date range",
    );
  });
});
