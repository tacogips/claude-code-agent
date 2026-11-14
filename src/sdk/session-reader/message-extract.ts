/**
 * Parse user/assistant records and token usage from session JSONL lines.
 *
 * @module sdk/session-reader/message-extract
 */

import type { Message, ToolCall, ToolResult } from "../../types/message";
import type { Task } from "../../types/task";
import type { TokenUsage } from "../../types/session";
import type { ContentBlock } from "./raw-types";

export function extractContentBlocks(content: readonly ContentBlock[]): {
  textContent: string;
  toolCalls: readonly ToolCall[] | undefined;
  toolResults: readonly ToolResult[] | undefined;
  hasToolUseBlocks: boolean | undefined;
  hasToolResultBlocks: boolean | undefined;
} {
  const textParts: string[] = [];
  const toolCalls: ToolCall[] = [];
  const toolResults: ToolResult[] = [];
  let hasToolUseBlocks = false;
  let hasToolResultBlocks = false;

  for (const block of content) {
    switch (block.type) {
      case "text":
        if (block.text) {
          textParts.push(block.text);
        }
        break;
      case "tool_use":
        hasToolUseBlocks = true;
        if (block.id && block.name) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input ?? {},
          });
        }
        break;
      case "tool_result":
        hasToolResultBlocks = true;
        if (block.tool_use_id) {
          const output =
            typeof block.content === "string"
              ? block.content
              : JSON.stringify(block.content ?? "");
          toolResults.push({
            id: block.tool_use_id,
            output,
            isError: block.is_error ?? false,
          });
        }
        break;
    }
  }

  return {
    textContent: textParts.join("\n"),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    hasToolUseBlocks: hasToolUseBlocks ? true : undefined,
    hasToolResultBlocks: hasToolResultBlocks ? true : undefined,
  };
}

export function extractMessage(
  record: Record<string, unknown>,
): Message | null {
  const type = record["type"] as string | undefined;
  if (type !== "user" && type !== "assistant") {
    return null;
  }

  const message = record["message"] as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") {
    return null;
  }

  const uuid = record["uuid"] as string | undefined;
  const timestamp = record["timestamp"] as string | undefined;
  const role = message["role"] as string | undefined;
  const content = message["content"];

  if (!uuid || !timestamp || !role || content === undefined) {
    return null;
  }

  let textContent: string;
  let toolCalls: readonly ToolCall[] | undefined;
  let toolResults: readonly ToolResult[] | undefined;
  let hasToolUseBlocks: boolean | undefined;
  let hasToolResultBlocks: boolean | undefined;

  if (typeof content === "string") {
    textContent = content;
  } else if (Array.isArray(content)) {
    const extracted = extractContentBlocks(content as readonly ContentBlock[]);
    textContent = extracted.textContent;
    toolCalls = extracted.toolCalls;
    toolResults = extracted.toolResults;
    hasToolUseBlocks = extracted.hasToolUseBlocks;
    hasToolResultBlocks = extracted.hasToolResultBlocks;
  } else {
    textContent = "";
  }

  return {
    id: uuid,
    role: role as Message["role"],
    content: textContent,
    timestamp,
    toolCalls,
    toolResults,
    hasToolUseBlocks,
    hasToolResultBlocks,
  };
}

export function extractTasks(record: Record<string, unknown>): readonly Task[] {
  const message = record["message"] as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") {
    return [];
  }

  const content = message["content"];
  if (!Array.isArray(content)) {
    return [];
  }

  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      block.type === "tool_use" &&
      block.name === "TodoWrite"
    ) {
      const input = block.input as { todos?: unknown } | undefined;
      if (!input || typeof input !== "object") {
        continue;
      }

      const todos = input.todos;
      if (!Array.isArray(todos)) {
        continue;
      }

      const tasks: Task[] = [];
      for (const todo of todos) {
        if (typeof todo !== "object" || todo === null) {
          continue;
        }

        const todoContent = (todo as Record<string, unknown>)["content"];
        const status = (todo as Record<string, unknown>)["status"];
        const activeForm = (todo as Record<string, unknown>)["activeForm"];

        if (
          typeof todoContent === "string" &&
          typeof status === "string" &&
          (status === "pending" ||
            status === "in_progress" ||
            status === "completed") &&
          typeof activeForm === "string"
        ) {
          tasks.push({
            content: todoContent,
            status,
            activeForm,
          });
        }
      }

      return tasks;
    }
  }

  return [];
}

export function extractUsage(
  record: Record<string, unknown>,
): TokenUsage | undefined {
  const message = record["message"] as Record<string, unknown> | undefined;
  const usage = message?.["usage"] as Record<string, unknown> | undefined;

  if (!usage) {
    return undefined;
  }

  const input = finiteUsageNumber(usage["input_tokens"], 0);
  const output = finiteUsageNumber(usage["output_tokens"], 0);
  const cacheRead = finiteOptionalUsageNumber(usage["cache_read_input_tokens"]);
  const cacheWrite = finiteOptionalUsageNumber(
    usage["cache_creation_input_tokens"],
  );

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
  };
}

function finiteUsageNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function finiteOptionalUsageNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function aggregateUsage(
  usages: readonly TokenUsage[],
): TokenUsage | undefined {
  if (usages.length === 0) {
    return undefined;
  }

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;

  for (const usage of usages) {
    totalInput += usage.input;
    totalOutput += usage.output;
    totalCacheRead += usage.cacheRead ?? 0;
    totalCacheWrite += usage.cacheWrite ?? 0;
  }

  return {
    input: totalInput,
    output: totalOutput,
    cacheRead: totalCacheRead > 0 ? totalCacheRead : undefined,
    cacheWrite: totalCacheWrite > 0 ? totalCacheWrite : undefined,
  };
}
