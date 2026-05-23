import { Command } from "commander";
import { describe, expect, test, vi } from "vitest";
import {
  createAuthStatusCommand,
  type AuthStatusCommandDependencies,
} from "./status";
import type { ClaudeReadinessResult } from "../../../sdk";

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function createResult(
  overrides: Partial<ClaudeReadinessResult>,
): ClaudeReadinessResult {
  return {
    ready: true,
    auth: {
      state: "configured",
      available: true,
      verified: false,
      storageLocation: "~/.claude",
      scopes: ["user:inference"],
      subscriptionType: "max",
      rateLimitTier: "default",
      expiresAt: new Date("2026-03-31T00:00:00.000Z"),
    },
    cli: {
      checked: false,
      available: false,
      command: "claude",
    },
    model: {
      requested: null,
      checked: false,
      available: false,
      timedOut: false,
      stdout: "",
      stderr: "",
      commandArgs: [],
    },
    ...overrides,
  };
}

function createProgram(dependencies: AuthStatusCommandDependencies): Command {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createAuthStatusCommand(dependencies));
  return program;
}

describe("createAuthStatusCommand", () => {
  test("prints valid status for ready credentials", async () => {
    const writeLine = vi.fn();
    const program = createProgram({
      verifyReadiness: vi.fn(async () => createResult({ ready: true })),
      writeLine,
      exit: ((code: number): never => {
        throw new ExitSignal(code);
      }) as (code: number) => never,
    });

    await program.parseAsync(["node", "test", "status"]);

    expect(
      writeLine.mock.calls.some((call) =>
        String(call[0]).includes("Authentication Status: VALID"),
      ),
    ).toBe(true);
  });

  test("exits with code 1 when credentials are expired", async () => {
    const program = createProgram({
      verifyReadiness: vi.fn(async () =>
        createResult({
          ready: false,
          auth: {
            state: "expired",
            available: false,
            verified: false,
            storageLocation: "~/.claude",
            scopes: ["user:inference"],
            message: "Stored credentials are expired.",
          },
        }),
      ),
      writeLine: vi.fn(),
      exit: ((code: number): never => {
        throw new ExitSignal(code);
      }) as (code: number) => never,
    });

    await expect(program.parseAsync(["node", "test", "status"])).rejects.toMatchObject(
      { code: 1 },
    );
  });

  test("outputs structured JSON when --json is passed", async () => {
    const writeLine = vi.fn();
    const program = createProgram({
      verifyReadiness: vi.fn(async () => createResult({ ready: true })),
      writeLine,
      exit: ((code: number): never => {
        throw new ExitSignal(code);
      }) as (code: number) => never,
    });

    await program.parseAsync(["node", "test", "status", "--json"]);

    const jsonLine = writeLine.mock.calls
      .map((call) => String(call[0]))
      .find((line) => line.includes('"ready"'));
    expect(jsonLine).toBeDefined();
    expect(JSON.parse(jsonLine ?? "{}")).toMatchObject({ ready: true });
  });
});
