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
export class JsonlStreamParser {
  /** Buffer for incomplete lines */
  private buffer: string;

  /**
   * Create a new JSONL stream parser.
   */
  constructor() {
    this.buffer = "";
  }

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
  feed(content: string): TranscriptEvent[] {
    // Append to buffer
    this.buffer += content;

    // Split on newlines, keeping the buffer updated
    const lines = this.buffer.split("\n");

    // Last element is either empty (if content ended with \n)
    // or an incomplete line - keep it in buffer
    const lastLine = lines.pop();
    this.buffer = lastLine ?? "";

    // Parse complete lines
    const events: TranscriptEvent[] = [];
    for (const line of lines) {
      const event = this.parseLine(line);
      if (event !== null) {
        events.push(event);
      }
    }

    return events;
  }

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
  flush(): TranscriptEvent[] {
    if (this.buffer.trim() === "") {
      this.buffer = "";
      return [];
    }

    const event = this.parseLine(this.buffer);
    this.buffer = "";

    return event !== null ? [event] : [];
  }

  /**
   * Parse a single line into a TranscriptEvent.
   *
   * Returns null for empty lines or lines with invalid JSON,
   * implementing graceful error handling.
   *
   * @param line - Line to parse
   * @returns Parsed event or null if parsing failed
   */
  private parseLine(line: string): TranscriptEvent | null {
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      return null;
    }

    try {
      const raw = JSON.parse(trimmed) as object;

      // Extract common fields with type safety
      const event: TranscriptEvent = {
        type:
          "type" in raw && typeof raw.type === "string" ? raw.type : "unknown",
        raw,
      };

      // Extract optional fields if present
      if ("uuid" in raw && typeof raw.uuid === "string") {
        event.uuid = raw.uuid;
      }

      if ("timestamp" in raw && typeof raw.timestamp === "string") {
        event.timestamp = raw.timestamp;
      }

      if ("content" in raw) {
        event.content = raw.content;
      } else if (
        "message" in raw &&
        typeof raw.message === "object" &&
        raw.message !== null &&
        "content" in raw.message
      ) {
        event.content = raw.message.content;
      }

      return event;
    } catch {
      // Gracefully skip malformed JSON
      return null;
    }
  }
}
