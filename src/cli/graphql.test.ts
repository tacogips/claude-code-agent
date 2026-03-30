import { describe, expect, test, vi } from "vitest";
import {
  normalizeGraphqlDocument,
  parseGraphqlCliArgs,
  runGraphqlCli,
} from "./graphql";

describe("normalizeGraphqlDocument", () => {
  test("wraps shorthand commands in a query", () => {
    expect(normalizeGraphqlDocument("session.list")).toContain(
      'command(name: "session.list"',
    );
  });

  test("uses mutations for mutating commands", () => {
    expect(normalizeGraphqlDocument("queue.run").startsWith("mutation")).toBe(
      true,
    );
  });
});

describe("parseGraphqlCliArgs", () => {
  test("binds --param to the param variable", async () => {
    const parsed = await parseGraphqlCliArgs([
      "session.list",
      "--param",
      '{"limit":1}',
    ]);

    expect(parsed.variables).toEqual({
      param: { limit: 1 },
    });
  });
});

describe("runGraphqlCli", () => {
  test("prints the execution result", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runGraphqlCli(["query { ping }"], {
      sdk: {} as never,
    });

    expect(JSON.parse(logSpy.mock.calls[0]?.[0] as string)).toEqual({
      data: { ping: true },
    });
  });
});
