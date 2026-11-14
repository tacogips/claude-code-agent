/**
 * React Integration Example
 *
 * Demonstrates how to consume SessionUpdateReceiver in React
 * using useSyncExternalStore and custom hooks.
 *
 * Prerequisites:
 *   bun add claude-code-agent react
 *
 * NOTE: This file requires React 18+ for useSyncExternalStore.
 */

import { useSyncExternalStore, useCallback, useEffect, useRef } from "react";
import type {
  TranscriptEvent,
  SessionUpdate,
  ISessionUpdateReceiver,
} from "claude-code-agent/sdk";
import { SessionUpdateReceiver } from "claude-code-agent/sdk";

// ============================================================
// Pattern 1: External Store for useSyncExternalStore
// ============================================================

/**
 * SessionStore wraps SessionUpdateReceiver as a React-compatible
 * external store using the useSyncExternalStore pattern.
 *
 * This is the recommended approach for React 18+ as it properly
 * handles concurrent rendering and avoids tearing.
 */
class SessionStore {
  private receiver: ISessionUpdateReceiver | null = null;
  private events: readonly TranscriptEvent[] = [];
  private connected: boolean = false;
  private error: string | null = null;
  private listeners: Set<() => void> = new Set();
  private polling: boolean = false;

  constructor(
    private readonly sessionId: string,
    private readonly options?: {
      pollingIntervalMs?: number;
      includeExisting?: boolean;
    },
  ) {}

  /**
   * Subscribe to store changes.
   * Called by useSyncExternalStore.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    // Start polling on first subscriber
    if (this.listeners.size === 1 && !this.polling) {
      void this.start();
    }

    return () => {
      this.listeners.delete(listener);

      // Stop polling when no subscribers
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  };

  /**
   * Get current snapshot for useSyncExternalStore.
   * Returns a stable reference that only changes when data changes.
   */
  getSnapshot = (): SessionStoreSnapshot => {
    return {
      events: this.events,
      connected: this.connected,
      error: this.error,
      sessionId: this.sessionId,
    };
  };

  /**
   * Server-side snapshot for SSR.
   */
  getServerSnapshot = (): SessionStoreSnapshot => {
    return {
      events: [],
      connected: false,
      error: null,
      sessionId: this.sessionId,
    };
  };

  private async start(): Promise<void> {
    this.receiver = new SessionUpdateReceiver(this.sessionId, {
      pollingIntervalMs: this.options?.pollingIntervalMs ?? 300,
      includeExisting: this.options?.includeExisting ?? true,
    });

    this.connected = true;
    this.polling = true;
    this.notify();

    while (this.polling && this.receiver !== null) {
      try {
        const update: SessionUpdate | null = await this.receiver.receive();

        if (update === null) {
          this.connected = false;
          this.notify();
          break;
        }

        // Create new array reference to trigger React re-render
        this.events = [...this.events, ...update.events];
        this.error = null;
        this.notify();
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
        this.notify();
      }
    }
  }

  private stop(): void {
    this.polling = false;
    if (this.receiver !== null) {
      this.receiver.close();
      this.receiver = null;
    }
    this.connected = false;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/**
 * Immutable snapshot of the session store state.
 */
interface SessionStoreSnapshot {
  readonly events: readonly TranscriptEvent[];
  readonly connected: boolean;
  readonly error: string | null;
  readonly sessionId: string;
}

// ============================================================
// Pattern 2: Custom Hook
// ============================================================

/**
 * useSessionUpdates - React hook for consuming session updates.
 *
 * Uses useSyncExternalStore internally for proper concurrent
 * rendering support.
 *
 * @param sessionId - Claude Code session ID to monitor
 * @param options - Polling configuration
 * @returns Current session state snapshot
 *
 * @example
 * ```tsx
 * function SessionViewer({ sessionId }: { sessionId: string }) {
 *   const { events, connected, error } = useSessionUpdates(sessionId);
 *
 *   return (
 *     <div>
 *       <p>Status: {connected ? "Connected" : "Disconnected"}</p>
 *       {error && <p className="error">{error}</p>}
 *       {events.map((event, i) => (
 *         <div key={event.uuid ?? i}>
 *           <strong>{event.type}</strong>: {JSON.stringify(event.content)}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSessionUpdates(
  sessionId: string,
  options?: {
    pollingIntervalMs?: number;
    includeExisting?: boolean;
  },
): SessionStoreSnapshot {
  // Create stable store reference
  const storeRef = useRef<SessionStore | null>(null);

  if (storeRef.current === null || storeRef.current.getSnapshot().sessionId !== sessionId) {
    storeRef.current = new SessionStore(sessionId, options);
  }

  const store = storeRef.current;

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

// ============================================================
// Pattern 3: Example Component
// ============================================================

/**
 * SessionViewer component - displays live session events.
 *
 * @example
 * ```tsx
 * <SessionViewer sessionId="abc-123-def" />
 * ```
 */
export function SessionViewer({ sessionId }: { sessionId: string }) {
  const { events, connected, error } = useSessionUpdates(sessionId, {
    pollingIntervalMs: 300,
    includeExisting: true,
  });

  const userMessages = events.filter((e) => e.type === "user");
  const assistantMessages = events.filter((e) => e.type === "assistant");

  return (
    <div className="session-viewer">
      <header>
        <h2>Session: {sessionId.slice(0, 8)}...</h2>
        <span className={connected ? "status-connected" : "status-disconnected"}>
          {connected ? "Live" : "Disconnected"}
        </span>
        <span>Events: {events.length}</span>
        <span>User: {userMessages.length}</span>
        <span>Assistant: {assistantMessages.length}</span>
      </header>

      {error !== null && (
        <div className="error-banner">Error: {error}</div>
      )}

      <div className="event-list">
        {events.map((event, index) => (
          <div
            key={event.uuid ?? `event-${index}`}
            className={`event event-${event.type}`}
          >
            <div className="event-header">
              <span className="event-type">{event.type}</span>
              {event.timestamp && (
                <time className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </time>
              )}
            </div>
            <pre className="event-content">
              {typeof event.content === "string"
                ? event.content
                : JSON.stringify(event.content, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SessionList component - lists sessions and allows selection.
 *
 * Demonstrates combining SessionReader (for listing) with
 * SessionUpdateReceiver (for live monitoring).
 */
export function SessionListWithViewer() {
  const selectedRef = useRef<string | null>(null);

  // In a real app, you would fetch sessions from the REST API:
  //   const sessions = useFetch("/api/sessions");

  return (
    <div className="session-app">
      <aside className="session-sidebar">
        <h3>Sessions</h3>
        <p>Select a session to view live updates</p>
        {/* Session list would go here */}
      </aside>

      <main className="session-main">
        {selectedRef.current ? (
          <SessionViewer sessionId={selectedRef.current} />
        ) : (
          <p>Select a session from the sidebar</p>
        )}
      </main>
    </div>
  );
}
