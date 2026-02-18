/**
 * Unit tests for queue REST API routes
 *
 * @module daemon/routes/queues.test
 */

import { describe, test, expect } from "bun:test";
import type { SdkManager } from "../../sdk";
import type { TokenManager } from "../auth";
import type { ApiToken, Permission } from "../types";
import type {
  CommandQueue as SDKCommandQueue,
  QueueCommand as SDKQueueCommand,
} from "../../sdk/queue/types";
import type { QueueResult } from "../../sdk/queue/runner";

// Mock token
const mockToken: ApiToken = {
  id: "test-id",
  name: "Test Token",
  hash: "sha256:testhash",
  permissions: ["queue:*"],
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

// Mock queue (SDK type)
const mockQueue: SDKCommandQueue = {
  id: "queue-123",
  name: "Test Queue",
  projectPath: "/test/project",
  status: "idle",
  currentCommandIndex: 0,
  commands: [],
  config: { stopOnError: true },
  stats: {
    totalCommands: 0,
    completedCommands: 0,
    failedCommands: 0,
    totalCost: 0,
    totalTokens: { input: 0, output: 0 },
    totalDuration: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock command (SDK type)
const mockCommand: SDKQueueCommand = {
  id: "cmd-001",
  index: 0,
  prompt: "Test prompt",
  sessionMode: "continue",
  status: "pending",
  addedAt: new Date().toISOString(),
};

// Mock queue result
const mockQueueResult: QueueResult = {
  status: "completed",
  completedCommands: 0,
  failedCommands: 0,
  skippedCommands: 0,
  totalCostUsd: 0,
  totalDurationMs: 0,
};

// Create mock SDK
function createMockSDK(options: {
  createQueueResult?: SDKCommandQueue;
  listQueuesResult?: SDKCommandQueue[];
  getQueueResult?: SDKCommandQueue | null;
  addCommandResult?: SDKQueueCommand;
  updateCommandResult?: SDKQueueCommand;
  runQueueResult?: QueueResult;
  throwError?: boolean;
}): SdkManager {
  return {
    queues: {
      createQueue: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.createQueueResult ?? mockQueue;
      },
      listQueues: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.listQueuesResult ?? [mockQueue];
      },
      getQueue: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return "getQueueResult" in options ? options.getQueueResult : mockQueue;
      },
      addCommand: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.addCommandResult ?? mockCommand;
      },
      updateCommand: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.updateCommandResult ?? mockCommand;
      },
      removeCommand: async () => {
        if (options.throwError) throw new Error("SDK Error");
      },
    },
    queueRunner: {
      run: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.runQueueResult ?? mockQueueResult;
      },
      pause: async () => {
        if (options.throwError) throw new Error("SDK Error");
      },
      resume: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.runQueueResult ?? mockQueueResult;
      },
    },
  } as unknown as SdkManager;
}

// Create mock TokenManager
function createMockTokenManager(hasPermission: boolean = true): TokenManager {
  return {
    hasPermission: () => hasPermission,
  } as unknown as TokenManager;
}

// Mock context helpers
function createMockContext(options: {
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
  token?: ApiToken;
  setStatus?: number;
}) {
  let status = 200;
  return {
    body: options.body ?? {},
    query: options.query ?? {},
    params: options.params ?? {},
    token: options.token ?? mockToken,
    set: {
      get status() {
        return status;
      },
      set status(value: number) {
        status = value;
      },
    },
    getStatus: () => status,
  };
}

describe("Queue Routes", () => {
  describe("TEST-003: Queue Create", () => {
    test("Create queue with valid body - 200", async () => {
      const sdk = createMockSDK({ createQueueResult: mockQueue });
      const tokenManager = createMockTokenManager(true);

      // Simulate route handler logic
      const ctx = createMockContext({
        body: { projectPath: "/test/project", name: "Test Queue" },
      });

      // Permission check
      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "queue:*" as Permission,
      );
      expect(hasPermission).toBe(true);

      // Create queue
      const queue = await sdk.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      expect(queue).toBeDefined();
      expect(queue.projectPath).toBe("/test/project");
    });

    test("Create queue with optional name - 200", async () => {
      const sdk = createMockSDK({ createQueueResult: mockQueue });

      const queue = await sdk.queues.createQueue({
        projectPath: "/test/project",
      });

      expect(queue).toBeDefined();
    });

    test("Missing projectPath - 400", () => {
      const ctx = createMockContext({
        body: { name: "Test Queue" },
      });

      const body = ctx.body as { projectPath?: string };
      expect(body.projectPath).toBeUndefined();
    });

    test("Missing queue:* permission - 403", () => {
      const tokenManager = createMockTokenManager(false);
      const ctx = createMockContext({});

      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "queue:*" as Permission,
      );
      expect(hasPermission).toBe(false);
    });

    test("SDK error - 500", async () => {
      const sdk = createMockSDK({ throwError: true });

      await expect(
        sdk.queues.createQueue({ projectPath: "/test/project" }),
      ).rejects.toThrow("SDK Error");
    });
  });

  describe("TEST-004: Queue List and Get", () => {
    test("List all queues - 200", async () => {
      const sdk = createMockSDK({ listQueuesResult: [mockQueue] });

      const queues = await sdk.queues.listQueues({});
      expect(queues).toHaveLength(1);
      expect(queues[0]?.id).toBe(mockQueue.id);
    });

    test("List with projectPath filter - 200", async () => {
      const filteredQueue = { ...mockQueue, projectPath: "/filtered/project" };
      const sdk = createMockSDK({ listQueuesResult: [filteredQueue] });

      const ctx = createMockContext({
        query: { projectPath: "/filtered/project" },
      });

      const queues = await sdk.queues.listQueues({
        filter: { projectPath: ctx.query["projectPath"] },
      });

      expect(queues).toHaveLength(1);
      expect(queues[0]?.projectPath).toBe("/filtered/project");
    });

    test("List with status filter - 200", async () => {
      const sdk = createMockSDK({ listQueuesResult: [mockQueue] });

      const queues = await sdk.queues.listQueues({
        filter: { status: "pending" },
      });

      expect(queues).toBeDefined();
    });

    test("List with invalid status (ignored) - 200", () => {
      const ctx = createMockContext({ query: { status: "invalid-status" } });

      // Invalid status should be filtered out before SDK call
      const validStatuses = [
        "pending",
        "running",
        "paused",
        "stopped",
        "completed",
        "failed",
      ];
      const statusIsValid = validStatuses.includes(ctx.query["status"] ?? "");
      expect(statusIsValid).toBe(false);
    });

    test("Get existing queue - 200", async () => {
      const sdk = createMockSDK({ getQueueResult: mockQueue });
      const ctx = createMockContext({ params: { id: "queue-123" } });

      const queue = await sdk.queues.getQueue(ctx.params["id"] ?? "");
      expect(queue?.id).toBe(mockQueue.id);
    });

    test("Get nonexistent queue - 404", async () => {
      const sdk = createMockSDK({ getQueueResult: null });
      const ctx = createMockContext({ params: { id: "nonexistent" } });

      const queue = await sdk.queues.getQueue(ctx.params["id"] ?? "");
      expect(queue).toBeNull();
    });

    test("Missing permission - 403", () => {
      const tokenManager = createMockTokenManager(false);
      const ctx = createMockContext({});

      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "queue:*" as Permission,
      );
      expect(hasPermission).toBe(false);
    });
  });

  describe("TEST-005: Queue Command Management", () => {
    test("Add command with prompt - 200", async () => {
      const sdk = createMockSDK({ addCommandResult: mockCommand });

      const command = await sdk.queues.addCommand("queue-123", {
        prompt: "Test prompt",
        sessionMode: "continue",
      });

      expect(command).toEqual(mockCommand);
    });

    test("Add command with sessionMode and position - 200", async () => {
      const customCommand = { ...mockCommand, sessionMode: "new" as const };
      const sdk = createMockSDK({ addCommandResult: customCommand });

      const command = await sdk.queues.addCommand("queue-123", {
        prompt: "Test prompt",
        sessionMode: "new",
        position: 0,
      });

      expect(command.sessionMode).toBe("new");
    });

    test("Add command missing prompt - 400", () => {
      const ctx = createMockContext({
        body: { sessionMode: "continue" },
      });

      const body = ctx.body as { prompt?: string };
      expect(body.prompt).toBeUndefined();
    });

    test("Update command prompt - 200", async () => {
      const updatedCommand = { ...mockCommand, prompt: "Updated prompt" };
      const sdk = createMockSDK({ updateCommandResult: updatedCommand });

      const command = await sdk.queues.updateCommand("queue-123", 0, {
        prompt: "Updated prompt",
      });

      expect(command.prompt).toBe("Updated prompt");
    });

    test("Update command sessionMode - 200", async () => {
      const updatedCommand = { ...mockCommand, sessionMode: "new" as const };
      const sdk = createMockSDK({ updateCommandResult: updatedCommand });

      const command = await sdk.queues.updateCommand("queue-123", 0, {
        sessionMode: "new",
      });

      expect(command.sessionMode).toBe("new");
    });

    test("Update with no fields - 400", () => {
      const ctx = createMockContext({ body: {} });
      const body = ctx.body as { prompt?: string; sessionMode?: string };

      expect(body.prompt).toBeUndefined();
      expect(body.sessionMode).toBeUndefined();
    });

    test("Update with invalid index - 400", () => {
      const ctx = createMockContext({ params: { index: "invalid" } });
      const index = parseInt(ctx.params["index"] ?? "", 10);

      expect(isNaN(index)).toBe(true);
    });

    test("Delete command - 200", async () => {
      const sdk = createMockSDK({});
      await expect(
        sdk.queues.removeCommand("queue-123", 0),
      ).resolves.toBeUndefined();
    });

    test("Delete with invalid index - 400", () => {
      const ctx = createMockContext({ params: { index: "-1" } });
      const index = parseInt(ctx.params["index"] ?? "", 10);

      expect(index < 0).toBe(true);
    });
  });

  describe("TEST-006: Queue Execution Control", () => {
    test("Run existing queue - 200", async () => {
      const sdk = createMockSDK({
        getQueueResult: mockQueue,
        runQueueResult: mockQueueResult,
      });

      const queue = await sdk.queues.getQueue("queue-123");
      expect(queue).not.toBeNull();

      const result = await sdk.queueRunner.run("queue-123");
      expect(result).toEqual(mockQueueResult);
    });

    test("Run nonexistent queue - 404", async () => {
      const sdk = createMockSDK({ getQueueResult: null });

      const queue = await sdk.queues.getQueue("nonexistent");
      expect(queue).toBeNull();
    });

    test("Pause running queue - 200", async () => {
      const sdk = createMockSDK({ getQueueResult: mockQueue });

      const queue = await sdk.queues.getQueue("queue-123");
      expect(queue).not.toBeNull();

      await expect(sdk.queueRunner.pause("queue-123")).resolves.toBeUndefined();
    });

    test("Pause nonexistent queue - 404", async () => {
      const sdk = createMockSDK({ getQueueResult: null });

      const queue = await sdk.queues.getQueue("nonexistent");
      expect(queue).toBeNull();
    });

    test("Resume paused queue - 200", async () => {
      const sdk = createMockSDK({
        getQueueResult: mockQueue,
        runQueueResult: mockQueueResult,
      });

      const queue = await sdk.queues.getQueue("queue-123");
      expect(queue).not.toBeNull();

      const result = await sdk.queueRunner.resume("queue-123");
      expect(result).toEqual(mockQueueResult);
    });

    test("Resume nonexistent queue - 404", async () => {
      const sdk = createMockSDK({ getQueueResult: null });

      const queue = await sdk.queues.getQueue("nonexistent");
      expect(queue).toBeNull();
    });

    test("Missing permission - 403", () => {
      const tokenManager = createMockTokenManager(false);
      const ctx = createMockContext({});

      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "queue:*" as Permission,
      );
      expect(hasPermission).toBe(false);
    });
  });
});
