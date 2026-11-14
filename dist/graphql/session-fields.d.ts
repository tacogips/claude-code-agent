/**
 * Field resolvers on Session-related GraphQL types.
 *
 * @module graphql/session-fields
 */
import type { SearchSessionsOptions, SessionSearchResponse, TranscriptSearchOptions, TranscriptSearchResult } from "../types/session-index";
import type { SessionGraphqlSource, GraphqlMessage, GraphqlContext, SessionHistorySource } from "./types";
import type { Session } from "../types/session";
export declare function isFullSession(source: SessionGraphqlSource): source is Session;
export declare function readSessionId(source: SessionGraphqlSource): string;
export declare function readMessageCount(source: SessionGraphqlSource): number;
export declare function resolveSessionMessages(sessionId: string, context: GraphqlContext, options: {
    readonly parseMarkdown: boolean;
    readonly excludeToolMessages: boolean;
}): Promise<readonly GraphqlMessage[]>;
export declare function resolveSessionHistory(sessionId: string, context: GraphqlContext, options: {
    readonly offset?: number;
    readonly limit?: number;
}): Promise<SessionHistorySource>;
export declare function resolveSessionGrep(sessionId: string, query: string, context: GraphqlContext, options: TranscriptSearchOptions): Promise<TranscriptSearchResult>;
export declare function resolveSessionSearch(query: string, context: GraphqlContext, options: SearchSessionsOptions): Promise<SessionSearchResponse>;
//# sourceMappingURL=session-fields.d.ts.map