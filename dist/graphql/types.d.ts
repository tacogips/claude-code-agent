/**
 * GraphQL layer context types and internal source shapes.
 *
 * @module graphql/types
 */
import type { SdkManager } from "../sdk";
import type { TokenManager, ApiToken } from "../auth";
import type { TranscriptEvent } from "../polling/parser";
import type { Message } from "../types/message";
import type { Session, SessionMetadata, TokenUsage } from "../types/session";
export interface GraphqlContext {
    readonly sdk: SdkManager;
    readonly tokenManager?: Pick<TokenManager, "hasPermission"> | undefined;
    readonly token?: ApiToken | undefined;
}
export interface GraphqlExecutionRequest {
    readonly document: string;
    readonly variables?: Readonly<Record<string, unknown>> | undefined;
    readonly context: GraphqlContext;
}
export interface RecordLike {
    readonly [key: string]: unknown;
}
export interface SessionConnectionSource {
    readonly nodes: readonly SessionMetadata[];
    readonly total: number;
    readonly offset: number;
    readonly limit: number;
}
export interface SessionHistorySource {
    readonly sessionId: string;
    readonly events: readonly TranscriptEvent[];
    readonly total: number;
    readonly offset: number;
    readonly limit: number;
    readonly tokenUsage?: TokenUsage | undefined;
}
export type SessionGraphqlSource = Session | SessionMetadata;
export type GraphqlMessage = Omit<Message, "content"> & {
    readonly content: unknown;
};
//# sourceMappingURL=types.d.ts.map