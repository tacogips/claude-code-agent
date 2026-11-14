/**
 * Production ProcessManager implementation using Bun APIs.
 *
 * This provides the real process spawning operations using Bun's
 * built-in subprocess APIs.
 *
 * @module interfaces/bun-process-manager
 */

import type {
  ProcessManager,
  ManagedProcess,
  SpawnOptions,
} from "./process-manager";

/**
 * Managed process implementation using Bun.spawn.
 */
class BunManagedProcess implements ManagedProcess {
  readonly pid: number;
  private readonly subprocess: ReturnType<typeof Bun.spawn>;

  constructor(subprocess: ReturnType<typeof Bun.spawn>) {
    this.subprocess = subprocess;
    this.pid = subprocess.pid;
  }

  get stdout(): AsyncIterable<string> {
    const stdout = this.subprocess.stdout;
    if (stdout === null) {
      return emptyAsyncIterable();
    }

    return createLineIterator(stdout);
  }

  get stderr(): AsyncIterable<string> {
    const stderr = this.subprocess.stderr;
    if (stderr === null || stderr === undefined) {
      return emptyAsyncIterable();
    }

    return createLineIterator(stderr);
  }

  get exitCode(): Promise<number | null> {
    return this.subprocess.exited;
  }

  kill(signal?: string): void {
    const signalToUse = signal ?? "SIGTERM";
    this.subprocess.kill(signalToUse as NodeJS.Signals);
  }
}

/**
 * Create an async iterable that yields lines from a readable stream.
 */
function createLineIterator(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<string> {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      return {
        async next(): Promise<IteratorResult<string>> {
          while (!done) {
            // Check if buffer has a complete line
            const newlineIndex = buffer.indexOf("\n");
            if (newlineIndex !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              return { value: line, done: false };
            }

            // Read more data
            const result = await reader.read();
            if (result.done) {
              done = true;
              // Return any remaining content in buffer
              if (buffer.length > 0) {
                const remaining = buffer;
                buffer = "";
                return { value: remaining, done: false };
              }
              return { value: undefined, done: true };
            }

            buffer += decoder.decode(result.value, { stream: true });
          }

          return { value: undefined, done: true };
        },

        async return(): Promise<IteratorResult<string>> {
          done = true;
          reader.releaseLock();
          return { value: undefined, done: true };
        },
      };
    },
  };
}

/**
 * Create an empty async iterable.
 */
function emptyAsyncIterable(): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<string> {
      return {
        async next(): Promise<IteratorResult<string>> {
          return { value: undefined, done: true };
        },
      };
    },
  };
}

/**
 * Production ProcessManager implementation using Bun.spawn.
 *
 * Uses Bun's optimized subprocess APIs for process spawning
 * and management.
 */
export class BunProcessManager implements ProcessManager {
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
  ): ManagedProcess {
    const spawnOptions: Parameters<typeof Bun.spawn>[1] = {
      stdin: options?.stdin !== undefined ? "pipe" : "ignore",
      stdout: "pipe",
      stderr: "pipe",
    };

    if (options?.cwd !== undefined) {
      spawnOptions.cwd = options.cwd;
    }

    if (options?.env !== undefined) {
      spawnOptions.env = { ...process.env, ...options.env };
    }

    const subprocess = Bun.spawn([command, ...args], spawnOptions);

    // Write stdin if provided
    if (options?.stdin !== undefined) {
      const stdin = subprocess.stdin;
      if (stdin !== null && stdin !== undefined && "getWriter" in stdin) {
        const writer = (stdin as WritableStream<Uint8Array>).getWriter();
        writer.write(new TextEncoder().encode(options.stdin));
        writer.close();
      }
    }

    return new BunManagedProcess(subprocess);
  }

  /**
   * Kill a process by PID.
   *
   * @param pid - Process ID to kill
   * @param signal - Signal to send (default: "SIGTERM")
   * @throws Error if process cannot be killed
   */
  async kill(pid: number, signal?: string): Promise<void> {
    const signalToUse = signal ?? "SIGTERM";
    try {
      process.kill(pid, signalToUse as NodeJS.Signals);
    } catch (error) {
      // Process may already be dead, which is fine
      if (error instanceof Error && !error.message.includes("ESRCH")) {
        throw error;
      }
    }
  }
}
