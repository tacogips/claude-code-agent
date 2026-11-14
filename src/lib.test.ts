import { describe, expect, test } from "vitest";
import { verifyClaudeReadiness, createProductionContainer } from "./lib";

describe("library exports", () => {
  test("exports readiness verification", () => {
    expect(typeof verifyClaudeReadiness).toBe("function");
  });

  test("exports container helpers", () => {
    expect(typeof createProductionContainer).toBe("function");
  });
});
