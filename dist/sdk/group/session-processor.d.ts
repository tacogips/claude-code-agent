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
export declare function startGroupSession(session: GroupSession, group: SessionGroup, container: Container, configGenerator: ConfigGenerator, resumeFlag: boolean): Promise<ManagedProcess | null>;
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
export declare function processGroupSessionOutput(sessionId: string, process: ManagedProcess): Promise<void>;
//# sourceMappingURL=session-processor.d.ts.map