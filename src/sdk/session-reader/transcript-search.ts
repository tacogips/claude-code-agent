/**
 * In-memory transcript scanning (JSONL text, no filesystem).
 *
 * @module sdk/session-reader/transcript-search
 */

import type {
  TranscriptSearchOptions,
  TranscriptSearchResult,
  TranscriptSearchRole,
} from "../../types/session-index";

export function tryParseJsonRecord(
  line: string,
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function matchesRoleFilter(
  record: Record<string, unknown>,
  role: TranscriptSearchRole,
): boolean {
  if (role === "both") {
    return true;
  }

  const type = record["type"];
  if (type === "user" || type === "assistant") {
    return type === role;
  }

  const message = record["message"];
  if (typeof message !== "object" || message === null) {
    return false;
  }

  const messageRole = (message as Record<string, unknown>)["role"];
  return messageRole === role;
}

export function collectStringValues(
  value: unknown,
  output: string[],
  depth: number,
  maxDepth: number,
): void {
  if (value === null || value === undefined || depth > maxDepth) {
    return;
  }

  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, output, depth + 1, maxDepth);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const child of Object.values(value)) {
    collectStringValues(child, output, depth + 1, maxDepth);
  }
}

export function extractSearchableText(record: Record<string, unknown>): string {
  const collected: string[] = [];
  collectStringValues(record["message"], collected, 0, 6);

  if (collected.length === 0) {
    collectStringValues(record, collected, 0, 4);
  }

  return collected.join("\n");
}

export function searchTranscriptInContent(
  sessionId: string,
  content: string,
  query: string,
  options: TranscriptSearchOptions,
): TranscriptSearchResult {
  const caseSensitive = options.caseSensitive ?? false;
  const role = options.role ?? "both";
  const maxMatches = options.maxMatches ?? 1;
  const maxBytes = options.maxBytes;
  const timeoutMs = options.timeoutMs;
  const deadline =
    timeoutMs !== undefined && timeoutMs >= 0 ? Date.now() + timeoutMs : null;

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const lines = content.split(/\r?\n/);

  let matchCount = 0;
  let scannedBytes = 0;
  let scannedLines = 0;
  let truncated = false;
  let timedOut = false;

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    if (deadline !== null && Date.now() > deadline) {
      truncated = true;
      timedOut = true;
      break;
    }

    const lineBytes = Buffer.byteLength(line, "utf8") + 1;
    if (
      maxBytes !== undefined &&
      maxBytes >= 0 &&
      scannedBytes + lineBytes > maxBytes
    ) {
      truncated = true;
      break;
    }

    scannedBytes += lineBytes;
    scannedLines += 1;

    const parsed = tryParseJsonRecord(line);
    if (parsed === null) {
      continue;
    }

    if (!matchesRoleFilter(parsed, role)) {
      continue;
    }

    const searchableText = extractSearchableText(parsed);
    if (searchableText === "") {
      continue;
    }

    const normalizedText = caseSensitive
      ? searchableText
      : searchableText.toLowerCase();
    if (normalizedText.includes(normalizedQuery)) {
      matchCount += 1;
      if (maxMatches >= 0 && matchCount >= maxMatches) {
        truncated = scannedLines < lines.length;
        break;
      }
    }
  }

  return {
    sessionId,
    matched: matchCount > 0,
    matchCount,
    scannedBytes,
    scannedLines,
    truncated,
    timedOut,
  };
}
