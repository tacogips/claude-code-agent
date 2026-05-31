/**
 * State Manager for tracking real-time session state from transcript events.
 *
 * This module maintains current state of monitored Claude Code sessions,
 * tracking active tools, subagents, tasks, and message counts.
 *
 * @module polling/state-manager
 */
import type { EventEmitter } from "../sdk/events/emitter";
import type { MonitorEvent, TaskState } from "./output";
/**
 * Active tool call tracking.
 */
interface ActiveTool {
    readonly tool: string;
    readonly startedAt: string;
}
/**
 * Subagent state tracking.
 */
export interface SubagentState {
    readonly agentId: string;
    readonly agentType: string;
    readonly description: string;
    readonly status: "running" | "completed" | "failed";
    readonly startedAt: string;
    readonly endedAt?: string;
}
/**
 * Task state with extended tracking.
 */
export interface ExtendedTaskState extends TaskState {
    readonly id: string;
    readonly activeForm?: string;
}
/**
 * Complete session state.
 */
export interface SessionState {
    readonly sessionId: string;
    readonly activeTools: ReadonlyMap<string, ActiveTool>;
    readonly subagents: ReadonlyMap<string, SubagentState>;
    readonly tasks: ReadonlyMap<string, ExtendedTaskState>;
    readonly messageCount: number;
    readonly lastUpdated: string;
}
/**
 * StateManager tracks session state from monitor events.
 *
 * Processes monitor events to maintain current state of sessions,
 * tracking active tools, subagents, tasks, and message counts.
 *
 * @example
 * ```typescript
 * const emitter = createEventEmitter();
 * const stateManager = new StateManager(emitter);
 *
 * // Process events
 * stateManager.processEvents([
 *   { type: "tool_start", sessionId: "s1", tool: "Task", timestamp: "..." },
 *   { type: "tool_end", sessionId: "s1", tool: "Task", duration: 5000, timestamp: "..." }
 * ]);
 *
 * // Query state
 * const state = stateManager.getSessionState("s1");
 * const activeTools = stateManager.getActiveTools("s1");
 * ```
 */
export declare class StateManager {
    /**
     * Map of session states by session ID.
     */
    private readonly states;
    /**
     * Create a new state manager.
     *
     * @param _eventEmitter - Event emitter for future event publishing (reserved)
     */
    constructor(_eventEmitter: EventEmitter);
    /**
     * Process monitor events to update state.
     *
     * Processes an array of monitor events and updates the internal state
     * accordingly. Events are processed in order.
     *
     * @param events - Monitor events to process
     */
    processEvents(events: readonly MonitorEvent[]): void;
    /**
     * Process a single monitor event.
     *
     * @param event - Monitor event to process
     */
    private processEvent;
    /**
     * Get or create internal state for a session.
     *
     * @param sessionId - Session ID
     * @returns Internal session state
     */
    private getOrCreateState;
    /**
     * Handle tool start event.
     *
     * @param state - Session state
     * @param event - Tool start event
     */
    private handleToolStart;
    /**
     * Handle tool end event.
     *
     * @param state - Session state
     * @param event - Tool end event
     */
    private handleToolEnd;
    /**
     * Handle subagent start event.
     *
     * @param state - Session state
     * @param event - Subagent start event
     */
    private handleSubagentStart;
    /**
     * Handle subagent end event.
     *
     * @param state - Session state
     * @param event - Subagent end event
     */
    private handleSubagentEnd;
    /**
     * Handle message event.
     *
     * @param state - Session state
     * @param event - Message event
     */
    private handleMessage;
    /**
     * Handle task update event.
     *
     * @param state - Session state
     * @param event - Task update event
     */
    private handleTaskUpdate;
    /**
     * Get session state.
     *
     * Returns the current state for a session, or undefined if the session
     * has not been tracked.
     *
     * @param sessionId - Session ID to query
     * @returns Session state or undefined
     */
    getSessionState(sessionId: string): SessionState | undefined;
    /**
     * Get active tools for a session.
     *
     * Returns a list of tool names currently active in the session.
     *
     * @param sessionId - Session ID to query
     * @returns Array of active tool names
     */
    getActiveTools(sessionId: string): string[];
    /**
     * Get active subagents for a session.
     *
     * Returns all subagents currently running in the session.
     *
     * @param sessionId - Session ID to query
     * @returns Array of active subagent states
     */
    getActiveSubagents(sessionId: string): SubagentState[];
    /**
     * Get all tasks for a session.
     *
     * Returns all tasks tracked for the session.
     *
     * @param sessionId - Session ID to query
     * @returns Array of task states
     */
    getAllTasks(sessionId: string): ExtendedTaskState[];
    /**
     * Get task by ID.
     *
     * Returns a specific task by its ID.
     *
     * @param sessionId - Session ID
     * @param taskId - Task ID
     * @returns Task state or undefined
     */
    getTaskById(sessionId: string, taskId: string): ExtendedTaskState | undefined;
    /**
     * Reset all state.
     *
     * Clears all tracked sessions and their state.
     */
    reset(): void;
    /**
     * Clear state for a specific session.
     *
     * Removes all state tracking for the specified session.
     *
     * @param sessionId - Session ID to clear
     */
    clearSession(sessionId: string): void;
    /**
     * Convert internal state to public state.
     *
     * @param state - Internal session state
     * @returns Public session state
     */
    private toPublicState;
}
export {};
//# sourceMappingURL=state-manager.d.ts.map