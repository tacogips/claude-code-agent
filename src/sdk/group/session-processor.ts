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
import type { ConfigGenerator } from "./config-generator";
import { createTaggedLogger } from "../../logger";
import { createHash } from "node:crypto";
import { assertNoPrintModeArgs } from "../claude-args";

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
  const args: string[] = [];
  const claudeSessionId =
    session.claudeSessionId ?? createDeterministicSessionUuid(session.id);

  // Pass additional CLI arguments from group config
  if (
    group.config.additionalArgs !== undefined &&
    group.config.additionalArgs.length > 0
  ) {
    assertNoPrintModeArgs(group.config.additionalArgs, "group additionalArgs");
    args.push(...group.config.additionalArgs);
  }

  if (resumeFlag) {
    args.push("--resume", claudeSessionId);
  } else {
    args.push("--session-id", claudeSessionId);
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

function createDeterministicSessionUuid(sessionId: string): string {
  const hex = createHash("sha256").update(sessionId).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
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
  await Promise.all([
    drainLines(process.stdout, () => {
      // Drain stdout so the child process cannot block on a full pipe.
    }),
    drainLines(process.stderr, (line) => {
      logger.warn(`Session ${sessionId} stderr: ${line}`);
    }),
  ]);
}

async function drainLines(
  lines: AsyncIterable<string>,
  onLine: (line: string) => void,
): Promise<void> {
  try {
    for await (const line of lines) {
      onLine(line);
    }
  } catch (_error) {
    logger.debug("process stream closed");
  }
}
