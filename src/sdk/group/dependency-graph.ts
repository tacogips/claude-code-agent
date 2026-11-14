/**
 * Dependency graph for managing session execution order.
 *
 * Provides topological sorting, cycle detection, and dependency tracking
 * for concurrent session execution in Session Groups.
 *
 * @module sdk/group/dependency-graph
 */

import type { GroupSession } from "../../repository/group-repository";
import { CircularDependencyError } from "../../errors";

/**
 * Session with dependency tracking information.
 */
interface SessionNode {
  readonly session: GroupSession;
  /** IDs of sessions this session depends on */
  readonly dependencies: ReadonlySet<string>;
  /** IDs of sessions that depend on this session */
  readonly dependents: ReadonlySet<string>;
}

/**
 * Blocked session information.
 */
export interface BlockedSession {
  readonly session: GroupSession;
  readonly waitingOn: readonly string[];
}

/**
 * Dependency graph for determining session execution order.
 *
 * Manages session dependencies, tracks completed/failed sessions,
 * and determines which sessions are ready to execute.
 */
export class DependencyGraph {
  private readonly nodes: Map<string, SessionNode>;
  private readonly completed: Set<string>;
  private readonly failed: Set<string>;

  /**
   * Create a dependency graph from sessions.
   *
   * @param sessions - Sessions to include in the graph
   * @throws {CircularDependencyError} If a circular dependency is detected
   */
  constructor(sessions: readonly GroupSession[]) {
    this.nodes = new Map();
    this.completed = new Set();
    this.failed = new Set();

    // Build graph nodes
    this.buildGraph(sessions);

    // Detect cycles
    if (this.hasCycles()) {
      const cycle = this.findCycle();
      throw new CircularDependencyError(cycle);
    }
  }

  /**
   * Build the dependency graph from sessions.
   */
  private buildGraph(sessions: readonly GroupSession[]): void {
    // First pass: create all nodes
    for (const session of sessions) {
      const dependencies = new Set(session.dependsOn);
      const dependents = new Set<string>();

      this.nodes.set(session.id, {
        session,
        dependencies,
        dependents,
      });
    }

    // Second pass: populate dependents
    for (const session of sessions) {
      for (const depId of session.dependsOn) {
        const depNode = this.nodes.get(depId);
        if (depNode !== undefined) {
          const updatedDependents = new Set(depNode.dependents);
          updatedDependents.add(session.id);
          this.nodes.set(depId, {
            ...depNode,
            dependents: updatedDependents,
          });
        }
      }
    }
  }

  /**
   * Check if the graph contains cycles.
   *
   * Uses DFS to detect back edges which indicate cycles.
   *
   * @returns True if cycles exist
   */
  hasCycles(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleFrom = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node === undefined) {
        return false;
      }

      for (const depId of Array.from(node.dependencies)) {
        if (!visited.has(depId)) {
          if (hasCycleFrom(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          // Back edge found - cycle detected
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        if (hasCycleFrom(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find a cycle in the graph.
   *
   * Used for error reporting when a cycle is detected.
   *
   * @returns Array of session IDs forming a cycle
   */
  private findCycle(): readonly string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const findCycleFrom = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node === undefined) {
        return false;
      }

      for (const depId of Array.from(node.dependencies)) {
        if (!visited.has(depId)) {
          if (findCycleFrom(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          // Found cycle - path contains the cycle
          return true;
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        if (findCycleFrom(nodeId)) {
          return path;
        }
      }
    }

    return [];
  }

  /**
   * Get sessions that are ready to execute.
   *
   * A session is ready if:
   * - It is in "pending" status
   * - All its dependencies are completed
   * - None of its dependencies have failed
   *
   * @returns Array of sessions ready to execute
   */
  getReadySessions(): readonly GroupSession[] {
    const ready: GroupSession[] = [];

    for (const node of Array.from(this.nodes.values())) {
      // Skip if already completed or failed in the graph
      if (
        this.completed.has(node.session.id) ||
        this.failed.has(node.session.id)
      ) {
        continue;
      }

      // Only pending sessions can be ready
      if (node.session.status !== "pending") {
        continue;
      }

      // Check if any dependency has failed
      const hasFailedDependency = Array.from(node.dependencies).some((depId) =>
        this.failed.has(depId),
      );

      if (hasFailedDependency) {
        continue;
      }

      // Check if all dependencies are completed
      const allDependenciesCompleted = Array.from(node.dependencies).every(
        (depId) => this.completed.has(depId),
      );

      if (allDependenciesCompleted) {
        ready.push(node.session);
      }
    }

    return ready;
  }

  /**
   * Mark a session as completed.
   *
   * Updates the graph state to reflect that the session
   * has successfully completed.
   *
   * @param sessionId - ID of the completed session
   */
  markCompleted(sessionId: string): void {
    this.completed.add(sessionId);
    this.failed.delete(sessionId);
  }

  /**
   * Mark a session as failed.
   *
   * Updates the graph state to reflect that the session
   * has failed. This will block any sessions that depend on it.
   *
   * @param sessionId - ID of the failed session
   */
  markFailed(sessionId: string): void {
    this.failed.add(sessionId);
    this.completed.delete(sessionId);
  }

  /**
   * Get the number of remaining sessions.
   *
   * Counts sessions that are not completed or failed.
   *
   * @returns Number of remaining sessions
   */
  getRemainingCount(): number {
    let count = 0;
    for (const node of Array.from(this.nodes.values())) {
      if (
        !this.completed.has(node.session.id) &&
        !this.failed.has(node.session.id)
      ) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get blocked sessions and what they are waiting on.
   *
   * A session is blocked if it is pending but has unsatisfied dependencies.
   *
   * @returns Array of blocked sessions with their blocking dependencies
   */
  getBlockedSessions(): readonly BlockedSession[] {
    const blocked: BlockedSession[] = [];

    for (const node of Array.from(this.nodes.values())) {
      // Skip if already completed or failed in the graph
      if (
        this.completed.has(node.session.id) ||
        this.failed.has(node.session.id)
      ) {
        continue;
      }

      // Only pending sessions can be blocked
      if (node.session.status !== "pending") {
        continue;
      }

      const waitingOn: string[] = [];

      for (const depId of Array.from(node.dependencies)) {
        if (!this.completed.has(depId)) {
          waitingOn.push(depId);
        }
      }

      if (waitingOn.length > 0) {
        blocked.push({
          session: node.session,
          waitingOn,
        });
      }
    }

    return blocked;
  }

  /**
   * Get all completed session IDs.
   *
   * @returns Set of completed session IDs
   */
  getCompleted(): ReadonlySet<string> {
    return this.completed;
  }

  /**
   * Get all failed session IDs.
   *
   * @returns Set of failed session IDs
   */
  getFailed(): ReadonlySet<string> {
    return this.failed;
  }
}
