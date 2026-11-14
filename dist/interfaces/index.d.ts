/**
 * Core interfaces for abstracting external dependencies.
 *
 * These interfaces enable dependency injection and testability
 * by allowing mock implementations in tests while using real
 * implementations in production.
 *
 * @module interfaces
 */
export type { FileSystem, FileStat, WatchEvent, MkdirOptions, RmOptions, } from "./filesystem";
export type { ProcessManager, ManagedProcess, SpawnOptions, } from "./process-manager";
export type { Clock } from "./clock";
export type { LockOptions, LockHandle, LockResult, FileLockService, } from "./lock";
export { BunFileSystem } from "./bun-filesystem";
export { BunProcessManager } from "./bun-process-manager";
export { SystemClock } from "./system-clock";
//# sourceMappingURL=index.d.ts.map