/**
 * In-memory implementation of SessionRepository.
 *
 * Provides in-memory storage for sessions using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/session-repository
 */
import type { Session, SessionMetadata } from "../../types/session";
import type { SessionFilter, SessionRepository, SessionSort } from "../session-repository";
/**
 * In-memory implementation of SessionRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export declare class InMemorySessionRepository implements SessionRepository {
    private sessions;
    constructor();
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
     * List session metadata with optional filtering and sorting.
     *
     * @param filter - Filter criteria
     * @param sort - Sort options
     * @returns Array of session metadata
     */
    listMetadata(filter?: SessionFilter, sort?: SessionSort): Promise<readonly SessionMetadata[]>;
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
    /**
     * Clear all sessions from memory.
     *
     * Useful for test cleanup.
     */
    clear(): void;
    /**
     * Apply filter criteria to session array.
     */
    private applyFilter;
    /**
     * Apply sort options to session array.
     */
    private applySort;
}
//# sourceMappingURL=session-repository.d.ts.map