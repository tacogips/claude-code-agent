/**
 * GraphQL JSON scalar and literal parsing.
 *
 * @module graphql/json
 */
import { GraphQLScalarType, type ValueNode } from "graphql";
export declare function parseJsonLiteral(ast: ValueNode): unknown;
export declare const JSON_SCALAR: GraphQLScalarType<unknown, unknown>;
//# sourceMappingURL=json.d.ts.map