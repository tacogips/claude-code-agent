/**
 * JSONL Parser with error recovery.
 *
 * Parses JSON Lines format (newline-delimited JSON) with support
 * for error recovery on malformed lines.
 *
 * @module sdk/jsonl-parser
 */

import { ParseError } from "../errors";
import { type Result, ok, err } from "../result";

/**
 * Parse JSONL content into an array of objects.
 *
 * Parses each line as a JSON object. Returns an error if any line
 * fails to parse.
 *
 * @typeParam T - Expected type of parsed objects
 * @param content - JSONL content string
 * @param filename - Source filename (for error reporting)
 * @returns Result containing array of parsed objects or parse error
 */
export function parseJsonl<T>(
  content: string,
  filename: string = "unknown",
): Result<readonly T[], ParseError> {
  const lines = content.split("\n");
  const results: T[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const trimmed = line.trim();
    // Skip empty lines
    if (trimmed === "") {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      results.push(parsed);
    } catch (error) {
      const details =
        error instanceof Error ? error.message : "Unknown parse error";
      return err(new ParseError(filename, i + 1, details));
    }
  }

  return ok(results);
}

/**
 * Parse JSONL content with error recovery.
 *
 * Parses each line as a JSON object. Invalid lines are skipped
 * and reported via the onError callback. This allows partial
 * parsing of files with some corrupted lines.
 *
 * @typeParam T - Expected type of parsed objects
 * @param content - JSONL content string
 * @param onError - Callback for parse errors on individual lines
 * @param filename - Source filename (for error reporting)
 * @returns Array of successfully parsed objects
 */
export function parseJsonlWithRecovery<T>(
  content: string,
  onError: (error: ParseError) => void,
  filename: string = "unknown",
): readonly T[] {
  const lines = content.split("\n");
  const results: T[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const trimmed = line.trim();
    // Skip empty lines
    if (trimmed === "") {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      results.push(parsed);
    } catch (error) {
      const details =
        error instanceof Error ? error.message : "Unknown parse error";
      onError(new ParseError(filename, i + 1, details));
    }
  }

  return results;
}

/**
 * Parse a single JSON line.
 *
 * @typeParam T - Expected type of parsed object
 * @param line - Single line of JSON
 * @param lineNumber - Line number (for error reporting)
 * @param filename - Source filename (for error reporting)
 * @returns Result containing parsed object or parse error
 */
export function parseJsonLine<T>(
  line: string,
  lineNumber: number = 1,
  filename: string = "unknown",
): Result<T, ParseError> {
  const trimmed = line.trim();

  if (trimmed === "") {
    return err(new ParseError(filename, lineNumber, "Empty line"));
  }

  try {
    const parsed = JSON.parse(trimmed) as T;
    return ok(parsed);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unknown parse error";
    return err(new ParseError(filename, lineNumber, details));
  }
}

/**
 * Create an async generator that parses JSONL lines as they arrive.
 *
 * Useful for streaming parsing of large files or real-time data.
 *
 * @typeParam T - Expected type of parsed objects
 * @param lines - Async iterable of lines
 * @param onError - Optional callback for parse errors
 * @param filename - Source filename (for error reporting)
 * @returns Async generator of parsed objects
 */
export async function* parseJsonlStream<T>(
  lines: AsyncIterable<string>,
  onError?: (error: ParseError) => void,
  filename: string = "unknown",
): AsyncGenerator<T, void, unknown> {
  let lineNumber = 0;

  for await (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      yield parsed;
    } catch (error) {
      const details =
        error instanceof Error ? error.message : "Unknown parse error";
      const parseError = new ParseError(filename, lineNumber, details);

      if (onError !== undefined) {
        onError(parseError);
      } else {
        throw parseError;
      }
    }
  }
}

/**
 * Serialize an array of objects to JSONL format.
 *
 * @typeParam T - Type of objects to serialize
 * @param objects - Array of objects to serialize
 * @returns JSONL formatted string
 */
export function toJsonl<T>(objects: readonly T[]): string {
  return objects.map((obj) => JSON.stringify(obj)).join("\n");
}

/**
 * Serialize a single object to a JSON line.
 *
 * @typeParam T - Type of object to serialize
 * @param object - Object to serialize
 * @returns JSON formatted string (no trailing newline)
 */
export function toJsonLine<T>(object: T): string {
  return JSON.stringify(object);
}
