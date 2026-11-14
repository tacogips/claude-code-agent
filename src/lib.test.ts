import { describe, expect, it } from "vitest";
import { add, greet } from "./lib";

describe("greet", () => {
  it("returns greeting with name", () => {
    expect(greet("World")).toBe("Hello, World!");
  });

  it("returns greeting with different name", () => {
    expect(greet("Bun")).toBe("Hello, Bun!");
  });
});

describe("add", () => {
  it("adds two positive numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("adds negative numbers", () => {
    expect(add(-1, -2)).toBe(-3);
  });

  it("adds zero", () => {
    expect(add(5, 0)).toBe(5);
  });
});
