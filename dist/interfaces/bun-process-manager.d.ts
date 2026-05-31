/**
 * Production ProcessManager implementation using Bun APIs.
 *
 * This provides the real process spawning operations using Bun's
 * built-in subprocess APIs.
 *
 * @module interfaces/bun-process-manager
 */
import type { ProcessManager, ManagedProcess, SpawnOptions } from "./process-manager";
/**
 * Production ProcessManager implementation using Bun.spawn.
 *
 * Uses Bun's optimized subprocess APIs for process spawning
 * and management.
 */
export declare class BunProcessManager implements ProcessManager {
    /**
     * Spawn a new subprocess.
     *
     * @param command - Command to execute
     * @param args - Command arguments
     * @param options - Spawn options
     * @returns Handle to the spawned process
     */
    spawn(command: string, args: readonly string[], options?: SpawnOptions): ManagedProcess;
    /**
     * Kill a process by PID.
     *
     * @param pid - Process ID to kill
     * @param signal - Signal to send (default: "SIGTERM")
     * @throws Error if process cannot be killed
     */
    kill(pid: number, signal?: string): Promise<void>;
}
//# sourceMappingURL=bun-process-manager.d.ts.map