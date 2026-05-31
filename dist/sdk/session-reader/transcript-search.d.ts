/**
 * In-memory transcript scanning (JSONL text, no filesystem).
 *
 * @module sdk/session-reader/transcript-search
 */
import type { TranscriptSearchOptions, TranscriptSearchResult, TranscriptSearchRole } from "../../types/session-index";
export declare function tryParseJsonRecord(line: string): Record<string, unknown> | null;
export declare function matchesRoleFilter(record: Record<string, unknown>, role: TranscriptSearchRole): boolean;
export declare function collectStringValues(value: unknown, output: string[], depth: number, maxDepth: number): void;
export declare function extractSearchableText(record: Record<string, unknown>): string;
export declare function searchTranscriptInContent(sessionId: string, content: string, query: string, options: TranscriptSearchOptions): TranscriptSearchResult;
//# sourceMappingURL=transcript-search.d.ts.map