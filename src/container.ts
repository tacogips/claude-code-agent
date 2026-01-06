/**
 * Dependency injection container.
 *
 * Provides a centralized location for all injectable dependencies,
 * enabling easy testing through mock implementations.
 *
 * @module container
 */

import type { FileSystem } from "./interfaces/filesystem";
import type { ProcessManager } from "./interfaces/process-manager";
import type { Clock } from "./interfaces/clock";
import { BunFileSystem } from "./interfaces/bun-filesystem";
import { BunProcessManager } from "./interfaces/bun-process-manager";
import { SystemClock } from "./interfaces/system-clock";
import { MockFileSystem } from "./test/mocks/filesystem";
import { MockProcessManager } from "./test/mocks/process-manager";
import { MockClock } from "./test/mocks/clock";

/**
 * Dependency injection container.
 *
 * Holds all injectable dependencies for the application.
 * Use createProductionContainer() for production and
 * createTestContainer() for testing.
 */
export interface Container {
  /** File system operations */
  readonly fileSystem: FileSystem;
  /** Process management */
  readonly processManager: ProcessManager;
  /** Time operations */
  readonly clock: Clock;
}

/**
 * Create a production container with real implementations.
 *
 * Uses Bun APIs for file system, process management, and
 * system time. This is the container used in production.
 *
 * @returns Container with production implementations
 */
export function createProductionContainer(): Container {
  return {
    fileSystem: new BunFileSystem(),
    processManager: new BunProcessManager(),
    clock: new SystemClock(),
  };
}

/**
 * Create a test container with mock implementations.
 *
 * Uses in-memory mocks for all dependencies, allowing
 * deterministic testing without external effects. Supports
 * partial overrides to customize specific dependencies.
 *
 * @param overrides - Partial container to override defaults
 * @returns Container with mock implementations
 */
export function createTestContainer(overrides?: Partial<Container>): Container {
  const defaults: Container = {
    fileSystem: new MockFileSystem(),
    processManager: new MockProcessManager(),
    clock: new MockClock(),
  };

  return {
    ...defaults,
    ...overrides,
  };
}
