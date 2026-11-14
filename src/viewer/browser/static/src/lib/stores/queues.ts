/**
 * Svelte stores for queue data.
 *
 * Provides reactive stores for queue list and current queue,
 * with automatic updates via WebSocket.
 *
 * @module lib/stores/queues
 */

import { writable } from "svelte/store";
import type { CommandQueue } from "../api";
import api from "../api";
import { ws } from "../websocket";

/**
 * Store for queue list.
 */
export const queues = writable<CommandQueue[]>([]);

/**
 * Store for currently viewed queue.
 */
export const currentQueue = writable<CommandQueue | null>(null);

/**
 * Store for loading state.
 */
export const isLoadingQueues = writable<boolean>(false);

/**
 * Store for loading state of current queue.
 */
export const isLoadingQueue = writable<boolean>(false);

/**
 * Store for error messages.
 */
export const queuesError = writable<string | null>(null);

/**
 * Load all queues from API.
 *
 * @returns Promise that resolves when queues are loaded
 */
export async function loadQueues(): Promise<void> {
  isLoadingQueues.set(true);
  queuesError.set(null);

  try {
    const queueList = await api.queues.list();
    queues.set(queueList);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    queuesError.set(errorMessage);
    console.error("Failed to load queues:", errorMessage);
  } finally {
    isLoadingQueues.set(false);
  }
}

/**
 * Load a specific queue by ID.
 *
 * @param id - Queue ID to load
 * @returns Promise that resolves when queue is loaded
 */
export async function loadQueue(id: string): Promise<void> {
  isLoadingQueue.set(true);
  queuesError.set(null);

  try {
    const queue = await api.queues.get(id);
    currentQueue.set(queue);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    queuesError.set(errorMessage);
    console.error("Failed to load queue:", errorMessage);
    currentQueue.set(null);
  } finally {
    isLoadingQueue.set(false);
  }
}

/**
 * Unload current queue.
 *
 * Clears the current queue store.
 */
export function unloadQueue(): void {
  currentQueue.set(null);
}

/**
 * Reload the queue list.
 *
 * @returns Promise that resolves when queues are reloaded
 */
export async function reloadQueues(): Promise<void> {
  await loadQueues();
}

/**
 * Reload the current queue.
 *
 * @returns Promise that resolves when queue is reloaded
 */
export async function reloadQueue(): Promise<void> {
  const current = currentQueue;
  let queueId: string | null = null;

  // Get current queue ID
  current.subscribe((value) => {
    if (value !== null) {
      queueId = value.id;
    }
  })();

  if (queueId !== null) {
    await loadQueue(queueId);
  }
}

/**
 * Setup WebSocket message handler for queue updates.
 *
 * Call this once during app initialization.
 */
export function setupQueueUpdates(): void {
  ws.onMessage((message) => {
    if (message.type === "queue_update") {
      // Reload queue list
      void reloadQueues();

      // Reload current queue if it matches
      const current = currentQueue;
      current.subscribe((value) => {
        if (value !== null && value.id === message.queueId) {
          void reloadQueue();
        }
      })();
    }
  });
}
