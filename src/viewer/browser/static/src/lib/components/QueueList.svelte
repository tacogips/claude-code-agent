<script lang="ts">
  import type { CommandQueue } from "$lib/api";

  interface Props {
    queues: CommandQueue[];
    onSelect: (queueId: string) => void;
  }

  let { queues, onSelect }: Props = $props();

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
   * Format date for display.
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
   * Format cost for display.
   */
  function formatCost(cost: number): string {
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Shorten project path for display.
   */
  function shortenPath(path: string): string {
    const parts = path.split("/");
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join("/")}`;
    }
    return path;
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
</script>

{#if queues.length === 0}
  <div class="card p-6">
    <p class="text-gray-500 dark:text-gray-400 text-center">
      No command queues found. Create a new queue to get started.
    </p>
  </div>
{:else}
  <div class="space-y-3">
    {#each queues as queue (queue.id)}
      <button
        onclick={() => onSelect(queue.id)}
        class="card w-full p-4 hover:shadow-md transition-shadow text-left cursor-pointer"
      >
        <div class="flex flex-col gap-3">
          <!-- Header: Status, Name, and Date -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusBadgeClass(
                    queue.status,
                  )}"
                >
                  {queue.status}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(queue.createdAt)}
                </span>
              </div>
              <p
                class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                {queue.name}
              </p>
              <p
                class="text-xs text-gray-500 dark:text-gray-400 truncate"
                title={queue.projectPath}
              >
                {shortenPath(queue.projectPath)}
              </p>
            </div>

            <!-- Stats -->
            <div class="flex flex-col items-end gap-2 text-sm">
              <div class="flex items-center gap-1">
                <span class="text-gray-500 dark:text-gray-400">Cost:</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">
                  {formatCost(queue.totalCostUsd)}
                </span>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600 dark:text-gray-400">
                Commands: {getCompletedCount(queue)}
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
      </button>
    {/each}
  </div>
{/if}
