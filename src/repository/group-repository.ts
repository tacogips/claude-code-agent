/**
 * Session Group Repository interface.
 *
 * Defines the data access contract for session group storage and retrieval.
 *
 * @module repository/group-repository
 */

import type {
  GroupStatus,
  SessionGroup,
  GroupSession,
} from "../sdk/group/types";

// Re-export types for convenience
export type { GroupStatus, SessionGroup, GroupSession };

/**
 * Filter criteria for listing groups.
 */
export interface GroupFilter {
  /** Filter by status */
  readonly status?: GroupStatus | undefined;
  /** Filter by name (partial match) */
  readonly nameContains?: string | undefined;
  /** Filter groups created after this date */
  readonly since?: Date | undefined;
  /** Maximum number of results to return */
  readonly limit?: number | undefined;
  /** Number of results to skip (for pagination) */
  readonly offset?: number | undefined;
}

/**
 * Sort options for group listing.
 */
export interface GroupSort {
  /** Field to sort by */
  readonly field: "name" | "createdAt" | "updatedAt";
  /** Sort direction */
  readonly direction: "asc" | "desc";
}

/**
 * Repository interface for session group data access.
 *
 * Provides CRUD operations for group storage with
 * filtering and status tracking.
 */
export interface GroupRepository {
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
  list(
    filter?: GroupFilter,
    sort?: GroupSort,
  ): Promise<readonly SessionGroup[]>;

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
  updateSession(
    groupId: string,
    sessionId: string,
    updates: Partial<Omit<GroupSession, "id">>,
  ): Promise<boolean>;

  /**
   * Count groups matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching groups
   */
  count(filter?: GroupFilter): Promise<number>;
}
