/**
 * Field resolvers on Session-related GraphQL types.
 *
 * @module graphql/session-fields
 */

import type {
  SearchSessionsOptions,
  SessionSearchResponse,
  TranscriptSearchOptions,
  TranscriptSearchResult,
} from "../types/session-index";
import type {
  SessionGraphqlSource,
  GraphqlMessage,
  GraphqlContext,
  SessionHistorySource,
} from "./types";
import type { Session } from "../types/session";
import { asGraphqlError, notFoundError } from "./graphql-errors";

export function isFullSession(source: SessionGraphqlSource): source is Session {
  return "messages" in source;
}

export function readSessionId(source: SessionGraphqlSource): string {
  return source.id;
}

export function readMessageCount(source: SessionGraphqlSource): number {
  if (isFullSession(source)) {
    return source.messages.length;
  }
  return source.messageCount;
}

export async function resolveSessionMessages(
  sessionId: string,
  context: GraphqlContext,
  options: {
    readonly parseMarkdown: boolean;
    readonly excludeToolMessages: boolean;
  },
): Promise<readonly GraphqlMessage[]> {
  const messages = await context.sdk.sessions.getMessages(sessionId, {
    excludeToolMessages: options.excludeToolMessages,
  });

  if (messages.length === 0) {
    const session = await context.sdk.sessions.getSession(sessionId);
    if (session === null) {
      throw notFoundError("Session");
    }
  }

  if (!options.parseMarkdown) {
    return messages;
  }

  return messages.map((message) => ({
    ...message,
    content: context.sdk.parseMarkdown(message.content),
  }));
}

export async function resolveSessionHistory(
  sessionId: string,
  context: GraphqlContext,
  options: { readonly offset?: number; readonly limit?: number },
): Promise<SessionHistorySource> {
  const result = await context.sdk.sessions.readTranscript(sessionId, options);
  if (result.isErr()) {
    throw asGraphqlError(result.error);
  }

  return {
    sessionId,
    events: result.value.events,
    total: result.value.total,
    offset: Math.max(0, options.offset ?? 0),
    limit: options.limit ?? result.value.events.length,
    tokenUsage: result.value.tokenUsage,
  };
}

export async function resolveSessionGrep(
  sessionId: string,
  query: string,
  context: GraphqlContext,
  options: TranscriptSearchOptions,
): Promise<TranscriptSearchResult> {
  const result = await context.sdk.sessions.searchTranscript(
    sessionId,
    query,
    options,
  );
  if (result.isErr()) {
    throw asGraphqlError(result.error);
  }
  return result.value;
}

export async function resolveSessionSearch(
  query: string,
  context: GraphqlContext,
  options: SearchSessionsOptions,
): Promise<SessionSearchResponse> {
  return context.sdk.sessions.searchSessions(query, options);
}
