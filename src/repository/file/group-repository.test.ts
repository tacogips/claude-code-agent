/**
 * Tests for FileGroupRepository.
 *
 * @module repository/file/group-repository.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { FileGroupRepository } from "./group-repository";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockClock } from "../../test/mocks/clock";
import type { SessionGroup, GroupSession } from "../group-repository";
import * as path from "node:path";
import * as os from "node:os";

describe("FileGroupRepository", () => {
  let fs: MockFileSystem;
  let clock: MockClock;
  let repo: FileGroupRepository;
  let baseDir: string;

  beforeEach(() => {
    fs = new MockFileSystem();
    clock = new MockClock();
    repo = new FileGroupRepository(fs, clock);
    baseDir = path.join(
      os.homedir(),
      ".local",
      "claude-code-agent",
      "session-groups",
    );
  });

  const createTestSession = (
    overrides?: Partial<GroupSession>,
  ): GroupSession => ({
    id: "gs-1",
    projectPath: "/project",
    prompt: "Test prompt",
    dependsOn: [],
    status: "paused",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  const createTestGroup = (
    overrides?: Partial<SessionGroup>,
  ): SessionGroup => ({
    id: "group-1",
    name: "Test Group",
    slug: "test-group",
    status: "created",
    sessions: [createTestSession()],
    config: {
      model: "sonnet",
      maxBudgetUsd: 10.0,
      maxConcurrentSessions: 3,
      onBudgetExceeded: "pause",
      warningThreshold: 0.8,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  describe("save and findById", () => {
    test("saves and retrieves a group", async () => {
      const group = createTestGroup();
      await repo.save(group);

      const found = await repo.findById("group-1");
      expect(found).toEqual(group);
    });

    test("creates directory structure on save", async () => {
      const group = createTestGroup({ id: "test-group" });
      await repo.save(group);

      const groupDir = path.join(baseDir, "test-group");
      const metaPath = path.join(groupDir, "meta.json");

      expect(await fs.exists(groupDir)).toBe(true);
      expect(await fs.exists(metaPath)).toBe(true);
    });

    test("returns null for non-existent group", async () => {
      const found = await repo.findById("non-existent");
      expect(found).toBeNull();
    });

    test("updates existing group on save", async () => {
      const group = createTestGroup();
      await repo.save(group);

      const updated = { ...group, status: "running" as const };
      await repo.save(updated);

      const found = await repo.findById("group-1");
      expect(found?.status).toBe("running");
    });

    test("handles JSON parse errors gracefully", async () => {
      // Write invalid JSON to meta.json
      const metaPath = path.join(baseDir, "bad-group", "meta.json");
      await fs.mkdir(path.dirname(metaPath), { recursive: true });
      await fs.writeFile(metaPath, "{ invalid json }");

      const found = await repo.findById("bad-group");
      expect(found).toBeNull();
    });
  });

  describe("delete", () => {
    test("deletes existing group", async () => {
      const group = createTestGroup();
      await repo.save(group);

      const deleted = await repo.delete("group-1");
      expect(deleted).toBe(true);

      const found = await repo.findById("group-1");
      expect(found).toBeNull();
    });

    test("returns false for non-existent group", async () => {
      const deleted = await repo.delete("non-existent");
      expect(deleted).toBe(false);
    });

    test("removes entire group directory", async () => {
      const group = createTestGroup({ id: "test-group" });
      await repo.save(group);

      await repo.delete("test-group");

      const groupDir = path.join(baseDir, "test-group");
      expect(await fs.exists(groupDir)).toBe(false);
    });
  });

  describe("findByStatus", () => {
    test("finds all groups with a status", async () => {
      await repo.save(createTestGroup({ id: "g1", status: "created" }));
      await repo.save(createTestGroup({ id: "g2", status: "running" }));
      await repo.save(createTestGroup({ id: "g3", status: "created" }));

      const groups = await repo.findByStatus("created");
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.id)).toEqual(
        expect.arrayContaining(["g1", "g3"]),
      );
    });

    test("returns empty array for status with no groups", async () => {
      const groups = await repo.findByStatus("completed");
      expect(groups).toEqual([]);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await repo.save(
        createTestGroup({
          id: "g1",
          name: "Alpha",
          status: "created",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        }),
      );
      await repo.save(
        createTestGroup({
          id: "g2",
          name: "Beta",
          status: "running",
          createdAt: "2026-01-02T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        }),
      );
      await repo.save(
        createTestGroup({
          id: "g3",
          name: "Gamma",
          status: "created",
          createdAt: "2026-01-03T00:00:00Z",
          updatedAt: "2026-01-03T00:00:00Z",
        }),
      );
    });

    test("lists all groups without filter", async () => {
      const groups = await repo.list();
      expect(groups).toHaveLength(3);
    });

    test("returns empty array when base directory doesn't exist", async () => {
      const emptyFs = new MockFileSystem();
      const emptyClock = new MockClock();
      const emptyRepo = new FileGroupRepository(emptyFs, emptyClock);

      const groups = await emptyRepo.list();
      expect(groups).toEqual([]);
    });

    test("filters by status", async () => {
      const groups = await repo.list({ status: "created" });
      expect(groups).toHaveLength(2);
      expect(groups.every((g) => g.status === "created")).toBe(true);
    });

    test("filters by nameContains", async () => {
      const groups = await repo.list({ nameContains: "beta" });
      expect(groups).toHaveLength(1);
      expect(groups[0]?.name).toBe("Beta");
    });

    test("filters by since date", async () => {
      const groups = await repo.list({
        since: new Date("2026-01-02T00:00:00Z"),
      });
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.id)).toEqual(
        expect.arrayContaining(["g2", "g3"]),
      );
    });

    test("applies limit", async () => {
      const groups = await repo.list({ limit: 2 });
      expect(groups).toHaveLength(2);
    });

    test("applies offset", async () => {
      const groups = await repo.list({ offset: 1 });
      expect(groups).toHaveLength(2);
    });

    test("sorts by name ascending", async () => {
      const groups = await repo.list({}, { field: "name", direction: "asc" });
      expect(groups.map((g) => g.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    });

    test("sorts by name descending", async () => {
      const groups = await repo.list({}, { field: "name", direction: "desc" });
      expect(groups.map((g) => g.name)).toEqual(["Gamma", "Beta", "Alpha"]);
    });

    test("sorts by createdAt", async () => {
      const groups = await repo.list(
        {},
        { field: "createdAt", direction: "asc" },
      );
      expect(groups.map((g) => g.id)).toEqual(["g1", "g2", "g3"]);
    });

    test("sorts by updatedAt", async () => {
      const groups = await repo.list(
        {},
        { field: "updatedAt", direction: "desc" },
      );
      expect(groups.map((g) => g.id)).toEqual(["g3", "g2", "g1"]);
    });

    test("skips invalid group files", async () => {
      // Create an invalid meta.json
      const badMetaPath = path.join(baseDir, "bad-group", "meta.json");
      await fs.mkdir(path.dirname(badMetaPath), { recursive: true });
      await fs.writeFile(badMetaPath, "invalid json");

      const groups = await repo.list();
      // Should only have the 3 valid groups, skipping bad-group
      expect(groups).toHaveLength(3);
    });
  });

  describe("updateSession", () => {
    test("updates a session within a group", async () => {
      const group = createTestGroup({
        sessions: [
          createTestSession({ id: "s1", status: "paused" }),
          createTestSession({ id: "s2", status: "paused" }),
        ],
      });
      await repo.save(group);

      const updated = await repo.updateSession("group-1", "s1", {
        status: "active",
        claudeSessionId: "claude-123",
      });
      expect(updated).toBe(true);

      const found = await repo.findById("group-1");
      const session1 = found?.sessions.find((s) => s.id === "s1");
      expect(session1?.status).toBe("active");
      expect(session1?.claudeSessionId).toBe("claude-123");

      // Other session unchanged
      const session2 = found?.sessions.find((s) => s.id === "s2");
      expect(session2?.status).toBe("paused");
    });

    test("returns false for non-existent group", async () => {
      const updated = await repo.updateSession("non-existent", "s1", {
        status: "active",
      });
      expect(updated).toBe(false);
    });

    test("returns false for non-existent session", async () => {
      const group = createTestGroup();
      await repo.save(group);

      const updated = await repo.updateSession("group-1", "non-existent", {
        status: "active",
      });
      expect(updated).toBe(false);
    });

    test("updates group updatedAt timestamp", async () => {
      const group = createTestGroup({
        sessions: [createTestSession({ id: "s1" })],
        updatedAt: "2026-01-01T00:00:00Z",
      });
      await repo.save(group);

      await repo.updateSession("group-1", "s1", { status: "active" });

      const found = await repo.findById("group-1");
      expect(found?.updatedAt).not.toBe("2026-01-01T00:00:00Z");
    });

    test("persists changes to filesystem", async () => {
      const group = createTestGroup({
        sessions: [createTestSession({ id: "s1", status: "paused" })],
      });
      await repo.save(group);

      await repo.updateSession("group-1", "s1", { status: "completed" });

      // Create new repo instance to verify persistence
      const newRepo = new FileGroupRepository(fs, clock);
      const found = await newRepo.findById("group-1");
      const session = found?.sessions.find((s) => s.id === "s1");
      expect(session?.status).toBe("completed");
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await repo.save(createTestGroup({ id: "g1", status: "created" }));
      await repo.save(createTestGroup({ id: "g2", status: "running" }));
      await repo.save(createTestGroup({ id: "g3", status: "created" }));
    });

    test("counts all groups without filter", async () => {
      const count = await repo.count();
      expect(count).toBe(3);
    });

    test("counts filtered groups", async () => {
      const count = await repo.count({ status: "created" });
      expect(count).toBe(2);
    });
  });

  describe("filesystem integration", () => {
    test("creates recursive directory structure", async () => {
      const group = createTestGroup({ id: "deep-test" });
      await repo.save(group);

      const groupDir = path.join(baseDir, "deep-test");
      const stat = await fs.stat(groupDir);
      expect(stat.isDirectory).toBe(true);
    });

    test("stores JSON with proper formatting", async () => {
      const group = createTestGroup({ id: "format-test" });
      await repo.save(group);

      const metaPath = path.join(baseDir, "format-test", "meta.json");
      const content = await fs.readFile(metaPath);

      // Should be pretty-printed with 2-space indentation
      expect(content).toContain("\n");
      expect(content).toContain("  ");

      // Should be valid JSON
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(group);
    });
  });
});
