/**
 * Unit tests for credential validation functions
 *
 * @module sdk/credentials/__tests__/validation.test
 */

import { describe, test, expect } from "bun:test";
import {
  validateCredentialsInput,
  validateCredentialsExport,
  type OAuthTokensInput,
  type CredentialsExport,
} from "../validation";

describe("validateCredentialsInput", () => {
  test("accepts valid input with exact token prefix", () => {
    const validInput: OAuthTokensInput = {
      accessToken: "sk-ant-oat01-test-access-token-1234567890",
      refreshToken: "sk-ant-ort01-test-refresh-token-1234567890",
      expiresAt: Date.now() + 3600000, // 1 hour in future
      scopes: ["user:inference", "user:profile", "user:sessions:claude_code"],
      subscriptionType: "max",
      rateLimitTier: "default_claude_max_20x",
    };

    const result = validateCredentialsInput(validInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(validInput);
    }
  });

  test("accepts valid input with lenient sk-ant- prefix for access token", () => {
    const validInput = {
      accessToken: "sk-ant-test-access-token-1234567890",
      refreshToken: "sk-ant-ort01-test-refresh-token-1234567890",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "pro",
      rateLimitTier: "default_pro",
    };

    const result = validateCredentialsInput(validInput);

    expect(result.isOk()).toBe(true);
  });

  test("accepts valid input with lenient sk-ant- prefix for refresh token", () => {
    const validInput = {
      accessToken: "sk-ant-oat01-test-access-token-1234567890",
      refreshToken: "sk-ant-test-refresh-token-1234567890",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "free",
      rateLimitTier: "default_free",
    };

    const result = validateCredentialsInput(validInput);

    expect(result.isOk()).toBe(true);
  });

  test("accepts all valid subscription types", () => {
    const subscriptionTypes = ["max", "pro", "free", "enterprise", "unknown"];

    for (const subType of subscriptionTypes) {
      const validInput = {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: subType,
        rateLimitTier: "default_tier",
      };

      const result = validateCredentialsInput(validInput);

      expect(result.isOk()).toBe(true);
    }
  });

  test("rejects null input", () => {
    const result = validateCredentialsInput(null);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("must be an object");
      expect(result.error.message).toContain("null or non-object");
    }
  });

  test("rejects non-object input", () => {
    const result = validateCredentialsInput("not an object");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("must be an object");
    }
  });

  test("rejects missing accessToken", () => {
    const invalidInput = {
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("accessToken");
      expect(result.error.message).toContain("must be a string");
    }
  });

  test("rejects invalid access token prefix", () => {
    const invalidInput = {
      accessToken: "invalid-prefix-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("accessToken");
      expect(result.error.message).toContain('must start with "sk-ant-');
    }
  });

  test("rejects empty access token", () => {
    const invalidInput = {
      accessToken: "",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("accessToken");
    }
  });

  test("rejects missing refreshToken", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("refreshToken");
      expect(result.error.message).toContain("must be a string");
    }
  });

  test("rejects invalid refresh token prefix", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "invalid-prefix-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("refreshToken");
      expect(result.error.message).toContain('must start with "sk-ant-');
    }
  });

  test("rejects empty refresh token", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("refreshToken");
    }
  });

  test("rejects missing expiresAt", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("expiresAt");
      expect(result.error.message).toContain("must be a number");
    }
  });

  test("rejects non-number expiresAt", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: "not a number",
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("expiresAt");
      expect(result.error.message).toContain("must be a number");
    }
  });

  test("rejects expired token (past timestamp)", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() - 3600000, // 1 hour ago
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("Token is expired");
      expect(result.error.message).toContain("invalid expiration");
    }
  });

  test("rejects token expiring exactly now (boundary case)", () => {
    const now = Date.now();
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: now,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("Token is expired");
    }
  });

  test("accepts token expiring 1ms in future (boundary case)", () => {
    const validInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 1, // 1ms in future
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(validInput);

    expect(result.isOk()).toBe(true);
  });

  test("rejects missing scopes", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("scopes");
      expect(result.error.message).toContain("must be an array");
    }
  });

  test("rejects non-array scopes", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: "not an array",
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("scopes");
      expect(result.error.message).toContain("must be an array");
    }
  });

  test("rejects empty scopes array", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: [],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("scopes");
      expect(result.error.message).toContain("non-empty array");
    }
  });

  test("rejects scopes with non-string elements", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference", 123, "user:profile"],
      subscriptionType: "max",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("all scopes must be strings");
    }
  });

  test("rejects missing subscriptionType", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("subscriptionType");
      expect(result.error.message).toContain("must be a string");
    }
  });

  test("rejects invalid subscription type", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "invalid_subscription",
      rateLimitTier: "default_tier",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("subscriptionType");
      expect(result.error.message).toContain("must be one of");
      expect(result.error.message).toContain("max");
      expect(result.error.message).toContain("pro");
      expect(result.error.message).toContain("free");
      expect(result.error.message).toContain("enterprise");
      expect(result.error.message).toContain("unknown");
    }
  });

  test("rejects missing rateLimitTier", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("rateLimitTier");
      expect(result.error.message).toContain("must be a string");
    }
  });

  test("rejects empty rate limit tier", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "",
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("rateLimitTier");
      expect(result.error.message).toContain("non-empty string");
    }
  });

  test("rejects non-string rateLimitTier", () => {
    const invalidInput = {
      accessToken: "sk-ant-oat01-test-access-token",
      refreshToken: "sk-ant-ort01-test-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: 123,
    };

    const result = validateCredentialsInput(invalidInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("rateLimitTier");
      expect(result.error.message).toContain("must be a string");
    }
  });
});

describe("validateCredentialsExport", () => {
  test("accepts valid export", () => {
    const validExport: CredentialsExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference", "user:profile"],
        subscriptionType: "max",
        rateLimitTier: "default_claude_max_20x",
      },
    };

    const result = validateCredentialsExport(validExport);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.version).toBe(1);
      expect(result.value.exportedAt).toBe("2026-01-14T12:00:00Z");
      expect(result.value.credentials.accessToken).toBe(
        "sk-ant-oat01-test-access-token",
      );
    }
  });

  test("rejects null input", () => {
    const result = validateCredentialsExport(null);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("Export must be an object");
      expect(result.error.message).toContain("null or non-object");
    }
  });

  test("rejects non-object input", () => {
    const result = validateCredentialsExport("not an object");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("Export must be an object");
    }
  });

  test("rejects missing version", () => {
    const invalidExport = {
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("version must be 1");
    }
  });

  test("rejects invalid version (not 1)", () => {
    const invalidExport = {
      version: 2,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("version must be 1");
      expect(result.error.message).toContain("got 2");
    }
  });

  test("rejects version 0 (boundary case)", () => {
    const invalidExport = {
      version: 0,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("version must be 1");
      expect(result.error.message).toContain("got 0");
    }
  });

  test("rejects missing exportedAt", () => {
    const invalidExport = {
      version: 1,
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("exportedAt");
      expect(result.error.message).toContain("must be a string");
    }
  });

  test("rejects non-string exportedAt", () => {
    const invalidExport = {
      version: 1,
      exportedAt: 1234567890,
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("exportedAt");
      expect(result.error.message).toContain("must be a string");
    }
  });

  test("rejects missing credentials", () => {
    const invalidExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("credentials object");
    }
  });

  test("rejects null credentials", () => {
    const invalidExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: null,
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("credentials object");
    }
  });

  test("rejects invalid credentials (delegates to validateCredentialsInput)", () => {
    const invalidExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "invalid-prefix",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("accessToken");
    }
  });

  test("rejects expired credentials in export", () => {
    const invalidExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() - 3600000, // Expired
        scopes: ["user:inference"],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("expired");
    }
  });

  test("rejects empty scopes in export credentials", () => {
    const invalidExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: [],
        subscriptionType: "max",
        rateLimitTier: "default_tier",
      },
    };

    const result = validateCredentialsExport(invalidExport);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_FORMAT");
      expect(result.error.message).toContain("scopes");
      expect(result.error.message).toContain("non-empty");
    }
  });

  test("accepts export with multiple scopes", () => {
    const validExport = {
      version: 1,
      exportedAt: "2026-01-14T12:00:00Z",
      credentials: {
        accessToken: "sk-ant-oat01-test-access-token",
        refreshToken: "sk-ant-ort01-test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: [
          "user:inference",
          "user:profile",
          "user:sessions:claude_code",
          "user:billing",
        ],
        subscriptionType: "enterprise",
        rateLimitTier: "enterprise_tier",
      },
    };

    const result = validateCredentialsExport(validExport);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.credentials.scopes).toHaveLength(4);
    }
  });

  test("accepts various exportedAt formats (validation is lenient)", () => {
    const formats = [
      "2026-01-14T12:00:00Z",
      "2026-01-14T12:00:00.000Z",
      "2026-01-14 12:00:00",
      "Mon Jan 14 2026",
    ];

    for (const dateFormat of formats) {
      const validExport = {
        version: 1,
        exportedAt: dateFormat,
        credentials: {
          accessToken: "sk-ant-oat01-test-access-token",
          refreshToken: "sk-ant-ort01-test-refresh-token",
          expiresAt: Date.now() + 3600000,
          scopes: ["user:inference"],
          subscriptionType: "max",
          rateLimitTier: "default_tier",
        },
      };

      const result = validateCredentialsExport(validExport);

      expect(result.isOk()).toBe(true);
    }
  });
});
