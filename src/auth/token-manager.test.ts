import { describe, expect, test } from "vitest";
import { createTestContainer } from "../container";
import type {
  FileLockService,
  LockOptions,
  LockResult,
} from "../interfaces/lock";
import { MockClock } from "../test/mocks/clock";
import { MockFileLockService } from "../test/mocks/lock";
import type { Permission } from "./types";
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

    clock.setTime(new Date("2026-05-05T00:59:59.999Z"));
    expect(await manager.validateToken(fullToken)).not.toBeNull();

    clock.setTime(new Date("2026-05-05T01:00:00.000Z"));
    expect(await manager.validateToken(fullToken)).toBeNull();
  });

  test("rejects invalid expiration durations", async () => {
    const manager = new TokenManager(
      createTestContainer(),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    await expect(
      manager.createToken({
        name: "invalid",
        permissions: ["session:read"],
        expiresIn: "0d",
      }),
    ).rejects.toThrow("Invalid duration format");
  });

  test("snapshots permissions when tokens are created", async () => {
    const manager = new TokenManager(
      createTestContainer(),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();
    const permissions: Permission[] = ["session:read"];

    await manager.createToken({
      name: "snapshot",
      permissions,
    });
    permissions.push("queue:*");

    const tokens = await manager.listTokens();
    expect(tokens[0]?.permissions).toEqual(["session:read"]);
  });

  test("uses the injected file lock service for token storage access", async () => {
    const lockService = new RecordingFileLockService();
    const manager = new TokenManager(
      createTestContainer({ fileLockService: lockService }),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    await manager.createToken({
      name: "locked",
      permissions: ["session:read"],
    });

    expect(lockService.lockedPaths).toEqual([
      "/tokens/api-tokens.json",
      "/tokens/api-tokens.json",
    ]);
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

  test("rotates tokens without dropping expiration metadata", async () => {
    const clock = new MockClock(new Date("2026-05-05T00:00:00.000Z"));
    const manager = new TokenManager(
      createTestContainer({ clock }),
      "/tokens/api-tokens.json",
    );
    await manager.initialize();

    const oldFullToken = await manager.createToken({
      name: "rotating",
      permissions: ["session:read"],
      expiresIn: "1h",
    });
    const oldToken = await manager.validateToken(oldFullToken);
    expect(oldToken).not.toBeNull();
    if (oldToken === null) {
      return;
    }

    const newFullToken = await manager.rotateToken(oldToken.id);
    const tokens = await manager.listTokens();

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.id).not.toBe(oldToken.id);
    expect(tokens[0]?.expiresAt).toBe("2026-05-05T01:00:00.000Z");
    expect(await manager.validateToken(oldFullToken)).toBeNull();
    expect(await manager.validateToken(newFullToken)).not.toBeNull();
  });

  test("rejects malformed token storage instead of trusting JSON shape", async () => {
    const container = createTestContainer();
    await container.fileSystem.writeFile(
      "/tokens/api-tokens.json",
      JSON.stringify({ tokens: [{ id: "broken", permissions: ["queue:*"] }] }),
    );

    const manager = new TokenManager(container, "/tokens/api-tokens.json");

    await expect(manager.initialize()).rejects.toThrow(
      "Invalid token storage schema",
    );
  });

  test("rejects non-canonical timestamps in token storage", async () => {
    const container = createTestContainer();
    await container.fileSystem.writeFile(
      "/tokens/api-tokens.json",
      JSON.stringify({
        tokens: [
          {
            id: "abc12345",
            name: "date-only",
            hash: `sha256:${"a".repeat(64)}`,
            permissions: ["session:read"],
            createdAt: "2026-05-05",
          },
        ],
      }),
    );

    const manager = new TokenManager(container, "/tokens/api-tokens.json");

    await expect(manager.initialize()).rejects.toThrow(
      "Invalid token storage schema",
    );
  });
});

class RecordingFileLockService implements FileLockService {
  readonly lockedPaths: string[] = [];
  readonly #delegate = new MockFileLockService();

  async acquire(
    resourcePath: string,
    options?: LockOptions,
  ): Promise<LockResult> {
    return await this.#delegate.acquire(resourcePath, options);
  }

  async withLock<T>(
    resourcePath: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    this.lockedPaths.push(resourcePath);
    return await this.#delegate.withLock(resourcePath, fn, options);
  }

  async isLocked(resourcePath: string): Promise<boolean> {
    return await this.#delegate.isLocked(resourcePath);
  }
}
