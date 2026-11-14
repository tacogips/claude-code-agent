/**
 * Update methods for Group Runner.
 *
 * Provides methods for updating group and session states in repository,
 * and emitting related events.
 *
 * @module sdk/group/runner-updaters
 */
import type { Container } from "../../container";
import type { GroupRepository, GroupSession } from "../../repository/group-repository";
import type { EventEmitter } from "../events/emitter";
import type { SessionGroup } from "./types";
import type { DependencyGraph } from "./dependency-graph";
import { type ProgressAggregator } from "./progress";
/**
 * Group and Session Updater for managing repository updates and events.
 *
 * Encapsulates all group and session update operations with event emission.
 */
export declare class GroupUpdater {
    private readonly container;
    private readonly repository;
    private readonly eventEmitter;
    /**
     * Create a new GroupUpdater.
     *
     * @param container - Dependency injection container
     * @param repository - Group repository for data access
     * @param eventEmitter - Event emitter for group events
     */
    constructor(container: Container, repository: GroupRepository, eventEmitter: EventEmitter);
    /**
     * Update group status in repository.
     *
     * @param currentGroup - Current group reference (will be updated in-place)
     * @param status - New group status
     * @param updates - Additional fields to update
     * @returns Updated group
     */
    updateGroupStatus(currentGroup: SessionGroup | null, status: SessionGroup["status"], updates?: Partial<SessionGroup>): Promise<SessionGroup | null>;
    /**
     * Update session status in repository.
     *
     * @param currentGroup - Current group reference (will be updated in-place)
     * @param progressAggregator - Progress aggregator to update
     * @param sessionId - Session ID to update
     * @param status - New session status
     * @param updates - Additional fields to update
     * @returns Updated group with modified session
     */
    updateSessionStatus(currentGroup: SessionGroup | null, progressAggregator: ProgressAggregator | null, sessionId: string, status: GroupSession["status"], updates?: Partial<GroupSession>): Promise<SessionGroup | null>;
    /**
     * Emit dependency resolved events for sessions unblocked by completion.
     *
     * @param currentGroup - Current group
     * @param dependencyGraph - Dependency graph
     * @param completedSessionId - ID of completed session
     */
    emitDependencyResolved(currentGroup: SessionGroup | null, dependencyGraph: DependencyGraph | null, completedSessionId: string): Promise<void>;
    /**
     * Emit group progress event.
     *
     * @param currentGroup - Current group
     * @param progressAggregator - Progress aggregator
     */
    emitGroupProgress(currentGroup: SessionGroup | null, progressAggregator: ProgressAggregator | null): void;
}
//# sourceMappingURL=runner-updaters.d.ts.map