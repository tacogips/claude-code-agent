/**
 * File-based implementation of GroupRepository.
 *
 * Stores session groups as JSON files in the local filesystem at:
 * ~/.local/claude-code-agent/session-groups/{id}/meta.json
 *
 * @module repository/file/group-repository
 */
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
import type { GroupFilter, GroupRepository, GroupSession, GroupSort, SessionGroup } from "../group-repository";
import { BaseFileRepository } from "./base-repository";
/**
 * File-based implementation of GroupRepository.
 *
 * Stores each group in a separate directory with a meta.json file.
 * Directory structure:
 * ~/.local/claude-code-agent/session-groups/
 *   {group-id}/
 *     meta.json
 *     sessions/
 */
export declare class FileGroupRepository extends BaseFileRepository<SessionGroup> implements GroupRepository {
    private readonly baseDir;
    constructor(fs: FileSystem, clock: Clock, baseDir?: string);
    /**
     * Find a group by its ID.
     *
     * @param id - Group ID
     * @returns Group if found, null otherwise
     */
    findById(id: string): Promise<SessionGroup | null>;
    /**
     * Find groups by status.
     *
     * @param status - Status to filter by
     * @returns Array of groups with the status
     */
    findByStatus(status: SessionGroup["status"]): Promise<readonly SessionGroup[]>;
    /**
     * List groups with optional filtering and sorting.
     *
     * @param filter - Filter criteria
     * @param sort - Sort options
     * @returns Array of groups matching the filter
     */
    list(filter?: GroupFilter, sort?: GroupSort): Promise<readonly SessionGroup[]>;
    /**
     * Save a group.
     *
     * Creates a new group or updates an existing one.
     *
     * @param group - Group to save
     */
    save(group: SessionGroup): Promise<void>;
    /**
     * Delete a group by ID.
     *
     * @param id - Group ID to delete
     * @returns True if group was deleted, false if not found
     */
    delete(id: string): Promise<boolean>;
    /**
     * Update a session within a group.
     *
     * @param groupId - Group ID
     * @param sessionId - Session ID within the group
     * @param updates - Partial session updates
     * @returns True if session was updated, false if not found
     */
    updateSession(groupId: string, sessionId: string, updates: Partial<Omit<GroupSession, "id">>): Promise<boolean>;
    /**
     * Count groups matching the filter.
     *
     * @param filter - Filter criteria
     * @returns Number of matching groups
     */
    count(filter?: GroupFilter): Promise<number>;
    /**
     * Get the directory path for a group.
     */
    private getGroupDir;
    /**
     * Get the meta.json path for a group.
     */
    private getMetaPath;
    /**
     * Apply filter criteria to group array.
     */
    private applyFilter;
    /**
     * Apply sort options to group array.
     */
    private applySort;
}
//# sourceMappingURL=group-repository.d.ts.map