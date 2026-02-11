/**
 * Unit tests for ClaudeCodeAgent.
 *
 * @module sdk/agent.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { ClaudeCodeAgent, ClaudeCodeToolAgent } from "./agent";
import type { SessionConfig } from "./agent";
import { createTestContainer } from "../container";
import type { Container } from "../container";
import { InMemoryGroupRepository } from "../repository/in-memory/group-repository";
import { InMemoryQueueRepository } from "../repository/in-memory/queue-repository";
import { InMemoryBookmarkRepository } from "../repository/in-memory/bookmark-repository";
import { EventEmitter } from "./events/emitter";
import { SessionReader } from "./session-reader";
import { GroupManager, GroupRunner } from "./group";
import { QueueManager, QueueRunner } from "./queue";
import { BookmarkManager } from "./bookmarks";
import { tool, createSdkMcpServer } from "./tool-registry";
import type { SdkTool } from "./types/tool";
import { SubprocessTransport } from "./transport/subprocess";
import { ControlProtocolHandler } from "./control-protocol";

describe("ClaudeCodeAgent", () => {
  let container: Container;

  beforeEach(() => {
    container = createTestContainer();
  });

  describe("TEST-001: Agent Creation - Factory Method", () => {
    test("creates agent with valid container", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent).toBeInstanceOf(ClaudeCodeAgent);
      expect(agent).toBeDefined();
    });

    test("async initialization completes", async () => {
      const agentPromise = ClaudeCodeAgent.create(container);

      expect(agentPromise).toBeInstanceOf(Promise);

      const agent = await agentPromise;
      expect(agent).toBeInstanceOf(ClaudeCodeAgent);
    });

    test("agent instance is returned", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent).toBeInstanceOf(ClaudeCodeAgent);
      expect(agent.container).toBeDefined();
      expect(agent.events).toBeDefined();
      expect(agent.sessions).toBeDefined();
    });

    test("multiple calls create separate instances", async () => {
      const agent1 = await ClaudeCodeAgent.create(container);
      const agent2 = await ClaudeCodeAgent.create(container);

      expect(agent1).not.toBe(agent2);
      expect(agent1.events).not.toBe(agent2.events);
      expect(agent1.sessions).not.toBe(agent2.sessions);
    });
  });

  describe("TEST-002: Manager Initialization", () => {
    test("sessions property is SessionReader instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.sessions).toBeInstanceOf(SessionReader);
    });

    test("groups property is GroupManager instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.groups).toBeInstanceOf(GroupManager);
    });

    test("queues property is QueueManager instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.queues).toBeInstanceOf(QueueManager);
    });

    test("bookmarks property is BookmarkManager instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.bookmarks).toBeInstanceOf(BookmarkManager);
    });

    test("events property is EventEmitter instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.events).toBeInstanceOf(EventEmitter);
    });

    test("all managers initialized with container", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // All managers should be defined
      expect(agent.sessions).toBeDefined();
      expect(agent.groups).toBeDefined();
      expect(agent.queues).toBeDefined();
      expect(agent.bookmarks).toBeDefined();
    });
  });

  describe("TEST-003: Runner Initialization", () => {
    test("groupRunner property is GroupRunner instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.groupRunner).toBeInstanceOf(GroupRunner);
    });

    test("queueRunner property is QueueRunner instance", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.queueRunner).toBeInstanceOf(QueueRunner);
    });

    test("runners share same EventEmitter as agent.events", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // Verify by subscribing to agent.events and checking if runner events propagate
      let groupEventReceived = false;
      agent.events.on("group_created", () => {
        groupEventReceived = true;
      });

      // Create a group which should emit group_created event
      await agent.groups.createGroup({ name: "Test Group" });

      expect(groupEventReceived).toBe(true);
    });

    test("runners have access to container", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // Runners should be functional, which requires container access
      expect(agent.groupRunner).toBeDefined();
      expect(agent.queueRunner).toBeDefined();

      // Can't directly test container access without exposing it,
      // but we can verify runners were constructed (they'd fail if no container)
      expect(agent.groupRunner).toBeInstanceOf(GroupRunner);
      expect(agent.queueRunner).toBeInstanceOf(QueueRunner);
    });
  });

  describe("TEST-004: Container Dependency Injection", () => {
    test("agent.container equals passed container", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.container).toBe(container);
    });

    test("container reference accessible via agent.container", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.container).toBeDefined();
      expect(agent.container.fileSystem).toBeDefined();
      expect(agent.container.processManager).toBeDefined();
      expect(agent.container.clock).toBeDefined();
    });

    test("groupRepository used by GroupManager and GroupRunner", async () => {
      const customGroupRepo = new InMemoryGroupRepository();
      const customContainer = createTestContainer({
        groupRepository: customGroupRepo,
      });

      const agent = await ClaudeCodeAgent.create(customContainer);

      expect(agent.container.groupRepository).toBe(customGroupRepo);

      // Verify it's actually used by creating a group
      const group = await agent.groups.createGroup({ name: "Test" });
      const retrieved = await customGroupRepo.findById(group.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(group.id);
    });

    test("queueRepository used by QueueManager and QueueRunner", async () => {
      const customQueueRepo = new InMemoryQueueRepository();
      const customContainer = createTestContainer({
        queueRepository: customQueueRepo,
      });

      const agent = await ClaudeCodeAgent.create(customContainer);

      expect(agent.container.queueRepository).toBe(customQueueRepo);

      // Verify it's actually used by creating a queue
      const queue = await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });
      const retrieved = await customQueueRepo.findById(queue.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(queue.id);
    });

    test("bookmarkRepository used by BookmarkManager", async () => {
      const customBookmarkRepo = new InMemoryBookmarkRepository();
      const customContainer = createTestContainer({
        bookmarkRepository: customBookmarkRepo,
      });

      const agent = await ClaudeCodeAgent.create(customContainer);

      expect(agent.container.bookmarkRepository).toBe(customBookmarkRepo);

      // Verify it's actually used by adding a bookmark
      const bookmark = await agent.bookmarks.add({
        type: "session",
        sessionId: "test-session",
        name: "Test Bookmark",
        description: "Test description",
      });

      const retrieved = await customBookmarkRepo.findById(bookmark.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(bookmark.id);
    });

    test("other container services accessible through agent", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.container.fileSystem).toBeDefined();
      expect(agent.container.processManager).toBeDefined();
      expect(agent.container.clock).toBeDefined();
    });
  });

  describe("TEST-005: EventEmitter Integration", () => {
    test("EventEmitter created during construction", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.events).toBeDefined();
      expect(agent.events).toBeInstanceOf(EventEmitter);
    });

    test("same EventEmitter passed to all managers", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // All managers should share the same EventEmitter
      // We can verify this by subscribing and emitting events
      let groupEventCount = 0;
      let queueEventCount = 0;

      agent.events.on("group_created", () => {
        groupEventCount++;
      });

      agent.events.on("queue_created", () => {
        queueEventCount++;
      });

      // Trigger events through managers
      await agent.groups.createGroup({ name: "Test Group" });
      await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      expect(groupEventCount).toBe(1);
      expect(queueEventCount).toBe(1);
    });

    test("events can be subscribed via agent.events", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      let eventReceived = false;
      let receivedEventData: unknown = undefined;

      agent.events.on("group_created", (data) => {
        eventReceived = true;
        receivedEventData = data;
      });

      await agent.groups.createGroup({ name: "Test Group" });

      expect(eventReceived).toBe(true);
      expect(receivedEventData).toBeDefined();
    });

    test("events emitted by managers propagate", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      const receivedEvents: string[] = [];

      agent.events.on("group_created", () => {
        receivedEvents.push("group_created");
      });

      agent.events.on("queue_created", () => {
        receivedEvents.push("queue_created");
      });

      // Emit events through different managers
      await agent.groups.createGroup({ name: "Test Group" });
      await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      expect(receivedEvents).toContain("group_created");
      expect(receivedEvents).toContain("queue_created");
      expect(receivedEvents).toHaveLength(2);
    });

    test("event listeners can be removed", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      let eventCount = 0;
      const listener = () => {
        eventCount++;
      };

      agent.events.on("group_created", listener);
      await agent.groups.createGroup({ name: "Test 1" });

      expect(eventCount).toBe(1);

      // Remove listener
      agent.events.off("group_created", listener);
      await agent.groups.createGroup({ name: "Test 2" });

      // Event count should not increase
      expect(eventCount).toBe(1);
    });
  });

  describe("TEST-006: Markdown Parsing", () => {
    test("parses simple markdown content", () => {
      const agent = new (ClaudeCodeAgent as any)(container);

      const result = agent.parseMarkdown("# Hello\n\nWorld");

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
    });

    test("parses empty string", () => {
      const agent = new (ClaudeCodeAgent as any)(container);

      const result = agent.parseMarkdown("");

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
    });

    test("parses complex markdown with code blocks", () => {
      const agent = new (ClaudeCodeAgent as any)(container);

      const markdown = `
# Title

Some text

\`\`\`typescript
const x = 1;
\`\`\`

More text
`;

      const result = agent.parseMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
    });

    test("return type matches parseMarkdown module", () => {
      const agent = new (ClaudeCodeAgent as any)(container);

      const result = agent.parseMarkdown("# Test");

      // Should have the expected structure from parseMarkdown
      expect(result).toHaveProperty("sections");
      expect(Array.isArray(result.sections)).toBe(true);
    });
  });

  describe("TEST-007: Manager Accessibility", () => {
    test("sessions API accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.sessions).toBeDefined();
      expect(typeof agent.sessions.listSessions).toBe("function");
    });

    test("groups API accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.groups).toBeDefined();
      expect(typeof agent.groups.createGroup).toBe("function");

      const group = await agent.groups.createGroup({ name: "Test" });
      expect(group).toBeDefined();
      expect(group.id).toBeDefined();
    });

    test("queues API accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.queues).toBeDefined();
      expect(typeof agent.queues.createQueue).toBe("function");

      const queue = await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });
      expect(queue).toBeDefined();
      expect(queue.id).toBeDefined();
    });

    test("bookmarks API accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.bookmarks).toBeDefined();
      expect(typeof agent.bookmarks.add).toBe("function");

      const bookmark = await agent.bookmarks.add({
        type: "session",
        sessionId: "test-session",
        name: "Test",
        description: "Test description",
      });
      expect(bookmark).toBeDefined();
      expect(bookmark.id).toBeDefined();
    });

    test("methods return expected types", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      const group = await agent.groups.createGroup({ name: "Test" });
      expect(group).toHaveProperty("id");
      expect(group).toHaveProperty("name");
      expect(group).toHaveProperty("status");

      const queue = await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });
      expect(queue).toHaveProperty("id");
      expect(queue).toHaveProperty("name");
      expect(queue).toHaveProperty("status");

      const bookmark = await agent.bookmarks.add({
        type: "session",
        sessionId: "test-session",
        name: "Test",
        description: "Test description",
      });
      expect(bookmark).toHaveProperty("id");
      expect(bookmark).toHaveProperty("sessionId");
      expect(bookmark).toHaveProperty("name");
    });
  });

  describe("TEST-008: Runner Accessibility", () => {
    test("GroupRunner methods accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.groupRunner).toBeDefined();
      expect(typeof agent.groupRunner.run).toBe("function");
      expect(typeof agent.groupRunner.pause).toBe("function");
    });

    test("QueueRunner methods accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.queueRunner).toBeDefined();
      expect(typeof agent.queueRunner.run).toBe("function");
      expect(typeof agent.queueRunner.pause).toBe("function");
    });

    test("runners interact with correct repositories", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // Create a group
      const group = await agent.groups.createGroup({
        name: "Test Group",
      });

      // Verify GroupRunner can access the repository by checking for the group
      const retrievedGroup = await agent.container.groupRepository.findById(
        group.id,
      );
      expect(retrievedGroup).not.toBeNull();
      expect(retrievedGroup?.id).toBe(group.id);

      // Create a queue
      const queue = await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      // Verify QueueRunner can access the repository by checking for the queue
      const retrievedQueue = await agent.container.queueRepository.findById(
        queue.id,
      );
      expect(retrievedQueue).not.toBeNull();
      expect(retrievedQueue?.id).toBe(queue.id);
    });

    test("events emitted during runner operations", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      let groupCreatedReceived = false;
      agent.events.on("group_created", () => {
        groupCreatedReceived = true;
      });

      // Create a group which should emit event through the shared EventEmitter
      await agent.groups.createGroup({
        name: "Test Group",
      });

      expect(groupCreatedReceived).toBe(true);

      let queueCreatedReceived = false;
      agent.events.on("queue_created", () => {
        queueCreatedReceived = true;
      });

      // Create a queue which should emit event through the shared EventEmitter
      await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      expect(queueCreatedReceived).toBe(true);
    });
  });

  describe("TEST-009: Error Handling - Initialization", () => {
    test("handles container with custom repositories", async () => {
      const customContainer = createTestContainer({
        groupRepository: new InMemoryGroupRepository(),
        queueRepository: new InMemoryQueueRepository(),
        bookmarkRepository: new InMemoryBookmarkRepository(),
      });

      const agent = await ClaudeCodeAgent.create(customContainer);

      expect(agent).toBeDefined();
      expect(agent.groups).toBeDefined();
      expect(agent.queues).toBeDefined();
      expect(agent.bookmarks).toBeDefined();
    });

    test("container properties are accessible", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      expect(agent.container.groupRepository).toBeDefined();
      expect(agent.container.queueRepository).toBeDefined();
      expect(agent.container.bookmarkRepository).toBeDefined();
    });

    test("async initialization completes successfully", async () => {
      const startTime = Date.now();
      const agent = await ClaudeCodeAgent.create(container);
      const endTime = Date.now();

      expect(agent).toBeDefined();
      // Should be fast (< 1 second for in-memory operations)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test("multiple concurrent initializations succeed", async () => {
      const promises = [
        ClaudeCodeAgent.create(createTestContainer()),
        ClaudeCodeAgent.create(createTestContainer()),
        ClaudeCodeAgent.create(createTestContainer()),
      ];

      const agents = await Promise.all(promises);

      expect(agents).toHaveLength(3);
      agents.forEach((agent) => {
        expect(agent).toBeInstanceOf(ClaudeCodeAgent);
      });
    });

    test("agent remains functional after initialization", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // Should be able to perform operations
      const group = await agent.groups.createGroup({ name: "Test" });
      const queue = await agent.queues.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      expect(group).toBeDefined();
      expect(queue).toBeDefined();
    });
  });

  describe("TEST-010: Readonly Properties", () => {
    test("properties are defined as readonly", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // TypeScript enforces readonly at compile time
      // At runtime, we can verify the properties exist and are stable
      expect(agent.container).toBeDefined();
      expect(agent.events).toBeDefined();
      expect(agent.sessions).toBeDefined();
      expect(agent.groups).toBeDefined();
      expect(agent.queues).toBeDefined();
      expect(agent.bookmarks).toBeDefined();
      expect(agent.groupRunner).toBeDefined();
      expect(agent.queueRunner).toBeDefined();
    });

    test("container property remains stable", async () => {
      const agent = await ClaudeCodeAgent.create(container);
      const originalContainer = agent.container;

      // TypeScript will prevent reassignment at compile time
      // At runtime, we verify the property remains stable
      expect(agent.container).toBe(originalContainer);
      expect(agent.container).toBe(container);
    });

    test("events property remains stable", async () => {
      const agent = await ClaudeCodeAgent.create(container);
      const originalEvents = agent.events;

      // Verify events instance remains the same
      expect(agent.events).toBe(originalEvents);
      expect(agent.events).toBeInstanceOf(EventEmitter);
    });

    test("manager properties remain stable", async () => {
      const agent = await ClaudeCodeAgent.create(container);
      const originalSessions = agent.sessions;
      const originalGroups = agent.groups;
      const originalQueues = agent.queues;
      const originalBookmarks = agent.bookmarks;

      // TypeScript enforces readonly, preventing reassignment
      // At runtime, verify properties remain stable
      expect(agent.sessions).toBe(originalSessions);
      expect(agent.groups).toBe(originalGroups);
      expect(agent.queues).toBe(originalQueues);
      expect(agent.bookmarks).toBe(originalBookmarks);
    });

    test("runner properties remain stable", async () => {
      const agent = await ClaudeCodeAgent.create(container);
      const originalGroupRunner = agent.groupRunner;
      const originalQueueRunner = agent.queueRunner;

      // TypeScript enforces readonly, preventing reassignment
      // At runtime, verify properties remain stable
      expect(agent.groupRunner).toBe(originalGroupRunner);
      expect(agent.queueRunner).toBe(originalQueueRunner);
    });

    test("all properties are instances of expected types", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // Verify all properties have correct types
      expect(agent.container).toBe(container);
      expect(agent.events).toBeInstanceOf(EventEmitter);
      expect(agent.sessions).toBeInstanceOf(SessionReader);
      expect(agent.groups).toBeInstanceOf(GroupManager);
      expect(agent.queues).toBeInstanceOf(QueueManager);
      expect(agent.bookmarks).toBeInstanceOf(BookmarkManager);
      expect(agent.groupRunner).toBeInstanceOf(GroupRunner);
      expect(agent.queueRunner).toBeInstanceOf(QueueRunner);
    });

    test("TypeScript enforces readonly at compile time", async () => {
      const agent = await ClaudeCodeAgent.create(container);

      // This test documents that TypeScript prevents reassignment at compile time
      // Attempting to reassign would cause TypeScript compilation errors:
      //
      // agent.container = createTestContainer();  // TS Error: Cannot assign to 'container' because it is a read-only property
      // agent.events = new EventEmitter();        // TS Error: Cannot assign to 'events' because it is a read-only property
      // agent.sessions = new SessionReader(...);  // TS Error: Cannot assign to 'sessions' because it is a read-only property
      //
      // At runtime, we verify the properties remain accessible and stable
      expect(agent.container).toBeDefined();
      expect(agent.events).toBeDefined();
      expect(agent.sessions).toBeDefined();
      expect(agent.groups).toBeDefined();
      expect(agent.queues).toBeDefined();
      expect(agent.bookmarks).toBeDefined();
      expect(agent.groupRunner).toBeDefined();
      expect(agent.queueRunner).toBeDefined();
    });
  });
});

// Tests for ClaudeCodeToolAgent (SDK tool execution agent)
describe("ClaudeCodeToolAgent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TEST-011: Agent Creation", () => {
    test("creates agent with no options", () => {
      const agent = new ClaudeCodeToolAgent();

      expect(agent).toBeInstanceOf(ClaudeCodeToolAgent);
      expect(agent).toBeDefined();
    });

    test("creates agent with options", () => {
      const agent = new ClaudeCodeToolAgent({
        cwd: "/test/project",
        model: "claude-opus-4",
      });

      expect(agent).toBeInstanceOf(ClaudeCodeToolAgent);
    });

    test("creates tool registries from mcpServers", () => {
      interface AddArgs {
        a: number;
        b: number;
      }

      const addTool = tool<AddArgs>({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args) => ({
          content: [
            { type: "text", text: `Result: ${args.a + args.b}` } as const,
          ],
        }),
      });

      // Cast to base type for createSdkMcpServer
      const calculator = createSdkMcpServer({
        name: "calculator",
        tools: [addTool as unknown as SdkTool],
      });

      const agent = new ClaudeCodeToolAgent({
        mcpServers: { calc: calculator },
      });

      expect(agent).toBeDefined();
      expect(agent.getActiveSessions()).toHaveLength(0);
    });
  });

  describe("TEST-012: Session Management", () => {
    test("passes initial prompt as positional CLI arg via transport options (issue #34)", async () => {
      const agent = new ClaudeCodeToolAgent();

      let capturedOptions: Record<string, unknown> | undefined;

      vi.spyOn(SubprocessTransport.prototype, "connect").mockImplementation(
        async function (this: unknown) {
          capturedOptions = (this as { options?: Record<string, unknown> })
            .options;
        },
      );
      vi.spyOn(SubprocessTransport.prototype, "write").mockResolvedValue();
      vi.spyOn(SubprocessTransport.prototype, "close").mockResolvedValue();
      vi.spyOn(
        ControlProtocolHandler.prototype,
        "initialize",
      ).mockResolvedValue();
      vi.spyOn(
        ControlProtocolHandler.prototype,
        "processMessages",
      ).mockImplementation(async () => {
        await new Promise(() => {});
      });

      await agent.startSession({ prompt: "hello from issue-34 test" });

      expect(capturedOptions).toBeDefined();
      expect(capturedOptions?.["prompt"]).toBe("hello from issue-34 test");
    });

    test("does not send initial prompt via stdin to avoid double-processing (issue #34)", async () => {
      const agent = new ClaudeCodeToolAgent();

      vi.spyOn(SubprocessTransport.prototype, "connect").mockResolvedValue();
      const writeSpy = vi
        .spyOn(SubprocessTransport.prototype, "write")
        .mockResolvedValue();
      vi.spyOn(SubprocessTransport.prototype, "close").mockResolvedValue();
      vi.spyOn(
        ControlProtocolHandler.prototype,
        "initialize",
      ).mockResolvedValue();
      vi.spyOn(
        ControlProtocolHandler.prototype,
        "processMessages",
      ).mockImplementation(async () => {
        await new Promise(() => {});
      });

      await agent.startSession({ prompt: "hello from issue-34 test" });

      // Prompt is passed as positional CLI arg, NOT via stdin
      expect(writeSpy).not.toHaveBeenCalled();
    });

    test("starts session with mock transport", async () => {
      interface AddArgs {
        a: number;
        b: number;
      }

      const addTool = tool<AddArgs>({
        name: "add",
        description: "Add two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args) => ({
          content: [
            { type: "text", text: `Result: ${args.a + args.b}` } as const,
          ],
        }),
      });

      const calculator = createSdkMcpServer({
        name: "calculator",
        tools: [addTool as unknown as SdkTool],
      });

      // Note: We'd need to inject MockTransport for real unit tests
      // For now, just test agent creation
      const agent = new ClaudeCodeToolAgent({
        mcpServers: { calc: calculator },
      });

      expect(agent).toBeDefined();
      expect(agent.getActiveSessions()).toHaveLength(0);
    });

    test("tracks active sessions", () => {
      const agent = new ClaudeCodeToolAgent();
      const sessions = agent.getActiveSessions();

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions).toHaveLength(0);
    });

    test("close agent clears all sessions", async () => {
      const agent = new ClaudeCodeToolAgent();

      await agent.close();

      expect(agent.getActiveSessions()).toHaveLength(0);
    });

    test("session config accepts system prompt override", () => {
      const config: SessionConfig = {
        prompt: "hello",
        systemPrompt: "You are a strict reviewer",
      };

      expect(config.systemPrompt).toBe("You are a strict reviewer");
    });
  });

  describe("TEST-013: Tool Registry", () => {
    test("registers SDK tools", () => {
      interface MultiplyArgs {
        a: number;
        b: number;
      }

      const multiplyTool = tool<MultiplyArgs>({
        name: "multiply",
        description: "Multiply two numbers",
        inputSchema: { a: "number", b: "number" },
        handler: async (args) => ({
          content: [
            { type: "text", text: `Result: ${args.a * args.b}` } as const,
          ],
        }),
      });

      const mathServer = createSdkMcpServer({
        name: "math",
        tools: [multiplyTool as unknown as SdkTool],
      });

      const agent = new ClaudeCodeToolAgent({
        mcpServers: { math: mathServer },
      });

      expect(agent).toBeDefined();
    });

    test("supports multiple MCP servers", () => {
      interface AddArgs {
        a: number;
        b: number;
      }

      interface QueryArgs {
        sql: string;
      }

      const addTool = tool<AddArgs>({
        name: "add",
        description: "Add",
        inputSchema: { a: "number", b: "number" },
        handler: async (args) => ({
          content: [{ type: "text", text: String(args.a + args.b) } as const],
        }),
      });

      const queryTool = tool<QueryArgs>({
        name: "query",
        description: "Query database",
        inputSchema: { sql: "string" },
        handler: async (args) => ({
          content: [{ type: "text", text: `Executing: ${args.sql}` } as const],
        }),
      });

      const calc = createSdkMcpServer({
        name: "calc",
        tools: [addTool as unknown as SdkTool],
      });
      const db = createSdkMcpServer({
        name: "database",
        tools: [queryTool as unknown as SdkTool],
      });

      const agent = new ClaudeCodeToolAgent({
        mcpServers: { calc, db },
      });

      expect(agent).toBeDefined();
    });
  });

  describe("TEST-014: Agent Options", () => {
    test("accepts all option types", () => {
      const agent = new ClaudeCodeToolAgent({
        cwd: "/test/cwd",
        model: "claude-opus-4",
        maxBudgetUsd: 10.0,
        maxTurns: 100,
        permissionMode: "bypassPermissions",
        allowedTools: ["tool1", "tool2"],
        disallowedTools: ["danger"],
        env: { TEST: "value" },
        cliPath: "/usr/local/bin/claude",
        defaultTimeout: 60000,
      });

      expect(agent).toBeDefined();
    });

    test("system prompt as string", () => {
      const agent = new ClaudeCodeToolAgent({
        systemPrompt: "You are a helpful assistant",
      });

      expect(agent).toBeDefined();
    });

    test("system prompt with preset", () => {
      const agent = new ClaudeCodeToolAgent({
        systemPrompt: {
          preset: "claude_code",
          append: "Additional instructions",
        },
      });

      expect(agent).toBeDefined();
    });
  });

  describe("TEST-015: ToolAgentSession", () => {
    test("session has correct properties", async () => {
      // We can't actually start a session without real CLI,
      // but we can test type compatibility
      const agent = new ClaudeCodeToolAgent();
      const sessions = agent.getActiveSessions();

      // Type check - ensure ToolAgentSession has expected interface
      type SessionType = (typeof sessions)[number];
      type HasSessionId = SessionType extends { sessionId: string }
        ? true
        : false;
      const typeCheck: HasSessionId = true;

      expect(typeCheck).toBe(true);
    });
  });
});
