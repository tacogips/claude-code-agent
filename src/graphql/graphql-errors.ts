/**
 * GraphQL error helpers for resolver and executor layers.
 *
 * @module graphql/graphql-errors
 */

import { GraphQLError } from "graphql";
import type { ExecutionResult } from "graphql";

export function notFoundError(label: string): GraphQLError {
  return new GraphQLError(`${label} not found`);
}

export function toErrorResult(error: GraphQLError): ExecutionResult {
  return { errors: [error] };
}

export function asGraphqlError(error: unknown): GraphQLError {
  return error instanceof GraphQLError
    ? error
    : new GraphQLError(error instanceof Error ? error.message : String(error));
}
