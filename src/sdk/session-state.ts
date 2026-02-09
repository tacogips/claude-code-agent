/**
 * Session State Manager
 *
 * Manages session execution state with state machine transitions
 * and pending operation tracking for the claude-code-agent SDK.
 *
 * @module sdk/session-state
 */

import { EventEmitter } from "node:events";
import { InvalidStateError, TimeoutError } from "./errors";
import type {
  SessionState,
  SessionStateInfo,
  PendingToolCall,
  PendingPermission,
  SessionStats,
} from "./types/state";
import { isTerminalState } from "./types/state";

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
 * Internal tracking of pending operations.
 */
interface PendingOperation {
  readonly type: "tool_call" | "permission";
  readonly id: string;
  readonly startedAt: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Valid state transitions map.
 *
 * Defines which states can transition to which other states.
 */
const VALID_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  idle: ["starting", "cancelled"],
  starting: ["running", "failed", "cancelled"],
  running: [
    "waiting_tool_call",
    "waiting_permission",
    "paused",
    "completed",
    "failed",
    "cancelled",
  ],
  waiting_tool_call: ["running", "failed", "cancelled"],
  waiting_permission: ["running", "failed", "cancelled"],
  paused: ["running", "cancelled"],
  completed: [], // Terminal state
  failed: [], // Terminal state
  cancelled: [], // Terminal state
};

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
export class SessionStateManager extends EventEmitter {
  private state: SessionState = "idle";
  private stateInfo: SessionStateInfo;
  private pendingOperations: Map<string, PendingOperation> = new Map();

  /**
   * Create a new SessionStateManager.
   *
   * @param sessionId - Unique identifier for the session
   */
  constructor(sessionId: string) {
    super();
    this.stateInfo = {
      state: "idle",
      sessionId,
      stats: {
        toolCallCount: 0,
        messageCount: 0,
      },
    };
  }

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
  transition(
    newState: SessionState,
    metadata?: Partial<SessionStateInfo>,
  ): void {
    if (!this.isValidTransition(this.state, newState)) {
      const validTargets = VALID_TRANSITIONS[this.state];
      throw new InvalidStateError(
        this.state,
        validTargets !== undefined ? Array.from<string>(validTargets) : [],
      );
    }

    const from = this.state;
    this.state = newState;

    // Update state info
    this.stateInfo = {
      ...this.stateInfo,
      state: newState,
      ...metadata,
    };

    // Clean up pending operations when entering terminal state
    if (isTerminalState(newState)) {
      this.pendingOperations.clear();
      this.stateInfo = {
        ...this.stateInfo,
        pendingToolCall: undefined,
        pendingPermission: undefined,
      };
    }

    // Emit state change event
    const change: StateChange = {
      from,
      to: newState,
      info: this.getState(),
      timestamp: new Date().toISOString(),
    };

    this.emit("stateChange", change);
  }

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
  startToolCall(
    toolUseId: string,
    toolName: string,
    serverName: string,
    args: Record<string, unknown>,
  ): void {
    const startedAt = new Date().toISOString();

    // Record pending operation
    this.pendingOperations.set(toolUseId, {
      type: "tool_call",
      id: toolUseId,
      startedAt,
      metadata: { toolName, serverName, args },
    });

    // Transition to waiting state
    const pendingToolCall: PendingToolCall = {
      toolUseId,
      toolName,
      serverName,
      arguments: args,
      startedAt,
    };

    this.transition("waiting_tool_call", {
      pendingToolCall,
    });
  }

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
  completeToolCall(toolUseId: string): void {
    // Remove pending operation
    this.pendingOperations.delete(toolUseId);

    // Increment tool call count
    const updatedStats: SessionStats = {
      ...this.stateInfo.stats,
      toolCallCount: this.stateInfo.stats.toolCallCount + 1,
    };

    // Transition back to running
    this.transition("running", {
      pendingToolCall: undefined,
      stats: updatedStats,
    });
  }

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
  startPermissionRequest(
    requestId: string,
    toolName: string,
    input: Record<string, unknown>,
  ): void {
    const startedAt = new Date().toISOString();

    // Record pending operation
    this.pendingOperations.set(requestId, {
      type: "permission",
      id: requestId,
      startedAt,
      metadata: { toolName, input },
    });

    // Transition to waiting state
    const pendingPermission: PendingPermission = {
      requestId,
      toolName,
      toolInput: input,
    };

    this.transition("waiting_permission", {
      pendingPermission,
    });
  }

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
  completePermissionRequest(requestId: string): void {
    // Remove pending operation
    this.pendingOperations.delete(requestId);

    // Transition back to running
    this.transition("running", {
      pendingPermission: undefined,
    });
  }

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
  incrementMessageCount(): void {
    const updatedStats: SessionStats = {
      ...this.stateInfo.stats,
      messageCount: this.stateInfo.stats.messageCount + 1,
    };

    this.stateInfo = {
      ...this.stateInfo,
      stats: updatedStats,
    };
  }

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
  markStarted(): void {
    const updatedStats: SessionStats = {
      ...this.stateInfo.stats,
      startedAt: new Date().toISOString(),
    };

    this.transition("running", {
      stats: updatedStats,
    });
  }

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
  markCompleted(): void {
    const updatedStats: SessionStats = {
      ...this.stateInfo.stats,
      completedAt: new Date().toISOString(),
    };

    this.transition("completed", {
      stats: updatedStats,
    });
  }

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
  markFailed(_error?: Error): void {
    this.transition("failed");
  }

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
  getState(): SessionStateInfo {
    return {
      ...this.stateInfo,
      stats: { ...this.stateInfo.stats },
      pendingToolCall: this.stateInfo.pendingToolCall
        ? { ...this.stateInfo.pendingToolCall }
        : undefined,
      pendingPermission: this.stateInfo.pendingPermission
        ? { ...this.stateInfo.pendingPermission }
        : undefined,
    };
  }

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
  getCurrentState(): SessionState {
    return this.state;
  }

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
  isTerminal(): boolean {
    return isTerminalState(this.state);
  }

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
  waitForState(
    targetState: SessionState | SessionState[],
    timeout?: number,
  ): Promise<SessionStateInfo> {
    const targetStates = Array.isArray(targetState)
      ? targetState
      : [targetState];

    // Check if already in target state
    if (targetStates.includes(this.state)) {
      return Promise.resolve(this.getState());
    }

    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const stateChangeHandler = (change: StateChange): void => {
        if (targetStates.includes(change.to)) {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
          }
          this.removeListener("stateChange", stateChangeHandler);
          resolve(change.info);
        }
      };

      this.on("stateChange", stateChangeHandler);

      if (timeout !== undefined) {
        timeoutId = setTimeout(() => {
          this.removeListener("stateChange", stateChangeHandler);
          reject(
            new TimeoutError(
              `waitForState(${targetStates.join("|")})`,
              timeout,
            ),
          );
        }, timeout);
      }
    });
  }

  /**
   * Check if a transition is valid.
   *
   * @param from - Source state
   * @param to - Target state
   * @returns true if transition is valid
   */
  private isValidTransition(from: SessionState, to: SessionState): boolean {
    const validTargets = VALID_TRANSITIONS[from];
    if (validTargets === undefined) {
      return false;
    }
    return validTargets.includes(to);
  }
}
