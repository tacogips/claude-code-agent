/**
 * In-memory implementation of SessionRepository.
 *
 * Provides in-memory storage for sessions using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/session-repository
 */

import type { Session, SessionMetadata } from "../../types/session";
import { toSessionMetadata } from "../../types/session";
import type {
  SessionFilter,
  SessionRepository,
  SessionSort,
} from "../session-repository";

/**
 * In-memory implementation of SessionRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export class InMemorySessionRepository implements SessionRepository {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Find a session by its ID.
   *
   * @param id - Session ID
   * @returns Session if found, null otherwise
   */
  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  /**
   * Find all sessions for a project.
   *
   * @param projectPath - Project directory path
   * @returns Array of sessions for the project
   */
  async findByProject(projectPath: string): Promise<readonly Session[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.projectPath === projectPath,
    );
  }

  /**
   * List sessions with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of sessions matching the filter
   */
  async list(
    filter?: SessionFilter,
    sort?: SessionSort,
  ): Promise<readonly Session[]> {
    let results = Array.from(this.sessions.values());

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
   * List session metadata with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of session metadata
   */
  async listMetadata(
    filter?: SessionFilter,
    sort?: SessionSort,
  ): Promise<readonly SessionMetadata[]> {
    const sessions = await this.list(filter, sort);
    return sessions.map(toSessionMetadata);
  }

  /**
   * Save a session.
   *
   * Creates a new session or updates an existing one.
   *
   * @param session - Session to save
   */
  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  /**
   * Delete a session by ID.
   *
   * @param id - Session ID to delete
   * @returns True if session was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  /**
   * Count sessions matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching sessions
   */
  async count(filter?: SessionFilter): Promise<number> {
    if (!filter) {
      return this.sessions.size;
    }

    const filtered = this.applyFilter(
      Array.from(this.sessions.values()),
      filter,
    );
    return filtered.length;
  }

  /**
   * Clear all sessions from memory.
   *
   * Useful for test cleanup.
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Apply filter criteria to session array.
   */
  private applyFilter(sessions: Session[], filter: SessionFilter): Session[] {
    let results = sessions;

    if (filter.projectPath !== undefined) {
      results = results.filter((s) => s.projectPath === filter.projectPath);
    }

    if (filter.status !== undefined) {
      results = results.filter((s) => s.status === filter.status);
    }

    if (filter.since !== undefined) {
      const sinceTime = filter.since.getTime();
      results = results.filter(
        (s) => new Date(s.createdAt).getTime() >= sinceTime,
      );
    }

    if (filter.until !== undefined) {
      const untilTime = filter.until.getTime();
      results = results.filter(
        (s) => new Date(s.createdAt).getTime() <= untilTime,
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
   * Apply sort options to session array.
   */
  private applySort(sessions: Session[], sort: SessionSort): Session[] {
    const sorted = [...sessions];
    const direction = sort.direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sort.field) {
        case "createdAt":
          compareValue =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "costUsd":
          compareValue = (a.costUsd ?? 0) - (b.costUsd ?? 0);
          break;
      }

      return compareValue * direction;
    });

    return sorted;
  }
}
