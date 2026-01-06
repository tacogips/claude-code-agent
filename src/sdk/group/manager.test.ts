/**
 * Unit tests for GroupManager.
 *
 * @module sdk/group/manager.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { GroupManager } from "./manager";
import { createTestContainer } from "../../container";
import { InMemoryGroupRepository } from "../../repository/in-memory/group-repository";
import { EventEmitter } from "../events/emitter";
import { MockClock } from "../../test/mocks/clock";
import type { GroupSession } from "./types";
import type { GroupCreatedEvent, GroupCompletedEvent } from "./events";

describe("GroupManager", () => {
  let container: ReturnType<typeof createTestContainer>;
  let repository: InMemoryGroupRepository;
  let eventEmitter: EventEmitter;
  let manager: GroupManager;
  let clock: MockClock;

  beforeEach(() => {
    clock = new MockClock();
    container = createTestContainer({ clock });
    repository = new InMemoryGroupRepository();
    eventEmitter = new EventEmitter();
    manager = new GroupManager(container, repository, eventEmitter);
  });

  describe("createGroup", () => {
    test("creates group with generated ID in YYYYMMDD-HHMMSS-slug format", async () => {
      const group = await manager.createGroup({
        name: "Test Group",
        description: "Test description",
      });

      expect(group.id).toMatch(/^\d{8}-\d{6}-.+$/);
      expect(group.name).toBe("Test Group");
      expect(group.description).toBe("Test description");
      expect(group.status).toBe("created");
      expect(group.sessions).toEqual([]);
    });

    test("generates slug from group name", async () => {
      const group = await manager.createGroup({
        name: "My Test Group With Spaces",
      });

      // "my-test-group-with-spaces" -> slice(0, 20) = "my-test-group-with-s"
      expect(group.slug).toBe("my-test-group-with-s");
      expect(group.id).toContain(group.slug);
    });

    test("applies default configuration", async () => {
      const group = await manager.createGroup({
        name: "Test Group",
      });

      expect(group.config.model).toBe("sonnet");
      expect(group.config.maxBudgetUsd).toBe(10.0);
      expect(group.config.maxConcurrentSessions).toBe(3);
    });

    test("merges custom configuration with defaults", async () => {
      const group = await manager.createGroup({
        name: "Test Group",
        config: {
          maxBudgetUsd: 20.0,
          model: "opus",
        },
      });

      expect(group.config.model).toBe("opus");
      expect(group.config.maxBudgetUsd).toBe(20.0);
      expect(group.config.maxConcurrentSessions).toBe(3); // Default
    });

    test("saves group to repository", async () => {
      const group = await manager.createGroup({
        name: "Test Group",
      });

      const retrieved = await repository.findById(group.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(group.id);
    });

    test("emits group_created event", async () => {
      let emittedEvent: GroupCreatedEvent | undefined;
      eventEmitter.on("group_created", (event) => {
        emittedEvent = event;
      });

      const group = await manager.createGroup({
        name: "Test Group",
      });

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent?.type).toBe("group_created");
      expect(emittedEvent?.groupId).toBe(group.id);
      expect(emittedEvent?.name).toBe("Test Group");
      expect(emittedEvent?.totalSessions).toBe(0);
    });

    test("sets timestamps correctly", async () => {
      const group = await manager.createGroup({
        name: "Test Group",
      });

      expect(group.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(group.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(group.createdAt).toBe(group.updatedAt);
      expect(group.startedAt).toBeUndefined();
      expect(group.completedAt).toBeUndefined();
    });
  });

  describe("getGroup", () => {
    test("retrieves existing group by ID", async () => {
      const created = await manager.createGroup({
        name: "Test Group",
      });

      const retrieved = await manager.getGroup(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe("Test Group");
    });

    test("returns null for non-existent group", async () => {
      const retrieved = await manager.getGroup("non-existent");

      expect(retrieved).toBeNull();
    });
  });

  describe("listGroups", () => {
    test("lists all groups when no filter provided", async () => {
      await manager.createGroup({ name: "Group 1" });
      await manager.createGroup({ name: "Group 2" });
      await manager.createGroup({ name: "Group 3" });

      const groups = await manager.listGroups();

      expect(groups).toHaveLength(3);
    });

    test("filters groups by status", async () => {
      const group1 = await manager.createGroup({ name: "Group 1" });
      const group2 = await manager.createGroup({ name: "Group 2" });
      await manager.updateGroup(group2.id, { status: "running" });

      const createdGroups = await manager.listGroups({ status: "created" });
      const runningGroups = await manager.listGroups({ status: "running" });

      expect(createdGroups).toHaveLength(1);
      expect(createdGroups[0]?.id).toBe(group1.id);
      expect(runningGroups).toHaveLength(1);
      expect(runningGroups[0]?.id).toBe(group2.id);
    });

    test("filters groups by name substring", async () => {
      await manager.createGroup({ name: "Auth Refactor" });
      await manager.createGroup({ name: "Database Migration" });
      await manager.createGroup({ name: "Authentication Updates" });

      const authGroups = await manager.listGroups({ nameContains: "auth" });

      expect(authGroups).toHaveLength(2);
    });
  });

  describe("updateGroup", () => {
    test("updates group properties", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const updated = await manager.updateGroup(group.id, {
        name: "Updated Name",
        description: "New description",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("New description");
    });

    test("updates group status", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const updated = await manager.updateGroup(group.id, {
        status: "running",
      });

      expect(updated.status).toBe("running");
    });

    test("updates updatedAt timestamp", async () => {
      const group = await manager.createGroup({ name: "Test Group" });
      const originalUpdatedAt = group.updatedAt;

      // Advance time
      clock.advance(1000);

      const updated = await manager.updateGroup(group.id, {
        name: "New Name",
      });

      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
    });

    test("preserves immutable properties", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const updated = await manager.updateGroup(group.id, {
        name: "Updated Name",
      });

      expect(updated.id).toBe(group.id);
      expect(updated.slug).toBe(group.slug);
      expect(updated.createdAt).toBe(group.createdAt);
    });

    test("throws error for non-existent group", async () => {
      await expect(
        manager.updateGroup("non-existent", { name: "New Name" }),
      ).rejects.toThrow("Group not found");
    });

    test("emits group_completed event when status changes to completed", async () => {
      let emittedEvent: GroupCompletedEvent | undefined;
      eventEmitter.on("group_completed", (event) => {
        emittedEvent = event;
      });

      const group = await manager.createGroup({ name: "Test Group" });

      await manager.updateGroup(group.id, {
        status: "completed",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T01:00:00.000Z",
      });

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent?.type).toBe("group_completed");
      expect(emittedEvent?.groupId).toBe(group.id);
    });
  });

  describe("archiveGroup", () => {
    test("sets group status to archived", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      await manager.archiveGroup(group.id);

      const retrieved = await manager.getGroup(group.id);
      expect(retrieved?.status).toBe("archived");
    });

    test("throws error for non-existent group", async () => {
      await expect(manager.archiveGroup("non-existent")).rejects.toThrow(
        "Group not found",
      );
    });
  });

  describe("deleteGroup", () => {
    test("removes group from repository", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      await manager.deleteGroup(group.id);

      const retrieved = await manager.getGroup(group.id);
      expect(retrieved).toBeNull();
    });

    test("throws error for non-existent group", async () => {
      await expect(manager.deleteGroup("non-existent")).rejects.toThrow(
        "Group not found",
      );
    });
  });

  describe("addSession", () => {
    test("adds session to group", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      const updated = await manager.addSession(group.id, session);

      expect(updated.sessions).toHaveLength(1);
      expect(updated.sessions[0]?.id).toBe("001-session-id");
      expect(updated.sessions[0]?.projectPath).toBe("/path/to/project");
    });

    test("appends to existing sessions", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session1: GroupSession = {
        id: "001-session-1",
        projectPath: "/path/1",
        prompt: "Prompt 1",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      const session2: GroupSession = {
        id: "002-session-2",
        projectPath: "/path/2",
        prompt: "Prompt 2",
        status: "pending",
        dependsOn: ["001-session-1"],
        createdAt: new Date().toISOString(),
      };

      await manager.addSession(group.id, session1);
      const updated = await manager.addSession(group.id, session2);

      expect(updated.sessions).toHaveLength(2);
      expect(updated.sessions[0]?.id).toBe("001-session-1");
      expect(updated.sessions[1]?.id).toBe("002-session-2");
    });

    test("updates updatedAt timestamp", async () => {
      const group = await manager.createGroup({ name: "Test Group" });
      const originalUpdatedAt = group.updatedAt;

      clock.advance(1000);

      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      const updated = await manager.addSession(group.id, session);

      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
    });

    test("throws error for non-existent group", async () => {
      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      await expect(manager.addSession("non-existent", session)).rejects.toThrow(
        "Group not found",
      );
    });
  });

  describe("removeSession", () => {
    test("removes session from group", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      await manager.addSession(group.id, session);
      const updated = await manager.removeSession(group.id, "001-session-id");

      expect(updated.sessions).toHaveLength(0);
    });

    test("removes only specified session", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session1: GroupSession = {
        id: "001-session-1",
        projectPath: "/path/1",
        prompt: "Prompt 1",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      const session2: GroupSession = {
        id: "002-session-2",
        projectPath: "/path/2",
        prompt: "Prompt 2",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      await manager.addSession(group.id, session1);
      await manager.addSession(group.id, session2);
      const updated = await manager.removeSession(group.id, "001-session-1");

      expect(updated.sessions).toHaveLength(1);
      expect(updated.sessions[0]?.id).toBe("002-session-2");
    });

    test("throws error for non-existent group", async () => {
      await expect(
        manager.removeSession("non-existent", "001-session-id"),
      ).rejects.toThrow("Group not found");
    });

    test("throws error for non-existent session", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      await expect(
        manager.removeSession(group.id, "non-existent"),
      ).rejects.toThrow("Session not found in group");
    });
  });

  describe("updateSession", () => {
    test("updates session properties", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      await manager.addSession(group.id, session);

      const updated = await manager.updateSession(group.id, "001-session-id", {
        status: "active",
        startedAt: new Date().toISOString(),
      });

      expect(updated.status).toBe("active");
      expect(updated.startedAt).toBeDefined();
    });

    test("emits group_session_started event when status changes to running", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "pending",
        dependsOn: [],
        createdAt: new Date().toISOString(),
      };

      await manager.addSession(group.id, session);

      let eventEmitted = false;
      eventEmitter.on("group_session_started", () => {
        eventEmitted = true;
      });

      await manager.updateSession(group.id, "001-session-id", {
        status: "active",
      });

      expect(eventEmitted).toBe(true);
    });

    test("emits group_session_completed event when status changes to completed", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      const session: GroupSession = {
        id: "001-session-id",
        projectPath: "/path/to/project",
        prompt: "Test prompt",
        status: "active",
        dependsOn: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };

      await manager.addSession(group.id, session);

      let eventEmitted = false;
      eventEmitter.on("group_session_completed", () => {
        eventEmitted = true;
      });

      await manager.updateSession(group.id, "001-session-id", {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      expect(eventEmitted).toBe(true);
    });

    test("throws error for non-existent group", async () => {
      await expect(
        manager.updateSession("non-existent", "001-session-id", {
          status: "active",
        }),
      ).rejects.toThrow("Group or session not found");
    });

    test("throws error for non-existent session", async () => {
      const group = await manager.createGroup({ name: "Test Group" });

      await expect(
        manager.updateSession(group.id, "non-existent", {
          status: "active",
        }),
      ).rejects.toThrow("Group or session not found");
    });
  });

  describe("ID generation", () => {
    test("generates unique IDs for multiple groups", async () => {
      const group1 = await manager.createGroup({ name: "Group 1" });
      const group2 = await manager.createGroup({ name: "Group 2" });

      expect(group1.id).not.toBe(group2.id);
    });

    test("ID format matches YYYYMMDD-HHMMSS-slug", async () => {
      const group = await manager.createGroup({
        name: "Test Group",
      });

      // Format: YYYYMMDD-HHMMSS-slug
      const pattern = /^(\d{8})-(\d{6})-(.+)$/;
      const match = group.id.match(pattern);

      expect(match).not.toBeNull();
      expect(match?.[1]).toMatch(/^\d{8}$/); // YYYYMMDD
      expect(match?.[2]).toMatch(/^\d{6}$/); // HHMMSS
      expect(match?.[3]).toBe("test-group"); // slug
    });
  });

  describe("slug generation", () => {
    test("converts to lowercase", async () => {
      const group = await manager.createGroup({
        name: "UPPERCASE NAME",
      });

      expect(group.slug).toBe("uppercase-name");
    });

    test("replaces spaces with hyphens", async () => {
      const group = await manager.createGroup({
        name: "name with spaces",
      });

      expect(group.slug).toBe("name-with-spaces");
    });

    test("removes special characters", async () => {
      const group = await manager.createGroup({
        name: "name@with#special$chars!",
      });

      expect(group.slug).toBe("name-with-special-ch");
    });

    test("truncates to 20 characters", async () => {
      const group = await manager.createGroup({
        name: "this is a very long name that should be truncated",
      });

      expect(group.slug.length).toBeLessThanOrEqual(20);
      expect(group.slug).toBe("this-is-a-very-long");
    });

    test("removes leading and trailing hyphens", async () => {
      const group = await manager.createGroup({
        name: "---name---",
      });

      expect(group.slug).toBe("name");
    });
  });
});
