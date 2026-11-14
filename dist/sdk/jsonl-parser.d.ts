/**
 * JSONL Parser with error recovery.
 *
 * Parses JSON Lines format (newline-delimited JSON) with support
 * for error recovery on malformed lines.
 *
 * @module sdk/jsonl-parser
 */
import { ParseError } from "../errors";
import { type Result } from "../result";
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
export declare function parseJsonl<T>(content: string, filename?: string): Result<readonly T[], ParseError>;
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
export declare function parseJsonlWithRecovery<T>(content: string, onError: (error: ParseError) => void, filename?: string): readonly T[];
/**
 * Parse a single JSON line.
 *
 * @typeParam T - Expected type of parsed object
 * @param line - Single line of JSON
 * @param lineNumber - Line number (for error reporting)
 * @param filename - Source filename (for error reporting)
 * @returns Result containing parsed object or parse error
 */
export declare function parseJsonLine<T>(line: string, lineNumber?: number, filename?: string): Result<T, ParseError>;
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
export declare function parseJsonlStream<T>(lines: AsyncIterable<string>, onError?: (error: ParseError) => void, filename?: string): AsyncGenerator<T, void, unknown>;
/**
 * Serialize an array of objects to JSONL format.
 *
 * @typeParam T - Type of objects to serialize
 * @param objects - Array of objects to serialize
 * @returns JSONL formatted string
 */
export declare function toJsonl<T>(objects: readonly T[]): string;
/**
 * Serialize a single object to a JSON line.
 *
 * @typeParam T - Type of object to serialize
 * @param object - Object to serialize
 * @returns JSON formatted string (no trailing newline)
 */
export declare function toJsonLine<T>(object: T): string;
//# sourceMappingURL=jsonl-parser.d.ts.map