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
import type { FileLockService } from "./interfaces/lock";
import type { GroupRepository } from "./repository/group-repository";
import type { QueueRepository } from "./repository/queue-repository";
import type { BookmarkRepository } from "./repository/bookmark-repository";
import { BunFileSystem } from "./interfaces/bun-filesystem";
import { BunProcessManager } from "./interfaces/bun-process-manager";
import { SystemClock } from "./interfaces/system-clock";
import { FileLockServiceImpl } from "./services/file-lock";
import { AtomicWriter } from "./services/atomic-writer";
import { MockFileSystem } from "./test/mocks/filesystem";
import { MockProcessManager } from "./test/mocks/process-manager";
import { MockClock } from "./test/mocks/clock";
import { MockFileLockService } from "./test/mocks/lock";
import { InMemoryGroupRepository } from "./repository/in-memory";
import { InMemoryQueueRepository } from "./repository/in-memory";
import { InMemoryBookmarkRepository } from "./repository/in-memory";

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
  /** File locking service */
  readonly fileLockService: FileLockService;
  /** Atomic file writer */
  readonly atomicWriter: AtomicWriter;
  /** Group repository */
  readonly groupRepository: GroupRepository;
  /** Queue repository */
  readonly queueRepository: QueueRepository;
  /** Bookmark repository */
  readonly bookmarkRepository: BookmarkRepository;
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
  const fs = new BunFileSystem();
  const clock = new SystemClock();

  return {
    fileSystem: fs,
    processManager: new BunProcessManager(),
    clock,
    fileLockService: new FileLockServiceImpl(fs, clock),
    atomicWriter: new AtomicWriter(fs),
    groupRepository: new InMemoryGroupRepository(),
    queueRepository: new InMemoryQueueRepository(),
    bookmarkRepository: new InMemoryBookmarkRepository(),
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
  const fs = new MockFileSystem();
  const clock = new MockClock();

  const defaults: Container = {
    fileSystem: fs,
    processManager: new MockProcessManager(),
    clock,
    fileLockService: new MockFileLockService(),
    atomicWriter: new AtomicWriter(fs),
    groupRepository: new InMemoryGroupRepository(),
    queueRepository: new InMemoryQueueRepository(),
    bookmarkRepository: new InMemoryBookmarkRepository(),
  };

  return {
    ...defaults,
    ...overrides,
  };
}
