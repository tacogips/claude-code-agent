/**
 * Filename patterns for Claude Code session JSONL files.
 *
 * @module sdk/session-reader/constants
 */

/**
 * Pattern for UUID-named session files.
 * Claude Code stores main session files as: {uuid}.jsonl
 */
export const UUID_SESSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

/**
 * Check if a filename matches a session file pattern.
 * Supports both UUID-named files ({uuid}.jsonl) and legacy session.jsonl format.
 */
export function isSessionFile(filename: string): boolean {
  return UUID_SESSION_PATTERN.test(filename) || filename === "session.jsonl";
}
