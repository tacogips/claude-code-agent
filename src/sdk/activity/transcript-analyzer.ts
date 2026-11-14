/**
 * Transcript Analyzer for Claude Code Activity Tracking
 *
 * Efficiently analyzes Claude Code transcript files to detect AskUserQuestion
 * tool usage. Reads only the tail of transcript files for performance.
 *
 * @module sdk/activity/transcript-analyzer
 */

import { open, access, constants } from "fs/promises";

/**
 * TranscriptAnalyzer checks for AskUserQuestion tool usage in transcripts.
 *
 * Reads only the tail of the transcript file for efficiency rather than
 * loading the entire file into memory. This is important for long-running
 * sessions with large transcript files.
 */
export interface TranscriptAnalyzer {
  /**
   * Check if the last assistant turn used AskUserQuestion.
   *
   * Reads only the tail of the transcript for efficiency, parses JSONL
   * entries, and searches for tool_use blocks with name "AskUserQuestion".
   *
   * @param transcriptPath - Absolute path to the transcript JSONL file
   * @returns True if AskUserQuestion tool was used in the last assistant message
   */
  hasAskUserQuestion(transcriptPath: string): Promise<boolean>;
}

/**
 * Options for configuring the transcript analyzer.
 */
export interface TranscriptAnalyzerOptions {
  /**
   * Maximum bytes to read from end of file.
   *
   * Larger values provide better detection for sessions with very long
   * final assistant messages, but consume more memory and I/O.
   *
   * @default 10240 (10KB)
   */
  readonly maxReadBytes?: number;
}

/**
 * Default maximum bytes to read from end of transcript.
 */
const DEFAULT_MAX_READ_BYTES = 10240; // 10KB

/**
 * Create a transcript analyzer.
 *
 * @param options - Configuration options
 * @returns TranscriptAnalyzer instance
 */
export function createTranscriptAnalyzer(
  options?: TranscriptAnalyzerOptions,
): TranscriptAnalyzer {
  const maxReadBytes = options?.maxReadBytes ?? DEFAULT_MAX_READ_BYTES;

  return {
    hasAskUserQuestion: async (transcriptPath: string): Promise<boolean> => {
      return hasAskUserQuestionImpl(transcriptPath, maxReadBytes);
    },
  };
}

/**
 * Implementation of hasAskUserQuestion.
 *
 * @param transcriptPath - Path to transcript file
 * @param maxReadBytes - Maximum bytes to read from end
 * @returns True if AskUserQuestion detected
 */
async function hasAskUserQuestionImpl(
  transcriptPath: string,
  maxReadBytes: number,
): Promise<boolean> {
  // Check if file exists and is readable
  try {
    await access(transcriptPath, constants.R_OK);
  } catch {
    // File doesn't exist or not readable - treat as no AskUserQuestion
    return false;
  }

  let fileHandle;
  try {
    // Open file for reading
    fileHandle = await open(transcriptPath, "r");
    const stat = await fileHandle.stat();
    const fileSize = stat.size;

    // Empty file - no AskUserQuestion
    if (fileSize === 0) {
      return false;
    }

    // Determine how many bytes to read
    const bytesToRead = Math.min(fileSize, maxReadBytes);
    const startPosition = fileSize - bytesToRead;

    // Read tail of file
    const buffer = new Uint8Array(bytesToRead);
    await fileHandle.read(buffer, 0, bytesToRead, startPosition);

    // Convert buffer to string
    const tailContent = Buffer.from(buffer).toString("utf-8");

    // Extract complete JSONL lines from tail
    const lines = extractCompleteLines(tailContent);

    // Parse lines and search for AskUserQuestion
    return detectAskUserQuestion(lines);
  } catch {
    // Error reading file - treat as no AskUserQuestion
    return false;
  } finally {
    if (fileHandle !== undefined) {
      await fileHandle.close().catch(() => {
        // Ignore close errors
      });
    }
  }
}

/**
 * Extract complete JSONL lines from tail content.
 *
 * When reading from the middle of a file, the first line may be incomplete.
 * This function discards the first partial line and returns only complete lines.
 *
 * @param content - Tail content from file
 * @returns Array of complete JSONL lines
 */
function extractCompleteLines(content: string): string[] {
  const lines = content.split("\n");

  // First line might be incomplete if we started reading mid-line
  // Discard it to avoid parsing errors
  if (lines.length > 0) {
    lines.shift();
  }

  // Filter out empty lines
  return lines.filter((line) => line.trim() !== "");
}

/**
 * Detect AskUserQuestion tool usage in JSONL lines.
 *
 * Searches for assistant messages containing tool_use blocks with
 * name "AskUserQuestion". The JSONL format contains various event types,
 * but we specifically look for tool invocations.
 *
 * @param lines - Array of JSONL lines to parse
 * @returns True if AskUserQuestion detected in any line
 */
function detectAskUserQuestion(lines: string[]): boolean {
  // Search through lines in reverse order (most recent first)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }

    try {
      const parsed = JSON.parse(line) as unknown;

      // Type guard: check if object
      if (typeof parsed !== "object" || parsed === null) {
        continue;
      }

      const obj = parsed as Record<string, unknown>;

      // Check for tool_use event with name "AskUserQuestion"
      if (obj["type"] === "tool_use" && obj["name"] === "AskUserQuestion") {
        return true;
      }

      // Check for assistant message with tool calls
      if (obj["type"] === "assistant" && "message" in obj) {
        const message = obj["message"];
        if (
          typeof message === "object" &&
          message !== null &&
          "content" in message
        ) {
          const msgObj = message as Record<string, unknown>;
          const content = msgObj["content"];

          // Content can be an array of content blocks
          if (Array.isArray(content)) {
            for (const block of content) {
              if (
                typeof block === "object" &&
                block !== null &&
                "type" in block &&
                "name" in block
              ) {
                const blockObj = block as Record<string, unknown>;
                if (
                  blockObj["type"] === "tool_use" &&
                  blockObj["name"] === "AskUserQuestion"
                ) {
                  return true;
                }
              }
            }
          }
        }
      }
    } catch {
      // Invalid JSON or parsing error - skip this line
      continue;
    }
  }

  return false;
}
