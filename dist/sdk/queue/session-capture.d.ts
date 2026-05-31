/**
 * Session ID capture utility for Queue Runner.
 *
 * Parses Claude Code stream-json output to extract session IDs.
 *
 * @module sdk/queue/session-capture
 */
import type { Clock } from "../../interfaces/clock";
/**
 * Capture the Claude Code session ID from stdout.
 *
 * Parses stream-json output to extract the session ID.
 *
 * @param stdout - Async iterable of stdout lines
 * @param clock - Clock for generating fallback session IDs
 * @returns The captured session ID
 *
 * @example
 * ```typescript
 * const sessionId = await captureClaudeSessionId(process.stdout, container.clock);
 * ```
 */
export declare function captureClaudeSessionId(stdout: AsyncIterable<string>, clock: Clock): Promise<string>;
//# sourceMappingURL=session-capture.d.ts.map