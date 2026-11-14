/**
 * GraphQL error helpers for resolver and executor layers.
 *
 * @module graphql/graphql-errors
 */
import { GraphQLError } from "graphql";
import type { ExecutionResult } from "graphql";
export declare function notFoundError(label: string): GraphQLError;
export declare function toErrorResult(error: GraphQLError): ExecutionResult;
export declare function asGraphqlError(error: unknown): GraphQLError;
//# sourceMappingURL=graphql-errors.d.ts.map