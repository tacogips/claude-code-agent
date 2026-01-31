<script lang="ts">
  import { untrack } from "svelte";
  import SessionList from "$lib/components/SessionList.svelte";
  import type { SessionMetadata } from "../../../../../types/session";

  let sessions = $state<SessionMetadata[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // WebSocket for real-time updates
  let ws: WebSocket | null = null;

  /**
   * Fetch sessions from the API
   */
  async function fetchSessions(): Promise<void> {
    try {
      loading = true;
      error = null;

      const response = await fetch("/api/sessions");
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }

      const data = await response.json();
      sessions = data.sessions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error = errorMessage;
      console.error("Error fetching sessions:", errorMessage);
    } finally {
      loading = false;
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  function connectWebSocket(): void {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.addEventListener("open", () => {
      console.log("WebSocket connected");
    });

    ws.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "session_update") {
          // Update session in the list
          const index = sessions.findIndex((s) => s.id === message.sessionId);
          if (index !== -1 && message.payload) {
            sessions[index] = { ...sessions[index], ...message.payload };
            sessions = [...sessions]; // Trigger reactivity
          } else if (message.payload) {
            // New session - add to list
            sessions = [...sessions, message.payload];
          }
        } else if (message.type === "new_session") {
          // New session created
          if (message.payload) {
            sessions = [...sessions, message.payload];
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    });

    ws.addEventListener("close", () => {
      console.log("WebSocket disconnected");
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (ws?.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 3000);
    });

    ws.addEventListener("error", (err) => {
      console.error("WebSocket error:", err);
    });
  }

  /**
   * Navigate to session detail page
   */
  function handleSessionSelect(sessionId: string): void {
    window.location.href = `/sessions/${sessionId}`;
  }

  // Initialize on mount using $effect
  $effect(() => {
    // Run only once on mount (no dependencies tracked)
    untrack(() => {
      fetchSessions();
      connectWebSocket();
    });

    // Cleanup on destroy
    return () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  });
</script>

<svelte:head>
  <title>Sessions - Claude Code Agent</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
      Sessions
    </h1>
    <button
      onclick={() => fetchSessions()}
      class="btn btn-secondary"
      disabled={loading}
      aria-label="Refresh sessions"
    >
      {loading ? "Loading..." : "Refresh"}
    </button>
  </div>

  {#if error}
    <div
      class="card p-6 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
    >
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
      <button onclick={() => fetchSessions()} class="mt-4 btn btn-primary">
        Retry
      </button>
    </div>
  {:else if loading && sessions.length === 0}
    <div class="card p-6">
      <p class="text-gray-500 dark:text-gray-400 text-center">
        Loading sessions...
      </p>
    </div>
  {:else}
    <SessionList {sessions} onSelect={handleSessionSelect} />
  {/if}
</div>
