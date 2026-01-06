/**
 * In-memory implementation of GroupRepository.
 *
 * Provides in-memory storage for session groups using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/group-repository
 */

import type {
  GroupFilter,
  GroupRepository,
  GroupSession,
  GroupSort,
  GroupStatus,
  SessionGroup,
} from "../group-repository";

/**
 * In-memory implementation of GroupRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export class InMemoryGroupRepository implements GroupRepository {
  private groups: Map<string, SessionGroup>;

  constructor() {
    this.groups = new Map();
  }

  /**
   * Find a group by its ID.
   *
   * @param id - Group ID
   * @returns Group if found, null otherwise
   */
  async findById(id: string): Promise<SessionGroup | null> {
    return this.groups.get(id) ?? null;
  }

  /**
   * Find groups by status.
   *
   * @param status - Status to filter by
   * @returns Array of groups with the status
   */
  async findByStatus(status: GroupStatus): Promise<readonly SessionGroup[]> {
    return Array.from(this.groups.values()).filter(
      (group) => group.status === status,
    );
  }

  /**
   * List groups with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of groups matching the filter
   */
  async list(
    filter?: GroupFilter,
    sort?: GroupSort,
  ): Promise<readonly SessionGroup[]> {
    let results = Array.from(this.groups.values());

    // Apply filters
    if (filter) {
      results = this.applyFilter(results, filter);
    }

    // Apply sorting
    if (sort) {
      results = this.applySort(results, sort);
    }

    return results;
  }

  /**
   * Save a group.
   *
   * Creates a new group or updates an existing one.
   *
   * @param group - Group to save
   */
  async save(group: SessionGroup): Promise<void> {
    this.groups.set(group.id, group);
  }

  /**
   * Delete a group by ID.
   *
   * @param id - Group ID to delete
   * @returns True if group was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.groups.delete(id);
  }

  /**
   * Update a session within a group.
   *
   * @param groupId - Group ID
   * @param sessionId - Session ID within the group
   * @param updates - Partial session updates
   * @returns True if session was updated, false if not found
   */
  async updateSession(
    groupId: string,
    sessionId: string,
    updates: Partial<Omit<GroupSession, "id">>,
  ): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (!group) {
      return false;
    }

    const sessionIndex = group.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      return false;
    }

    // Create updated session
    const currentSession = group.sessions[sessionIndex];
    if (!currentSession) {
      return false;
    }

    const updatedSession: GroupSession = {
      ...currentSession,
      ...updates,
    };

    // Create updated sessions array
    const updatedSessions = [...group.sessions];
    updatedSessions[sessionIndex] = updatedSession;

    // Update group
    const updatedGroup: SessionGroup = {
      ...group,
      sessions: updatedSessions,
      updatedAt: new Date().toISOString(),
    };

    this.groups.set(groupId, updatedGroup);
    return true;
  }

  /**
   * Count groups matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching groups
   */
  async count(filter?: GroupFilter): Promise<number> {
    if (!filter) {
      return this.groups.size;
    }

    const filtered = this.applyFilter(Array.from(this.groups.values()), filter);
    return filtered.length;
  }

  /**
   * Clear all groups from memory.
   *
   * Useful for test cleanup.
   */
  clear(): void {
    this.groups.clear();
  }

  /**
   * Apply filter criteria to group array.
   */
  private applyFilter(
    groups: SessionGroup[],
    filter: GroupFilter,
  ): SessionGroup[] {
    let results = groups;

    if (filter.status !== undefined) {
      results = results.filter((g) => g.status === filter.status);
    }

    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((g) =>
        g.name.toLowerCase().includes(searchTerm),
      );
    }

    if (filter.since !== undefined) {
      const sinceTime = filter.since.getTime();
      results = results.filter(
        (g) => new Date(g.createdAt).getTime() >= sinceTime,
      );
    }

    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Apply sort options to group array.
   */
  private applySort(groups: SessionGroup[], sort: GroupSort): SessionGroup[] {
    const sorted = [...groups];
    const direction = sort.direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sort.field) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          compareValue =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "totalCostUsd":
          compareValue = a.totalCostUsd - b.totalCostUsd;
          break;
      }

      return compareValue * direction;
    });

    return sorted;
  }
}
