/**
 * Dependency graph for managing session execution order.
 *
 * Provides topological sorting, cycle detection, and dependency tracking
 * for concurrent session execution in Session Groups.
 *
 * @module sdk/group/dependency-graph
 */
import type { GroupSession } from "../../repository/group-repository";
/**
 * Blocked session information.
 */
export interface BlockedSession {
    readonly session: GroupSession;
    readonly waitingOn: readonly string[];
}
/**
 * Dependency graph for determining session execution order.
 *
 * Manages session dependencies, tracks completed/failed sessions,
 * and determines which sessions are ready to execute.
 */
export declare class DependencyGraph {
    private readonly nodes;
    private readonly completed;
    private readonly failed;
    /**
     * Create a dependency graph from sessions.
     *
     * @param sessions - Sessions to include in the graph
     * @throws {CircularDependencyError} If a circular dependency is detected
     */
    constructor(sessions: readonly GroupSession[]);
    /**
     * Build the dependency graph from sessions.
     */
    private buildGraph;
    /**
     * Check if the graph contains cycles.
     *
     * Uses DFS to detect back edges which indicate cycles.
     *
     * @returns True if cycles exist
     */
    hasCycles(): boolean;
    /**
     * Find a cycle in the graph.
     *
     * Used for error reporting when a cycle is detected.
     *
     * @returns Array of session IDs forming a cycle
     */
    private findCycle;
    /**
     * Get sessions that are ready to execute.
     *
     * A session is ready if:
     * - It is in "pending" status
     * - All its dependencies are completed
     * - None of its dependencies have failed
     *
     * @returns Array of sessions ready to execute
     */
    getReadySessions(): readonly GroupSession[];
    /**
     * Mark a session as completed.
     *
     * Updates the graph state to reflect that the session
     * has successfully completed.
     *
     * @param sessionId - ID of the completed session
     */
    markCompleted(sessionId: string): void;
    /**
     * Mark a session as failed.
     *
     * Updates the graph state to reflect that the session
     * has failed. This will block any sessions that depend on it.
     *
     * @param sessionId - ID of the failed session
     */
    markFailed(sessionId: string): void;
    /**
     * Get the number of remaining sessions.
     *
     * Counts sessions that are not completed or failed.
     *
     * @returns Number of remaining sessions
     */
    getRemainingCount(): number;
    /**
     * Get blocked sessions and what they are waiting on.
     *
     * A session is blocked if it is pending but has unsatisfied dependencies.
     *
     * @returns Array of blocked sessions with their blocking dependencies
     */
    getBlockedSessions(): readonly BlockedSession[];
    /**
     * Get all completed session IDs.
     *
     * @returns Set of completed session IDs
     */
    getCompleted(): ReadonlySet<string>;
    /**
     * Get all failed session IDs.
     *
     * @returns Set of failed session IDs
     */
    getFailed(): ReadonlySet<string>;
}
//# sourceMappingURL=dependency-graph.d.ts.map