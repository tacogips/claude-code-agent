/**
 * Session State Manager
 *
 * Manages session execution state with state machine transitions
 * and pending operation tracking for the claude-code-agent SDK.
 *
 * @module sdk/session-state
 */
import { EventEmitter } from "node:events";
import type { SessionState, SessionStateInfo } from "./types/state";
/**
 * Event emitted when session state changes.
 */
export interface StateChange {
    readonly from: SessionState;
    readonly to: SessionState;
    readonly info: SessionStateInfo;
    readonly timestamp: string;
}
/**
 * Type-safe event interface for SessionStateManager.
 */
export interface SessionStateManagerEvents {
    stateChange: (change: StateChange) => void;
}
/**
 * Manages session execution state with state machine transitions
 * and pending operation tracking.
 *
 * This class extends EventEmitter to emit state change events.
 * It maintains the session state, pending operations, and statistics.
 *
 * @example Basic usage
 * ```typescript
 * const manager = new SessionStateManager('session-123');
 *
 * manager.on('stateChange', (change) => {
 *   console.log(`State: ${change.from} -> ${change.to}`);
 * });
 *
 * manager.markStarted();
 * manager.startToolCall('tool-1', 'add', 'calculator', { a: 1, b: 2 });
 * manager.completeToolCall('tool-1');
 * manager.markCompleted();
 * ```
 *
 * @example Waiting for state
 * ```typescript
 * const manager = new SessionStateManager('session-123');
 *
 * // Start transition in background
 * setTimeout(() => manager.markStarted(), 100);
 *
 * // Wait for state with timeout
 * const info = await manager.waitForState('running', 1000);
 * console.log('Session is now running');
 * ```
 */
export declare class SessionStateManager extends EventEmitter {
    private state;
    private stateInfo;
    private pendingOperations;
    /**
     * Create a new SessionStateManager.
     *
     * @param sessionId - Unique identifier for the session
     */
    constructor(sessionId: string);
    /**
     * Transition to a new state.
     *
     * Validates the transition is valid, updates internal state,
     * and emits a 'stateChange' event.
     *
     * @param newState - Target state to transition to
     * @param metadata - Optional metadata to merge into state info
     * @throws {InvalidStateError} If transition is not valid
     *
     * @example
     * ```typescript
     * manager.transition('running');
     * manager.transition('completed', {
     *   stats: { ...stats, completedAt: new Date().toISOString() }
     * });
     * ```
     */
    transition(newState: SessionState, metadata?: Partial<SessionStateInfo>): void;
    /**
     * Start tracking a tool call.
     *
     * Transitions to 'waiting_tool_call' state and records
     * the pending tool call information.
     *
     * @param toolUseId - Unique identifier for this tool use
     * @param toolName - Name of the tool being called
     * @param serverName - Name of the MCP server providing the tool
     * @param args - Arguments passed to the tool handler
     *
     * @example
     * ```typescript
     * manager.startToolCall(
     *   'toolu_01ABC123',
     *   'add',
     *   'calculator',
     *   { a: 15, b: 27 }
     * );
     * ```
     */
    startToolCall(toolUseId: string, toolName: string, serverName: string, args: Record<string, unknown>): void;
    /**
     * Complete a tool call.
     *
     * Increments toolCallCount and transitions back to 'running'.
     *
     * @param toolUseId - Unique identifier for the tool use to complete
     *
     * @example
     * ```typescript
     * manager.completeToolCall('toolu_01ABC123');
     * ```
     */
    completeToolCall(toolUseId: string): void;
    /**
     * Start tracking a permission request.
     *
     * Transitions to 'waiting_permission' state and records
     * the pending permission request information.
     *
     * @param requestId - Unique identifier for this permission request
     * @param toolName - Name of the tool requiring permission
     * @param input - Input arguments for the tool
     *
     * @example
     * ```typescript
     * manager.startPermissionRequest(
     *   'perm_01XYZ789',
     *   'Bash',
     *   { command: 'rm -rf /tmp/cache' }
     * );
     * ```
     */
    startPermissionRequest(requestId: string, toolName: string, input: Record<string, unknown>): void;
    /**
     * Complete a permission request.
     *
     * Transitions back to 'running' state.
     *
     * @param requestId - Unique identifier for the permission request to complete
     *
     * @example
     * ```typescript
     * manager.completePermissionRequest('perm_01XYZ789');
     * ```
     */
    completePermissionRequest(requestId: string): void;
    /**
     * Increment message count.
     *
     * Updates the session statistics to reflect a new message.
     *
     * @example
     * ```typescript
     * manager.incrementMessageCount();
     * ```
     */
    incrementMessageCount(): void;
    /**
     * Mark session as started.
     *
     * Sets startedAt timestamp and transitions to 'running'.
     *
     * @example
     * ```typescript
     * manager.markStarted();
     * ```
     */
    markStarted(): void;
    /**
     * Mark session as completed.
     *
     * Sets completedAt timestamp and transitions to 'completed'.
     *
     * @example
     * ```typescript
     * manager.markCompleted();
     * ```
     */
    markCompleted(): void;
    /**
     * Mark session as failed.
     *
     * Transitions to 'failed' state.
     *
     * @param _error - Optional error that caused the failure (not currently stored)
     *
     * @example
     * ```typescript
     * manager.markFailed(new Error('Connection lost'));
     * ```
     */
    markFailed(_error?: Error): void;
    /**
     * Get current session state info.
     *
     * Returns a copy of the state information to prevent mutation.
     *
     * @returns Copy of current session state info
     *
     * @example
     * ```typescript
     * const state = manager.getState();
     * console.log(`State: ${state.state}`);
     * console.log(`Tool calls: ${state.stats.toolCallCount}`);
     * ```
     */
    getState(): SessionStateInfo;
    /**
     * Get current state enum value.
     *
     * @returns Current session state
     *
     * @example
     * ```typescript
     * if (manager.getCurrentState() === 'running') {
     *   console.log('Session is running');
     * }
     * ```
     */
    getCurrentState(): SessionState;
    /**
     * Check if session is in a terminal state.
     *
     * Terminal states are 'completed', 'failed', or 'cancelled'.
     *
     * @returns true if in terminal state
     *
     * @example
     * ```typescript
     * if (manager.isTerminal()) {
     *   console.log('Session has ended');
     * }
     * ```
     */
    isTerminal(): boolean;
    /**
     * Wait for a specific state or timeout.
     *
     * Resolves when the session enters any of the target states.
     * Rejects with TimeoutError if timeout is reached before target state.
     *
     * @param targetState - Single state or array of states to wait for
     * @param timeout - Optional timeout in milliseconds (default: no timeout)
     * @returns Promise that resolves with state info when target state reached
     * @throws {TimeoutError} If timeout is reached before target state
     *
     * @example Wait for single state
     * ```typescript
     * const info = await manager.waitForState('completed', 5000);
     * console.log('Session completed');
     * ```
     *
     * @example Wait for multiple states
     * ```typescript
     * const info = await manager.waitForState(['completed', 'failed'], 10000);
     * if (info.state === 'completed') {
     *   console.log('Success');
     * } else {
     *   console.log('Failed');
     * }
     * ```
     */
    waitForState(targetState: SessionState | SessionState[], timeout?: number): Promise<SessionStateInfo>;
    /**
     * Check if a transition is valid.
     *
     * @param from - Source state
     * @param to - Target state
     * @returns true if transition is valid
     */
    private isValidTransition;
}
//# sourceMappingURL=session-state.d.ts.map