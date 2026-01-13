/**
 * Unit tests for authentication helper
 *
 * @module daemon/routes/auth-helper.test
 */

import { describe, test, expect } from "bun:test";
import { validateAuth } from "./auth-helper";
import type { TokenManager } from "../auth";
import type { ApiToken, Permission } from "../types";

// Mock token for testing
const mockToken: ApiToken = {
  id: "test-id",
  name: "Test Token",
  hash: "sha256:testhash",
  permissions: ["queue:*", "bookmark:*"],
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

// Create mock TokenManager
function createMockTokenManager(options: {
  validateResult: ApiToken | null;
  hasPermissionResult?: boolean;
}): TokenManager {
  return {
    validateToken: async (_token: string) => options.validateResult,
    hasPermission: (_token: ApiToken, _permission: Permission) =>
      options.hasPermissionResult ?? true,
    generateToken: async () => mockToken,
    revokeToken: async () => true,
    listTokens: async () => [mockToken],
  } as unknown as TokenManager;
}

describe("validateAuth", () => {
  describe("Token Validation (TEST-001)", () => {
    test("Valid Bearer token - success", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: mockToken,
      });

      const result = await validateAuth("Bearer test-token-123", tokenManager);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.token).toEqual(mockToken);
      }
    });

    test("Missing Authorization header - 401", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: mockToken,
      });

      const result = await validateAuth(null, tokenManager);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
        expect(result.error).toBe("Unauthorized");
        expect(result.message).toBe("Missing Authorization header");
      }
    });

    test("Invalid format (not Bearer) - 401", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: mockToken,
      });

      const result = await validateAuth("Basic test-token-123", tokenManager);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
        expect(result.error).toBe("Unauthorized");
        expect(result.message).toContain("Expected: Bearer <token>");
      }
    });

    test("Missing token after Bearer - 401", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: null, // Empty string token will fail validation
      });

      const result = await validateAuth("Bearer ", tokenManager);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
        expect(result.error).toBe("Unauthorized");
      }
    });

    test("Invalid/expired token - 401", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: null, // Token validation fails
      });

      const result = await validateAuth("Bearer invalid-token", tokenManager);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
        expect(result.error).toBe("Unauthorized");
        expect(result.message).toContain("Invalid or expired token");
      }
    });

    test("Valid token but missing permission - 403", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: mockToken,
        hasPermissionResult: false, // Permission check fails
      });

      const result = await validateAuth(
        "Bearer test-token-123",
        tokenManager,
        "admin:*" as Permission,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toBe("Forbidden");
        expect(result.message).toContain("Missing permission");
        expect(result.message).toContain("admin:*");
      }
    });
  });

  describe("Auth Edge Cases (TEST-002)", () => {
    test("Multiple spaces in Authorization header", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: mockToken,
      });

      const result = await validateAuth(
        "Bearer  test-token-123  extra",
        tokenManager,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
        expect(result.message).toContain("Expected: Bearer <token>");
      }
    });

    test('Case sensitivity of "Bearer" keyword', async () => {
      const tokenManager = createMockTokenManager({
        validateResult: mockToken,
      });

      const result = await validateAuth("bearer test-token-123", tokenManager);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
        expect(result.message).toContain("Expected: Bearer <token>");
      }
    });

    test("Token with special characters", async () => {
      const specialToken: ApiToken = {
        ...mockToken,
        id: "special-token-id",
      };
      const tokenManager = createMockTokenManager({
        validateResult: specialToken,
      });

      const result = await validateAuth(
        `Bearer test-token!@#$%^&*()_+-=[]{}|;:',.<>?/`,
        tokenManager,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.token.id).toBe(specialToken.id);
      }
    });

    test("Very long token strings", async () => {
      const longToken = "a".repeat(1000);
      const longApiToken: ApiToken = { ...mockToken, id: "long-token-id" };
      const tokenManager = createMockTokenManager({
        validateResult: longApiToken,
      });

      const result = await validateAuth(`Bearer ${longToken}`, tokenManager);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.token.id).toBe("long-token-id");
      }
    });

    test("Empty string token", async () => {
      const tokenManager = createMockTokenManager({
        validateResult: null,
      });

      const result = await validateAuth("Bearer ", tokenManager);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
      }
    });

    test("Permission wildcards (e.g., queue:*)", async () => {
      const tokenWithWildcard: ApiToken = {
        ...mockToken,
        permissions: ["queue:*"],
      };
      const tokenManager = createMockTokenManager({
        validateResult: tokenWithWildcard,
        hasPermissionResult: true,
      });

      const result = await validateAuth(
        "Bearer test-token-123",
        tokenManager,
        "queue:*" as Permission,
      );

      expect(result.success).toBe(true);
    });
  });
});
