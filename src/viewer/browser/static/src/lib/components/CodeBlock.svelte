<!--
 * CodeBlock component for syntax-highlighted code display.
 *
 * Displays code with a copy button and optional language label.
 * Supports line numbers and simple syntax highlighting.
 *
 * @component
 -->
<script lang="ts">
  interface Props {
    code: string;
    language?: string;
    showLineNumbers?: boolean;
  }

  let { code, language, showLineNumbers = false }: Props = $props();

  let copied = $state(false);

  /**
   * Copy code to clipboard.
   */
  async function copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  }

  /**
   * Split code into lines for line number display.
   */
  let lines = $derived(code.split("\n"));
</script>

<div class="code-block-container">
  <!-- Header with language and copy button -->
  <div class="code-header">
    {#if language}
      <span class="language-label">{language}</span>
    {/if}
    <button
      onclick={copyToClipboard}
      class="copy-button"
      aria-label="Copy code"
      title={copied ? "Copied!" : "Copy code"}
    >
      {#if copied}
        <!-- Check icon -->
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      {:else}
        <!-- Copy icon -->
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      {/if}
    </button>
  </div>

  <!-- Code display -->
  <div class="code-content">
    {#if showLineNumbers}
      <div class="code-lines">
        <div class="line-numbers">
          {#each lines as _, i}
            <div class="line-number">{i + 1}</div>
          {/each}
        </div>
        <pre class="code-text"><code>{code}</code></pre>
      </div>
    {:else}
      <pre class="code-text"><code>{code}</code></pre>
    {/if}
  </div>
</div>

<style>
  .code-block-container {
    @apply bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700;
  }

  .code-header {
    @apply flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700;
  }

  .language-label {
    @apply text-xs font-medium text-gray-600 dark:text-gray-400 uppercase;
  }

  .copy-button {
    @apply p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors;
  }

  .code-content {
    @apply overflow-x-auto;
  }

  .code-lines {
    @apply flex;
  }

  .line-numbers {
    @apply select-none text-right pr-3 pl-4 py-3 border-r border-gray-300 dark:border-gray-700;
  }

  .line-number {
    @apply text-xs text-gray-500 dark:text-gray-500;
  }

  .code-text {
    @apply flex-1 px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100 bg-transparent;
    @apply overflow-x-auto;
  }

  .code-text code {
    @apply font-mono;
  }
</style>
