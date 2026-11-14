/**
 * Root GraphQL Query/Mutation wiring and executor.
 *
 * @module graphql/schema-root
 */
import { GraphQLSchema, type ExecutionResult } from "graphql";
import type { GraphqlExecutionRequest } from "./types";
export declare function getGraphqlSchema(): GraphQLSchema;
export declare function executeGraphqlDocument(request: GraphqlExecutionRequest): Promise<ExecutionResult>;
//# sourceMappingURL=schema-root.d.ts.map