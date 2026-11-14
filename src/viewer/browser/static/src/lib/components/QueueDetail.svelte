<script lang="ts">
  import type { CommandQueue, QueueCommand } from "$lib/api";
  import CommandEditor from "./CommandEditor.svelte";

  interface Props {
    queue: CommandQueue;
  }

  let { queue }: Props = $props();

  let expandedCommandIds = $state<Set<string>>(new Set());

  /**
   * Get badge color for queue status.
   */
  function getStatusBadgeClass(status: CommandQueue["status"]): string {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "stopped":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  }

  /**
   * Get badge color for command status.
   */
  function getCommandStatusBadgeClass(status: QueueCommand["status"]): string {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "skipped":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
   * Format cost for display.
   */
  function formatCost(cost: number | undefined): string {
    if (cost === undefined) {
      return "N/A";
    }
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Calculate progress percentage.
   */
  function calculateProgress(queue: CommandQueue): number {
    if (queue.commands.length === 0) {
      return 0;
    }
    const completed = queue.commands.filter(
      (cmd) => cmd.status === "completed",
    ).length;
    return Math.round((completed / queue.commands.length) * 100);
  }

  /**
   * Get completed command count.
   */
  function getCompletedCount(queue: CommandQueue): string {
    const completed = queue.commands.filter(
      (cmd) => cmd.status === "completed",
    ).length;
    return `${completed}/${queue.commands.length}`;
  }

  /**
   * Toggle command expansion.
   */
  function toggleCommandExpansion(commandId: string): void {
    const newSet = new Set(expandedCommandIds);
    if (newSet.has(commandId)) {
      newSet.delete(commandId);
    } else {
      newSet.add(commandId);
    }
    expandedCommandIds = newSet;
  }

  /**
   * Check if command is expanded.
   */
  function isCommandExpanded(commandId: string): boolean {
    return expandedCommandIds.has(commandId);
  }

  /**
   * Truncate text for display.
   */
  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Get command index (1-based).
   */
  function getCommandIndex(queue: CommandQueue, commandId: string): number {
    const index = queue.commands.findIndex((cmd) => cmd.id === commandId);
    return index + 1;
  }
</script>

<div class="space-y-6">
  <!-- Queue Header -->
  <div class="card p-6">
    <div class="space-y-4">
      <!-- Title and Status -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {queue.name}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {queue.projectPath}
          </p>
        </div>
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getStatusBadgeClass(
            queue.status,
          )}"
        >
          {queue.status}
        </span>
      </div>

      <!-- Metadata Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span class="text-gray-500 dark:text-gray-400 block">Created</span>
          <span class="text-gray-900 dark:text-gray-100 font-medium">
            {formatDate(queue.createdAt)}
          </span>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400 block">Updated</span>
          <span class="text-gray-900 dark:text-gray-100 font-medium">
            {formatDate(queue.updatedAt)}
          </span>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400 block">Commands</span>
          <span class="text-gray-900 dark:text-gray-100 font-medium">
            {getCompletedCount(queue)}
          </span>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400 block">Total Cost</span>
          <span class="text-gray-900 dark:text-gray-100 font-medium">
            {formatCost(queue.totalCostUsd)}
          </span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-600 dark:text-gray-400">
            Overall Progress
          </span>
          <span class="text-gray-600 dark:text-gray-400">
            {calculateProgress(queue)}%
          </span>
        </div>
        <div
          class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
        >
          <div
            class="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
            style="width: {calculateProgress(queue)}%"
          ></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Commands List -->
  <div class="space-y-3">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
      Commands
    </h2>

    {#if queue.commands.length === 0}
      <div class="card p-6">
        <p class="text-gray-500 dark:text-gray-400 text-center">
          No commands in this queue.
        </p>
      </div>
    {:else}
      {#each queue.commands as command, index (command.id)}
        <div
          class="card p-4 {queue.currentIndex === index
            ? 'border-primary-500 border-2'
            : ''}"
        >
          <div class="space-y-3">
            <!-- Command Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex items-center gap-2">
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    Command #{getCommandIndex(queue, command.id)}
                  </span>
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getCommandStatusBadgeClass(
                      command.status,
                    )}"
                  >
                    {command.status}
                  </span>
                  {#if queue.currentIndex === index}
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                    >
                      Current
                    </span>
                  {/if}
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {command.sessionMode}
                  </span>
                </div>

                <!-- Command Prompt -->
                <button
                  onclick={() => toggleCommandExpansion(command.id)}
                  class="text-left w-full"
                >
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    {isCommandExpanded(command.id)
                      ? command.prompt
                      : truncateText(command.prompt, 150)}
                  </p>
                  {#if command.prompt.length > 150}
                    <span
                      class="text-xs text-primary-600 dark:text-primary-400"
                    >
                      {isCommandExpanded(command.id)
                        ? "Show less"
                        : "Show more"}
                    </span>
                  {/if}
                </button>
              </div>

              <!-- Command Stats -->
              <div class="flex flex-col items-end gap-1 text-xs">
                {#if command.costUsd !== undefined}
                  <div class="flex items-center gap-1">
                    <span class="text-gray-500 dark:text-gray-400">Cost:</span>
                    <span class="font-medium text-gray-900 dark:text-gray-100">
                      {formatCost(command.costUsd)}
                    </span>
                  </div>
                {/if}
                {#if command.sessionId !== undefined}
                  <a
                    href="/sessions/{command.sessionId}"
                    class="text-primary-600 dark:text-primary-400 hover:underline"
                    onclick={(e) => e.stopPropagation()}
                  >
                    View Session
                  </a>
                {/if}
              </div>
            </div>

            <!-- Command Results (for completed/failed) -->
            {#if command.status === "completed" || command.status === "failed"}
              <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {#if command.startedAt !== undefined}
                    <div>
                      <span class="text-gray-500 dark:text-gray-400 block">
                        Started
                      </span>
                      <span class="text-gray-900 dark:text-gray-100">
                        {formatDate(command.startedAt)}
                      </span>
                    </div>
                  {/if}
                  {#if command.completedAt !== undefined}
                    <div>
                      <span class="text-gray-500 dark:text-gray-400 block">
                        Completed
                      </span>
                      <span class="text-gray-900 dark:text-gray-100">
                        {formatDate(command.completedAt)}
                      </span>
                    </div>
                  {/if}
                  {#if command.sessionId !== undefined}
                    <div>
                      <span class="text-gray-500 dark:text-gray-400 block">
                        Session ID
                      </span>
                      <span class="text-gray-900 dark:text-gray-100 font-mono">
                        {command.sessionId.substring(0, 8)}...
                      </span>
                    </div>
                  {/if}
                </div>
                {#if command.error !== undefined}
                  <div class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                    <p class="text-sm text-red-800 dark:text-red-200">
                      <span class="font-medium">Error:</span>
                      {command.error}
                    </p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
