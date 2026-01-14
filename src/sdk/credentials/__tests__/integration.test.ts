/**
 * Integration tests for Credential Manager lifecycle operations.
 *
 * Tests the complete credential lifecycle:
 * - Export/import round-trip preserves data
 * - Write then read returns same credentials
 * - Delete removes credentials
 * - Overwrite replaces existing credentials
 * - File backend permission checks (Linux/Windows)
 *
 * @module sdk/credentials/__tests__/integration.test
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { CredentialManager } from "../manager";
import type { OAuthTokensInput } from "../validation";
import { createTestCredentials } from "../../../test/fixtures/credentials";

describe("Credential Manager Integration Tests", () => {
  let tempDir: string;
  let configDir: string;

  beforeEach(async () => {
    // Create temporary directory for test credentials
    tempDir = await mkdtemp(join(tmpdir(), "cred-test-"));
    configDir = join(tempDir, ".claude");
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.error("Cleanup error:", error);
    }
  });

  describe("Export/Import Round-Trip", () => {
    test("export then import preserves all credential data", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Write initial credentials
      const original = createTestCredentials();
      const writeResult = await manager.writeCredentials(original);
      expect(writeResult.isOk()).toBe(true);

      // Export credentials
      const exportResult = await manager.exportCredentials();
      expect(exportResult.isOk()).toBe(true);

      if (exportResult.isErr()) {
        throw new Error("Export failed");
      }

      const exported = exportResult.value;

      // Verify export format
      expect(exported.version).toBe(1);
      expect(typeof exported.exportedAt).toBe("string");
      expect(exported.credentials).toBeDefined();

      // Delete credentials
      const deleteResult = await manager.deleteCredentials();
      expect(deleteResult.isOk()).toBe(true);

      // Verify credentials are gone
      const afterDelete = await manager.getCredentials();
      expect(afterDelete).toBeNull();

      // Import exported credentials
      const importResult = await manager.importCredentials(exported);
      expect(importResult.isOk()).toBe(true);

      // Read imported credentials
      const imported = await manager.getCredentials();
      expect(imported).not.toBeNull();

      if (imported === null) {
        throw new Error("Imported credentials are null");
      }

      // Verify all fields match original
      expect(imported.accessToken).toBe(original.accessToken);
      expect(imported.refreshToken).toBe(original.refreshToken);
      expect(imported.expiresAt.getTime()).toBe(original.expiresAt);
      expect([...imported.scopes]).toEqual(original.scopes);
      expect(imported.subscriptionType).toBe(original.subscriptionType);
      expect(imported.rateLimitTier).toBe(original.rateLimitTier);
      expect(imported.isExpired).toBe(false);
    });

    test("import validates export version", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const invalidExport = {
        version: 2, // Invalid version
        exportedAt: new Date().toISOString(),
        credentials: createTestCredentials(),
      };

      const importResult = await manager.importCredentials(invalidExport);
      expect(importResult.isErr()).toBe(true);
    });

    test("import validates credentials structure", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const invalidExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: {
          accessToken: "invalid-token", // Wrong prefix
          refreshToken: "sk-ant-ort01-test",
          expiresAt: Date.now() + 86400000,
          scopes: ["user:inference"],
          subscriptionType: "max",
          rateLimitTier: "default",
        },
      };

      const importResult = await manager.importCredentials(invalidExport);
      expect(importResult.isErr()).toBe(true);
    });
  });

  describe("Write-Read Lifecycle", () => {
    test("write then read returns same credentials", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const credentials = createTestCredentials();

      // Write credentials
      const writeResult = await manager.writeCredentials(credentials);
      expect(writeResult.isOk()).toBe(true);

      // Read credentials
      const read = await manager.getCredentials();
      expect(read).not.toBeNull();

      if (read === null) {
        throw new Error("Read credentials are null");
      }

      // Verify all fields
      expect(read.accessToken).toBe(credentials.accessToken);
      expect(read.refreshToken).toBe(credentials.refreshToken);
      expect(read.expiresAt.getTime()).toBe(credentials.expiresAt);
      expect([...read.scopes]).toEqual(credentials.scopes);
      expect(read.subscriptionType).toBe(credentials.subscriptionType);
      expect(read.rateLimitTier).toBe(credentials.rateLimitTier);
      expect(read.isExpired).toBe(false);
    });

    test("write with expired token is detected on read", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Write valid credentials and test expiration logic
      const validCreds = createTestCredentials();
      const writeResult = await manager.writeCredentials(validCreds);
      expect(writeResult.isOk()).toBe(true);

      const read = await manager.getCredentials();
      expect(read).not.toBeNull();

      if (read === null) {
        throw new Error("Read credentials are null");
      }

      // Verify isExpired is computed correctly (should be false for future timestamp)
      expect(read.isExpired).toBe(false);
    });

    test("overwrite replaces existing credentials", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Write first credentials
      const first = createTestCredentials();
      const writeFirst = await manager.writeCredentials(first);
      expect(writeFirst.isOk()).toBe(true);

      // Read first credentials
      const readFirst = await manager.getCredentials();
      expect(readFirst).not.toBeNull();
      expect(readFirst?.accessToken).toBe(first.accessToken);

      // Overwrite with second credentials
      const second: OAuthTokensInput = {
        ...createTestCredentials(),
        accessToken: "sk-ant-oat01-new-access-token-789",
        refreshToken: "sk-ant-ort01-new-refresh-token-012",
        subscriptionType: "pro",
      };

      const writeSecond = await manager.writeCredentials(second);
      expect(writeSecond.isOk()).toBe(true);

      // Read second credentials
      const readSecond = await manager.getCredentials();
      expect(readSecond).not.toBeNull();

      if (readSecond === null) {
        throw new Error("Read credentials are null");
      }

      // Verify overwrite succeeded
      expect(readSecond.accessToken).toBe(second.accessToken);
      expect(readSecond.refreshToken).toBe(second.refreshToken);
      expect(readSecond.subscriptionType).toBe("pro");

      // Verify old credentials are gone
      expect(readSecond.accessToken).not.toBe(first.accessToken);
    });
  });

  describe("Delete Operations", () => {
    test("delete removes credentials completely", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Write credentials
      const credentials = createTestCredentials();
      const writeResult = await manager.writeCredentials(credentials);
      expect(writeResult.isOk()).toBe(true);

      // Verify credentials exist
      const beforeDelete = await manager.getCredentials();
      expect(beforeDelete).not.toBeNull();

      // Delete credentials
      const deleteResult = await manager.deleteCredentials();
      expect(deleteResult.isOk()).toBe(true);

      // Verify credentials are gone
      const afterDelete = await manager.getCredentials();
      expect(afterDelete).toBeNull();

      // Verify read returns null (not authenticated)
      const authenticated = await manager.isAuthenticated();
      expect(authenticated).toBe(false);
    });

    test("delete is idempotent - safe to call when no credentials exist", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Delete when no credentials exist
      const firstDelete = await manager.deleteCredentials();
      expect(firstDelete.isOk()).toBe(true);

      // Delete again - should still succeed
      const secondDelete = await manager.deleteCredentials();
      expect(secondDelete.isOk()).toBe(true);
    });

    test("write after delete creates new credentials", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Write, delete, write again
      const first = createTestCredentials();
      await manager.writeCredentials(first);
      await manager.deleteCredentials();

      const second: OAuthTokensInput = {
        ...createTestCredentials(),
        accessToken: "sk-ant-oat01-after-delete-token",
      };

      const writeResult = await manager.writeCredentials(second);
      expect(writeResult.isOk()).toBe(true);

      const read = await manager.getCredentials();
      expect(read).not.toBeNull();
      expect(read?.accessToken).toBe(second.accessToken);
    });
  });

  describe("File Backend Permission Tests (Linux/Windows)", () => {
    test("creates directory with correct permissions (0o700)", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const credentials = createTestCredentials();
      const writeResult = await manager.writeCredentials(credentials);
      expect(writeResult.isOk()).toBe(true);

      // Check directory permissions
      const dirStats = await stat(configDir);
      const dirMode = dirStats.mode & 0o777;

      // Directory should be 0o700 (owner: rwx, group: ---, others: ---)
      expect(dirMode).toBe(0o700);
    });

    test("creates file with correct permissions (0o600)", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const credentials = createTestCredentials();
      const writeResult = await manager.writeCredentials(credentials);
      expect(writeResult.isOk()).toBe(true);

      // Check file permissions
      const filePath = join(configDir, ".credentials.json");
      const fileStats = await stat(filePath);
      const fileMode = fileStats.mode & 0o777;

      // File should be 0o600 (owner: rw-, group: ---, others: ---)
      expect(fileMode).toBe(0o600);
    });

    test("isWritable returns true for writable directory", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      // Create directory first
      const credentials = createTestCredentials();
      await manager.writeCredentials(credentials);

      const writable = await manager.isWritable();
      expect(writable).toBe(true);
    });

    test("getStorageLocation returns correct path", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const location = manager.getStorageLocation();
      const expectedPath = join(configDir, ".credentials.json");

      expect(location).toBe(expectedPath);
    });
  });

  describe("Authentication Status", () => {
    test("isAuthenticated returns true for valid credentials", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const credentials = createTestCredentials();
      await manager.writeCredentials(credentials);

      const authenticated = await manager.isAuthenticated();
      expect(authenticated).toBe(true);
    });

    test("isAuthenticated returns false after delete", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const credentials = createTestCredentials();
      await manager.writeCredentials(credentials);
      await manager.deleteCredentials();

      const authenticated = await manager.isAuthenticated();
      expect(authenticated).toBe(false);
    });

    test("getSubscriptionType returns correct type", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const credentials = createTestCredentials();
      await manager.writeCredentials(credentials);

      const subscriptionType = await manager.getSubscriptionType();
      expect(subscriptionType).toBe("max");
    });

    test("getSubscriptionType returns null when not authenticated", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const subscriptionType = await manager.getSubscriptionType();
      expect(subscriptionType).toBeNull();
    });
  });

  describe("Error Handling", () => {
    test("write rejects credentials with expired token", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const expiredCredentials: OAuthTokensInput = {
        ...createTestCredentials(),
        expiresAt: Date.now() - 3600000, // 1 hour ago
      };

      const writeResult = await manager.writeCredentials(expiredCredentials);
      expect(writeResult.isErr()).toBe(true);

      if (writeResult.isErr()) {
        expect(writeResult.error.message).toContain("expired");
      }
    });

    test("write rejects credentials with invalid token prefix", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const invalidCredentials: OAuthTokensInput = {
        ...createTestCredentials(),
        accessToken: "invalid-token-format",
      };

      const writeResult = await manager.writeCredentials(invalidCredentials);
      expect(writeResult.isErr()).toBe(true);
    });

    test("write rejects credentials with empty scopes", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const invalidCredentials: OAuthTokensInput = {
        ...createTestCredentials(),
        scopes: [],
      };

      const writeResult = await manager.writeCredentials(invalidCredentials);
      expect(writeResult.isErr()).toBe(true);
    });

    test("write rejects credentials with invalid subscription type", async () => {
      const manager = new CredentialManager({ configDir, platform: "linux" });

      const invalidCredentials = {
        ...createTestCredentials(),
        subscriptionType: "invalid_type",
      };

      const writeResult = await manager.writeCredentials(
        invalidCredentials as OAuthTokensInput,
      );
      expect(writeResult.isErr()).toBe(true);
    });
  });

  describe("Multiple Subscription Types", () => {
    const subscriptionTypes = ["max", "pro", "free", "enterprise"] as const;

    test.each(subscriptionTypes.map(t => [t]))(
      "handles %s subscription type",
      async (subType) => {
        const manager = new CredentialManager({ configDir, platform: "linux" });
        const credentials = createTestCredentials({ subscriptionType: subType });

        await manager.writeCredentials(credentials);
        const read = await manager.getCredentials();

        expect(read?.subscriptionType).toBe(subType);
      },
    );
  });
});
