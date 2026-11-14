<!--
 * MessageTimeline component for displaying session messages.
 *
 * Shows messages in chronological order with different styling for
 * user, assistant, and system messages. Includes tool call display
 * with collapsible sections.
 *
 * @component
 -->
<script lang="ts">
  import CodeBlock from "./CodeBlock.svelte";
  import type { Message, ToolCall, ToolResult } from "../api";

  interface Props {
    messages: readonly Message[];
    showThinking?: boolean;
  }

  let { messages, showThinking = false }: Props = $props();

  /**
   * Format timestamp for display.
   */
  function formatTimestamp(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * Get CSS classes for message role.
   */
  function getMessageClass(role: string): string {
    switch (role) {
      case "user":
        return "message-user";
      case "assistant":
        return "message-assistant";
      case "system":
        return "message-system";
      default:
        return "";
    }
  }

  /**
   * Check if content contains code blocks (simple heuristic).
   */
  function hasCodeBlock(content: string): boolean {
    return content.includes("```");
  }

  /**
   * Parse markdown code blocks from content.
   */
  function parseCodeBlocks(
    content: string,
  ): Array<{ type: "text" | "code"; content: string; language?: string }> {
    const parts: Array<{
      type: "text" | "code";
      content: string;
      language?: string;
    }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add code block
      const language = match[1];
      const code = match[2];
      if (code !== undefined) {
        parts.push({
          type: "code",
          content: code,
          language: language,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: "text", content }];
  }

  /**
   * State for expanded tool calls.
   */
  let expandedTools = $state<Set<string>>(new Set());

  /**
   * Toggle tool call expansion.
   */
  function toggleTool(toolId: string): void {
    const newSet = new Set(expandedTools);
    if (newSet.has(toolId)) {
      newSet.delete(toolId);
    } else {
      newSet.add(toolId);
    }
    expandedTools = newSet;
  }

  /**
   * Format JSON input for display.
   */
  function formatJson(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, null, 2);
  }
</script>

<div class="message-timeline">
  {#if messages.length === 0}
    <div class="card p-8 text-center">
      <p class="text-gray-500 dark:text-gray-400">No messages yet</p>
    </div>
  {:else}
    <div class="messages">
      {#each messages as message (message.id)}
        <div class="message {getMessageClass(message.role)}">
          <!-- Message Header -->
          <div class="message-header">
            <span class="message-role">{message.role}</span>
            <span class="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>

          <!-- Message Content -->
          <div class="message-content">
            {#if hasCodeBlock(message.content)}
              {#each parseCodeBlocks(message.content) as part}
                {#if part.type === "code"}
                  <CodeBlock code={part.content} language={part.language} />
                {:else}
                  <div class="message-text">{part.content}</div>
                {/if}
              {/each}
            {:else}
              <div class="message-text">{message.content}</div>
            {/if}
          </div>

          <!-- Tool Calls -->
          {#if message.toolCalls && message.toolCalls.length > 0}
            <div class="tool-calls">
              {#each message.toolCalls as toolCall (toolCall.id)}
                <div class="tool-call">
                  <button
                    onclick={() => toggleTool(toolCall.id)}
                    class="tool-header"
                  >
                    <span class="tool-name">{toolCall.name}</span>
                    <svg
                      class="tool-icon {expandedTools.has(toolCall.id)
                        ? 'expanded'
                        : ''}"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {#if expandedTools.has(toolCall.id)}
                    <div class="tool-content">
                      <div class="tool-section">
                        <h4 class="tool-section-title">Input</h4>
                        <CodeBlock
                          code={formatJson(toolCall.input)}
                          language="json"
                        />
                      </div>

                      <!-- Tool Result -->
                      {#if message.toolResults}
                        {#each message.toolResults as result}
                          {#if result.id === toolCall.id}
                            <div class="tool-section">
                              <h4 class="tool-section-title">
                                {result.isError ? "Error" : "Output"}
                              </h4>
                              <CodeBlock
                                code={result.output}
                                language={result.isError ? "error" : undefined}
                              />
                            </div>
                          {/if}
                        {/each}
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .message-timeline {
    @apply space-y-4;
  }

  .messages {
    @apply space-y-4;
  }

  .message {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4;
  }

  .message-user {
    @apply border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20;
    @apply ml-8;
  }

  .message-assistant {
    @apply border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800;
    @apply mr-8;
  }

  .message-system {
    @apply border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50;
    @apply text-sm;
  }

  .message-header {
    @apply flex items-center justify-between mb-2;
  }

  .message-role {
    @apply text-xs font-semibold uppercase text-gray-600 dark:text-gray-400;
  }

  .message-timestamp {
    @apply text-xs text-gray-500 dark:text-gray-500;
  }

  .message-content {
    @apply space-y-2;
  }

  .message-text {
    @apply text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap;
  }

  .tool-calls {
    @apply mt-4 space-y-2;
  }

  .tool-call {
    @apply border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden;
  }

  .tool-header {
    @apply w-full flex items-center justify-between px-4 py-2;
    @apply bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700;
    @apply transition-colors cursor-pointer;
  }

  .tool-name {
    @apply text-sm font-medium text-gray-700 dark:text-gray-300;
  }

  .tool-icon {
    @apply h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform;
  }

  .tool-icon.expanded {
    @apply transform rotate-180;
  }

  .tool-content {
    @apply p-4 space-y-4 bg-white dark:bg-gray-900;
  }

  .tool-section-title {
    @apply text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-2;
  }
</style>
