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
import type { GroupRepository, GroupFilter } from "../../repository/group-repository";
import type { EventEmitter } from "../events/emitter";
import type { SessionGroup, GroupSession, GroupConfig } from "./types";
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
export declare class GroupManager {
    private readonly container;
    private readonly repository;
    private readonly eventEmitter;
    constructor(container: Container, repository: GroupRepository, eventEmitter: EventEmitter);
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
    createGroup(options: CreateGroupOptions): Promise<SessionGroup>;
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
    getGroup(groupId: string): Promise<SessionGroup | null>;
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
    listGroups(filter?: GroupFilter): Promise<readonly SessionGroup[]>;
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
    updateGroup(groupId: string, updates: Partial<Omit<SessionGroup, "id" | "slug" | "createdAt" | "sessions">>): Promise<SessionGroup>;
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
    archiveGroup(groupId: string): Promise<void>;
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
    deleteGroup(groupId: string): Promise<void>;
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
    addSession(groupId: string, session: GroupSession): Promise<SessionGroup>;
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
    removeSession(groupId: string, sessionId: string): Promise<SessionGroup>;
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
    updateSession(groupId: string, sessionId: string, updates: Partial<Omit<GroupSession, "id">>): Promise<GroupSession>;
    /**
     * Emit status change events based on new group status.
     */
    private emitStatusChangeEvent;
    /**
     * Emit session status change events.
     */
    private emitSessionStatusEvent;
    /**
     * Generate a URL-safe slug from a name.
     *
     * Converts spaces and special characters to hyphens and lowercases.
     *
     * @param name - Name to slugify
     * @returns URL-safe slug
     */
    private generateSlug;
}
//# sourceMappingURL=manager.d.ts.map