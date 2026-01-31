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
export async function captureClaudeSessionId(
  stdout: AsyncIterable<string>,
  clock: Clock,
): Promise<string> {
  // TODO: Implement proper stream-json parsing
  // For now, return a placeholder
  // In a real implementation, we would parse the JSON output
  // and extract the session ID from the metadata

  for await (const line of stdout) {
    // Look for session ID in stream-json output
    // Example: {"type":"session","sessionId":"abc123"}
    try {
      const parsed = JSON.parse(line) as { sessionId?: string };
      if (parsed.sessionId !== undefined) {
        return parsed.sessionId;
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // Fallback: generate a session ID
  const timestamp = clock.now().toISOString();
  return `session-${timestamp}`;
}
