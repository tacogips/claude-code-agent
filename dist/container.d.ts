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
import { AtomicWriter } from "./services/atomic-writer";
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
export declare function createProductionContainer(): Container;
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
export declare function createTestContainer(overrides?: Partial<Container>): Container;
//# sourceMappingURL=container.d.ts.map