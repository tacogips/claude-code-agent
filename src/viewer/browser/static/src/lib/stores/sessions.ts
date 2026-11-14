/**
 * Svelte stores for session data.
 *
 * Provides reactive stores for session list and current session,
 * with automatic updates via WebSocket.
 *
 * @module lib/stores/sessions
 */

import { writable } from "svelte/store";
import type { SessionMetadata, Session } from "../api";
import api from "../api";
import { ws } from "../websocket";

/**
 * Store for session list.
 */
export const sessions = writable<SessionMetadata[]>([]);

/**
 * Store for currently viewed session.
 */
export const currentSession = writable<Session | null>(null);

/**
 * Store for loading state.
 */
export const isLoadingSessions = writable<boolean>(false);

/**
 * Store for loading state of current session.
 */
export const isLoadingSession = writable<boolean>(false);

/**
 * Store for error messages.
 */
export const sessionsError = writable<string | null>(null);

/**
 * Load all sessions from API.
 *
 * @returns Promise that resolves when sessions are loaded
 */
export async function loadSessions(): Promise<void> {
  isLoadingSessions.set(true);
  sessionsError.set(null);

  try {
    const sessionList = await api.sessions.list();
    sessions.set(sessionList);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sessionsError.set(errorMessage);
    console.error("Failed to load sessions:", errorMessage);
  } finally {
    isLoadingSessions.set(false);
  }
}

/**
 * Load a specific session by ID.
 *
 * @param id - Session ID to load
 * @returns Promise that resolves when session is loaded
 */
export async function loadSession(id: string): Promise<void> {
  isLoadingSession.set(true);
  sessionsError.set(null);

  try {
    const session = await api.sessions.get(id);
    currentSession.set(session);

    // Subscribe to WebSocket updates for this session
    ws.subscribe(id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sessionsError.set(errorMessage);
    console.error("Failed to load session:", errorMessage);
    currentSession.set(null);
  } finally {
    isLoadingSession.set(false);
  }
}

/**
 * Unload current session.
 *
 * Unsubscribes from WebSocket updates and clears the store.
 */
export function unloadSession(): void {
  const current = currentSession;
  let sessionId: string | null = null;

  // Get current session ID before clearing
  current.subscribe((value) => {
    if (value !== null) {
      sessionId = value.id;
    }
  })();

  // Unsubscribe from WebSocket
  if (sessionId !== null) {
    ws.unsubscribe(sessionId);
  }

  currentSession.set(null);
}

/**
 * Reload the session list.
 *
 * @returns Promise that resolves when sessions are reloaded
 */
export async function reloadSessions(): Promise<void> {
  await loadSessions();
}

/**
 * Reload the current session.
 *
 * @returns Promise that resolves when session is reloaded
 */
export async function reloadSession(): Promise<void> {
  const current = currentSession;
  let sessionId: string | null = null;

  // Get current session ID
  current.subscribe((value) => {
    if (value !== null) {
      sessionId = value.id;
    }
  })();

  if (sessionId !== null) {
    await loadSession(sessionId);
  }
}

/**
 * Setup WebSocket message handler for session updates.
 *
 * Call this once during app initialization.
 */
export function setupSessionUpdates(): void {
  ws.onMessage((message) => {
    if (message.type === "new_message") {
      // Reload session list to update message counts
      void reloadSessions();

      // Reload current session if it matches
      const current = currentSession;
      current.subscribe((value) => {
        if (value !== null && value.id === message.sessionId) {
          void reloadSession();
        }
      })();
    } else if (message.type === "session_update") {
      // Reload session list to update status/cost
      void reloadSessions();

      // Reload current session if it matches
      const current = currentSession;
      current.subscribe((value) => {
        if (value !== null && value.id === message.sessionId) {
          void reloadSession();
        }
      })();
    } else if (message.type === "session_end") {
      // Reload session list to update status
      void reloadSessions();
    }
  });
}
