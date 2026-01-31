/**
 * Tests for DependencyGraph.
 */

import { describe, test, expect } from "vitest";
import { DependencyGraph } from "./dependency-graph";
import type { GroupSession } from "../../repository/group-repository";
import { CircularDependencyError } from "../../errors";

/**
 * Helper to create a test session.
 */
function createSession(
  id: string,
  dependsOn: readonly string[] = [],
  status: GroupSession["status"] = "pending",
): GroupSession {
  return {
    id,
    projectPath: `/project/${id}`,
    prompt: `Prompt for ${id}`,
    dependsOn,
    status,
    createdAt: new Date().toISOString(),
    cost: undefined,
    tokens: undefined,
    startedAt: undefined,
    completedAt: undefined,
    claudeSessionId: undefined,
    template: undefined,
  };
}

describe("DependencyGraph", () => {
  describe("constructor", () => {
    test("creates graph from sessions with no dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3"),
      ];

      const graph = new DependencyGraph(sessions);

      expect(graph.getRemainingCount()).toBe(3);
      expect(graph.getCompleted().size).toBe(0);
      expect(graph.getFailed().size).toBe(0);
    });

    test("creates graph with linear dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s2"]),
      ];

      const graph = new DependencyGraph(sessions);

      expect(graph.getRemainingCount()).toBe(3);
    });

    test("creates graph with diamond dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
        createSession("s4", ["s2", "s3"]),
      ];

      const graph = new DependencyGraph(sessions);

      expect(graph.getRemainingCount()).toBe(4);
    });

    test("throws CircularDependencyError for self-dependency", () => {
      const sessions = [createSession("s1", ["s1"])];

      expect(() => new DependencyGraph(sessions)).toThrow(
        CircularDependencyError,
      );
    });

    test("throws CircularDependencyError for two-node cycle", () => {
      const sessions = [
        createSession("s1", ["s2"]),
        createSession("s2", ["s1"]),
      ];

      expect(() => new DependencyGraph(sessions)).toThrow(
        CircularDependencyError,
      );
    });

    test("throws CircularDependencyError for three-node cycle", () => {
      const sessions = [
        createSession("s1", ["s3"]),
        createSession("s2", ["s1"]),
        createSession("s3", ["s2"]),
      ];

      expect(() => new DependencyGraph(sessions)).toThrow(
        CircularDependencyError,
      );
    });
  });

  describe("hasCycles", () => {
    test("returns false for acyclic graph", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s2"]),
      ];

      const graph = new DependencyGraph(sessions);

      expect(graph.hasCycles()).toBe(false);
    });

    test("returns false for empty graph", () => {
      const graph = new DependencyGraph([]);

      expect(graph.hasCycles()).toBe(false);
    });
  });

  describe("getReadySessions", () => {
    test("returns all sessions when none have dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3"),
      ];

      const graph = new DependencyGraph(sessions);
      const ready = graph.getReadySessions();

      expect(ready).toHaveLength(3);
      expect(ready.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s1", "s2", "s3"]),
      );
    });

    test("returns only root sessions for linear dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s2"]),
      ];

      const graph = new DependencyGraph(sessions);
      const ready = graph.getReadySessions();

      expect(ready).toHaveLength(1);
      expect(ready[0]?.id).toBe("s1");
    });

    test("returns both branches of diamond dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
        createSession("s4", ["s2", "s3"]),
      ];

      const graph = new DependencyGraph(sessions);
      const ready = graph.getReadySessions();

      expect(ready).toHaveLength(1);
      expect(ready[0]?.id).toBe("s1");
    });

    test("returns next level after marking dependency completed", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
      ];

      const graph = new DependencyGraph(sessions);
      graph.markCompleted("s1");

      const ready = graph.getReadySessions();

      expect(ready).toHaveLength(2);
      expect(ready.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s2", "s3"]),
      );
    });

    test("excludes sessions with failed dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
      ];

      const graph = new DependencyGraph(sessions);
      graph.markFailed("s1");

      const ready = graph.getReadySessions();

      expect(ready).toHaveLength(0);
    });

    test("only returns sessions with all dependencies completed", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3", ["s1", "s2"]),
      ];

      const graph = new DependencyGraph(sessions);
      graph.markCompleted("s1");

      let ready = graph.getReadySessions();
      expect(ready.map((s) => s.id)).toEqual(expect.arrayContaining(["s2"]));
      expect(ready.map((s) => s.id)).not.toContain("s3");

      graph.markCompleted("s2");
      ready = graph.getReadySessions();
      expect(ready.map((s) => s.id)).toContain("s3");
    });

    test("excludes non-pending sessions", () => {
      const sessions = [
        createSession("s1", [], "active"),
        createSession("s2", [], "completed"),
        createSession("s3", [], "failed"),
        createSession("s4", [], "pending"),
      ];

      const graph = new DependencyGraph(sessions);
      const ready = graph.getReadySessions();

      expect(ready).toHaveLength(1);
      expect(ready[0]?.id).toBe("s4");
    });
  });

  describe("markCompleted", () => {
    test("adds session to completed set", () => {
      const sessions = [createSession("s1")];
      const graph = new DependencyGraph(sessions);

      graph.markCompleted("s1");

      expect(graph.getCompleted().has("s1")).toBe(true);
      expect(graph.getFailed().has("s1")).toBe(false);
    });

    test("removes session from failed set if present", () => {
      const sessions = [createSession("s1")];
      const graph = new DependencyGraph(sessions);

      graph.markFailed("s1");
      graph.markCompleted("s1");

      expect(graph.getCompleted().has("s1")).toBe(true);
      expect(graph.getFailed().has("s1")).toBe(false);
    });

    test("decreases remaining count", () => {
      const sessions = [createSession("s1"), createSession("s2")];
      const graph = new DependencyGraph(sessions);

      expect(graph.getRemainingCount()).toBe(2);

      graph.markCompleted("s1");
      expect(graph.getRemainingCount()).toBe(1);

      graph.markCompleted("s2");
      expect(graph.getRemainingCount()).toBe(0);
    });
  });

  describe("markFailed", () => {
    test("adds session to failed set", () => {
      const sessions = [createSession("s1")];
      const graph = new DependencyGraph(sessions);

      graph.markFailed("s1");

      expect(graph.getFailed().has("s1")).toBe(true);
      expect(graph.getCompleted().has("s1")).toBe(false);
    });

    test("removes session from completed set if present", () => {
      const sessions = [createSession("s1")];
      const graph = new DependencyGraph(sessions);

      graph.markCompleted("s1");
      graph.markFailed("s1");

      expect(graph.getFailed().has("s1")).toBe(true);
      expect(graph.getCompleted().has("s1")).toBe(false);
    });

    test("blocks dependent sessions", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
      ];

      const graph = new DependencyGraph(sessions);
      graph.markFailed("s1");

      const ready = graph.getReadySessions();
      expect(ready).toHaveLength(0);
    });
  });

  describe("getRemainingCount", () => {
    test("returns total count initially", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3"),
      ];
      const graph = new DependencyGraph(sessions);

      expect(graph.getRemainingCount()).toBe(3);
    });

    test("decreases as sessions complete", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3"),
      ];
      const graph = new DependencyGraph(sessions);

      graph.markCompleted("s1");
      expect(graph.getRemainingCount()).toBe(2);

      graph.markCompleted("s2");
      expect(graph.getRemainingCount()).toBe(1);

      graph.markCompleted("s3");
      expect(graph.getRemainingCount()).toBe(0);
    });

    test("decreases as sessions fail", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3"),
      ];
      const graph = new DependencyGraph(sessions);

      graph.markFailed("s1");
      expect(graph.getRemainingCount()).toBe(2);

      graph.markFailed("s2");
      expect(graph.getRemainingCount()).toBe(1);
    });

    test("returns 0 for empty graph", () => {
      const graph = new DependencyGraph([]);

      expect(graph.getRemainingCount()).toBe(0);
    });
  });

  describe("getBlockedSessions", () => {
    test("returns empty array when no sessions are blocked", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3"),
      ];
      const graph = new DependencyGraph(sessions);

      const blocked = graph.getBlockedSessions();

      expect(blocked).toHaveLength(0);
    });

    test("returns sessions waiting on incomplete dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
      ];
      const graph = new DependencyGraph(sessions);

      const blocked = graph.getBlockedSessions();

      expect(blocked).toHaveLength(2);
      expect(blocked.map((b) => b.session.id)).toEqual(
        expect.arrayContaining(["s2", "s3"]),
      );
      expect(blocked[0]?.waitingOn).toEqual(["s1"]);
    });

    test("excludes sessions after dependencies complete", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"]),
        createSession("s3", ["s1"]),
      ];
      const graph = new DependencyGraph(sessions);

      graph.markCompleted("s1");
      const blocked = graph.getBlockedSessions();

      expect(blocked).toHaveLength(0);
    });

    test("shows multiple blocking dependencies", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3", ["s1", "s2"]),
      ];
      const graph = new DependencyGraph(sessions);

      const blocked = graph.getBlockedSessions();

      expect(blocked).toHaveLength(1);
      expect(blocked[0]?.session.id).toBe("s3");
      expect(blocked[0]?.waitingOn).toEqual(
        expect.arrayContaining(["s1", "s2"]),
      );
    });

    test("excludes non-pending sessions from blocked list", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1"], "active"),
        createSession("s3", ["s1"], "completed"),
        createSession("s4", ["s1"], "pending"),
      ];
      const graph = new DependencyGraph(sessions);

      const blocked = graph.getBlockedSessions();

      expect(blocked).toHaveLength(1);
      expect(blocked[0]?.session.id).toBe("s4");
    });
  });

  describe("complex scenarios", () => {
    test("handles large dependency graph", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3", ["s1"]),
        createSession("s4", ["s1"]),
        createSession("s5", ["s2"]),
        createSession("s6", ["s3", "s4"]),
        createSession("s7", ["s5", "s6"]),
      ];

      const graph = new DependencyGraph(sessions);

      // Initially, only s1 and s2 are ready
      let ready = graph.getReadySessions();
      expect(ready.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s1", "s2"]),
      );

      // Complete s1
      graph.markCompleted("s1");
      ready = graph.getReadySessions();
      expect(ready.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s2", "s3", "s4"]),
      );

      // Complete s2, s3, s4
      graph.markCompleted("s2");
      graph.markCompleted("s3");
      graph.markCompleted("s4");
      ready = graph.getReadySessions();
      expect(ready.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s5", "s6"]),
      );

      // Complete s5, s6
      graph.markCompleted("s5");
      graph.markCompleted("s6");
      ready = graph.getReadySessions();
      expect(ready).toHaveLength(1);
      expect(ready[0]?.id).toBe("s7");

      // Complete s7
      graph.markCompleted("s7");
      expect(graph.getRemainingCount()).toBe(0);
    });

    test("handles partial failure in dependency chain", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2"),
        createSession("s3", ["s1"]),
        createSession("s4", ["s2"]),
        createSession("s5", ["s3", "s4"]),
      ];

      const graph = new DependencyGraph(sessions);

      // Fail s1
      graph.markFailed("s1");

      // Only s2 should be ready (s4 depends on s2)
      const ready = graph.getReadySessions();
      expect(ready.map((s) => s.id)).toEqual(["s2"]);

      // s3 and s5 should be blocked
      const blocked = graph.getBlockedSessions();
      expect(blocked.map((b) => b.session.id)).toEqual(
        expect.arrayContaining(["s3"]),
      );

      // Complete s2 and s4
      graph.markCompleted("s2");
      graph.markCompleted("s4");

      // s5 should still be blocked because s3 depends on failed s1
      const readyAfter = graph.getReadySessions();
      expect(readyAfter).toHaveLength(0);
    });

    test("handles missing dependency gracefully", () => {
      const sessions = [
        createSession("s1"),
        createSession("s2", ["s1", "s-missing"]),
      ];

      const graph = new DependencyGraph(sessions);

      // s2 waits for both s1 and s-missing
      const blocked = graph.getBlockedSessions();
      expect(blocked).toHaveLength(1);
      expect(blocked[0]?.waitingOn).toEqual(
        expect.arrayContaining(["s1", "s-missing"]),
      );

      // Even after completing s1, s2 still waits for s-missing
      graph.markCompleted("s1");
      const ready = graph.getReadySessions();
      expect(ready).toHaveLength(0);

      // Manually completing s-missing unblocks s2
      graph.markCompleted("s-missing");
      const readyAfter = graph.getReadySessions();
      expect(readyAfter).toHaveLength(1);
      expect(readyAfter[0]?.id).toBe("s2");
    });
  });
});
