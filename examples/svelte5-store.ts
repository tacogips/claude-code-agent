/**
 * Svelte 5 Integration Example
 *
 * Demonstrates how to consume SessionUpdateReceiver in Svelte 5
 * with proper reactivity using $state bridges.
 *
 * Svelte 5 runes ($state, $derived) cannot track property changes
 * on plain JavaScript objects returned by the SDK. This example shows
 * the recommended pattern for bridging SDK state into Svelte reactivity.
 *
 * NOTE: This file contains TypeScript patterns that would be used
 * inside .svelte files with <script lang="ts"> blocks.
 * It is provided as .ts for reference and type checking.
 *
 * Prerequisites:
 *   bun add claude-code-agent
 */

import type {
  ISessionUpdateReceiver,
  SessionUpdate,
  TranscriptEvent,
} from "claude-code-agent/sdk";
import {
  SessionUpdateReceiver,
  createSessionReceiver,
} from "claude-code-agent/sdk";

// ============================================================
// Pattern 1: Reactive Session Store
// ============================================================

/**
 * Creates a reactive session store that bridges SDK polling
 * into Svelte 5 $state variables.
 *
 * Usage in a .svelte file:
 * ```svelte
 * <script lang="ts">
 *   import { createSessionStore } from './svelte5-store';
 *
 *   const store = createSessionStore('session-uuid');
 *
 *   // These are reactive via $state
 *   // Access: store.events, store.isConnected, store.error
 * </script>
 *
 * {#each store.events as event}
 *   <p>{event.type}: {JSON.stringify(event.content)}</p>
 * {/each}
 * ```
 */
export function createSessionStore(sessionId: string) {
  // --- Svelte 5 $state bridge variables ---
  // In a real .svelte file, these would use $state rune:
  //   let events = $state<TranscriptEvent[]>([]);
  //   let isConnected = $state(false);
  //   let error = $state<string | null>(null);
  //   let lastUpdate = $state<string | null>(null);

  // For this .ts reference file, we use a plain object
  // to demonstrate the pattern:
  const state = {
    events: [] as TranscriptEvent[],
    isConnected: false,
    error: null as string | null,
    lastUpdate: null as string | null,
  };

  let receiver: ISessionUpdateReceiver | null = null;
  let polling = false;

  /**
   * Start receiving updates.
   * Call this in onMount() or when the component initializes.
   */
  async function connect(): Promise<void> {
    if (receiver !== null) return;

    receiver = createSessionReceiver(sessionId, {
      pollingIntervalMs: 300,
      includeExisting: true,
    });

    state.isConnected = true;
    polling = true;

    // Start polling loop
    void pollLoop();
  }

  /**
   * Internal polling loop.
   * Each iteration calls receive() and syncs results to $state variables.
   */
  async function pollLoop(): Promise<void> {
    while (polling && receiver !== null) {
      try {
        const update: SessionUpdate | null = await receiver.receive();

        if (update === null) {
          // Session ended
          state.isConnected = false;
          break;
        }

        // Sync to $state variables
        // In Svelte 5, this assignment triggers reactivity:
        //   events = [...events, ...update.events];
        //   lastUpdate = update.timestamp;
        state.events = [...state.events, ...update.events];
        state.lastUpdate = update.timestamp;
        state.error = null;
      } catch (err) {
        state.error = err instanceof Error ? err.message : String(err);
      }
    }
  }

  /**
   * Stop receiving updates.
   * Call this in onDestroy() or when the component unmounts.
   */
  function disconnect(): void {
    polling = false;
    if (receiver !== null) {
      receiver.close();
      receiver = null;
    }
    state.isConnected = false;
  }

  return {
    /** Reactive state (use $state in .svelte files) */
    state,
    /** Start receiving updates */
    connect,
    /** Stop receiving updates */
    disconnect,
  };
}

// ============================================================
// Pattern 2: Svelte 5 Component Example (pseudo-code)
// ============================================================

/**
 * Example Svelte 5 component using the session store.
 *
 * In a real .svelte file:
 *
 * ```svelte
 * <script lang="ts">
 *   import { onMount, onDestroy } from 'svelte';
 *   import {
 *     SessionUpdateReceiver,
 *     type TranscriptEvent,
 *     type SessionUpdate,
 *   } from 'claude-code-agent/sdk';
 *
 *   interface Props {
 *     sessionId: string;
 *   }
 *
 *   let { sessionId }: Props = $props();
 *
 *   // $state variables for reactivity bridge
 *   let events = $state<TranscriptEvent[]>([]);
 *   let isConnected = $state(false);
 *   let error = $state<string | null>(null);
 *
 *   // Derived values work on $state variables
 *   let messageCount = $derived(events.length);
 *   let userMessages = $derived(
 *     events.filter(e => e.type === 'user')
 *   );
 *   let assistantMessages = $derived(
 *     events.filter(e => e.type === 'assistant')
 *   );
 *
 *   let receiver: SessionUpdateReceiver | null = null;
 *
 *   onMount(() => {
 *     receiver = new SessionUpdateReceiver(sessionId, {
 *       pollingIntervalMs: 300,
 *       includeExisting: true,
 *     });
 *     isConnected = true;
 *     pollUpdates();
 *   });
 *
 *   onDestroy(() => {
 *     receiver?.close();
 *     receiver = null;
 *     isConnected = false;
 *   });
 *
 *   async function pollUpdates() {
 *     while (receiver && !receiver.isClosed) {
 *       try {
 *         const update = await receiver.receive();
 *         if (!update) break;
 *
 *         // Assignment to $state triggers reactivity
 *         events = [...events, ...update.events];
 *         error = null;
 *       } catch (e) {
 *         error = e instanceof Error ? e.message : String(e);
 *       }
 *     }
 *     isConnected = false;
 *   }
 * </script>
 *
 * <div class="session-viewer">
 *   <header>
 *     <h2>Session: {sessionId}</h2>
 *     <span class:connected={isConnected}>
 *       {isConnected ? 'Connected' : 'Disconnected'}
 *     </span>
 *     <span>Messages: {messageCount}</span>
 *   </header>
 *
 *   {#if error}
 *     <div class="error">{error}</div>
 *   {/if}
 *
 *   <div class="messages">
 *     {#each events as event (event.uuid ?? crypto.randomUUID())}
 *       <div class="event event-{event.type}">
 *         <span class="type">{event.type}</span>
 *         <span class="timestamp">{event.timestamp}</span>
 *         <pre>{JSON.stringify(event.content, null, 2)}</pre>
 *       </div>
 *     {/each}
 *   </div>
 * </div>
 * ```
 */
export const SVELTE_COMPONENT_EXAMPLE = "See JSDoc above for full .svelte component example";
