/**
 * Tests for JSONL Parser.
 *
 * @module sdk/jsonl-parser.test
 */

import { describe, it, expect } from "vitest";
import {
  parseJsonl,
  parseJsonlWithRecovery,
  parseJsonLine,
  parseJsonlStream,
  toJsonl,
  toJsonLine,
} from "./jsonl-parser";
import { ParseError } from "../errors";

interface TestObject {
  id: number;
  name: string;
}

describe("parseJsonl", () => {
  it("should parse valid JSONL content", () => {
    const content = `{"id": 1, "name": "Alice"}
{"id": 2, "name": "Bob"}
{"id": 3, "name": "Charlie"}`;

    const result = parseJsonl<TestObject>(content);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(3);
      expect(result.value[0]).toEqual({ id: 1, name: "Alice" });
      expect(result.value[1]).toEqual({ id: 2, name: "Bob" });
      expect(result.value[2]).toEqual({ id: 3, name: "Charlie" });
    }
  });

  it("should skip empty lines", () => {
    const content = `{"id": 1}

{"id": 2}

`;

    const result = parseJsonl<{ id: number }>(content);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(2);
    }
  });

  it("should handle whitespace-only lines", () => {
    const content = `{"id": 1}

{"id": 2}`;

    const result = parseJsonl<{ id: number }>(content);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(2);
    }
  });

  it("should return error for invalid JSON", () => {
    const content = `{"id": 1}
{invalid json}
{"id": 3}`;

    const result = parseJsonl<{ id: number }>(content, "test.jsonl");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ParseError);
      expect(result.error.file).toBe("test.jsonl");
      expect(result.error.line).toBe(2);
    }
  });

  it("should handle empty content", () => {
    const result = parseJsonl<{ id: number }>("");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(0);
    }
  });

  it("should parse single line", () => {
    const result = parseJsonl<{ id: number }>('{"id": 42}');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]).toEqual({ id: 42 });
    }
  });

  it("should use default filename if not provided", () => {
    const result = parseJsonl<{ id: number }>("{invalid}");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.file).toBe("unknown");
    }
  });
});

describe("parseJsonlWithRecovery", () => {
  it("should parse valid lines and report errors", () => {
    const content = `{"id": 1}
{invalid}
{"id": 2}
also invalid
{"id": 3}`;

    const errors: ParseError[] = [];
    const result = parseJsonlWithRecovery<{ id: number }>(
      content,
      (err) => errors.push(err),
      "test.jsonl",
    );

    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ id: 1 });
    expect(result[1]).toEqual({ id: 2 });
    expect(result[2]).toEqual({ id: 3 });

    expect(errors.length).toBe(2);
    expect(errors[0]?.line).toBe(2);
    expect(errors[1]?.line).toBe(4);
  });

  it("should handle all invalid lines", () => {
    const content = `invalid1
invalid2
invalid3`;

    const errors: ParseError[] = [];
    const result = parseJsonlWithRecovery<{ id: number }>(content, (err) =>
      errors.push(err),
    );

    expect(result.length).toBe(0);
    expect(errors.length).toBe(3);
  });

  it("should handle all valid lines", () => {
    const content = `{"id": 1}
{"id": 2}`;

    const errors: ParseError[] = [];
    const result = parseJsonlWithRecovery<{ id: number }>(content, (err) =>
      errors.push(err),
    );

    expect(result.length).toBe(2);
    expect(errors.length).toBe(0);
  });
});

describe("parseJsonLine", () => {
  it("should parse valid JSON line", () => {
    const result = parseJsonLine<{ id: number }>('{"id": 42}');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: 42 });
    }
  });

  it("should handle leading/trailing whitespace", () => {
    const result = parseJsonLine<{ id: number }>('  {"id": 42}  ');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: 42 });
    }
  });

  it("should return error for empty line", () => {
    const result = parseJsonLine<{ id: number }>("   ");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.details).toBe("Empty line");
    }
  });

  it("should return error for invalid JSON", () => {
    const result = parseJsonLine<{ id: number }>(
      "{not valid}",
      5,
      "test.jsonl",
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ParseError);
      expect(result.error.line).toBe(5);
      expect(result.error.file).toBe("test.jsonl");
    }
  });
});

describe("parseJsonlStream", () => {
  it("should parse async stream of lines", async () => {
    async function* lines(): AsyncGenerator<string> {
      yield '{"id": 1}';
      yield '{"id": 2}';
      yield '{"id": 3}';
    }

    const results: Array<{ id: number }> = [];
    for await (const obj of parseJsonlStream<{ id: number }>(lines())) {
      results.push(obj);
    }

    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ id: 1 });
    expect(results[1]).toEqual({ id: 2 });
    expect(results[2]).toEqual({ id: 3 });
  });

  it("should skip empty lines", async () => {
    async function* lines(): AsyncGenerator<string> {
      yield '{"id": 1}';
      yield "";
      yield "   ";
      yield '{"id": 2}';
    }

    const results: Array<{ id: number }> = [];
    for await (const obj of parseJsonlStream<{ id: number }>(lines())) {
      results.push(obj);
    }

    expect(results.length).toBe(2);
  });

  it("should throw on invalid line without error handler", async () => {
    async function* lines(): AsyncGenerator<string> {
      yield '{"id": 1}';
      yield "invalid";
    }

    const results: Array<{ id: number }> = [];

    await expect(
      (async () => {
        for await (const obj of parseJsonlStream<{ id: number }>(lines())) {
          results.push(obj);
        }
      })()
    ).rejects.toThrow(ParseError);
  });

  it("should call error handler for invalid lines", async () => {
    async function* lines(): AsyncGenerator<string> {
      yield '{"id": 1}';
      yield "invalid";
      yield '{"id": 2}';
    }

    const errors: ParseError[] = [];
    const results: Array<{ id: number }> = [];

    for await (const obj of parseJsonlStream<{ id: number }>(lines(), (err) =>
      errors.push(err),
    )) {
      results.push(obj);
    }

    expect(results.length).toBe(2);
    expect(errors.length).toBe(1);
    expect(errors[0]?.line).toBe(2);
  });

  it("should track line numbers correctly", async () => {
    async function* lines(): AsyncGenerator<string> {
      yield "invalid1";
      yield "invalid2";
      yield "invalid3";
    }

    const errors: ParseError[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _obj of parseJsonlStream<{ id: number }>(lines(), (err) =>
      errors.push(err),
    )) {
      // consume
    }

    expect(errors.length).toBe(3);
    expect(errors[0]?.line).toBe(1);
    expect(errors[1]?.line).toBe(2);
    expect(errors[2]?.line).toBe(3);
  });
});

describe("toJsonl", () => {
  it("should serialize objects to JSONL", () => {
    const objects = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const result = toJsonl(objects);

    expect(result).toBe('{"id":1,"name":"Alice"}\n{"id":2,"name":"Bob"}');
  });

  it("should handle empty array", () => {
    const result = toJsonl([]);
    expect(result).toBe("");
  });

  it("should handle single object", () => {
    const result = toJsonl([{ id: 1 }]);
    expect(result).toBe('{"id":1}');
  });

  it("should produce parseable output", () => {
    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const jsonl = toJsonl(objects);
    const parsed = parseJsonl<{ id: number }>(jsonl);

    expect(parsed.isOk()).toBe(true);
    if (parsed.isOk()) {
      expect(parsed.value).toEqual(objects);
    }
  });
});

describe("toJsonLine", () => {
  it("should serialize single object", () => {
    const result = toJsonLine({ id: 1, name: "Alice" });
    expect(result).toBe('{"id":1,"name":"Alice"}');
  });

  it("should not include trailing newline", () => {
    const result = toJsonLine({ id: 1 });
    expect(result.endsWith("\n")).toBe(false);
  });

  it("should handle complex objects", () => {
    const obj = {
      nested: { a: 1, b: [1, 2, 3] },
      array: ["x", "y"],
    };
    const result = toJsonLine(obj);
    expect(JSON.parse(result)).toEqual(obj);
  });
});
