/**
 * Mock ProcessManager for testing.
 *
 * Provides a controllable implementation of the ProcessManager interface
 * that allows tests to simulate process spawning, output, and exit behavior.
 *
 * @module test/mocks/process-manager
 */

import type {
  ProcessManager,
  ManagedProcess,
  SpawnOptions,
} from "../../interfaces/process-manager";

/**
 * Configuration for a mock process.
 */
export interface MockProcessConfig {
  /** Process ID to assign */
  pid: number;
  /** Lines to emit on stdout */
  stdout?: readonly string[];
  /** Lines to emit on stderr */
  stderr?: readonly string[];
  /** Exit code for the process */
  exitCode: number | null;
  /** Delay before emitting each line (ms) */
  lineDelay?: number;
  /** Delay before resolving exitCode (ms) */
  exitDelay?: number;
}

/**
 * Default mock process configuration.
 */
const defaultMockProcessConfig: MockProcessConfig = {
  pid: 1,
  stdout: [],
  stderr: [],
  exitCode: 0,
  lineDelay: 0,
  exitDelay: 0,
};

/**
 * A mock managed process with controllable behavior.
 */
export class MockManagedProcess implements ManagedProcess {
  readonly pid: number;
  private readonly config: MockProcessConfig;
  private killed = false;
  private killSignal: string | undefined;

  constructor(config: Partial<MockProcessConfig> = {}) {
    this.config = { ...defaultMockProcessConfig, ...config };
    this.pid = this.config.pid;
  }

  /**
   * Check if the process was killed.
   */
  wasKilled(): boolean {
    return this.killed;
  }

  /**
   * Get the signal used to kill the process.
   */
  getKillSignal(): string | undefined {
    return this.killSignal;
  }

  get stdout(): AsyncIterable<string> {
    const lines = this.config.stdout ?? [];
    const delay = this.config.lineDelay ?? 0;
    const self = this;

    return {
      [Symbol.asyncIterator](): AsyncIterator<string> {
        let index = 0;

        return {
          async next(): Promise<IteratorResult<string>> {
            if (self.killed) {
              return { value: undefined, done: true };
            }

            if (index >= lines.length) {
              return { value: undefined, done: true };
            }

            if (delay > 0) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            const line = lines[index];
            if (line === undefined) {
              return { value: undefined, done: true };
            }
            index++;
            return { value: line, done: false };
          },
        };
      },
    };
  }

  get stderr(): AsyncIterable<string> {
    const lines = this.config.stderr ?? [];
    const delay = this.config.lineDelay ?? 0;
    const self = this;

    return {
      [Symbol.asyncIterator](): AsyncIterator<string> {
        let index = 0;

        return {
          async next(): Promise<IteratorResult<string>> {
            if (self.killed) {
              return { value: undefined, done: true };
            }

            if (index >= lines.length) {
              return { value: undefined, done: true };
            }

            if (delay > 0) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            const line = lines[index];
            if (line === undefined) {
              return { value: undefined, done: true };
            }
            index++;
            return { value: line, done: false };
          },
        };
      },
    };
  }

  get exitCode(): Promise<number | null> {
    const exitDelay = this.config.exitDelay ?? 0;
    const exitCodeValue = this.config.exitCode;
    const self = this;

    return new Promise((resolve) => {
      if (exitDelay > 0) {
        setTimeout(() => {
          resolve(self.killed ? null : exitCodeValue);
        }, exitDelay);
      } else {
        // Use setImmediate to ensure async behavior
        setImmediate(() => {
          resolve(self.killed ? null : exitCodeValue);
        });
      }
    });
  }

  kill(signal?: string): void {
    this.killed = true;
    this.killSignal = signal ?? "SIGTERM";
  }
}

/**
 * Record of a spawn call for verification.
 */
export interface SpawnRecord {
  command: string;
  args: readonly string[];
  options: SpawnOptions | undefined;
  process: MockManagedProcess;
}

/**
 * Mock ProcessManager implementation for testing.
 *
 * Allows configuration of process behavior and tracks all spawn calls
 * for verification in tests.
 */
export class MockProcessManager implements ProcessManager {
  private readonly spawnHistory: SpawnRecord[] = [];
  private processConfigs: Map<string, MockProcessConfig[]> = new Map();
  private defaultConfig: MockProcessConfig = { ...defaultMockProcessConfig };
  private nextPid = 1;
  private readonly killedPids: Map<number, string> = new Map();

  /**
   * Configure behavior for a specific command.
   *
   * Multiple calls queue up configurations that are consumed in order.
   *
   * @param command - Command to configure
   * @param config - Configuration for the mock process
   */
  setProcessConfig(command: string, config: Partial<MockProcessConfig>): void {
    const existing = this.processConfigs.get(command);
    const fullConfig: MockProcessConfig = {
      ...defaultMockProcessConfig,
      ...config,
      pid: config.pid ?? this.nextPid++,
    };

    if (existing !== undefined) {
      existing.push(fullConfig);
    } else {
      this.processConfigs.set(command, [fullConfig]);
    }
  }

  /**
   * Set the default configuration for commands without specific config.
   *
   * @param config - Default configuration
   */
  setDefaultConfig(config: Partial<MockProcessConfig>): void {
    this.defaultConfig = { ...defaultMockProcessConfig, ...config };
  }

  /**
   * Get the history of spawn calls.
   */
  getSpawnHistory(): readonly SpawnRecord[] {
    return this.spawnHistory;
  }

  /**
   * Clear spawn history and configurations.
   */
  clear(): void {
    this.spawnHistory.length = 0;
    this.processConfigs.clear();
    this.killedPids.clear();
    this.nextPid = 1;
    this.defaultConfig = { ...defaultMockProcessConfig };
  }

  /**
   * Check if a PID was killed.
   *
   * @param pid - Process ID to check
   * @returns Signal used to kill, or undefined if not killed
   */
  wasKilled(pid: number): string | undefined {
    return this.killedPids.get(pid);
  }

  spawn(
    command: string,
    args: readonly string[],
    options?: SpawnOptions,
  ): ManagedProcess {
    // Get configuration for this command
    let config: MockProcessConfig;
    const commandConfigs = this.processConfigs.get(command);
    if (commandConfigs !== undefined && commandConfigs.length > 0) {
      const shifted = commandConfigs.shift();
      if (shifted !== undefined) {
        config = shifted;
      } else {
        config = { ...this.defaultConfig, pid: this.nextPid++ };
      }
    } else {
      config = { ...this.defaultConfig, pid: this.nextPid++ };
    }

    const process = new MockManagedProcess(config);

    // Record the spawn
    this.spawnHistory.push({
      command,
      args,
      options,
      process,
    });

    return process;
  }

  async kill(pid: number, signal?: string): Promise<void> {
    const signalToUse = signal ?? "SIGTERM";
    this.killedPids.set(pid, signalToUse);

    // Find and kill the process in history
    for (const record of this.spawnHistory) {
      if (record.process.pid === pid && !record.process.wasKilled()) {
        record.process.kill(signalToUse);
        return;
      }
    }

    // Process not found, but don't throw - real kill might also succeed on non-existent PIDs
  }
}
