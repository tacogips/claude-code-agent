/**
 * JSONL Stream Parser for real-time transcript parsing.
 *
 * Provides buffered parsing of JSONL streams with support for
 * incomplete lines. This is designed for real-time parsing of
 * Claude Code transcript files where content arrives incrementally.
 *
 * @module polling/parser
 */
/**
 * TranscriptEvent represents a parsed entry from a Claude Code transcript.
 *
 * Each event corresponds to one line in the JSONL transcript file.
 */
export interface TranscriptEvent {
    /** Event type (user, assistant, tool_use, etc.) */
    type: string;
    /** Message UUID if present */
    uuid?: string;
    /** Event timestamp if present */
    timestamp?: string;
    /** Event-specific content */
    content?: unknown;
    /** Original parsed object for access to any additional fields */
    raw: object;
}
/**
 * JsonlStreamParser parses JSONL streams with line buffering.
 *
 * This parser is designed for incremental parsing of JSONL content
 * that may arrive in chunks. It buffers incomplete lines and only
 * parses complete lines (ending with newline).
 *
 * Example usage:
 * ```typescript
 * const parser = new JsonlStreamParser();
 *
 * // Feed incremental content
 * const events1 = parser.feed('{"type":"user"}\n{"type":');
 * // Returns: [{ type: "user", raw: {...} }]
 *
 * const events2 = parser.feed('"assistant"}\n');
 * // Returns: [{ type: "assistant", raw: {...} }]
 *
 * // Flush remaining content
 * const events3 = parser.flush();
 * ```
 */
export declare class JsonlStreamParser {
    /** Buffer for incomplete lines */
    private buffer;
    /**
     * Create a new JSONL stream parser.
     */
    constructor();
    /**
     * Feed new content to the parser.
     *
     * Parses all complete lines (ending with newline) and buffers
     * any incomplete line at the end. Malformed JSON lines are
     * gracefully skipped.
     *
     * @param content - New content to parse
     * @returns Array of parsed transcript events
     */
    feed(content: string): TranscriptEvent[];
    /**
     * Flush any remaining buffered content.
     *
     * Parses the incomplete line currently in the buffer as if
     * it were complete. Useful when the stream is complete and
     * the last line doesn't end with a newline.
     *
     * Clears the buffer after flushing.
     *
     * @returns Array of parsed transcript events (0 or 1 element)
     */
    flush(): TranscriptEvent[];
    /**
     * Parse a single line into a TranscriptEvent.
     *
     * Returns null for empty lines or lines with invalid JSON,
     * implementing graceful error handling.
     *
     * @param line - Line to parse
     * @returns Parsed event or null if parsing failed
     */
    private parseLine;
}
//# sourceMappingURL=parser.d.ts.map