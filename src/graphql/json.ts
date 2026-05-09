/**
 * GraphQL JSON scalar and literal parsing.
 *
 * @module graphql/json
 */

import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

export function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.NULL:
      return null;
    case Kind.STRING:
    case Kind.ENUM:
      return ast.value;
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.OBJECT: {
      const value: Record<string, unknown> = {};
      for (const field of ast.fields) {
        value[field.name.value] = parseJsonLiteral(field.value);
      }
      return value;
    }
    default:
      return null;
  }
}

export const JSON_SCALAR = new GraphQLScalarType({
  name: "JSON",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast: ValueNode): unknown {
    return parseJsonLiteral(ast);
  },
});
