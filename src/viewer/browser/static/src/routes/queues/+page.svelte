<script lang="ts">
  import { onMount } from "svelte";
  import QueueList from "$lib/components/QueueList.svelte";
  import {
    queues,
    loadQueues,
    isLoadingQueues,
    queuesError,
    setupQueueUpdates,
  } from "$lib/stores/queues";

  onMount(() => {
    // Setup WebSocket updates
    setupQueueUpdates();

    // Load initial data
    void loadQueues();
  });

  /**
   * Handle queue selection.
   */
  function handleQueueSelect(queueId: string): void {
    window.location.href = `/queues/${queueId}`;
  }

  /**
   * Handle new queue button click.
   */
  function handleNewQueue(): void {
    // TODO: Implement queue creation
    alert("Queue creation will be implemented in a future task");
  }
</script>

<svelte:head>
  <title>Queues - Claude Code Agent</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
      Command Queues
    </h1>
    <button class="btn btn-primary" onclick={handleNewQueue}>
      New Queue
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
  {#if $isLoadingQueues}
    <div class="card p-6">
      <p class="text-gray-500 dark:text-gray-400 text-center">
        Loading queues...
      </p>
    </div>
  {:else}
    <!-- Queue List -->
    <QueueList queues={$queues} onSelect={handleQueueSelect} />
  {/if}
</div>
