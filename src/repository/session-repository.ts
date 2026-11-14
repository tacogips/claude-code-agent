/**
 * Session Repository interface.
 *
 * Defines the data access contract for session storage and retrieval.
 *
 * @module repository/session-repository
 */

import type { Session, SessionMetadata, SessionStatus } from "../types/session";

/**
 * Filter criteria for listing sessions.
 */
export interface SessionFilter {
  /** Filter by project path */
  readonly projectPath?: string | undefined;
  /** Filter by session status */
  readonly status?: SessionStatus | undefined;
  /** Filter sessions created after this date */
  readonly since?: Date | undefined;
  /** Filter sessions created before this date */
  readonly until?: Date | undefined;
  /** Maximum number of results to return */
  readonly limit?: number | undefined;
  /** Number of results to skip (for pagination) */
  readonly offset?: number | undefined;
}

/**
 * Sort options for session listing.
 */
export interface SessionSort {
  /** Field to sort by */
  readonly field: "createdAt" | "updatedAt" | "costUsd";
  /** Sort direction */
  readonly direction: "asc" | "desc";
}

/**
 * Repository interface for session data access.
 *
 * Provides CRUD operations for session storage with filtering
 * and search capabilities.
 */
export interface SessionRepository {
  /**
   * Find a session by its ID.
   *
   * @param id - Session ID
   * @returns Session if found, null otherwise
   */
  findById(id: string): Promise<Session | null>;

  /**
   * Find all sessions for a project.
   *
   * @param projectPath - Project directory path
   * @returns Array of sessions for the project
   */
  findByProject(projectPath: string): Promise<readonly Session[]>;

  /**
   * List sessions with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of sessions matching the filter
   */
  list(filter?: SessionFilter, sort?: SessionSort): Promise<readonly Session[]>;

  /**
   * List session metadata (lightweight) with optional filtering.
   *
   * Use this for list views where full session data is not needed.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of session metadata
   */
  listMetadata(
    filter?: SessionFilter,
    sort?: SessionSort,
  ): Promise<readonly SessionMetadata[]>;

  /**
   * Save a session.
   *
   * Creates a new session or updates an existing one.
   *
   * @param session - Session to save
   */
  save(session: Session): Promise<void>;

  /**
   * Delete a session by ID.
   *
   * @param id - Session ID to delete
   * @returns True if session was deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count sessions matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching sessions
   */
  count(filter?: SessionFilter): Promise<number>;
}
