import { describe, expect, test } from "vitest";
import {
  ClaudeEnvironment,
  defineClaudeEnvironment,
  toClaudeEnvironmentRecord,
} from "./environment";

describe("ClaudeEnvironment", () => {
  test("creates a typed value object from a record", () => {
    const env = defineClaudeEnvironment({
      ANTHROPIC_API_KEY: "test-key",
      CLAUDE_CODE_USE_BEDROCK: "1",
    });

    expect(env).toBeInstanceOf(ClaudeEnvironment);
    expect(env.toRecord()).toEqual({
      ANTHROPIC_API_KEY: "test-key",
      CLAUDE_CODE_USE_BEDROCK: "1",
    });
  });

  test("returns cloned records", () => {
    const env = defineClaudeEnvironment({
      ANTHROPIC_API_KEY: "test-key",
    });

    const first = env.toRecord();
    first["ANTHROPIC_API_KEY"] = "changed";

    expect(env.toRecord()).toEqual({
      ANTHROPIC_API_KEY: "test-key",
    });
  });

  test("merges environment values with later overrides", () => {
    const base = defineClaudeEnvironment({
      ANTHROPIC_API_KEY: "old-key",
      WORKSPACE_ID: "workspace-123",
    });

    const merged = base.merge({
      ANTHROPIC_API_KEY: "new-key",
      CLAUDE_CODE_USE_VERTEX: "1",
    });

    expect(merged.toRecord()).toEqual({
      ANTHROPIC_API_KEY: "new-key",
      WORKSPACE_ID: "workspace-123",
      CLAUDE_CODE_USE_VERTEX: "1",
    });
  });
});

describe("toClaudeEnvironmentRecord", () => {
  test("normalizes a ClaudeEnvironment instance", () => {
    const env = defineClaudeEnvironment({
      ANTHROPIC_API_KEY: "test-key",
    });

    expect(toClaudeEnvironmentRecord(env)).toEqual({
      ANTHROPIC_API_KEY: "test-key",
    });
  });

  test("normalizes a plain record", () => {
    expect(
      toClaudeEnvironmentRecord({
        ANTHROPIC_API_KEY: "test-key",
      }),
    ).toEqual({
      ANTHROPIC_API_KEY: "test-key",
    });
  });

  test("returns undefined for undefined input", () => {
    expect(toClaudeEnvironmentRecord(undefined)).toBeUndefined();
  });
});
