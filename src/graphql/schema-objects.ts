/**
 * GraphQL object types, enums, and scalars for the agent schema.
 *
 * @module graphql/schema-objects
 */

import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import type { TranscriptEvent } from "../polling/parser";
import type { ToolCall, ToolResult } from "../types/message";
import type { TokenUsage } from "../types/session";
import type {
  SessionSearchResponse,
  TranscriptSearchResult,
} from "../types/session-index";
import { requirePermission } from "./authz";
import { JSON_SCALAR } from "./json";
import {
  readMessageCount,
  readSessionId,
  resolveSessionGrep,
  resolveSessionHistory,
  resolveSessionMessages,
} from "./session-fields";
import type {
  GraphqlContext,
  GraphqlMessage,
  SessionConnectionSource,
  SessionGraphqlSource,
  SessionHistorySource,
} from "./types";

export const TRANSCRIPT_SEARCH_ROLE_ENUM = new GraphQLEnumType({
  name: "TranscriptSearchRole",
  values: {
    USER: { value: "user" },
    ASSISTANT: { value: "assistant" },
    BOTH: { value: "both" },
  },
});

export const SESSION_SEARCH_SOURCE_ENUM = new GraphQLEnumType({
  name: "SessionSearchSource",
  values: {
    ALL: { value: "all" },
    UUID: { value: "uuid" },
    LEGACY: { value: "legacy" },
  },
});

export const TOKEN_USAGE_TYPE = new GraphQLObjectType<{
  readonly tokenUsage?: TokenUsage | undefined;
}>({
  name: "TokenUsage",
  fields: {
    input: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(source) {
        return source.tokenUsage?.input ?? 0;
      },
    },
    output: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(source) {
        return source.tokenUsage?.output ?? 0;
      },
    },
    cacheRead: {
      type: GraphQLInt,
      resolve(source) {
        return source.tokenUsage?.cacheRead;
      },
    },
    cacheWrite: {
      type: GraphQLInt,
      resolve(source) {
        return source.tokenUsage?.cacheWrite;
      },
    },
  },
});

export const TOOL_CALL_TYPE = new GraphQLObjectType<ToolCall>({
  name: "SessionToolCall",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    input: { type: new GraphQLNonNull(JSON_SCALAR) },
  },
});

export const TOOL_RESULT_TYPE = new GraphQLObjectType<ToolResult>({
  name: "SessionToolResult",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    output: { type: new GraphQLNonNull(GraphQLString) },
    isError: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

export const MESSAGE_TYPE = new GraphQLObjectType<GraphqlMessage>({
  name: "SessionMessage",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(JSON_SCALAR) },
    timestamp: { type: new GraphQLNonNull(GraphQLString) },
    toolCalls: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(TOOL_CALL_TYPE)),
      ),
      resolve(source) {
        return source.toolCalls ?? [];
      },
    },
    toolResults: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(TOOL_RESULT_TYPE)),
      ),
      resolve(source) {
        return source.toolResults ?? [];
      },
    },
    hasToolUseBlocks: { type: GraphQLBoolean },
    hasToolResultBlocks: { type: GraphQLBoolean },
  },
});

export const TRANSCRIPT_EVENT_TYPE = new GraphQLObjectType<TranscriptEvent>({
  name: "TranscriptEvent",
  fields: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    uuid: { type: GraphQLString },
    timestamp: { type: GraphQLString },
    content: { type: JSON_SCALAR },
    raw: { type: new GraphQLNonNull(JSON_SCALAR) },
  },
});

export const SESSION_HISTORY_TYPE = new GraphQLObjectType<SessionHistorySource>(
  {
    name: "SessionHistory",
    fields: {
      sessionId: { type: new GraphQLNonNull(GraphQLString) },
      events: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(TRANSCRIPT_EVENT_TYPE)),
        ),
      },
      total: { type: new GraphQLNonNull(GraphQLInt) },
      offset: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      tokenUsage: {
        type: TOKEN_USAGE_TYPE,
        resolve(source) {
          return source.tokenUsage === undefined ? null : source;
        },
      },
    },
  },
);

export const TRANSCRIPT_SEARCH_RESULT_TYPE =
  new GraphQLObjectType<TranscriptSearchResult>({
    name: "TranscriptSearchResult",
    fields: {
      sessionId: { type: new GraphQLNonNull(GraphQLString) },
      matched: { type: new GraphQLNonNull(GraphQLBoolean) },
      matchCount: { type: new GraphQLNonNull(GraphQLInt) },
      scannedBytes: { type: new GraphQLNonNull(GraphQLInt) },
      scannedLines: { type: new GraphQLNonNull(GraphQLInt) },
      truncated: { type: new GraphQLNonNull(GraphQLBoolean) },
      timedOut: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  });

export const SESSION_SEARCH_RESULT_TYPE =
  new GraphQLObjectType<SessionSearchResponse>({
    name: "SessionSearchResult",
    fields: {
      sessionIds: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(GraphQLString)),
        ),
      },
      total: { type: new GraphQLNonNull(GraphQLInt) },
      offset: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      scannedSessions: { type: new GraphQLNonNull(GraphQLInt) },
      truncated: { type: new GraphQLNonNull(GraphQLBoolean) },
      timedOut: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  });

export const SESSION_TYPE = new GraphQLObjectType<
  SessionGraphqlSource,
  GraphqlContext
>({
  name: "Session",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    projectPath: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    messageCount: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(source) {
        return readMessageCount(source);
      },
    },
    costUsd: { type: GraphQLFloat },
    tokenUsage: {
      type: TOKEN_USAGE_TYPE,
      resolve(source) {
        return source.tokenUsage === undefined ? null : source;
      },
    },
    messages: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(MESSAGE_TYPE)),
      ),
      args: {
        parseMarkdown: { type: GraphQLBoolean },
        excludeToolMessages: { type: GraphQLBoolean },
      },
      async resolve(source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionMessages(readSessionId(source), context, {
          parseMarkdown: args.parseMarkdown ?? false,
          excludeToolMessages: args.excludeToolMessages ?? false,
        });
      },
    },
    history: {
      type: new GraphQLNonNull(SESSION_HISTORY_TYPE),
      args: {
        offset: { type: GraphQLInt },
        limit: { type: GraphQLInt },
      },
      async resolve(source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionHistory(readSessionId(source), context, {
          offset: args.offset,
          limit: args.limit,
        });
      },
    },
    grep: {
      type: new GraphQLNonNull(TRANSCRIPT_SEARCH_RESULT_TYPE),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
        caseSensitive: { type: GraphQLBoolean },
        role: { type: TRANSCRIPT_SEARCH_ROLE_ENUM },
        maxMatches: { type: GraphQLInt },
        maxBytes: { type: GraphQLInt },
        timeoutMs: { type: GraphQLInt },
      },
      async resolve(source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionGrep(readSessionId(source), args.query, context, {
          caseSensitive: args.caseSensitive,
          role: args.role,
          maxMatches: args.maxMatches,
          maxBytes: args.maxBytes,
          timeoutMs: args.timeoutMs,
        });
      },
    },
  },
});

export const SESSION_CONNECTION_TYPE =
  new GraphQLObjectType<SessionConnectionSource>({
    name: "SessionConnection",
    fields: {
      nodes: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(SESSION_TYPE)),
        ),
      },
      total: { type: new GraphQLNonNull(GraphQLInt) },
      offset: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
    },
  });
