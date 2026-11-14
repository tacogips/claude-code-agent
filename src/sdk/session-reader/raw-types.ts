/**
 * Raw JSON shapes from Claude Code session JSONL (internal parsing).
 *
 * @module sdk/session-reader/raw-types
 */

/**
 * Content block within a message (text, tool_use, tool_result).
 */
export interface ContentBlock {
  readonly type: "text" | "tool_use" | "tool_result";
  readonly text?: string;
  readonly id?: string;
  readonly name?: string;
  readonly input?: Record<string, unknown>;
  readonly tool_use_id?: string;
  readonly content?: string | Record<string, unknown>;
  readonly is_error?: boolean;
}
