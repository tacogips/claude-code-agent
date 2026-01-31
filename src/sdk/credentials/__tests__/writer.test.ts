/**
 * Unit tests for CredentialWriter.
 *
 * @module sdk/credentials/__tests__/writer.test
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CredentialWriter } from "../writer";
import type { OAuthTokensInput } from "../validation";
import { mkdir, unlink, rmdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createTestCredentials } from "../../../test/fixtures/credentials";

describe("CredentialWriter", () => {
  let testDir: string;
  let configDir: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    const uniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = join(tmpdir(), uniqueId);
    configDir = join(testDir, ".claude");

    // Ensure test directory exists
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      if (existsSync(testDir)) {
        // Remove files recursively
        await unlink(join(configDir, ".credentials.json")).catch(() => {});
        await rmdir(configDir).catch(() => {});
        await rmdir(testDir).catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("writeCredentials", () => {
    test("writes valid credentials successfully", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      const result = await writer.writeCredentials(credentials);

      // Should succeed
      expect(result.isOk()).toBe(true);

      // Verify file was created
      const credentialsPath = join(configDir, ".credentials.json");
      expect(existsSync(credentialsPath)).toBe(true);

      // Verify file contents
      const fileContent = await Bun.file(credentialsPath).text();
      const parsed = JSON.parse(fileContent);

      expect(parsed.claudeAiOauth).toBeDefined();
      expect(parsed.claudeAiOauth.accessToken).toBe(credentials.accessToken);
      expect(parsed.claudeAiOauth.refreshToken).toBe(credentials.refreshToken);
      expect(parsed.claudeAiOauth.expiresAt).toBe(credentials.expiresAt);
      expect(parsed.claudeAiOauth.scopes).toEqual(credentials.scopes);
      expect(parsed.claudeAiOauth.subscriptionType).toBe(
        credentials.subscriptionType,
      );
      expect(parsed.claudeAiOauth.rateLimitTier).toBe(
        credentials.rateLimitTier,
      );
    });

    test("creates directory if it does not exist", async () => {
      // Use a non-existent directory
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      // Directory should not exist yet
      expect(existsSync(configDir)).toBe(false);

      const result = await writer.writeCredentials(credentials);

      // Should succeed and create directory
      expect(result.isOk()).toBe(true);
      expect(existsSync(configDir)).toBe(true);

      // Verify file was created
      const credentialsPath = join(configDir, ".credentials.json");
      expect(existsSync(credentialsPath)).toBe(true);
    });

    test("overwrites existing credentials", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });

      // Write initial credentials
      const initialCredentials = createTestCredentials();
      const result1 = await writer.writeCredentials(initialCredentials);
      expect(result1.isOk()).toBe(true);

      // Write new credentials with different values
      const newCredentials = createTestCredentials();
      newCredentials.accessToken = "sk-ant-oat01-new-access-token-99999999";
      newCredentials.subscriptionType = "pro";
      const result2 = await writer.writeCredentials(newCredentials);

      // Should succeed
      expect(result2.isOk()).toBe(true);

      // Verify file contains new credentials
      const credentialsPath = join(configDir, ".credentials.json");
      const fileContent = await Bun.file(credentialsPath).text();
      const parsed = JSON.parse(fileContent);

      expect(parsed.claudeAiOauth.accessToken).toBe(newCredentials.accessToken);
      expect(parsed.claudeAiOauth.subscriptionType).toBe("pro");
    });

    test("rejects invalid credentials - missing accessToken", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const invalidCredentials = {
        // Missing accessToken
        refreshToken: "sk-ant-ort01-test-refresh-token-87654321",
        expiresAt: Date.now() + 86400000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_claude_max_20x",
      } as unknown as OAuthTokensInput;

      const result = await writer.writeCredentials(invalidCredentials);

      // Should fail with validation error
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.code).toBe("INVALID_FORMAT");
      expect(result.isErr() && result.error.message).toContain("accessToken");
    });

    test("rejects invalid credentials - invalid accessToken prefix", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const invalidCredentials = createTestCredentials();
      invalidCredentials.accessToken = "invalid-token-format";

      const result = await writer.writeCredentials(invalidCredentials);

      // Should fail with validation error
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.code).toBe("INVALID_FORMAT");
      expect(result.isErr() && result.error.message).toContain("sk-ant-");
    });

    test("rejects invalid credentials - expired token", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const expiredCredentials = createTestCredentials();
      expiredCredentials.expiresAt = Date.now() - 3600000; // 1 hour ago

      const result = await writer.writeCredentials(expiredCredentials);

      // Should fail with validation error
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.code).toBe("INVALID_FORMAT");
      expect(result.isErr() && result.error.message).toContain("expired");
    });

    test("rejects invalid credentials - empty scopes", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const invalidCredentials = createTestCredentials();
      invalidCredentials.scopes = [];

      const result = await writer.writeCredentials(invalidCredentials);

      // Should fail with validation error
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.code).toBe("INVALID_FORMAT");
      expect(result.isErr() && result.error.message).toContain("scopes");
    });

    test("rejects invalid credentials - invalid subscription type", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const invalidCredentials = createTestCredentials();
      // @ts-expect-error Testing invalid subscription type
      invalidCredentials.subscriptionType = "invalid-type";

      const result = await writer.writeCredentials(invalidCredentials);

      // Should fail with validation error
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.code).toBe("INVALID_FORMAT");
      expect(result.isErr() && result.error.message).toContain(
        "subscriptionType",
      );
    });

    test("handles write permission error", async () => {
      // Create a read-only directory
      const readOnlyDir = join(testDir, "readonly");
      await mkdir(readOnlyDir, { recursive: true, mode: 0o444 });

      const writer = new CredentialWriter({
        configDir: join(readOnlyDir, ".claude"),
        platform: "linux",
      });
      const credentials = createTestCredentials();

      const result = await writer.writeCredentials(credentials);

      // Should fail with permission error
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(
          result.error.code === "PERMISSION_DENIED" ||
            result.error.code === "WRITE_FAILED",
        ).toBe(true);
      }

      // Cleanup: restore permissions for removal
      await Bun.$`chmod 755 ${readOnlyDir}`.quiet();
      await rmdir(readOnlyDir).catch(() => {});
    });
  });

  describe("deleteCredentials", () => {
    test("deletes existing credentials successfully", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      // First, write credentials
      const writeResult = await writer.writeCredentials(credentials);
      expect(writeResult.isOk()).toBe(true);

      // Verify file exists
      const credentialsPath = join(configDir, ".credentials.json");
      expect(existsSync(credentialsPath)).toBe(true);

      // Delete credentials
      const deleteResult = await writer.deleteCredentials();

      // Should succeed
      expect(deleteResult.isOk()).toBe(true);

      // Verify file was deleted
      expect(existsSync(credentialsPath)).toBe(false);
    });

    test("succeeds when no credentials exist (idempotent)", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });

      // Verify credentials file does not exist
      const credentialsPath = join(configDir, ".credentials.json");
      expect(existsSync(credentialsPath)).toBe(false);

      // Delete non-existent credentials
      const result = await writer.deleteCredentials();

      // Should succeed (idempotent operation)
      expect(result.isOk()).toBe(true);
    });

    test("handles delete permission error", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      // Write credentials
      const writeResult = await writer.writeCredentials(credentials);
      expect(writeResult.isOk()).toBe(true);

      // Make directory read-only (prevents deletion of files)
      await Bun.$`chmod 444 ${configDir}`.quiet();

      // Attempt to delete credentials
      const deleteResult = await writer.deleteCredentials();

      // Should fail with permission error
      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(
          deleteResult.error.code === "PERMISSION_DENIED" ||
            deleteResult.error.code === "DELETE_FAILED",
        ).toBe(true);
      }

      // Cleanup: restore permissions
      await Bun.$`chmod 755 ${configDir}`.quiet();
    });

    test("can write again after deletion", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      // Write, delete, write again
      await writer.writeCredentials(credentials);
      const deleteResult = await writer.deleteCredentials();
      expect(deleteResult.isOk()).toBe(true);

      const rewriteResult = await writer.writeCredentials(credentials);
      expect(rewriteResult.isOk()).toBe(true);

      // Verify file exists
      const credentialsPath = join(configDir, ".credentials.json");
      expect(existsSync(credentialsPath)).toBe(true);
    });
  });

  describe("isWritable", () => {
    test("returns true when directory is writable", async () => {
      // Create writable directory
      await mkdir(configDir, { recursive: true, mode: 0o755 });

      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const result = await writer.isWritable();

      expect(result).toBe(true);
    });

    test("returns false when directory is not writable", async () => {
      // Create read-only directory
      await mkdir(configDir, { recursive: true, mode: 0o444 });

      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const result = await writer.isWritable();

      expect(result).toBe(false);

      // Cleanup: restore permissions
      await Bun.$`chmod 755 ${configDir}`.quiet();
    });

    test("returns false when directory does not exist and parent is not writable", async () => {
      // Create non-writable parent directory
      const readOnlyParent = join(testDir, "readonly-parent");
      await mkdir(readOnlyParent, { recursive: true, mode: 0o444 });

      const writer = new CredentialWriter({
        configDir: join(readOnlyParent, ".claude"),
        platform: "linux",
      });
      const result = await writer.isWritable();

      expect(result).toBe(false);

      // Cleanup: restore permissions
      await Bun.$`chmod 755 ${readOnlyParent}`.quiet();
      await rmdir(readOnlyParent).catch(() => {});
    });

    test("returns false when directory does not exist", async () => {
      // configDir doesn't exist yet
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const result = await writer.isWritable();

      // Should return false because the directory doesn't exist
      // (isWritable checks if the directory itself is writable, not the parent)
      expect(result).toBe(false);
    });
  });

  describe("getStorageLocation", () => {
    test("returns correct path for file backend", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const location = writer.getStorageLocation();

      // Should return the credentials file path
      expect(location).toBe(join(configDir, ".credentials.json"));
    });

    test("returns keychain description for macOS backend", async () => {
      const writer = new CredentialWriter({ platform: "macos" });
      const location = writer.getStorageLocation();

      // Should return keychain description
      expect(location).toContain("macOS Keychain");
      expect(location).toContain("claude-code");
    });

    test("uses custom config directory in location", async () => {
      const customDir = join(testDir, "custom-config");
      const writer = new CredentialWriter({
        configDir: customDir,
        platform: "linux",
      });
      const location = writer.getStorageLocation();

      expect(location).toBe(join(customDir, ".credentials.json"));
    });
  });

  describe("file permissions", () => {
    test("sets restrictive permissions on credentials file (0600)", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      const result = await writer.writeCredentials(credentials);
      expect(result.isOk()).toBe(true);

      // Check file permissions
      const credentialsPath = join(configDir, ".credentials.json");
      const stats = await stat(credentialsPath);

      // Mode should be 0600 (owner read/write only)
      // Note: mode includes file type bits, so we mask with 0o777
      const fileMode = stats.mode & 0o777;
      expect(fileMode).toBe(0o600);
    });

    test("sets restrictive permissions on directory (0700)", async () => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials();

      const result = await writer.writeCredentials(credentials);
      expect(result.isOk()).toBe(true);

      // Check directory permissions using stat
      const dirStat = await Bun.$`stat -c %a ${configDir}`.text();
      const dirMode = dirStat.trim();

      // Should be 700 (owner full access only)
      expect(dirMode).toBe("700");
    });
  });

  describe("different subscription types", () => {
    const subscriptionTypes = ["max", "pro", "free", "enterprise"] as const;

    test.each(subscriptionTypes.map((t) => [t]))(
      "writes credentials with '%s' subscription",
      async (subType) => {
        const writer = new CredentialWriter({ configDir, platform: "linux" });
        const credentials = createTestCredentials({
          subscriptionType: subType,
        });

        const result = await writer.writeCredentials(credentials);
        expect(result.isOk()).toBe(true);
      },
    );
  });

  describe("token format variations", () => {
    const tokenFormats = [
      {
        field: "accessToken",
        value: "sk-ant-lenient-token-format",
        desc: "lenient accessToken prefix (sk-ant-)",
      },
      {
        field: "refreshToken",
        value: "sk-ant-lenient-refresh-token",
        desc: "lenient refreshToken prefix (sk-ant-)",
      },
      {
        field: "accessToken",
        value: "sk-ant-oat01-standard-format-token",
        desc: "standard accessToken prefix (sk-ant-oat01-)",
      },
      {
        field: "refreshToken",
        value: "sk-ant-ort01-standard-format-token",
        desc: "standard refreshToken prefix (sk-ant-ort01-)",
      },
    ] as const;

    test.each([...tokenFormats])("accepts $desc", async ({ field, value }) => {
      const writer = new CredentialWriter({ configDir, platform: "linux" });
      const credentials = createTestCredentials({ [field]: value });

      const result = await writer.writeCredentials(credentials);
      expect(result.isOk()).toBe(true);
    });
  });
});
