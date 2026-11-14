/**
 * Parse user/assistant records and token usage from session JSONL lines.
 *
 * @module sdk/session-reader/message-extract
 */
import type { Message, ToolCall, ToolResult } from "../../types/message";
import type { Task } from "../../types/task";
import type { TokenUsage } from "../../types/session";
import type { ContentBlock } from "./raw-types";
export declare function extractContentBlocks(content: readonly ContentBlock[]): {
    textContent: string;
    toolCalls: readonly ToolCall[] | undefined;
    toolResults: readonly ToolResult[] | undefined;
    hasToolUseBlocks: boolean | undefined;
    hasToolResultBlocks: boolean | undefined;
};
export declare function extractMessage(record: Record<string, unknown>): Message | null;
export declare function extractTasks(record: Record<string, unknown>): readonly Task[];
export declare function extractUsage(record: Record<string, unknown>): TokenUsage | undefined;
export declare function aggregateUsage(usages: readonly TokenUsage[]): TokenUsage | undefined;
//# sourceMappingURL=message-extract.d.ts.map