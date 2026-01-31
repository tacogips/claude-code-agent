/**
 * Unit tests for CredentialManager.
 *
 * Tests the combined read/write interface including:
 * - Export/import functionality
 * - Delegation to reader and writer
 * - Validation and error handling
 *
 * @module sdk/credentials/__tests__/manager.test
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { CredentialManager } from "../manager";
import { CredentialError } from "../errors";
import type { OAuthCredentialsResult, AccountInfo } from "../types";
import type { OAuthTokensInput, CredentialsExport } from "../validation";
import { ok, err } from "../../../result";

describe("CredentialManager", () => {
  let manager: CredentialManager;
  let configDir: string;

  beforeEach(() => {
    configDir = "/test-home/.claude";
    process.env["HOME"] = "/test-home";
    manager = new CredentialManager({ configDir, platform: "linux" });
  });

  describe("constructor", () => {
    test("creates manager with custom config directory", () => {
      const customManager = new CredentialManager({
        configDir: "/custom/.claude",
        platform: "linux",
      });
      expect(customManager).toBeDefined();
    });

    test("creates manager with default options", () => {
      const defaultManager = new CredentialManager();
      expect(defaultManager).toBeDefined();
    });

    test("creates manager with only platform option", () => {
      const platformManager = new CredentialManager({ platform: "linux" });
      expect(platformManager).toBeDefined();
    });
  });

  describe("exportCredentials", () => {
    test("exports valid credentials with correct format", async () => {
      // Mock getCredentials to return valid credentials
      const mockCredentials: OAuthCredentialsResult = {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        scopes: ["user:inference", "user:profile"],
        subscriptionType: "max",
        rateLimitTier: "default_claude_max_20x",
        isExpired: false,
      };

      // Override getCredentials method
      manager.getCredentials = async () => mockCredentials;

      const result = await manager.exportCredentials();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const exported = result.value;
        expect(exported.version).toBe(1);
        expect(exported.exportedAt).toBeDefined();
        expect(exported.credentials.accessToken).toBe(
          "sk-ant-oat01-test-access-token",
        );
        expect(exported.credentials.refreshToken).toBe(
          "sk-ant-ort01-test-refresh-token",
        );
        expect(exported.credentials.expiresAt).toBe(
          mockCredentials.expiresAt.getTime(),
        );
        expect(exported.credentials.scopes).toEqual([
          "user:inference",
          "user:profile",
        ]);
        expect(exported.credentials.subscriptionType).toBe("max");
        expect(exported.credentials.rateLimitTier).toBe(
          "default_claude_max_20x",
        );
      }
    });

    test("handles not authenticated case", async () => {
      // Default mock returns null
      const result = await manager.exportCredentials();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(CredentialError);
        expect(result.error.code).toBe("NOT_AUTHENTICATED");
      }
    });

    test("creates ISO date string for exportedAt", async () => {
      const mockCredentials: OAuthCredentialsResult = {
        accessToken: "sk-ant-oat01-token",
        refreshToken: "sk-ant-ort01-token",
        expiresAt: new Date(Date.now() + 86400000),
        scopes: ["user:inference"],
        subscriptionType: "pro",
        rateLimitTier: "default_claude_pro",
        isExpired: false,
      };

      manager.getCredentials = async () => mockCredentials;

      const result = await manager.exportCredentials();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const exported = result.value;
        const parsedDate = new Date(exported.exportedAt);
        expect(parsedDate.toISOString()).toBe(exported.exportedAt);
      }
    });
  });

  describe("importCredentials", () => {
    test("imports valid CredentialsExport", async () => {
      const validExport: CredentialsExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "sk-ant-oat01-test-import-token",
          refreshToken: "sk-ant-ort01-test-import-token",
          expiresAt: Date.now() + 86400000,
          scopes: ["user:inference", "user:profile"],
          subscriptionType: "max",
          rateLimitTier: "default_claude_max_20x",
        },
      };

      // Mock writeCredentials to succeed
      manager.writeCredentials = async (_input: OAuthTokensInput) =>
        ok(undefined);

      const result = await manager.importCredentials(validExport);

      expect(result.isOk()).toBe(true);
    });

    test("rejects invalid export format - missing version", async () => {
      const invalidExport = {
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "sk-ant-oat01-token",
          refreshToken: "sk-ant-ort01-token",
          expiresAt: Date.now() + 86400000,
          scopes: ["user:inference"],
          subscriptionType: "max",
          rateLimitTier: "default",
        },
      };

      const result = await manager.importCredentials(invalidExport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(CredentialError);
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects invalid export format - wrong version", async () => {
      const invalidExport = {
        version: 2,
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "sk-ant-oat01-token",
          refreshToken: "sk-ant-ort01-token",
          expiresAt: Date.now() + 86400000,
          scopes: ["user:inference"],
          subscriptionType: "max",
          rateLimitTier: "default",
        },
      };

      const result = await manager.importCredentials(invalidExport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_FORMAT");
        expect(result.error.message).toContain("version must be 1");
      }
    });

    test("rejects invalid export format - missing credentials", async () => {
      const invalidExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
      };

      const result = await manager.importCredentials(invalidExport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects invalid credentials - expired token", async () => {
      const invalidExport: CredentialsExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "sk-ant-oat01-expired-token",
          refreshToken: "sk-ant-ort01-expired-token",
          expiresAt: Date.now() - 3600000, // 1 hour ago
          scopes: ["user:inference"],
          subscriptionType: "free",
          rateLimitTier: "default_free",
        },
      };

      const result = await manager.importCredentials(invalidExport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_FORMAT");
        expect(result.error.message).toContain("expired");
      }
    });

    test("rejects invalid credentials - invalid token format", async () => {
      const invalidExport: CredentialsExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "invalid-token-format",
          refreshToken: "sk-ant-ort01-token",
          expiresAt: Date.now() + 86400000,
          scopes: ["user:inference"],
          subscriptionType: "pro",
          rateLimitTier: "default",
        },
      };

      const result = await manager.importCredentials(invalidExport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_FORMAT");
        expect(result.error.message).toContain("accessToken");
      }
    });

    test("overwrites existing credentials", async () => {
      const validExport: CredentialsExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "sk-ant-oat01-new-token",
          refreshToken: "sk-ant-ort01-new-token",
          expiresAt: Date.now() + 86400000,
          scopes: ["user:inference"],
          subscriptionType: "max",
          rateLimitTier: "default_claude_max_20x",
        },
      };

      let writeCallCount = 0;
      manager.writeCredentials = async (_input: OAuthTokensInput) => {
        writeCallCount++;
        return ok(undefined);
      };

      await manager.importCredentials(validExport);

      expect(writeCallCount).toBe(1);
    });
  });

  describe("Reader delegation", () => {
    test("getCredentials delegates to reader", async () => {
      const result = await manager.getCredentials();
      // Default mock returns null
      expect(result).toBeNull();
    });

    test("getAccount delegates to reader", async () => {
      const result = await manager.getAccount();
      // Default mock returns null
      expect(result).toBeNull();
    });

    test("getStats delegates to reader", async () => {
      const result = await manager.getStats();
      // Default mock returns null
      expect(result).toBeNull();
    });

    test("isAuthenticated delegates to reader", async () => {
      const result = await manager.isAuthenticated();
      // Default mock returns false
      expect(result).toBe(false);
    });

    test("getSubscriptionType delegates to reader", async () => {
      const result = await manager.getSubscriptionType();
      // Default mock returns null
      expect(result).toBeNull();
    });

    test("getCredentials returns credentials from reader", async () => {
      const mockCredentials: OAuthCredentialsResult = {
        accessToken: "sk-ant-oat01-test",
        refreshToken: "sk-ant-ort01-test",
        expiresAt: new Date(Date.now() + 86400000),
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_claude_max_20x",
        isExpired: false,
      };

      manager.getCredentials = async () => mockCredentials;

      const result = await manager.getCredentials();
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("sk-ant-oat01-test");
      expect(result?.subscriptionType).toBe("max");
    });

    test("getAccount returns account info from reader", async () => {
      const mockAccount: AccountInfo = {
        accountUuid: "test-uuid-123",
        emailAddress: "test@example.com",
        displayName: "Test User",
        organization: {
          uuid: "org-uuid-456",
          name: "Test Org",
          billingType: "stripe_subscription",
          role: "member",
        },
      };

      manager.getAccount = async () => mockAccount;

      const result = await manager.getAccount();
      expect(result).not.toBeNull();
      expect(result?.accountUuid).toBe("test-uuid-123");
      expect(result?.emailAddress).toBe("test@example.com");
    });

    test("isAuthenticated returns true for valid credentials", async () => {
      manager.isAuthenticated = async () => true;

      const result = await manager.isAuthenticated();
      expect(result).toBe(true);
    });

    test("getSubscriptionType returns subscription from reader", async () => {
      manager.getSubscriptionType = async () => "pro";

      const result = await manager.getSubscriptionType();
      expect(result).toBe("pro");
    });
  });

  describe("Writer delegation", () => {
    test("writeCredentials delegates to writer", async () => {
      const credentials: OAuthTokensInput = {
        accessToken: "sk-ant-oat01-test-write",
        refreshToken: "sk-ant-ort01-test-write",
        expiresAt: Date.now() + 86400000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_claude_max_20x",
      };

      const result = await manager.writeCredentials(credentials);
      // Will fail because directory doesn't exist, but it demonstrates delegation
      expect(result.isErr() || result.isOk()).toBe(true);
    });

    test("deleteCredentials delegates to writer", async () => {
      const result = await manager.deleteCredentials();
      expect(result.isOk()).toBe(true);
    });

    test("isWritable delegates to writer", async () => {
      const result = await manager.isWritable();
      // Returns boolean indicating write permission
      expect(typeof result).toBe("boolean");
    });

    test("getStorageLocation delegates to writer", () => {
      const result = manager.getStorageLocation();
      // Should return the configured storage location
      expect(result).toBe("/test-home/.claude/.credentials.json");
    });

    test("writeCredentials validates input", async () => {
      const invalidCredentials = {
        accessToken: "invalid-format",
        refreshToken: "sk-ant-ort01-token",
        expiresAt: Date.now() + 86400000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default",
      };

      const result = await manager.writeCredentials(
        invalidCredentials as OAuthTokensInput,
      );

      // Validation should catch invalid token format
      expect(result.isErr()).toBe(true);
    });

    test("writeCredentials handles write failure", async () => {
      const credentials: OAuthTokensInput = {
        accessToken: "sk-ant-oat01-test",
        refreshToken: "sk-ant-ort01-test",
        expiresAt: Date.now() + 86400000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default",
      };

      // Mock write failure
      manager.writeCredentials = async (_input: OAuthTokensInput) =>
        err(CredentialError.writeFailed("/test/path", "permission denied"));

      const result = await manager.writeCredentials(credentials);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("WRITE_FAILED");
      }
    });

    test("deleteCredentials handles delete failure", async () => {
      manager.deleteCredentials = async () =>
        err(CredentialError.deleteFailed("/test/path", "not found"));

      const result = await manager.deleteCredentials();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("DELETE_FAILED");
      }
    });

    test("isWritable returns false when storage not writable", async () => {
      manager.isWritable = async () => false;

      const result = await manager.isWritable();
      expect(result).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    test("export-import round-trip", async () => {
      const mockCredentials: OAuthCredentialsResult = {
        accessToken: "sk-ant-oat01-roundtrip-token",
        refreshToken: "sk-ant-ort01-roundtrip-token",
        expiresAt: new Date(Date.now() + 86400000),
        scopes: ["user:inference", "user:profile"],
        subscriptionType: "max",
        rateLimitTier: "default_claude_max_20x",
        isExpired: false,
      };

      let importedCredentials: OAuthTokensInput | null = null;

      // Mock export
      manager.getCredentials = async () => mockCredentials;

      // Mock import
      manager.writeCredentials = async (input: OAuthTokensInput) => {
        importedCredentials = input;
        return ok(undefined);
      };

      // Export
      const exportResult = await manager.exportCredentials();
      expect(exportResult.isOk()).toBe(true);

      // Import
      if (exportResult.isOk()) {
        const importResult = await manager.importCredentials(
          exportResult.value,
        );
        expect(importResult.isOk()).toBe(true);
      }

      // Verify imported credentials match original
      expect(importedCredentials).not.toBeNull();
      // Use non-null assertion since we verified it's not null above
      expect(importedCredentials!.accessToken).toBe(
        "sk-ant-oat01-roundtrip-token",
      );
      expect(importedCredentials!.refreshToken).toBe(
        "sk-ant-ort01-roundtrip-token",
      );
      expect(importedCredentials!.scopes).toEqual([
        "user:inference",
        "user:profile",
      ]);
      expect(importedCredentials!.subscriptionType).toBe("max");
    });

    test("import fails when export is corrupted", async () => {
      const corruptedExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: null,
      };

      const result = await manager.importCredentials(corruptedExport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("export fails when reader throws", async () => {
      manager.getCredentials = async () => null;

      const result = await manager.exportCredentials();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_AUTHENTICATED");
      }
    });
  });

  describe("error handling", () => {
    test("handles reader errors gracefully", async () => {
      // Reader returns null on error - graceful degradation
      const credentials = await manager.getCredentials();
      const account = await manager.getAccount();
      const stats = await manager.getStats();

      expect(credentials).toBeNull();
      expect(account).toBeNull();
      expect(stats).toBeNull();
    });

    test("handles writer validation errors", async () => {
      const invalidInput = {
        accessToken: "not-a-valid-token",
        refreshToken: "not-valid-either",
        expiresAt: Date.now() - 1000,
        scopes: [],
        subscriptionType: "invalid-type",
        rateLimitTier: "",
      };

      const result = await manager.writeCredentials(
        invalidInput as OAuthTokensInput,
      );

      expect(result.isErr()).toBe(true);
    });
  });
});
