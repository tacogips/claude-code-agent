/**
 * Permission checks for optional token-based GraphQL contexts.
 *
 * @module graphql/authz
 */
import type { Permission } from "../auth";
import type { GraphqlContext } from "./types";
export declare function requirePermission(context: GraphqlContext, permission: Permission): void;
//# sourceMappingURL=authz.d.ts.map