<script lang="ts">
  import { untrack } from "svelte";
  import { page } from "$app/stores";
  import QueueDetail from "$lib/components/QueueDetail.svelte";
  import {
    currentQueue,
    loadQueue,
    unloadQueue,
    isLoadingQueue,
    queuesError,
    setupQueueUpdates,
  } from "$lib/stores/queues";

  let queueId = $derived($page.params.id);

  // Initialize on mount using $effect
  $effect(() => {
    // Capture current queueId for the effect
    const currentQueueId = queueId;

    untrack(() => {
      // Setup WebSocket updates
      setupQueueUpdates();

      // Load queue data
      if (currentQueueId !== undefined) {
        void loadQueue(currentQueueId);
      }
    });

    // Cleanup on destroy
    return () => {
      unloadQueue();
    };
  });

  /**
   * Handle back button click.
   */
  function handleBack(): void {
    window.location.href = "/queues";
  }
</script>

<svelte:head>
  <title>
    {$currentQueue !== null ? `Queue: ${$currentQueue.name}` : "Queue"} - Claude Code
    Agent
  </title>
</svelte:head>

<div class="space-y-6">
  <!-- Back Button -->
  <div>
    <button
      onclick={handleBack}
      class="btn btn-secondary text-sm inline-flex items-center gap-2"
    >
      <span>←</span>
      Back to Queues
    </button>
  </div>

  <!-- Error Message -->
  {#if $queuesError !== null}
    <div
      class="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    >
      <p class="text-red-800 dark:text-red-200">{$queuesError}</p>
    </div>
  {/if}

  <!-- Loading State -->
  {#if $isLoadingQueue}
    <div class="card p-6">
      <p class="text-gray-500 dark:text-gray-400 text-center">
        Loading queue...
      </p>
    </div>
  {:else if $currentQueue !== null}
    <!-- Queue Detail -->
    <QueueDetail queue={$currentQueue} />
  {:else if $queuesError === null}
    <div class="card p-6">
      <p class="text-gray-500 dark:text-gray-400 text-center">
        Queue not found.
      </p>
    </div>
  {/if}
</div>
