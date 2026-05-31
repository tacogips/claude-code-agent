/**
 * High-level session monitoring API.
 *
 * This module provides SessionMonitor for real-time monitoring of
 * Claude Code sessions. It integrates the watcher, parser, event parser,
 * and state manager to provide a simple async iterable interface.
 *
 * @module polling/monitor
 */
import type { Container } from "../container";
import type { EventEmitter } from "../sdk/events/emitter";
import type { MonitorEvent } from "./output";
import { type SessionState } from "./state-manager";
import { type WatcherConfig } from "./watcher";
/**
 * SessionMonitor provides high-level real-time monitoring for a single session.
 *
 * Integrates transcript watching, JSONL parsing, event extraction, and state
 * management into a simple AsyncIterable interface. Consumers can iterate
 * over monitor events and query current state.
 *
 * @example
 * ```typescript
 * const container = createProductionContainer();
 * const emitter = createEventEmitter();
 * const monitor = new SessionMonitor(container, emitter);
 *
 * // Watch session and process events
 * for await (const event of monitor.watch('session-id')) {
 *   console.log('Event:', event.type);
 *   const state = monitor.getState();
 *   console.log('Active tools:', state?.activeTools.size);
 * }
 *
 * // Clean up
 * monitor.stop();
 * ```
 */
export declare class SessionMonitor {
    private readonly eventEmitter;
    private readonly watcher;
    private readonly stateManager;
    private currentSessionId;
    private eventParser;
    private readonly parser;
    /**
     * Create a new session monitor.
     *
     * @param container - Dependency injection container
     * @param eventEmitter - Event emitter for publishing events
     * @param watcherConfig - Optional watcher configuration
     */
    constructor(container: Container, eventEmitter: EventEmitter, watcherConfig?: WatcherConfig);
    /**
     * Watch a session and yield monitor events.
     *
     * Starts monitoring a Claude Code session transcript and yields
     * monitor events as they occur. The async iterator will continue
     * until stop() is called or the watcher encounters an error.
     *
     * State is updated automatically as events are processed.
     *
     * @param sessionId - Session ID to monitor
     * @returns Async iterable of monitor events
     *
     * @example
     * ```typescript
     * for await (const event of monitor.watch('session-123')) {
     *   if (event.type === 'tool_start') {
     *     console.log(`Tool started: ${event.tool}`);
     *   }
     * }
     * ```
     */
    watch(sessionId: string): AsyncIterable<MonitorEvent>;
    /**
     * Get current session state.
     *
     * Returns the aggregated state for the currently monitored session,
     * or undefined if no session is being monitored or no events have
     * been processed yet.
     *
     * @returns Current session state or undefined
     *
     * @example
     * ```typescript
     * const state = monitor.getState();
     * if (state) {
     *   console.log('Active tools:', state.activeTools.size);
     *   console.log('Message count:', state.messageCount);
     * }
     * ```
     */
    getState(): SessionState | undefined;
    /**
     * Stop monitoring and clean up resources.
     *
     * Stops the transcript watcher and releases all resources.
     * After calling stop(), the watch() iterator will complete.
     * This method is idempotent and safe to call multiple times.
     *
     * @example
     * ```typescript
     * // In cleanup or error handler
     * monitor.stop();
     * ```
     */
    stop(): void;
    /**
     * Resolve transcript file path for a session.
     *
     * Constructs the full path to the session's transcript.jsonl file
     * based on the Claude Code session directory structure.
     *
     * @param sessionId - Session ID
     * @returns Absolute path to transcript file
     */
    private resolveTranscriptPath;
}
/**
 * GroupMonitor provides high-level real-time monitoring for all sessions in a group.
 *
 * Manages multiple SessionMonitor instances and provides a unified event stream
 * from all sessions in the group. Supports dynamic addition and removal of sessions
 * as the group execution progresses.
 *
 * @example
 * ```typescript
 * const container = createProductionContainer();
 * const emitter = createEventEmitter();
 * const monitor = new GroupMonitor(container, emitter);
 *
 * // Watch all sessions in the group
 * for await (const event of monitor.watch('group-id')) {
 *   console.log('Event from session:', event.sessionId, 'type:', event.type);
 *
 *   // Get aggregated state for all sessions
 *   const states = monitor.getStates();
 *   console.log('Active sessions:', states.size);
 * }
 *
 * // Clean up
 * monitor.stop();
 * ```
 */
export declare class GroupMonitor {
    private readonly container;
    private readonly eventEmitter;
    private readonly watcherConfig;
    private readonly monitors;
    private readonly stateManager;
    private stopped;
    private stopResolver;
    private readonly stopPromise;
    /**
     * Create a new group monitor.
     *
     * @param container - Dependency injection container
     * @param eventEmitter - Event emitter for publishing events
     * @param watcherConfig - Optional watcher configuration (applied to all session monitors)
     */
    constructor(container: Container, eventEmitter: EventEmitter, watcherConfig?: WatcherConfig);
    /**
     * Watch all sessions in a group and yield monitor events.
     *
     * Starts monitoring all sessions in the group and yields events from any session.
     * The async iterator merges events from all sessions in the group and continues
     * until stop() is called or all sessions complete.
     *
     * Sessions are monitored dynamically - sessions that start during execution
     * will be detected and added to monitoring automatically (if implemented
     * with periodic group polling).
     *
     * @param groupId - Session group ID to monitor
     * @returns Async iterable of monitor events from all sessions
     *
     * @example
     * ```typescript
     * for await (const event of monitor.watch('group-123')) {
     *   console.log(`Session ${event.sessionId}: ${event.type}`);
     *
     *   // Check state of specific session
     *   const states = monitor.getStates();
     *   const sessionState = states.get(event.sessionId);
     *   if (sessionState) {
     *     console.log('Active tools:', sessionState.activeTools.size);
     *   }
     * }
     * ```
     */
    watch(groupId: string): AsyncIterable<MonitorEvent>;
    /**
     * Add a session to the group monitoring.
     *
     * Dynamically adds a new session to be monitored. This is useful when
     * sessions start during group execution.
     *
     * @param groupSessionId - Group session ID
     * @param claudeSessionId - Claude Code session ID
     *
     * @example
     * ```typescript
     * // During group execution, a new session starts
     * monitor.addSession('session-001', 'claude-session-uuid');
     * ```
     */
    addSession(groupSessionId: string, claudeSessionId: string): void;
    /**
     * Remove a session from monitoring.
     *
     * Stops monitoring a specific session and cleans up its resources.
     *
     * @param groupSessionId - Group session ID to stop monitoring
     *
     * @example
     * ```typescript
     * // Session completed, stop monitoring it
     * monitor.removeSession('session-001');
     * ```
     */
    removeSession(groupSessionId: string): void;
    /**
     * Get states for all monitored sessions.
     *
     * Returns a map of session states indexed by group session ID.
     * Only includes sessions that have been monitored and have state.
     *
     * @returns Map of session ID to session state
     *
     * @example
     * ```typescript
     * const states = monitor.getStates();
     * for (const [sessionId, state] of states) {
     *   console.log(`Session ${sessionId}: ${state.messageCount} messages`);
     *   console.log(`  Active tools: ${state.activeTools.size}`);
     *   console.log(`  Subagents: ${state.subagents.size}`);
     * }
     * ```
     */
    getStates(): ReadonlyMap<string, SessionState>;
    /**
     * Stop monitoring all sessions and clean up resources.
     *
     * Stops all session monitors and releases resources. After calling stop(),
     * the watch() iterator will complete. This method is idempotent and safe
     * to call multiple times.
     *
     * @example
     * ```typescript
     * // In cleanup or error handler
     * monitor.stop();
     * ```
     */
    stop(): void;
}
//# sourceMappingURL=monitor.d.ts.map