/**
 * Filename patterns for Claude Code session JSONL files.
 *
 * @module sdk/session-reader/constants
 */
/**
 * Pattern for UUID-named session files.
 * Claude Code stores main session files as: {uuid}.jsonl
 */
export declare const UUID_SESSION_PATTERN: RegExp;
/**
 * Check if a filename matches a session file pattern.
 * Supports both UUID-named files ({uuid}.jsonl) and legacy session.jsonl format.
 */
export declare function isSessionFile(filename: string): boolean;
//# sourceMappingURL=constants.d.ts.map