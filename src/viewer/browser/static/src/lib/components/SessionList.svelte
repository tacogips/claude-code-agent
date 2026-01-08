<script lang="ts">
  import type {
    SessionMetadata,
    SessionStatus,
  } from "../../../../../../types/session";

  interface Props {
    sessions: SessionMetadata[];
    onSelect: (sessionId: string) => void;
  }

  let { sessions, onSelect }: Props = $props();

  let searchQuery = $state("");
  let selectedProject = $state<string>("all");
  let sortBy = $state<"date" | "cost" | "messages">("date");
  let sortOrder = $state<"asc" | "desc">("desc");

  /**
   * Get unique projects from sessions
   */
  let projects = $derived.by(() => {
    const projectSet = new Set(sessions.map((s) => s.projectPath));
    return Array.from(projectSet).sort();
  });

  /**
   * Filter sessions by search query and project
   */
  let filteredSessions = $derived.by(() => {
    return sessions.filter((session) => {
      // Project filter
      if (
        selectedProject !== "all" &&
        session.projectPath !== selectedProject
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const projectPath = session.projectPath.toLowerCase();
        const sessionId = session.id.toLowerCase();

        return projectPath.includes(query) || sessionId.includes(query);
      }

      return true;
    });
  });

  /**
   * Sort filtered sessions
   */
  let sortedSessions = $derived.by(() => {
    const sorted = [...filteredSessions];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "cost") {
        const costA = a.costUsd ?? 0;
        const costB = b.costUsd ?? 0;
        comparison = costA - costB;
      } else if (sortBy === "messages") {
        comparison = a.messageCount - b.messageCount;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  });

  /**
   * Get badge color for session status
   */
  function getStatusBadgeClass(status: SessionStatus): string {
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
   * Format date for display
   */
  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  /**
   * Format cost for display
   */
  function formatCost(cost: number | undefined): string {
    if (cost === undefined) {
      return "N/A";
    }
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Shorten project path for display
   */
  function shortenPath(path: string): string {
    const parts = path.split("/");
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join("/")}`;
    }
    return path;
  }

  /**
   * Toggle sort order or change sort field
   */
  function handleSort(field: "date" | "cost" | "messages"): void {
    if (sortBy === field) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      sortBy = field;
      sortOrder = "desc";
    }
  }
</script>

<div class="space-y-4">
  <!-- Search and Filter Controls -->
  <div class="flex flex-col sm:flex-row gap-4">
    <!-- Search Input -->
    <div class="flex-1">
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search by project path or session ID..."
        class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- Project Filter -->
    <div>
      <select
        bind:value={selectedProject}
        class="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="all">All Projects</option>
        {#each projects as project}
          <option value={project}>{shortenPath(project)}</option>
        {/each}
      </select>
    </div>

    <!-- Sort Controls -->
    <div class="flex gap-2">
      <button
        onclick={() => handleSort("date")}
        class="btn btn-secondary text-sm"
        class:active={sortBy === "date"}
      >
        Date {sortBy === "date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
      </button>
      <button
        onclick={() => handleSort("cost")}
        class="btn btn-secondary text-sm"
        class:active={sortBy === "cost"}
      >
        Cost {sortBy === "cost" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
      </button>
      <button
        onclick={() => handleSort("messages")}
        class="btn btn-secondary text-sm"
        class:active={sortBy === "messages"}
      >
        Messages {sortBy === "messages"
          ? sortOrder === "asc"
            ? "↑"
            : "↓"
          : ""}
      </button>
    </div>
  </div>

  <!-- Session Count -->
  <div class="text-sm text-gray-600 dark:text-gray-400">
    Showing {sortedSessions.length} of {sessions.length} sessions
  </div>

  <!-- Sessions List -->
  {#if sortedSessions.length === 0}
    <div class="card p-6">
      <p class="text-gray-500 dark:text-gray-400 text-center">
        {searchQuery || selectedProject !== "all"
          ? "No sessions match your filters."
          : "No sessions found. Start a Claude Code session to see it here."}
      </p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each sortedSessions as session (session.id)}
        <button
          onclick={() => onSelect(session.id)}
          class="card w-full p-4 hover:shadow-md transition-shadow text-left cursor-pointer"
        >
          <div class="flex flex-col sm:flex-row justify-between gap-3">
            <!-- Left: Status, Project, and Date -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusBadgeClass(
                    session.status,
                  )}"
                >
                  {session.status}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(session.createdAt)}
                </span>
              </div>
              <p
                class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                title={session.projectPath}
              >
                {session.projectPath}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                ID: {session.id}
              </p>
            </div>

            <!-- Right: Stats -->
            <div class="flex sm:flex-col sm:items-end gap-4 sm:gap-2 text-sm">
              <div class="flex items-center gap-1">
                <span class="text-gray-500 dark:text-gray-400">Messages:</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">
                  {session.messageCount}
                </span>
              </div>
              {#if session.costUsd !== undefined}
                <div class="flex items-center gap-1">
                  <span class="text-gray-500 dark:text-gray-400">Cost:</span>
                  <span class="font-medium text-gray-900 dark:text-gray-100">
                    {formatCost(session.costUsd)}
                  </span>
                </div>
              {/if}
              {#if session.tokenUsage}
                <div
                  class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  <span>
                    {(
                      session.tokenUsage.input + session.tokenUsage.output
                    ).toLocaleString()} tokens
                  </span>
                </div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .btn.active {
    @apply bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300;
  }
</style>
