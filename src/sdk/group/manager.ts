/**
 * Session Group Manager for CRUD operations.
 *
 * Provides lifecycle management for Session Groups including creation,
 * retrieval, updating, archiving, and deletion. Emits events for all
 * operations to enable real-time monitoring.
 *
 * @module sdk/group/manager
 */

import type { Container } from "../../container";
import { createTaggedLogger } from "../../logger";
import type {
  GroupRepository,
  GroupFilter,
} from "../../repository/group-repository";
import type { EventEmitter } from "../events/emitter";
import type { SessionGroup, GroupSession, GroupConfig } from "./types";
import { DEFAULT_GROUP_CONFIG } from "./types";

const logger = createTaggedLogger("group-manager");

/**
 * Options for creating a new session group.
 */
export interface CreateGroupOptions {
  /** User-friendly group name */
  readonly name: string;
  /** Optional description */
  readonly description?: string | undefined;
  /** Optional group configuration overrides */
  readonly config?: Partial<GroupConfig> | undefined;
}

/**
 * Session Group Manager.
 *
 * Provides CRUD operations for Session Groups with event emission
 * for all state changes. Uses dependency injection for testability.
 *
 * @example
 * ```typescript
 * const manager = new GroupManager(container, repository, emitter);
 *
 * // Create a new group
 * const group = await manager.createGroup({
 *   name: "Cross-Project Refactor",
 *   description: "Refactor auth across services",
 * });
 *
 * // Add sessions to the group
 * const updatedGroup = await manager.addSession(group.id, {
 *   id: "001-uuid-session1",
 *   projectPath: "/path/to/project-a",
 *   prompt: "Implement auth module",
 *   status: "pending",
 *   dependsOn: [],
 *   createdAt: new Date().toISOString(),
 * });
 * ```
 */
export class GroupManager {
  constructor(
    private readonly container: Container,
    private readonly repository: GroupRepository,
    private readonly eventEmitter: EventEmitter,
  ) {}

  /**
   * Create a new session group.
   *
   * Generates a unique ID in the format YYYYMMDD-HHMMSS-{slug}
   * and initializes the group with default configuration.
   *
   * @param options - Group creation options
   * @returns The newly created group
   *
   * @example
   * ```typescript
   * const group = await manager.createGroup({
   *   name: "Cross-Project Refactor",
   *   description: "Refactor auth across services",
   *   config: { maxBudgetUsd: 20.0 },
   * });
   * ```
   */
  async createGroup(options: CreateGroupOptions): Promise<SessionGroup> {
    const now = this.container.clock.now();
    const timestamp = now.toISOString();

    // Generate group ID: YYYYMMDD-HHMMSS-{slug}
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ""); // HHMMSS
    const slug = this.generateSlug(options.name);
    const groupId = `${dateStr}-${timeStr}-${slug}`;

    // Merge config with defaults
    const config: GroupConfig = {
      ...DEFAULT_GROUP_CONFIG,
      ...options.config,
    };

    const group: SessionGroup = {
      id: groupId,
      name: options.name,
      slug,
      description: options.description,
      status: "created",
      sessions: [],
      config,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: undefined,
      completedAt: undefined,
    };

    await this.repository.save(group);

    logger.info(`Created group ${groupId}`, {
      name: group.name,
      slug: group.slug,
    });

    this.eventEmitter.emit("group_created", {
      type: "group_created",
      timestamp,
      groupId,
      name: group.name,
      slug,
      totalSessions: 0,
    });

    return group;
  }

  /**
   * Get a group by ID.
   *
   * @param groupId - Group ID to retrieve
   * @returns The group if found, null otherwise
   *
   * @example
   * ```typescript
   * const group = await manager.getGroup("20260104-143022-cross-project-refactor");
   * if (group) {
   *   console.log(`Group: ${group.name}`);
   * }
   * ```
   */
  async getGroup(groupId: string): Promise<SessionGroup | null> {
    return this.repository.findById(groupId);
  }

  /**
   * List groups with optional filtering.
   *
   * @param filter - Optional filter criteria
   * @returns Array of groups matching the filter
   *
   * @example
   * ```typescript
   * // List all active groups
   * const activeGroups = await manager.listGroups({ status: "running" });
   *
   * // List groups by name
   * const authGroups = await manager.listGroups({ nameContains: "auth" });
   * ```
   */
  async listGroups(filter?: GroupFilter): Promise<readonly SessionGroup[]> {
    return this.repository.list(filter);
  }

  /**
   * Update a group.
   *
   * Updates group properties and emits a group_updated event.
   * Cannot update id, slug, createdAt, or sessions (use addSession/removeSession).
   *
   * @param groupId - Group ID to update
   * @param updates - Partial group updates
   * @returns The updated group
   * @throws Error if group not found
   *
   * @example
   * ```typescript
   * const updated = await manager.updateGroup(groupId, {
   *   status: "running",
   *   startedAt: new Date().toISOString(),
   * });
   * ```
   */
  async updateGroup(
    groupId: string,
    updates: Partial<
      Omit<SessionGroup, "id" | "slug" | "createdAt" | "sessions">
    >,
  ): Promise<SessionGroup> {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const now = this.container.clock.now();
    const timestamp = now.toISOString();

    const updated: SessionGroup = {
      ...existing,
      ...updates,
      updatedAt: timestamp,
    };

    await this.repository.save(updated);

    logger.info(`Updated group ${groupId}`, {
      status: updated.status,
    });

    // Emit event for status change if status was updated
    if (updates.status !== undefined && updates.status !== existing.status) {
      this.emitStatusChangeEvent(updated, timestamp);
    }

    return updated;
  }

  /**
   * Archive a group.
   *
   * Sets the group status to "archived". Archived groups are
   * excluded from default listings but can still be retrieved by ID.
   *
   * @param groupId - Group ID to archive
   * @throws Error if group not found
   *
   * @example
   * ```typescript
   * await manager.archiveGroup("20260104-143022-cross-project-refactor");
   * ```
   */
  async archiveGroup(groupId: string): Promise<void> {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }

    await this.updateGroup(groupId, { status: "archived" });

    logger.info(`Archived group ${groupId}`);
  }

  /**
   * Delete a group.
   *
   * Permanently removes the group from storage.
   *
   * @param groupId - Group ID to delete
   * @throws Error if group not found
   *
   * @example
   * ```typescript
   * await manager.deleteGroup("20260104-143022-cross-project-refactor");
   * ```
   */
  async deleteGroup(groupId: string): Promise<void> {
    const deleted = await this.repository.delete(groupId);
    if (!deleted) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const timestamp = this.container.clock.now().toISOString();

    logger.info(`Deleted group ${groupId}`);

    this.eventEmitter.emit("group_created", {
      type: "group_created",
      timestamp,
      groupId,
      name: "",
      slug: "",
      totalSessions: 0,
    });
  }

  /**
   * Add a session to a group.
   *
   * Appends the session to the group's session list and emits
   * a session_added event.
   *
   * @param groupId - Group ID
   * @param session - Session to add
   * @returns The updated group
   * @throws Error if group not found
   *
   * @example
   * ```typescript
   * const updated = await manager.addSession(groupId, {
   *   id: "001-uuid-session1",
   *   projectPath: "/path/to/project",
   *   prompt: "Implement feature",
   *   status: "pending",
   *   dependsOn: [],
   *   createdAt: new Date().toISOString(),
   * });
   * ```
   */
  async addSession(
    groupId: string,
    session: GroupSession,
  ): Promise<SessionGroup> {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const updated: SessionGroup = {
      ...existing,
      sessions: [...existing.sessions, session],
      updatedAt: this.container.clock.now().toISOString(),
    };

    await this.repository.save(updated);

    logger.info(`Added session ${session.id} to group ${groupId}`, {
      projectPath: session.projectPath,
    });

    return updated;
  }

  /**
   * Remove a session from a group.
   *
   * Removes the session from the group's session list.
   *
   * @param groupId - Group ID
   * @param sessionId - Session ID to remove
   * @returns The updated group
   * @throws Error if group or session not found
   *
   * @example
   * ```typescript
   * const updated = await manager.removeSession(groupId, "001-uuid-session1");
   * ```
   */
  async removeSession(
    groupId: string,
    sessionId: string,
  ): Promise<SessionGroup> {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const sessionIndex = existing.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session not found in group: ${sessionId}`);
    }

    const updated: SessionGroup = {
      ...existing,
      sessions: existing.sessions.filter((s) => s.id !== sessionId),
      updatedAt: this.container.clock.now().toISOString(),
    };

    await this.repository.save(updated);

    logger.info(`Removed session ${sessionId} from group ${groupId}`);

    return updated;
  }

  /**
   * Update a session within a group.
   *
   * Updates session properties and emits appropriate events.
   *
   * @param groupId - Group ID
   * @param sessionId - Session ID to update
   * @param updates - Partial session updates
   * @returns The updated session
   * @throws Error if group or session not found
   *
   * @example
   * ```typescript
   * const session = await manager.updateSession(groupId, sessionId, {
   *   status: "running",
   *   startedAt: new Date().toISOString(),
   * });
   * ```
   */
  async updateSession(
    groupId: string,
    sessionId: string,
    updates: Partial<Omit<GroupSession, "id">>,
  ): Promise<GroupSession> {
    const updated = await this.repository.updateSession(
      groupId,
      sessionId,
      updates,
    );

    if (!updated) {
      throw new Error(`Group or session not found: ${groupId}/${sessionId}`);
    }

    // Retrieve the updated group to get the full session
    const group = await this.repository.findById(groupId);
    if (group === null) {
      throw new Error(`Group not found after update: ${groupId}`);
    }

    const session = group.sessions.find((s) => s.id === sessionId);
    if (session === undefined) {
      throw new Error(`Session not found after update: ${sessionId}`);
    }

    logger.info(`Updated session ${sessionId} in group ${groupId}`, {
      status: session.status,
    });

    // Emit session status change events if status was updated
    if (updates.status !== undefined) {
      this.emitSessionStatusEvent(groupId, session);
    }

    return session;
  }

  /**
   * Emit status change events based on new group status.
   */
  private emitStatusChangeEvent(group: SessionGroup, timestamp: string): void {
    const status = group.status;

    // No specific event for "created" as it's handled by group_created
    if (status === "created") {
      return;
    }

    // Emit appropriate event based on status
    switch (status) {
      case "running":
        // group_started is emitted by GroupRunner, not by manager
        break;
      case "completed": {
        const completedSessions = group.sessions.filter(
          (s) => s.status === "completed",
        ).length;
        const failedSessions = group.sessions.filter(
          (s) => s.status === "failed",
        ).length;
        const totalCost = group.sessions.reduce(
          (sum, s) => sum + (s.cost ?? 0),
          0,
        );
        const elapsedMs =
          group.startedAt !== undefined && group.completedAt !== undefined
            ? new Date(group.completedAt).getTime() -
              new Date(group.startedAt).getTime()
            : 0;

        this.eventEmitter.emit("group_completed", {
          type: "group_completed",
          timestamp,
          groupId: group.id,
          completedSessions,
          failedSessions,
          totalCostUsd: totalCost,
          elapsedMs,
        });
        break;
      }
      case "paused":
        // Paused event is emitted by GroupRunner with reason
        break;
      case "failed": {
        const failedSessions = group.sessions.filter(
          (s) => s.status === "failed",
        ).length;

        this.eventEmitter.emit("group_failed", {
          type: "group_failed",
          timestamp,
          groupId: group.id,
          failedSessions,
          reason: "Error threshold exceeded",
        });
        break;
      }
      case "archived":
        // No specific event for archive
        break;
      case "deleted":
        // Handled in deleteGroup
        break;
    }
  }

  /**
   * Emit session status change events.
   */
  private emitSessionStatusEvent(groupId: string, session: GroupSession): void {
    const timestamp = this.container.clock.now().toISOString();

    switch (session.status) {
      case "active":
        this.eventEmitter.emit("group_session_started", {
          type: "group_session_started",
          timestamp,
          groupId,
          sessionId: session.id,
          projectPath: session.projectPath,
          prompt: session.prompt,
        });
        break;
      case "completed":
      case "failed": {
        const durationMs =
          session.startedAt !== undefined && session.completedAt !== undefined
            ? new Date(session.completedAt).getTime() -
              new Date(session.startedAt).getTime()
            : 0;

        if (session.status === "completed") {
          this.eventEmitter.emit("group_session_completed", {
            type: "group_session_completed",
            timestamp,
            groupId,
            sessionId: session.id,
            status: "completed",
            costUsd: session.cost,
            durationMs,
          });
        } else {
          this.eventEmitter.emit("group_session_failed", {
            type: "group_session_failed",
            timestamp,
            groupId,
            sessionId: session.id,
            error: "Session failed",
            costUsd: session.cost,
          });
        }
        break;
      }
      default:
        // No events for other statuses
        break;
    }
  }

  /**
   * Generate a URL-safe slug from a name.
   *
   * Converts spaces and special characters to hyphens and lowercases.
   *
   * @param name - Name to slugify
   * @returns URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .replace(/-+$/g, ""); // Remove trailing hyphens after truncation
  }
}
