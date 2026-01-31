/**
 * Authentication helper for route handlers.
 *
 * Provides helper function to extract and validate Bearer tokens.
 *
 * @module daemon/routes/auth-helper
 */

import type { TokenManager } from "../auth";
import type { Permission, ApiToken } from "../types";

/**
 * Result of token validation
 */
export type AuthResult =
  | { success: true; token: ApiToken }
  | { success: false; status: number; error: string; message: string };

/**
 * Extract and validate token from Authorization header.
 *
 * @param authHeader - Authorization header value
 * @param tokenManager - Token manager instance
 * @param requiredPermission - Required permission (optional)
 * @returns Validation result with token or error
 */
export async function validateAuth(
  authHeader: string | null,
  tokenManager: TokenManager,
  requiredPermission?: Permission,
): Promise<AuthResult> {
  // Check for Authorization header
  if (authHeader === null) {
    return {
      success: false,
      status: 401,
      error: "Unauthorized",
      message: "Missing Authorization header",
    };
  }

  // Parse Bearer token format
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return {
      success: false,
      status: 401,
      error: "Unauthorized",
      message: "Invalid Authorization header format. Expected: Bearer <token>",
    };
  }

  const tokenString = parts[1];
  if (tokenString === undefined) {
    return {
      success: false,
      status: 401,
      error: "Unauthorized",
      message: "Missing token in Authorization header",
    };
  }

  // Validate token
  const token = await tokenManager.validateToken(tokenString);
  if (token === null) {
    return {
      success: false,
      status: 401,
      error: "Unauthorized",
      message: "Invalid or expired token",
    };
  }

  // Check permission if required
  if (requiredPermission !== undefined) {
    if (!tokenManager.hasPermission(token, requiredPermission)) {
      return {
        success: false,
        status: 403,
        error: "Forbidden",
        message: `Missing permission: ${requiredPermission}`,
      };
    }
  }

  return { success: true, token };
}
