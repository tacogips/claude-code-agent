/**
 * In-memory implementation of GroupRepository.
 *
 * Provides in-memory storage for session groups using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/group-repository
 */
import type { GroupFilter, GroupRepository, GroupSession, GroupSort, GroupStatus, SessionGroup } from "../group-repository";
/**
 * In-memory implementation of GroupRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export declare class InMemoryGroupRepository implements GroupRepository {
    private readonly groups;
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
    findByStatus(status: GroupStatus): Promise<readonly SessionGroup[]>;
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
     * Clear all groups from memory.
     *
     * Useful for test cleanup.
     */
    clear(): void;
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