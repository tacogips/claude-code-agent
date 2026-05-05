import { describe, expect, test } from "vitest";
import { createTestContainer } from "../container";
import { MockClock } from "../test/mocks/clock";
import { TokenManager } from "./token-manager";

describe("TokenManager", () => {
  test("creates, lists, and validates tokens without storing plaintext", async () => {
    const clock = new MockClock(new Date("2026-05-05T00:00:00.000Z"));
    const manager = new TokenManager(
      createTestContainer({ clock }),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    const fullToken = await manager.createToken({
      name: "local",
      permissions: ["session:read"],
    });

    expect(fullToken).toMatch(/^cca_/);

    const tokens = await manager.listTokens();
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.name).toBe("local");
    expect(tokens[0]?.createdAt).toBe("2026-05-05T00:00:00.000Z");
    expect(tokens[0]?.hash).toMatch(/^sha256:/);
    expect(tokens[0]?.hash).not.toBe(fullToken);

    clock.setTime(new Date("2026-05-05T00:01:00.000Z"));
    const validated = await manager.validateToken(fullToken);
    expect(validated?.id).toBe(tokens[0]?.id);
    expect(validated?.lastUsedAt).toBe("2026-05-05T00:01:00.000Z");
  });

  test("uses injected clock for expiration checks", async () => {
    const clock = new MockClock(new Date("2026-05-05T00:00:00.000Z"));
    const manager = new TokenManager(
      createTestContainer({ clock }),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    const fullToken = await manager.createToken({
      name: "short-lived",
      permissions: ["session:read"],
      expiresIn: "1h",
    });

    expect(await manager.validateToken(fullToken)).not.toBeNull();

    clock.setTime(new Date("2026-05-05T01:00:01.000Z"));
    expect(await manager.validateToken(fullToken)).toBeNull();
  });

  test("checks exact and wildcard permissions", async () => {
    const manager = new TokenManager(
      createTestContainer(),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    const fullToken = await manager.createToken({
      name: "queue-admin",
      permissions: ["queue:*"],
    });

    const token = await manager.validateToken(fullToken);
    expect(token).not.toBeNull();
    if (token === null) {
      return;
    }

    expect(manager.hasPermission(token, "queue:*")).toBe(true);
    expect(manager.hasPermission(token, "session:read")).toBe(false);
  });

  test("revokes tokens by id", async () => {
    const manager = new TokenManager(
      createTestContainer(),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    const fullToken = await manager.createToken({
      name: "temporary",
      permissions: ["bookmark:*"],
    });

    const token = await manager.validateToken(fullToken);
    expect(token).not.toBeNull();
    if (token === null) {
      return;
    }

    await manager.revokeToken(token.id);
    expect(await manager.validateToken(fullToken)).toBeNull();
  });
});
