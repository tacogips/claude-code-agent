<!--
 * CostDisplay component for token usage and cost information.
 *
 * Displays token counts (input, output, cache) and total cost in USD.
 *
 * @component
 -->
<script lang="ts">
  interface TokenUsage {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  }

  interface Props {
    tokenUsage?: TokenUsage;
    costUsd?: number;
  }

  let { tokenUsage, costUsd }: Props = $props();

  /**
   * Format cost as USD currency.
   */
  function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Format token count with thousands separator.
   */
  function formatTokens(count: number): string {
    return count.toLocaleString();
  }

  /**
   * Calculate total tokens.
   */
  let totalTokens = $derived.by(() => {
    if (tokenUsage === undefined) {
      return 0;
    }
    return tokenUsage.input + tokenUsage.output;
  });
</script>

<div class="card p-4">
  {#if tokenUsage || costUsd !== undefined}
    <div class="cost-grid">
      <!-- Token Usage -->
      {#if tokenUsage}
        <div class="cost-item">
          <span class="cost-label">Input Tokens</span>
          <span class="cost-value">{formatTokens(tokenUsage.input)}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">Output Tokens</span>
          <span class="cost-value">{formatTokens(tokenUsage.output)}</span>
        </div>
        {#if tokenUsage.cacheRead !== undefined && tokenUsage.cacheRead > 0}
          <div class="cost-item">
            <span class="cost-label">Cache Read</span>
            <span class="cost-value">{formatTokens(tokenUsage.cacheRead)}</span>
          </div>
        {/if}
        {#if tokenUsage.cacheWrite !== undefined && tokenUsage.cacheWrite > 0}
          <div class="cost-item">
            <span class="cost-label">Cache Write</span>
            <span class="cost-value">
              {formatTokens(tokenUsage.cacheWrite)}
            </span>
          </div>
        {/if}
        <div class="cost-item total">
          <span class="cost-label">Total Tokens</span>
          <span class="cost-value">{formatTokens(totalTokens)}</span>
        </div>
      {/if}

      <!-- Cost in USD -->
      {#if costUsd !== undefined}
        <div class="cost-item total">
          <span class="cost-label">Total Cost</span>
          <span class="cost-value cost-highlight">{formatCost(costUsd)}</span>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-gray-500 dark:text-gray-400">
      No cost information available
    </p>
  {/if}
</div>

<style>
  .cost-grid {
    @apply grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4;
  }

  .cost-item {
    @apply flex flex-col;
  }

  .cost-item.total {
    @apply border-t pt-4 border-gray-200 dark:border-gray-700;
  }

  .cost-label {
    @apply text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-1;
  }

  .cost-value {
    @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
  }

  .cost-highlight {
    @apply text-primary-600 dark:text-primary-400;
  }
</style>
