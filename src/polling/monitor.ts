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
