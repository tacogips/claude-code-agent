/**
 * Root GraphQL Query/Mutation wiring and executor.
 *
 * @module graphql/schema-root
 */

import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  execute,
  parse,
  validate,
  type DocumentNode,
  type ExecutionResult,
} from "graphql";
import type { GraphqlExecutionRequest, GraphqlContext } from "./types";
import {
  SESSION_CONNECTION_TYPE,
  SESSION_SEARCH_RESULT_TYPE,
  SESSION_SEARCH_SOURCE_ENUM,
  SESSION_TYPE,
  TRANSCRIPT_SEARCH_ROLE_ENUM,
} from "./schema-objects";
import { JSON_SCALAR } from "./json";
import { executeCommand } from "./commands";
import { resolveSessionSearch } from "./session-fields";
import { requirePermission } from "./authz";
import { asGraphqlError, toErrorResult } from "./graphql-errors";

const QUERY_TYPE = new GraphQLObjectType<unknown, GraphqlContext>({
  name: "Query",
  fields: {
    command: {
      type: new GraphQLNonNull(JSON_SCALAR),
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        params: { type: JSON_SCALAR },
      },
      async resolve(_source, args, context) {
        return executeCommand(args.name, args.params, context);
      },
    },
    ping: {
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve() {
        return true;
      },
    },
    sessions: {
      type: new GraphQLNonNull(SESSION_CONNECTION_TYPE),
      args: {
        projectPath: { type: GraphQLString },
        status: { type: GraphQLString },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      async resolve(_source, args, context) {
        requirePermission(context, "session:read");

        let sessions = [
          ...(await context.sdk.sessions.listSessions(args.projectPath)),
        ];
        if (typeof args.status === "string" && args.status.length > 0) {
          sessions = sessions.filter(
            (session) => session.status === args.status,
          );
        }

        const offset = Math.max(0, args.offset ?? 0);
        const total = sessions.length;
        const paginated =
          args.limit === undefined
            ? sessions.slice(offset)
            : sessions.slice(offset, offset + Math.max(0, args.limit));

        return {
          nodes: paginated,
          total,
          offset,
          limit:
            args.limit === undefined
              ? paginated.length
              : Math.max(0, args.limit),
        };
      },
    },
    session: {
      type: SESSION_TYPE,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_source, args, context) {
        requirePermission(context, "session:read");
        return context.sdk.sessions.getSession(args.id);
      },
    },
    searchSessions: {
      type: new GraphQLNonNull(SESSION_SEARCH_RESULT_TYPE),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
        projectPath: { type: GraphQLString },
        workingDirectoryPrefix: { type: GraphQLString },
        projectPathPrefix: { type: GraphQLString },
        source: { type: SESSION_SEARCH_SOURCE_ENUM },
        offset: { type: GraphQLInt },
        limit: { type: GraphQLInt },
        maxSessions: { type: GraphQLInt },
        caseSensitive: { type: GraphQLBoolean },
        role: { type: TRANSCRIPT_SEARCH_ROLE_ENUM },
        maxMatches: { type: GraphQLInt },
        maxBytes: { type: GraphQLInt },
        timeoutMs: { type: GraphQLInt },
      },
      async resolve(_source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionSearch(args.query, context, {
          projectPath: args.projectPath,
          workingDirectoryPrefix: args.workingDirectoryPrefix,
          projectPathPrefix: args.projectPathPrefix,
          source: args.source,
          offset: args.offset,
          limit: args.limit,
          maxSessions: args.maxSessions,
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

const MUTATION_TYPE = new GraphQLObjectType<unknown, GraphqlContext>({
  name: "Mutation",
  fields: {
    command: {
      type: new GraphQLNonNull(JSON_SCALAR),
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        params: { type: JSON_SCALAR },
      },
      async resolve(_source, args, context) {
        return executeCommand(args.name, args.params, context);
      },
    },
  },
});

const SCHEMA = new GraphQLSchema({
  query: QUERY_TYPE,
  mutation: MUTATION_TYPE,
});

export function getGraphqlSchema(): GraphQLSchema {
  return SCHEMA;
}

export async function executeGraphqlDocument(
  request: GraphqlExecutionRequest,
): Promise<ExecutionResult> {
  let document: DocumentNode;
  try {
    document = parse(request.document);
  } catch (error) {
    return toErrorResult(asGraphqlError(error));
  }

  const validationErrors = validate(SCHEMA, document);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  return execute({
    schema: SCHEMA,
    document,
    variableValues: request.variables,
    contextValue: request.context,
  });
}
