/**
 * Session processing utilities for Group Runner.
 *
 * Handles session startup and output stream processing.
 *
 * @module sdk/group/session-processor
 */

import type { Container } from "../../container";
import type { ManagedProcess } from "../../interfaces/process-manager";
import type { GroupSession, SessionGroup } from "./types";
import { ConfigGenerator } from "./config-generator";
import { createTaggedLogger } from "../../logger";

const logger = createTaggedLogger("session-processor");

/**
 * Start a session execution.
 *
 * Generates session configuration, spawns Claude Code process,
 * and sets up output processing.
 *
 * @param session - Session to start
 * @param group - Group containing the session
 * @param container - Dependency injection container
 * @param configGenerator - Configuration generator
 * @param resumeFlag - Whether to use --resume flag
 * @returns Spawned process or null if configuration failed
 *
 * @example
 * ```typescript
 * const process = await startGroupSession(
 *   session,
 *   group,
 *   container,
 *   configGenerator,
 *   false
 * );
 * if (process) {
 *   // Handle process...
 * }
 * ```
 */
export async function startGroupSession(
  session: GroupSession,
  group: SessionGroup,
  container: Container,
  configGenerator: ConfigGenerator,
  resumeFlag: boolean,
): Promise<ManagedProcess | null> {
  logger.info(`Starting session ${session.id}`, {
    projectPath: session.projectPath,
  });

  // Generate session configuration
  const configResult = await configGenerator.generateSessionConfig(
    session,
    group,
  );

  if (configResult.isErr()) {
    logger.error(`Failed to generate config for session ${session.id}`, {
      error: configResult.error,
    });
    return null;
  }

  // Build Claude Code command
  // TODO: [Future Enhancement] Process Pool per Working Directory
  // See src/sdk/queue/runner.ts for detailed description of the planned enhancement.
  // Summary: Reuse long-lived processes via /clear instead of spawning new processes.
  const args = ["-p", "--output-format", "stream-json"];
  if (resumeFlag) {
    args.push("--resume");
  }
  args.push(session.prompt);

  // Set up environment with config directory
  const env: Record<string, string> = {
    CLAUDE_CONFIG_DIR: configResult.value.configDir,
  };

  // Spawn Claude Code process
  const process = container.processManager.spawn("claude", args, {
    cwd: session.projectPath,
    env,
  });

  return process;
}

/**
 * Process session output streams.
 *
 * Consumes stdout and stderr streams for progress tracking and error logging.
 * This function runs asynchronously and does not block.
 *
 * @param sessionId - Session ID for logging
 * @param process - Process with stdout/stderr streams
 *
 * @example
 * ```typescript
 * processGroupSessionOutput(session.id, process); // Non-blocking
 * ```
 */
export async function processGroupSessionOutput(
  sessionId: string,
  process: ManagedProcess,
): Promise<void> {
  // Process stdout for progress updates
  // In a real implementation, we'd parse the JSON output
  // to extract cost, token usage, and tool activity
  try {
    for await (const _line of process.stdout) {
      // Parse JSON output for progress updates
      // This is simplified - real implementation would parse
      // the stream-json output format
    }
  } catch (error) {
    logger.debug(`stdout closed for session ${sessionId}`);
  }

  // Process stderr for errors
  try {
    for await (const line of process.stderr) {
      logger.warn(`Session ${sessionId} stderr: ${line}`);
    }
  } catch (error) {
    logger.debug(`stderr closed for session ${sessionId}`);
  }
}
