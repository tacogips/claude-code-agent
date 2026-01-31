/**
 * Tests for Transcript Analyzer
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createTranscriptAnalyzer } from "./transcript-analyzer";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

describe("TranscriptAnalyzer", () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `transcript-analyzer-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    testFilePath = join(testDir, "transcript.jsonl");
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await unlink(testFilePath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  });

  describe("hasAskUserQuestion", () => {
    test("detects AskUserQuestion in tool_use event", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        '{"type":"assistant","content":"Let me ask"}',
        '{"type":"tool_use","id":"toolu_123","name":"AskUserQuestion","input":{"questions":[]}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("detects AskUserQuestion in assistant message content", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "Let me ask you" },
              {
                type: "tool_use",
                id: "toolu_456",
                name: "AskUserQuestion",
                input: { questions: [] },
              },
            ],
          },
        }),
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("returns false when no AskUserQuestion present", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        '{"type":"assistant","content":"response"}',
        '{"type":"tool_use","id":"toolu_789","name":"Read","input":{"file_path":"test.ts"}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(false);
    });

    test("handles empty transcript file", async () => {
      await writeFile(testFilePath, "", "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(false);
    });

    test("handles missing transcript file", async () => {
      const nonExistentPath = join(testDir, "does-not-exist.jsonl");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(nonExistentPath);

      expect(result).toBe(false);
    });

    test("handles transcript with only whitespace", async () => {
      await writeFile(testFilePath, "   \n\n  \n", "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(false);
    });

    test("handles malformed JSON lines gracefully", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        "invalid json line",
        '{"incomplete":',
        '{"type":"tool_use","id":"toolu_abc","name":"AskUserQuestion","input":{}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("reads only tail of large transcript", async () => {
      // Create a transcript larger than default maxReadBytes (10KB)
      const largePrefix = Array(500)
        .fill('{"type":"user","content":"filler"}')
        .join("\n");

      const transcript = [
        largePrefix,
        '{"type":"tool_use","id":"toolu_xyz","name":"AskUserQuestion","input":{}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("respects custom maxReadBytes option", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        '{"type":"tool_use","id":"toolu_123","name":"AskUserQuestion","input":{}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer({ maxReadBytes: 1024 });
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("handles transcript ending without newline", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        '{"type":"tool_use","id":"toolu_123","name":"AskUserQuestion","input":{}}',
      ].join("\n");

      // Write without trailing newline
      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("ignores incomplete first line when reading from middle", async () => {
      // Create content where reading from middle would split a line
      const completeLines = [
        '{"type":"user","content":"This is a very long line that will be split when reading from the middle of the file to test partial line handling"}',
        '{"type":"assistant","content":"response"}',
        '{"type":"tool_use","id":"toolu_123","name":"AskUserQuestion","input":{}}',
      ];

      const transcript = completeLines.join("\n");
      await writeFile(testFilePath, transcript, "utf-8");

      // Use small maxReadBytes to ensure we start mid-file
      const analyzer = createTranscriptAnalyzer({ maxReadBytes: 200 });
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("detects multiple tool_use blocks in same message", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "toolu_1",
                name: "Read",
                input: { file_path: "test.ts" },
              },
              {
                type: "tool_use",
                id: "toolu_2",
                name: "AskUserQuestion",
                input: { questions: [] },
              },
            ],
          },
        }),
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("returns false for other tool types", async () => {
      const transcript = [
        '{"type":"user","content":"test"}',
        '{"type":"tool_use","id":"toolu_1","name":"Read","input":{}}',
        '{"type":"tool_use","id":"toolu_2","name":"Edit","input":{}}',
        '{"type":"tool_use","id":"toolu_3","name":"Bash","input":{}}',
        '{"type":"tool_use","id":"toolu_4","name":"Write","input":{}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(false);
    });

    test("handles transcript with mixed event types", async () => {
      const transcript = [
        '{"type":"session_start","timestamp":"2026-01-31T00:00:00Z"}',
        '{"type":"user","content":"test"}',
        '{"type":"assistant","content":"response"}',
        '{"type":"thinking","content":"internal thoughts"}',
        '{"type":"tool_use","id":"toolu_1","name":"Read","input":{}}',
        '{"type":"tool_result","id":"toolu_1","content":"file content"}',
        '{"type":"assistant","content":"done"}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(false);
    });

    test("finds AskUserQuestion in most recent message when multiple exist", async () => {
      const transcript = [
        '{"type":"tool_use","id":"toolu_1","name":"Read","input":{}}',
        '{"type":"assistant","content":"first response"}',
        '{"type":"tool_use","id":"toolu_2","name":"AskUserQuestion","input":{}}',
        '{"type":"user","content":"answer"}',
        '{"type":"assistant","content":"final response"}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });

    test("handles unicode content in transcript", async () => {
      const transcript = [
        '{"type":"user","content":"こんにちは"}',
        '{"type":"assistant","content":"你好"}',
        '{"type":"tool_use","id":"toolu_1","name":"AskUserQuestion","input":{"questions":[{"question":"选择一个选项"}]}}',
      ].join("\n");

      await writeFile(testFilePath, transcript, "utf-8");

      const analyzer = createTranscriptAnalyzer();
      const result = await analyzer.hasAskUserQuestion(testFilePath);

      expect(result).toBe(true);
    });
  });

  describe("createTranscriptAnalyzer options", () => {
    test("creates analyzer with default options", () => {
      const analyzer = createTranscriptAnalyzer();
      expect(analyzer).toBeDefined();
      expect(typeof analyzer.hasAskUserQuestion).toBe("function");
    });

    test("creates analyzer with custom maxReadBytes", () => {
      const analyzer = createTranscriptAnalyzer({ maxReadBytes: 5120 });
      expect(analyzer).toBeDefined();
      expect(typeof analyzer.hasAskUserQuestion).toBe("function");
    });

    test("creates analyzer with undefined options", () => {
      const analyzer = createTranscriptAnalyzer(undefined);
      expect(analyzer).toBeDefined();
      expect(typeof analyzer.hasAskUserQuestion).toBe("function");
    });
  });
});
