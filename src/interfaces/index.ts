/**
 * Core interfaces for abstracting external dependencies.
 *
 * These interfaces enable dependency injection and testability
 * by allowing mock implementations in tests while using real
 * implementations in production.
 *
 * @module interfaces
 */

// FileSystem interface and types
export type {
  FileSystem,
  FileStat,
  WatchEvent,
  MkdirOptions,
  RmOptions,
} from "./filesystem";

// ProcessManager interface and types
export type {
  ProcessManager,
  ManagedProcess,
  SpawnOptions,
} from "./process-manager";

// Clock interface
export type { Clock } from "./clock";

// Lock interface and types
export type {
  LockOptions,
  LockHandle,
  LockResult,
  FileLockService,
} from "./lock";

// Production implementations
export { BunFileSystem } from "./bun-filesystem";
export { BunProcessManager } from "./bun-process-manager";
export { SystemClock } from "./system-clock";
