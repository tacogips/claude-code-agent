/**
 * Update methods for Group Runner.
 *
 * Provides methods for updating group and session states in repository,
 * and emitting related events.
 *
 * @module sdk/group/runner-updaters
 */

import type { Container } from "../../container";
import type {
  GroupRepository,
  GroupSession,
} from "../../repository/group-repository";
import type { EventEmitter } from "../events/emitter";
import type { SessionGroup } from "./types";
import { DependencyGraph } from "./dependency-graph";
import {
  ProgressAggregator,
  createSessionProgress,
} from "./progress";

/**
 * Group and Session Updater for managing repository updates and events.
 *
 * Encapsulates all group and session update operations with event emission.
 */
export class GroupUpdater {
  private readonly container: Container;
  private readonly repository: GroupRepository;
  private readonly eventEmitter: EventEmitter;

  /**
   * Create a new GroupUpdater.
   *
   * @param container - Dependency injection container
   * @param repository - Group repository for data access
   * @param eventEmitter - Event emitter for group events
   */
  constructor(
    container: Container,
    repository: GroupRepository,
    eventEmitter: EventEmitter,
  ) {
    this.container = container;
    this.repository = repository;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Update group status in repository.
   *
   * @param currentGroup - Current group reference (will be updated in-place)
   * @param status - New group status
   * @param updates - Additional fields to update
   * @returns Updated group
   */
  async updateGroupStatus(
    currentGroup: SessionGroup | null,
    status: SessionGroup["status"],
    updates?: Partial<SessionGroup>,
  ): Promise<SessionGroup | null> {
    if (currentGroup === null) {
      return null;
    }

    const timestamp = this.container.clock.now().toISOString();
    const updated: SessionGroup = {
      ...currentGroup,
      ...updates,
      status,
      updatedAt: timestamp,
    };

    await this.repository.save(updated);
    return updated;
  }

  /**
   * Update session status in repository.
   *
   * @param currentGroup - Current group reference (will be updated in-place)
   * @param progressAggregator - Progress aggregator to update
   * @param sessionId - Session ID to update
   * @param status - New session status
   * @param updates - Additional fields to update
   * @returns Updated group with modified session
   */
  async updateSessionStatus(
    currentGroup: SessionGroup | null,
    progressAggregator: ProgressAggregator | null,
    sessionId: string,
    status: GroupSession["status"],
    updates?: Partial<GroupSession>,
  ): Promise<SessionGroup | null> {
    if (currentGroup === null) {
      return null;
    }

    await this.repository.updateSession(currentGroup.id, sessionId, {
      ...updates,
      status,
    });

    // Update local copy
    const sessionIndex = currentGroup.sessions.findIndex(
      (s) => s.id === sessionId,
    );
    if (sessionIndex === -1) {
      return currentGroup;
    }

    const sessions = [...currentGroup.sessions];
    const existingSession = sessions[sessionIndex];
    if (existingSession === undefined) {
      return currentGroup;
    }

    sessions[sessionIndex] = {
      ...existingSession,
      ...updates,
      id: existingSession.id, // Ensure id is preserved
      status,
    };

    const updatedGroup: SessionGroup = {
      ...currentGroup,
      sessions,
    };

    // Update progress aggregator
    if (progressAggregator !== null) {
      const session = updatedGroup.sessions.find((s) => s.id === sessionId);
      if (session !== undefined) {
        progressAggregator.updateSession(createSessionProgress(session));
      }
    }

    return updatedGroup;
  }

  /**
   * Emit dependency resolved events for sessions unblocked by completion.
   *
   * @param currentGroup - Current group
   * @param dependencyGraph - Dependency graph
   * @param completedSessionId - ID of completed session
   */
  async emitDependencyResolved(
    currentGroup: SessionGroup | null,
    dependencyGraph: DependencyGraph | null,
    completedSessionId: string,
  ): Promise<void> {
    if (currentGroup === null || dependencyGraph === null) {
      return;
    }

    const timestamp = this.container.clock.now().toISOString();

    // Find sessions that were waiting on this one
    for (const session of currentGroup.sessions) {
      if (session.dependsOn.includes(completedSessionId)) {
        // Check if all dependencies are now resolved
        const allResolved = session.dependsOn.every(
          (depId) =>
            dependencyGraph.getCompleted().has(depId) ||
            dependencyGraph.getFailed().has(depId),
        );

        if (allResolved) {
          this.eventEmitter.emit("dependency_resolved", {
            type: "dependency_resolved",
            timestamp,
            groupId: currentGroup.id,
            sessionId: session.id,
            resolvedDependencies: session.dependsOn,
          });
        }
      }
    }
  }

  /**
   * Emit group progress event.
   *
   * @param currentGroup - Current group
   * @param progressAggregator - Progress aggregator
   */
  emitGroupProgress(
    currentGroup: SessionGroup | null,
    progressAggregator: ProgressAggregator | null,
  ): void {
    if (currentGroup === null || progressAggregator === null) {
      return;
    }

    const progress = progressAggregator.computeProgress(currentGroup);
    const timestamp = this.container.clock.now().toISOString();

    this.eventEmitter.emit("group_progress", {
      type: "group_progress",
      timestamp,
      groupId: currentGroup.id,
      completed: progress.completed,
      running: progress.running,
      pending: progress.pending,
      failed: progress.failed,
      totalCostUsd: progress.totalCost,
    });
  }
}
