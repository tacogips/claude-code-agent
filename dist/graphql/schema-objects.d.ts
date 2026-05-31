/**
 * GraphQL object types, enums, and scalars for the agent schema.
 *
 * @module graphql/schema-objects
 */
import { GraphQLEnumType, GraphQLObjectType } from "graphql";
import type { TranscriptEvent } from "../polling/parser";
import type { ToolCall, ToolResult } from "../types/message";
import type { TokenUsage } from "../types/session";
import type { SessionSearchResponse, TranscriptSearchResult } from "../types/session-index";
import type { GraphqlContext, GraphqlMessage, SessionConnectionSource, SessionGraphqlSource, SessionHistorySource } from "./types";
export declare const TRANSCRIPT_SEARCH_ROLE_ENUM: GraphQLEnumType;
export declare const SESSION_SEARCH_SOURCE_ENUM: GraphQLEnumType;
export declare const TOKEN_USAGE_TYPE: GraphQLObjectType<{
    readonly tokenUsage?: TokenUsage | undefined;
}, any>;
export declare const TOOL_CALL_TYPE: GraphQLObjectType<ToolCall, any>;
export declare const TOOL_RESULT_TYPE: GraphQLObjectType<ToolResult, any>;
export declare const MESSAGE_TYPE: GraphQLObjectType<GraphqlMessage, any>;
export declare const TRANSCRIPT_EVENT_TYPE: GraphQLObjectType<TranscriptEvent, any>;
export declare const SESSION_HISTORY_TYPE: GraphQLObjectType<SessionHistorySource, any>;
export declare const TRANSCRIPT_SEARCH_RESULT_TYPE: GraphQLObjectType<TranscriptSearchResult, any>;
export declare const SESSION_SEARCH_RESULT_TYPE: GraphQLObjectType<SessionSearchResponse, any>;
export declare const SESSION_TYPE: GraphQLObjectType<SessionGraphqlSource, GraphqlContext>;
export declare const SESSION_CONNECTION_TYPE: GraphQLObjectType<SessionConnectionSource, any>;
//# sourceMappingURL=schema-objects.d.ts.map