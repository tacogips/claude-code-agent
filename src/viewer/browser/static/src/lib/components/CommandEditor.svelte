<script lang="ts">
  import type { QueueCommand } from "$lib/api";

  interface Props {
    command: QueueCommand;
    readonly?: boolean;
  }

  let { command, readonly = true }: Props = $props();

  /**
   * Get badge color for session mode.
   */
  function getModeBadgeClass(mode: QueueCommand["sessionMode"]): string {
    switch (mode) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "continue":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  }
</script>

<div class="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
  <!-- Mode Indicator -->
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
      Mode:
    </span>
    <span
      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getModeBadgeClass(
        command.sessionMode,
      )}"
    >
      {command.sessionMode}
    </span>
  </div>

  <!-- Prompt Editor (Display Only) -->
  <div>
    <label
      for="prompt-{command.id}"
      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      Prompt
    </label>
    {#if readonly}
      <div
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
      >
        {command.prompt}
      </div>
    {:else}
      <!-- Future: Editable textarea -->
      <textarea
        id="prompt-{command.id}"
        value={command.prompt}
        readonly
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      ></textarea>
    {/if}
  </div>

  <!-- Mode Toggle (Display Only) -->
  {#if !readonly}
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Session Mode:
      </label>
      <div class="flex gap-2">
        <button
          class="btn btn-secondary text-xs {command.sessionMode === 'new'
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
            : ''}"
          disabled
        >
          New
        </button>
        <button
          class="btn btn-secondary text-xs {command.sessionMode === 'continue'
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
            : ''}"
          disabled
        >
          Continue
        </button>
      </div>
    </div>
  {/if}

  <!-- Note about editing -->
  {#if readonly}
    <p class="text-xs text-gray-500 dark:text-gray-400 italic">
      Command editing requires API integration and will be available in a future
      update.
    </p>
  {/if}
</div>
