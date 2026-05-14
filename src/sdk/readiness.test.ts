import { describe, expect, test } from "vitest";
import { MockProcessManager } from "../test/mocks/process-manager";
import { verifyClaudeReadiness } from "./readiness";
import type { OAuthCredentialsResult } from "./credentials/types";

function createCredentialSource(credentials: OAuthCredentialsResult | null): {
  getCredentials(): Promise<OAuthCredentialsResult | null>;
  getStorageLocation(): string;
} {
  return {
    async getCredentials(): Promise<OAuthCredentialsResult | null> {
      return credentials;
    },
    getStorageLocation(): string {
      return "~/.claude";
    },
  };
}

function createValidCredentials(): OAuthCredentialsResult {
  return {
    accessToken: "sk-ant-oat01-test",
    refreshToken: "sk-ant-ort01-test",
    expiresAt: new Date(Date.now() + 60_000),
    scopes: ["user:inference"],
    subscriptionType: "max",
    rateLimitTier: "default",
    isExpired: false,
  };
}

describe("verifyClaudeReadiness", () => {
  test("returns auth-only success when no model is requested", async () => {
    const result = await verifyClaudeReadiness({
      credentialSource: createCredentialSource(createValidCredentials()),
      processManager: new MockProcessManager(),
    });

    expect(result.ready).toBe(true);
    expect(result.auth.available).toBe(true);
    expect(result.cli.checked).toBe(false);
    expect(result.model.checked).toBe(false);
  });

  test("probes the requested model successfully", async () => {
    const processManager = new MockProcessManager();
    processManager.setProcessConfig("claude", {
      stdout: ['{"type":"result","result":"READY"}'],
      exitCode: 0,
    });

    const result = await verifyClaudeReadiness({
      model: "claude-sonnet-4-5",
      credentialSource: createCredentialSource(createValidCredentials()),
      processManager,
    });

    expect(result.ready).toBe(true);
    expect(result.auth.verified).toBe(true);
    expect(result.model.available).toBe(true);
    expect(result.model.requested).toBe("claude-sonnet-4-5");
    expect(processManager.getSpawnHistory()[0]?.args).toContain("--model");
    expect(processManager.getSpawnHistory()[0]?.args).not.toContain("-p");
    expect(processManager.getSpawnHistory()[0]?.args).not.toContain(
      "--output-format",
    );
    expect(processManager.getSpawnHistory()[0]?.args).toContain(
      "claude-sonnet-4-5",
    );
  });

  test("marks the model unavailable when Claude rejects the model", async () => {
    const processManager = new MockProcessManager();
    processManager.setProcessConfig("claude", {
      stderr: ["Model claude-unknown is not available for this account"],
      exitCode: 1,
    });

    const result = await verifyClaudeReadiness({
      model: "claude-unknown",
      credentialSource: createCredentialSource(createValidCredentials()),
      processManager,
    });

    expect(result.ready).toBe(false);
    expect(result.auth.available).toBe(true);
    expect(result.auth.verified).toBe(true);
    expect(result.model.available).toBe(false);
    expect(result.model.failureKind).toBe("model");
  });

  test("marks auth unavailable when the live probe reports an auth error", async () => {
    const processManager = new MockProcessManager();
    processManager.setProcessConfig("claude", {
      stderr: ["Authentication failed. Please login again."],
      exitCode: 1,
    });

    const result = await verifyClaudeReadiness({
      model: "claude-sonnet-4-5",
      credentialSource: createCredentialSource(createValidCredentials()),
      processManager,
    });

    expect(result.ready).toBe(false);
    expect(result.auth.available).toBe(false);
    expect(result.auth.verified).toBe(true);
    expect(result.model.failureKind).toBe("auth");
  });

  test("skips the live probe when stored credentials are missing", async () => {
    const processManager = new MockProcessManager();

    const result = await verifyClaudeReadiness({
      model: "claude-sonnet-4-5",
      credentialSource: createCredentialSource(null),
      processManager,
    });

    expect(result.ready).toBe(false);
    expect(result.auth.state).toBe("missing");
    expect(result.model.checked).toBe(false);
    expect(processManager.getSpawnHistory()).toHaveLength(0);
  });
});
