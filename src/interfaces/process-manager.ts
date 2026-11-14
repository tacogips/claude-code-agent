/**
 * ProcessManager interface for abstracting process spawning.
 *
 * This provides testability by allowing mock implementations
 * in tests while using real process spawning in production.
 */

/**
 * Options for spawning a process.
 */
export interface SpawnOptions {
  /** Working directory for the process */
  readonly cwd?: string | undefined;
  /** Environment variables (merged with process.env) */
  readonly env?: Readonly<Record<string, string>> | undefined;
  /** Standard input data to pipe to the process */
  readonly stdin?: string | undefined;
}

/**
 * Handle to a managed subprocess.
 *
 * Provides access to process I/O streams and lifecycle.
 */
export interface ManagedProcess {
  /** Process ID (PID) of the spawned process */
  readonly pid: number;

  /**
   * Async iterable of stdout lines.
   *
   * Use for-await-of to consume output as it becomes available.
   */
  readonly stdout: AsyncIterable<string>;

  /**
   * Async iterable of stderr lines.
   *
   * Use for-await-of to consume error output as it becomes available.
   */
  readonly stderr: AsyncIterable<string>;

  /**
   * Promise that resolves to the exit code when the process terminates.
   *
   * Null exit code indicates the process was killed by a signal.
   */
  readonly exitCode: Promise<number | null>;

  /**
   * Send a signal to the process.
   *
   * @param signal - Signal name (e.g., "SIGTERM", "SIGKILL")
   */
  kill(signal?: string): void;
}

/**
 * Abstract interface for process management.
 *
 * Provides subprocess spawning and control capabilities.
 */
export interface ProcessManager {
  /**
   * Spawn a new subprocess.
   *
   * @param command - Command to execute
   * @param args - Command arguments
   * @param options - Spawn options
   * @returns Handle to the spawned process
   */
  spawn(
    command: string,
    args: readonly string[],
    options?: SpawnOptions,
  ): ManagedProcess;

  /**
   * Kill a process by PID.
   *
   * @param pid - Process ID to kill
   * @param signal - Signal to send (default: "SIGTERM")
   * @throws Error if process cannot be killed
   */
  kill(pid: number, signal?: string): Promise<void>;
}
