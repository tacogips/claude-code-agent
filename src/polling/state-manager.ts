/**
 * State Manager for tracking real-time session state from transcript events.
 *
 * This module maintains current state of monitored Claude Code sessions,
 * tracking active tools, subagents, tasks, and message counts.
 *
 * @module polling/state-manager
 */

import type { EventEmitter } from "../sdk/events/emitter";
import type {
  MessageEvent,
  MonitorEvent,
  SubagentEndEvent,
  SubagentStartEvent,
  TaskState,
  TaskUpdateEvent,
  ToolEndEvent,
  ToolStartEvent,
} from "./output";

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
export class StateManager {
  /**
   * Map of session states by session ID.
   */
  private readonly states: Map<string, InternalSessionState>;

  /**
   * Create a new state manager.
   *
   * @param _eventEmitter - Event emitter for future event publishing (reserved)
   */
  constructor(_eventEmitter: EventEmitter) {
    this.states = new Map();
  }

  /**
   * Process monitor events to update state.
   *
   * Processes an array of monitor events and updates the internal state
   * accordingly. Events are processed in order.
   *
   * @param events - Monitor events to process
   */
  processEvents(events: readonly MonitorEvent[]): void {
    for (const event of events) {
      this.processEvent(event);
    }
  }

  /**
   * Process a single monitor event.
   *
   * @param event - Monitor event to process
   */
  private processEvent(event: MonitorEvent): void {
    const state = this.getOrCreateState(event.sessionId);

    switch (event.type) {
      case "tool_start":
        this.handleToolStart(state, event);
        break;
      case "tool_end":
        this.handleToolEnd(state, event);
        break;
      case "subagent_start":
        this.handleSubagentStart(state, event);
        break;
      case "subagent_end":
        this.handleSubagentEnd(state, event);
        break;
      case "message":
        this.handleMessage(state, event);
        break;
      case "task_update":
        this.handleTaskUpdate(state, event);
        break;
      case "session_end":
        // Session end is tracked but doesn't modify state
        state.lastUpdated = event.timestamp;
        break;
    }
  }

  /**
   * Get or create internal state for a session.
   *
   * @param sessionId - Session ID
   * @returns Internal session state
   */
  private getOrCreateState(sessionId: string): InternalSessionState {
    let state = this.states.get(sessionId);
    if (state === undefined) {
      state = {
        sessionId,
        activeTools: new Map(),
        subagents: new Map(),
        tasks: new Map(),
        messageCount: 0,
        lastUpdated: new Date().toISOString(),
      };
      this.states.set(sessionId, state);
    }
    return state;
  }

  /**
   * Handle tool start event.
   *
   * @param state - Session state
   * @param event - Tool start event
   */
  private handleToolStart(
    state: InternalSessionState,
    event: ToolStartEvent,
  ): void {
    state.activeTools.set(event.tool, {
      tool: event.tool,
      startedAt: event.timestamp,
    });
    state.lastUpdated = event.timestamp;
  }

  /**
   * Handle tool end event.
   *
   * @param state - Session state
   * @param event - Tool end event
   */
  private handleToolEnd(
    state: InternalSessionState,
    event: ToolEndEvent,
  ): void {
    state.activeTools.delete(event.tool);
    state.lastUpdated = event.timestamp;
  }

  /**
   * Handle subagent start event.
   *
   * @param state - Session state
   * @param event - Subagent start event
   */
  private handleSubagentStart(
    state: InternalSessionState,
    event: SubagentStartEvent,
  ): void {
    state.subagents.set(event.agentId, {
      agentId: event.agentId,
      agentType: event.agentType,
      description: event.description,
      status: "running",
      startedAt: event.timestamp,
    });
    state.lastUpdated = event.timestamp;
  }

  /**
   * Handle subagent end event.
   *
   * @param state - Session state
   * @param event - Subagent end event
   */
  private handleSubagentEnd(
    state: InternalSessionState,
    event: SubagentEndEvent,
  ): void {
    const existing = state.subagents.get(event.agentId);
    if (existing !== undefined) {
      state.subagents.set(event.agentId, {
        ...existing,
        status: event.status,
        endedAt: event.timestamp,
      });
    } else {
      // Subagent end without start - create entry with unknown start time
      state.subagents.set(event.agentId, {
        agentId: event.agentId,
        agentType: "unknown",
        description: "",
        status: event.status,
        startedAt: event.timestamp,
        endedAt: event.timestamp,
      });
    }
    state.lastUpdated = event.timestamp;
  }

  /**
   * Handle message event.
   *
   * @param state - Session state
   * @param event - Message event
   */
  private handleMessage(
    state: InternalSessionState,
    event: MessageEvent,
  ): void {
    state.messageCount += 1;
    state.lastUpdated = event.timestamp;
  }

  /**
   * Handle task update event.
   *
   * @param state - Session state
   * @param event - Task update event
   */
  private handleTaskUpdate(
    state: InternalSessionState,
    event: TaskUpdateEvent,
  ): void {
    // Replace all tasks with new task list
    state.tasks.clear();

    for (const [index, task] of event.tasks.entries()) {
      const taskId = `task-${index}`;
      state.tasks.set(taskId, {
        id: taskId,
        summary: task.summary,
        status: task.status,
      });
    }

    state.lastUpdated = event.timestamp;
  }

  /**
   * Get session state.
   *
   * Returns the current state for a session, or undefined if the session
   * has not been tracked.
   *
   * @param sessionId - Session ID to query
   * @returns Session state or undefined
   */
  getSessionState(sessionId: string): SessionState | undefined {
    const state = this.states.get(sessionId);
    if (state === undefined) {
      return undefined;
    }

    return this.toPublicState(state);
  }

  /**
   * Get active tools for a session.
   *
   * Returns a list of tool names currently active in the session.
   *
   * @param sessionId - Session ID to query
   * @returns Array of active tool names
   */
  getActiveTools(sessionId: string): string[] {
    const state = this.states.get(sessionId);
    if (state === undefined) {
      return [];
    }

    return Array.from(state.activeTools.keys());
  }

  /**
   * Get active subagents for a session.
   *
   * Returns all subagents currently running in the session.
   *
   * @param sessionId - Session ID to query
   * @returns Array of active subagent states
   */
  getActiveSubagents(sessionId: string): SubagentState[] {
    const state = this.states.get(sessionId);
    if (state === undefined) {
      return [];
    }

    return Array.from(state.subagents.values()).filter(
      (s) => s.status === "running",
    );
  }

  /**
   * Get all tasks for a session.
   *
   * Returns all tasks tracked for the session.
   *
   * @param sessionId - Session ID to query
   * @returns Array of task states
   */
  getAllTasks(sessionId: string): ExtendedTaskState[] {
    const state = this.states.get(sessionId);
    if (state === undefined) {
      return [];
    }

    return Array.from(state.tasks.values());
  }

  /**
   * Get task by ID.
   *
   * Returns a specific task by its ID.
   *
   * @param sessionId - Session ID
   * @param taskId - Task ID
   * @returns Task state or undefined
   */
  getTaskById(
    sessionId: string,
    taskId: string,
  ): ExtendedTaskState | undefined {
    const state = this.states.get(sessionId);
    if (state === undefined) {
      return undefined;
    }

    return state.tasks.get(taskId);
  }

  /**
   * Reset all state.
   *
   * Clears all tracked sessions and their state.
   */
  reset(): void {
    this.states.clear();
  }

  /**
   * Clear state for a specific session.
   *
   * Removes all state tracking for the specified session.
   *
   * @param sessionId - Session ID to clear
   */
  clearSession(sessionId: string): void {
    this.states.delete(sessionId);
  }

  /**
   * Convert internal state to public state.
   *
   * @param state - Internal session state
   * @returns Public session state
   */
  private toPublicState(state: InternalSessionState): SessionState {
    return {
      sessionId: state.sessionId,
      activeTools: new Map(state.activeTools),
      subagents: new Map(state.subagents),
      tasks: new Map(state.tasks),
      messageCount: state.messageCount,
      lastUpdated: state.lastUpdated,
    };
  }
}

/**
 * Internal mutable session state.
 */
interface InternalSessionState {
  sessionId: string;
  activeTools: Map<string, ActiveTool>;
  subagents: Map<string, SubagentState>;
  tasks: Map<string, ExtendedTaskState>;
  messageCount: number;
  lastUpdated: string;
}
