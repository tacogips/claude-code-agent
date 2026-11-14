/**
 * Production-like queue fixtures for E2E testing.
 *
 * These fixtures are modeled after the command queue data structure
 * to provide realistic test scenarios.
 *
 * @module tests/e2e/fixtures/queues
 */

import type {
  CommandQueue,
  QueueCommand,
  QueueStatus,
  CommandStatus,
  SessionMode,
} from "../../../src/repository/queue-repository";

/**
 * Generate a unique command ID.
 */
function generateCommandId(): string {
  return `cmd-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a queue command.
 */
function createCommand(
  prompt: string,
  status: CommandStatus,
  sessionMode: SessionMode = "continue",
  extra: Partial<QueueCommand> = {},
): QueueCommand {
  return {
    id: generateCommandId(),
    prompt,
    sessionMode,
    status,
    ...extra,
  };
}

// Fixture: Running queue with mixed command statuses
export const runningQueue: CommandQueue = {
  id: "feature-development-queue",
  name: "Feature Development Queue",
  projectPath: "/home/user/projects/web-app",
  status: "running",
  commands: [
    createCommand(
      "Set up the project structure with TypeScript and ESLint",
      "completed",
      "new",
      {
        sessionId: "session-001",
        costUsd: 0.0523,
        startedAt: "2026-01-12T09:00:00.000Z",
        completedAt: "2026-01-12T09:15:00.000Z",
      },
    ),
    createCommand(
      "Implement the user authentication module with JWT",
      "completed",
      "continue",
      {
        sessionId: "session-002",
        costUsd: 0.1234,
        startedAt: "2026-01-12T09:15:00.000Z",
        completedAt: "2026-01-12T09:45:00.000Z",
      },
    ),
    createCommand(
      "Create the database schema and migrations",
      "running",
      "continue",
      {
        sessionId: "session-003",
        startedAt: "2026-01-12T09:45:00.000Z",
      },
    ),
    createCommand(
      "Implement CRUD operations for the user resource",
      "pending",
      "continue",
    ),
    createCommand(
      "Add unit tests for the authentication module",
      "pending",
      "continue",
    ),
    createCommand(
      "Set up CI/CD pipeline with GitHub Actions",
      "pending",
      "new",
    ),
  ],
  currentIndex: 2,
  currentSessionId: "session-003",
  totalCostUsd: 0.1757,
  createdAt: "2026-01-12T08:55:00.000Z",
  updatedAt: "2026-01-12T09:50:00.000Z",
  startedAt: "2026-01-12T09:00:00.000Z",
};

// Fixture: Completed queue
export const completedQueue: CommandQueue = {
  id: "bug-fixes-batch",
  name: "Bug Fixes Batch",
  projectPath: "/home/user/projects/api-server",
  status: "completed",
  commands: [
    createCommand(
      "Fix the null pointer exception in PaymentProcessor",
      "completed",
      "new",
      {
        sessionId: "session-010",
        costUsd: 0.0456,
        startedAt: "2026-01-11T14:00:00.000Z",
        completedAt: "2026-01-11T14:20:00.000Z",
      },
    ),
    createCommand(
      "Fix the race condition in OrderService",
      "completed",
      "continue",
      {
        sessionId: "session-011",
        costUsd: 0.0789,
        startedAt: "2026-01-11T14:20:00.000Z",
        completedAt: "2026-01-11T14:45:00.000Z",
      },
    ),
    createCommand(
      "Fix the memory leak in WebSocketHandler",
      "completed",
      "continue",
      {
        sessionId: "session-012",
        costUsd: 0.0623,
        startedAt: "2026-01-11T14:45:00.000Z",
        completedAt: "2026-01-11T15:10:00.000Z",
      },
    ),
  ],
  currentIndex: 3,
  totalCostUsd: 0.1868,
  createdAt: "2026-01-11T13:50:00.000Z",
  updatedAt: "2026-01-11T15:10:00.000Z",
  startedAt: "2026-01-11T14:00:00.000Z",
  completedAt: "2026-01-11T15:10:00.000Z",
};

// Fixture: Paused queue
export const pausedQueue: CommandQueue = {
  id: "refactoring-tasks",
  name: "Refactoring Tasks",
  projectPath: "/home/user/projects/legacy-app",
  status: "paused",
  commands: [
    createCommand(
      "Extract common utilities into a shared module",
      "completed",
      "new",
      {
        sessionId: "session-020",
        costUsd: 0.0890,
        startedAt: "2026-01-10T10:00:00.000Z",
        completedAt: "2026-01-10T10:40:00.000Z",
      },
    ),
    createCommand(
      "Migrate from callbacks to async/await",
      "pending",
      "continue",
    ),
    createCommand(
      "Add TypeScript types to all API endpoints",
      "pending",
      "continue",
    ),
    createCommand(
      "Replace deprecated dependencies",
      "pending",
      "continue",
    ),
  ],
  currentIndex: 1,
  totalCostUsd: 0.0890,
  createdAt: "2026-01-10T09:55:00.000Z",
  updatedAt: "2026-01-10T11:00:00.000Z",
  startedAt: "2026-01-10T10:00:00.000Z",
};

// Fixture: Failed queue
export const failedQueue: CommandQueue = {
  id: "migration-tasks",
  name: "Database Migration Tasks",
  projectPath: "/home/user/projects/database-service",
  status: "failed",
  commands: [
    createCommand(
      "Create backup of the current database",
      "completed",
      "new",
      {
        sessionId: "session-030",
        costUsd: 0.0234,
        startedAt: "2026-01-09T16:00:00.000Z",
        completedAt: "2026-01-09T16:10:00.000Z",
      },
    ),
    createCommand(
      "Run the migration scripts for v2.0",
      "failed",
      "continue",
      {
        sessionId: "session-031",
        costUsd: 0.0567,
        startedAt: "2026-01-09T16:10:00.000Z",
        completedAt: "2026-01-09T16:25:00.000Z",
        error: "Migration failed: Foreign key constraint violation in users table",
      },
    ),
    createCommand(
      "Verify data integrity after migration",
      "skipped",
      "continue",
    ),
    createCommand(
      "Update application to use new schema",
      "skipped",
      "continue",
    ),
  ],
  currentIndex: 1,
  totalCostUsd: 0.0801,
  createdAt: "2026-01-09T15:55:00.000Z",
  updatedAt: "2026-01-09T16:25:00.000Z",
  startedAt: "2026-01-09T16:00:00.000Z",
};

// Fixture: Pending queue (not started)
export const pendingQueue: CommandQueue = {
  id: "documentation-updates",
  name: "Documentation Updates",
  projectPath: "/home/user/projects/docs-site",
  status: "pending",
  commands: [
    createCommand(
      "Update the API reference documentation",
      "pending",
      "new",
    ),
    createCommand(
      "Add examples for all SDK methods",
      "pending",
      "continue",
    ),
    createCommand(
      "Write the getting started guide",
      "pending",
      "continue",
    ),
    createCommand(
      "Create the changelog for version 3.0",
      "pending",
      "new",
    ),
  ],
  currentIndex: 0,
  totalCostUsd: 0,
  createdAt: "2026-01-12T07:00:00.000Z",
  updatedAt: "2026-01-12T07:00:00.000Z",
};

// Fixture: Stopped queue
export const stoppedQueue: CommandQueue = {
  id: "performance-optimization",
  name: "Performance Optimization",
  projectPath: "/home/user/projects/backend-service",
  status: "stopped",
  commands: [
    createCommand(
      "Profile the API endpoints for bottlenecks",
      "completed",
      "new",
      {
        sessionId: "session-040",
        costUsd: 0.0678,
        startedAt: "2026-01-08T11:00:00.000Z",
        completedAt: "2026-01-08T11:30:00.000Z",
      },
    ),
    createCommand(
      "Optimize database queries",
      "pending",
      "continue",
    ),
    createCommand(
      "Implement caching layer",
      "pending",
      "continue",
    ),
  ],
  currentIndex: 1,
  totalCostUsd: 0.0678,
  createdAt: "2026-01-08T10:55:00.000Z",
  updatedAt: "2026-01-08T11:35:00.000Z",
  startedAt: "2026-01-08T11:00:00.000Z",
};

// Fixture: Large queue with many commands
export const largeQueue: CommandQueue = {
  id: "large-refactoring-project",
  name: "Large Refactoring Project",
  projectPath: "/home/user/projects/monorepo",
  status: "running",
  commands: Array.from({ length: 20 }, (_, i) => {
    const status: CommandStatus = i < 8 ? "completed" : i === 8 ? "running" : "pending";
    return createCommand(
      `Task ${i + 1}: ${["Refactor module", "Add tests", "Update docs", "Fix types", "Optimize performance"][i % 5]} for component-${i + 1}`,
      status,
      i === 0 || i === 10 ? "new" : "continue",
      status === "completed"
        ? {
            sessionId: `session-${100 + i}`,
            costUsd: 0.05 + Math.random() * 0.1,
            startedAt: `2026-01-12T${(9 + Math.floor(i / 2)).toString().padStart(2, "0")}:${((i % 2) * 30).toString().padStart(2, "0")}:00.000Z`,
            completedAt: `2026-01-12T${(9 + Math.floor((i + 1) / 2)).toString().padStart(2, "0")}:${(((i + 1) % 2) * 30).toString().padStart(2, "0")}:00.000Z`,
          }
        : status === "running"
          ? {
              sessionId: `session-${100 + i}`,
              startedAt: `2026-01-12T${(9 + Math.floor(i / 2)).toString().padStart(2, "0")}:${((i % 2) * 30).toString().padStart(2, "0")}:00.000Z`,
            }
          : {},
    );
  }),
  currentIndex: 8,
  currentSessionId: "session-108",
  totalCostUsd: 0.65,
  createdAt: "2026-01-12T08:50:00.000Z",
  updatedAt: "2026-01-12T13:30:00.000Z",
  startedAt: "2026-01-12T09:00:00.000Z",
};

/**
 * All queue fixtures as a readonly array.
 */
export const allQueues: readonly CommandQueue[] = [
  runningQueue,
  completedQueue,
  pausedQueue,
  failedQueue,
  pendingQueue,
  stoppedQueue,
  largeQueue,
];
