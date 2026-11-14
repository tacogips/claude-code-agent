/**
 * Permission checks for optional token-based GraphQL contexts.
 *
 * @module graphql/authz
 */

import { GraphQLError } from "graphql";
import type { Permission } from "../auth";
import type { GraphqlContext } from "./types";

export function requirePermission(
  context: GraphqlContext,
  permission: Permission,
): void {
  if (context.tokenManager === undefined || context.token === undefined) {
    return;
  }

  if (!context.tokenManager.hasPermission(context.token, permission)) {
    throw new GraphQLError(`Missing permission: ${permission}`);
  }
}
