/**
 * High-level session monitoring API.
 *
 * This module provides SessionMonitor for real-time monitoring of
 * Claude Code sessions. It integrates the watcher, parser, event parser,
 * and state manager to provide a simple async iterable interface.
 *
 * @module polling/monitor
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type { Container } from "../container";
import type { EventEmitter } from "../sdk/events/emitter";
import { EventParser } from "./event-parser";
import type { MonitorEvent } from "./output";
import { JsonlStreamParser } from "./parser";
import { StateManager, type SessionState } from "./state-manager";
import { TranscriptWatcher, type WatcherConfig } from "./watcher";

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
export class SessionMonitor {
  private readonly eventEmitter: EventEmitter;
  private readonly watcher: TranscriptWatcher;
  private readonly stateManager: StateManager;
  private currentSessionId: string | undefined;
  private eventParser: EventParser | undefined;
  private readonly parser: JsonlStreamParser;

  /**
   * Create a new session monitor.
   *
   * @param container - Dependency injection container
   * @param eventEmitter - Event emitter for publishing events
   * @param watcherConfig - Optional watcher configuration
   */
  constructor(
    container: Container,
    eventEmitter: EventEmitter,
    watcherConfig?: WatcherConfig,
  ) {
    this.eventEmitter = eventEmitter;
    // Default to includeExisting: true for monitoring
    const config: WatcherConfig = {
      includeExisting: true,
      debounceMs: 50,
      ...watcherConfig,
    };
    this.watcher = new TranscriptWatcher(container, config);
    this.stateManager = new StateManager(eventEmitter);
    this.parser = new JsonlStreamParser();
    this.currentSessionId = undefined;
    this.eventParser = undefined;
  }

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
  async *watch(sessionId: string): AsyncIterable<MonitorEvent> {
    // Store current session ID
    this.currentSessionId = sessionId;

    // Create event parser for this session
    this.eventParser = new EventParser(this.eventEmitter, sessionId);

    // Resolve transcript path
    const transcriptPath = this.resolveTranscriptPath(sessionId);

    // Watch transcript file for changes
    for await (const change of this.watcher.watch(transcriptPath)) {
      // Parse JSONL content
      const transcriptEvents = this.parser.feed(change.content);

      // Convert to monitor events
      const monitorEvents = this.eventParser.parseEvents(transcriptEvents);

      // Update state manager
      this.stateManager.processEvents(monitorEvents);

      // Yield events to consumer
      for (const event of monitorEvents) {
        yield event;
      }
    }

    // Flush any remaining buffered content
    const remaining = this.parser.flush();
    if (remaining.length > 0) {
      const monitorEvents = this.eventParser.parseEvents(remaining);
      this.stateManager.processEvents(monitorEvents);

      for (const event of monitorEvents) {
        yield event;
      }
    }
  }

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
  getState(): SessionState | undefined {
    if (this.currentSessionId === undefined) {
      return undefined;
    }

    return this.stateManager.getSessionState(this.currentSessionId);
  }

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
  stop(): void {
    // Stop the watcher
    this.watcher.stop();

    // Clear current session
    this.currentSessionId = undefined;
    this.eventParser = undefined;
  }

  /**
   * Resolve transcript file path for a session.
   *
   * Constructs the full path to the session's transcript.jsonl file
   * based on the Claude Code session directory structure.
   *
   * @param sessionId - Session ID
   * @returns Absolute path to transcript file
   */
  private resolveTranscriptPath(sessionId: string): string {
    const claudeDir = join(homedir(), ".claude");
    const sessionDir = join(claudeDir, "sessions", sessionId);
    return join(sessionDir, "transcript.jsonl");
  }
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
export class GroupMonitor {
  private readonly container: Container;
  private readonly eventEmitter: EventEmitter;
  private readonly watcherConfig: WatcherConfig | undefined;
  private readonly monitors: Map<string, SessionMonitor>;
  private readonly stateManager: StateManager;
  private stopped: boolean;
  private stopResolver: (() => void) | undefined;
  private readonly stopPromise: Promise<void>;

  /**
   * Create a new group monitor.
   *
   * @param container - Dependency injection container
   * @param eventEmitter - Event emitter for publishing events
   * @param watcherConfig - Optional watcher configuration (applied to all session monitors)
   */
  constructor(
    container: Container,
    eventEmitter: EventEmitter,
    watcherConfig?: WatcherConfig,
  ) {
    this.container = container;
    this.eventEmitter = eventEmitter;
    this.watcherConfig = watcherConfig;
    this.monitors = new Map();
    this.stateManager = new StateManager(eventEmitter);
    this.stopped = false;
    this.stopPromise = new Promise((resolve) => {
      this.stopResolver = resolve;
    });
  }

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
  async *watch(groupId: string): AsyncIterable<MonitorEvent> {
    // Get group repository to fetch session list
    const groupRepo = this.container.groupRepository;
    const group = await groupRepo.findById(groupId);

    if (group === null) {
      throw new Error(`Group not found: ${groupId}`);
    }

    // Create session monitors for all sessions that have claudeSessionId
    const activeSessions = group.sessions.filter(
      (s): s is typeof s & { claudeSessionId: string } =>
        s.claudeSessionId !== undefined,
    );

    if (activeSessions.length === 0) {
      // No active sessions to monitor
      return;
    }

    // Start monitoring each session
    const sessionIterators = new Map<
      string,
      AsyncIterator<MonitorEvent, void, undefined>
    >();

    for (const session of activeSessions) {
      const monitor = new SessionMonitor(
        this.container,
        this.eventEmitter,
        this.watcherConfig,
      );
      this.monitors.set(session.id, monitor);

      // Get async iterator for this session
      const iterator = monitor
        .watch(session.claudeSessionId)
        [Symbol.asyncIterator]();
      sessionIterators.set(session.id, iterator);
    }

    // Merge events from all session iterators
    // Maintain one pending promise per iterator to avoid calling next() multiple times
    const pendingPromises = new Map<
      string,
      Promise<{
        sessionId: string;
        result: IteratorResult<MonitorEvent, void>;
      }>
    >();
    const completedIterators = new Set<string>();

    // Initialize pending promises for all iterators
    for (const [sessionId, iterator] of sessionIterators.entries()) {
      pendingPromises.set(
        sessionId,
        iterator.next().then((result) => ({ sessionId, result })),
      );
    }

    while (pendingPromises.size > 0 && !this.stopped) {
      // Get array of all pending promises
      const promiseArray = Array.from(pendingPromises.values());

      if (promiseArray.length === 0 || this.stopped) {
        break;
      }

      // Wait for the first iterator to return a value, or for stop() to be called
      const raceResult = await Promise.race([
        Promise.race(promiseArray).then((result) => ({
          type: "event" as const,
          data: result,
        })),
        this.stopPromise.then(() => ({ type: "stop" as const })),
      ]);

      if (raceResult.type === "stop") {
        break;
      }

      const { sessionId, result } = raceResult.data;

      if (result.done === true) {
        // Mark this iterator as completed and remove its pending promise
        completedIterators.add(sessionId);
        pendingPromises.delete(sessionId);
        continue;
      }

      // Process and yield the event
      const event = result.value;
      this.stateManager.processEvents([event]);
      yield event;

      // Replace the resolved promise with a new one for the same iterator
      const iterator = sessionIterators.get(sessionId);
      if (iterator !== undefined && !completedIterators.has(sessionId)) {
        pendingPromises.set(
          sessionId,
          iterator.next().then((nextResult) => ({
            sessionId,
            result: nextResult,
          })),
        );
      }
    }
  }

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
  addSession(groupSessionId: string, claudeSessionId: string): void {
    if (this.monitors.has(groupSessionId)) {
      // Already monitoring this session
      return;
    }

    const monitor = new SessionMonitor(
      this.container,
      this.eventEmitter,
      this.watcherConfig,
    );
    this.monitors.set(groupSessionId, monitor);

    // Start watching asynchronously (fire-and-forget)
    // Events will be picked up by the main watch() loop
    (async () => {
      for await (const event of monitor.watch(claudeSessionId)) {
        this.stateManager.processEvents([event]);
        // Events are already yielded by the main watch() loop
      }
    })().catch((error: unknown) => {
      // Log error but don't throw - individual session failures
      // shouldn't crash the entire group monitor
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error monitoring session ${groupSessionId}: ${errorMessage}`,
      );
    });
  }

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
  removeSession(groupSessionId: string): void {
    const monitor = this.monitors.get(groupSessionId);
    if (monitor !== undefined) {
      monitor.stop();
      this.monitors.delete(groupSessionId);
    }
  }

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
  getStates(): ReadonlyMap<string, SessionState> {
    const states = new Map<string, SessionState>();

    for (const [groupSessionId, monitor] of this.monitors.entries()) {
      const state = monitor.getState();
      if (state !== undefined) {
        states.set(groupSessionId, state);
      }
    }

    return states;
  }

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
  stop(): void {
    // Set stopped flag to break the watch loop
    this.stopped = true;

    // Resolve the stop promise to break any pending Promise.race
    if (this.stopResolver !== undefined) {
      this.stopResolver();
    }

    // Stop all session monitors
    for (const monitor of this.monitors.values()) {
      monitor.stop();
    }

    // Clear monitors
    this.monitors.clear();
  }
}
