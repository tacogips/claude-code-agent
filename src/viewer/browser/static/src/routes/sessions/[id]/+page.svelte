<!--
 * Session detail page.
 *
 * Displays full session information including messages, token usage,
 * and cost. Supports real-time updates via WebSocket and export
 * functionality.
 *
 * @page
 -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import MessageTimeline from "$lib/components/MessageTimeline.svelte";
  import CostDisplay from "$lib/components/CostDisplay.svelte";
  import type { Session } from "$lib/api";
  import api from "$lib/api";
  import { ws } from "$lib/websocket";

  // Get session ID from URL params
  const sessionId = $derived($page.params.id);

  let session = $state<Session | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showThinking = $state(false);

  /**
   * Fetch session data from API.
   */
  async function fetchSession(): Promise<void> {
    if (sessionId === undefined) {
      error = "No session ID provided";
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      const data = await api.sessions.get(sessionId);
      session = data;

      // Subscribe to WebSocket updates
      ws.subscribe(sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error = errorMessage;
      console.error("Error fetching session:", errorMessage);
      session = null;
    } finally {
      loading = false;
    }
  }

  /**
   * Format session status as display text.
   */
  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  }

  /**
   * Format date for display.
   */
  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Export session as JSON.
   */
  function exportAsJson(): void {
    if (session === null) {
      return;
    }

    const dataStr = JSON.stringify(session, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-${session.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export session as Markdown.
   */
  function exportAsMarkdown(): void {
    if (session === null) {
      return;
    }

    let markdown = `# Session ${session.id}\n\n`;
    markdown += `**Project**: ${session.projectPath}\n`;
    markdown += `**Status**: ${session.status}\n`;
    markdown += `**Created**: ${formatDate(session.createdAt)}\n`;
    markdown += `**Updated**: ${formatDate(session.updatedAt)}\n\n`;

    if (session.tokenUsage !== undefined) {
      markdown += `## Token Usage\n\n`;
      markdown += `- Input: ${session.tokenUsage.input.toLocaleString()}\n`;
      markdown += `- Output: ${session.tokenUsage.output.toLocaleString()}\n`;
      if (session.tokenUsage.cacheRead !== undefined) {
        markdown += `- Cache Read: ${session.tokenUsage.cacheRead.toLocaleString()}\n`;
      }
      if (session.tokenUsage.cacheWrite !== undefined) {
        markdown += `- Cache Write: ${session.tokenUsage.cacheWrite.toLocaleString()}\n`;
      }
      markdown += `\n`;
    }

    if (session.costUsd !== undefined) {
      markdown += `**Total Cost**: $${session.costUsd.toFixed(4)}\n\n`;
    }

    markdown += `## Messages\n\n`;

    for (const message of session.messages) {
      markdown += `### ${message.role.toUpperCase()} - ${formatDate(message.timestamp)}\n\n`;
      markdown += `${message.content}\n\n`;

      if (message.toolCalls !== undefined && message.toolCalls.length > 0) {
        markdown += `**Tool Calls**:\n\n`;
        for (const toolCall of message.toolCalls) {
          markdown += `- **${toolCall.name}**\n`;
          markdown += `  \`\`\`json\n`;
          markdown += `  ${JSON.stringify(toolCall.input, null, 2)}\n`;
          markdown += `  \`\`\`\n\n`;
        }
      }

      markdown += `---\n\n`;
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-${session.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Handle WebSocket messages for this session.
   */
  let cleanupWebSocket: (() => void) | null = null;

  onMount(() => {
    void fetchSession();

    // Setup WebSocket message handler
    cleanupWebSocket = ws.onMessage((message) => {
      if (
        sessionId !== undefined &&
        (message.type === "session_update" || message.type === "new_message") &&
        message.sessionId === sessionId
      ) {
        // Reload session data on updates
        void fetchSession();
      }
    });
  });

  onDestroy(() => {
    // Unsubscribe from WebSocket
    if (sessionId !== undefined) {
      ws.unsubscribe(sessionId);
    }

    // Cleanup message handler
    if (cleanupWebSocket !== null) {
      cleanupWebSocket();
    }
  });
</script>

<svelte:head>
  <title>Session {sessionId} - Claude Code Agent</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div
    class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
  >
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Session Detail
      </h1>
      {#if session}
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          ID: {session.id}
        </p>
      {/if}
    </div>

    <div class="flex gap-2">
      <button
        onclick={() => window.history.back()}
        class="btn btn-secondary"
        aria-label="Go back"
      >
        Back
      </button>
      {#if session}
        <button
          onclick={exportAsJson}
          class="btn btn-secondary"
          aria-label="Export as JSON"
        >
          Export JSON
        </button>
        <button
          onclick={exportAsMarkdown}
          class="btn btn-secondary"
          aria-label="Export as Markdown"
        >
          Export MD
        </button>
      {/if}
    </div>
  </div>

  <!-- Error State -->
  {#if error}
    <div
      class="card p-6 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
    >
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
      <button onclick={() => fetchSession()} class="mt-4 btn btn-primary">
        Retry
      </button>
    </div>
  {:else if loading && session === null}
    <!-- Loading State -->
    <div class="card p-6">
      <p class="text-gray-500 dark:text-gray-400 text-center">
        Loading session...
      </p>
    </div>
  {:else if session}
    <!-- Session Content -->
    <div class="space-y-6">
      <!-- Session Metadata -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Session Information
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span
              class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase block mb-1"
            >
              Status
            </span>
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusBadgeClass(
                session.status,
              )}"
            >
              {session.status}
            </span>
          </div>

          <div>
            <span
              class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase block mb-1"
            >
              Project
            </span>
            <p class="text-sm text-gray-900 dark:text-gray-100 break-all">
              {session.projectPath}
            </p>
          </div>

          <div>
            <span
              class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase block mb-1"
            >
              Created
            </span>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {formatDate(session.createdAt)}
            </p>
          </div>

          <div>
            <span
              class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase block mb-1"
            >
              Updated
            </span>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {formatDate(session.updatedAt)}
            </p>
          </div>

          <div>
            <span
              class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase block mb-1"
            >
              Messages
            </span>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {session.messages.length}
            </p>
          </div>

          {#if session.tasks.length > 0}
            <div>
              <span
                class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase block mb-1"
              >
                Tasks
              </span>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {session.tasks.length}
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Token Usage and Cost -->
      {#if session.tokenUsage || session.costUsd !== undefined}
        <CostDisplay
          tokenUsage={session.tokenUsage}
          costUsd={session.costUsd}
        />
      {/if}

      <!-- Messages -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Messages
          </h2>
          <label
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <input
              type="checkbox"
              bind:checked={showThinking}
              class="rounded border-gray-300 dark:border-gray-600"
            />
            Show thinking
          </label>
        </div>

        <MessageTimeline messages={session.messages} {showThinking} />
      </div>
    </div>
  {/if}
</div>
