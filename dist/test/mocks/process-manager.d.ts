/**
 * Mock ProcessManager for testing.
 *
 * Provides a controllable implementation of the ProcessManager interface
 * that allows tests to simulate process spawning, output, and exit behavior.
 *
 * @module test/mocks/process-manager
 */
import type { ProcessManager, ManagedProcess, SpawnOptions } from "../../interfaces/process-manager";
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
 * A mock managed process with controllable behavior.
 */
export declare class MockManagedProcess implements ManagedProcess {
    readonly pid: number;
    private readonly config;
    private killed;
    private killSignal;
    constructor(config?: Partial<MockProcessConfig>);
    /**
     * Check if the process was killed.
     */
    wasKilled(): boolean;
    /**
     * Get the signal used to kill the process.
     */
    getKillSignal(): string | undefined;
    get stdout(): AsyncIterable<string>;
    get stderr(): AsyncIterable<string>;
    get exitCode(): Promise<number | null>;
    kill(signal?: string): void;
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
export declare class MockProcessManager implements ProcessManager {
    private readonly spawnHistory;
    private processConfigs;
    private defaultConfig;
    private nextPid;
    private readonly killedPids;
    /**
     * Configure behavior for a specific command.
     *
     * Multiple calls queue up configurations that are consumed in order.
     *
     * @param command - Command to configure
     * @param config - Configuration for the mock process
     */
    setProcessConfig(command: string, config: Partial<MockProcessConfig>): void;
    /**
     * Set the default configuration for commands without specific config.
     *
     * @param config - Default configuration
     */
    setDefaultConfig(config: Partial<MockProcessConfig>): void;
    /**
     * Get the history of spawn calls.
     */
    getSpawnHistory(): readonly SpawnRecord[];
    /**
     * Clear spawn history and configurations.
     */
    clear(): void;
    /**
     * Check if a PID was killed.
     *
     * @param pid - Process ID to check
     * @returns Signal used to kill, or undefined if not killed
     */
    wasKilled(pid: number): string | undefined;
    spawn(command: string, args: readonly string[], options?: SpawnOptions): ManagedProcess;
    kill(pid: number, signal?: string): Promise<void>;
}
//# sourceMappingURL=process-manager.d.ts.map