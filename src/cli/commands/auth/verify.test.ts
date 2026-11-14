import { Command } from "commander";
import { describe, expect, test, vi } from "vitest";
import {
  createAuthVerifyCommand,
  type AuthVerifyCommandDependencies,
} from "./verify";
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

function createProgram(dependencies: AuthVerifyCommandDependencies): Command {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createAuthVerifyCommand(dependencies));
  return program;
}

describe("createAuthVerifyCommand", () => {
  test("passes the requested model to readiness verification", async () => {
    const writeLine = vi.fn();
    const verifyReadiness = vi.fn(async () =>
      createResult({
        model: {
          requested: "claude-sonnet-4-5",
          checked: true,
          available: true,
          timedOut: false,
          stdout: "",
          stderr: "",
          commandArgs: ["--model", "claude-sonnet-4-5"],
        },
      }),
    );

    const program = createProgram({
      verifyReadiness,
      writeLine,
      exit: ((code: number): never => {
        throw new ExitSignal(code);
      }) as (code: number) => never,
    });

    await program.parseAsync([
      "node",
      "test",
      "verify",
      "--model",
      "claude-sonnet-4-5",
    ]);

    expect(verifyReadiness).toHaveBeenCalledWith({
      model: "claude-sonnet-4-5",
    });
    expect(
      writeLine.mock.calls.some((call) =>
        String(call[0]).includes("Model:            claude-sonnet-4-5"),
      ),
    ).toBe(true);
  });

  test("exits with code 1 when readiness check fails", async () => {
    const verifyReadiness = vi.fn(async () =>
      createResult({
        ready: false,
        auth: {
          state: "configured",
          available: false,
          verified: true,
          storageLocation: "~/.claude",
          scopes: ["user:inference"],
          message: "Authentication failed",
        },
      }),
    );

    const program = createProgram({
      verifyReadiness,
      writeLine: vi.fn(),
      exit: ((code: number): never => {
        throw new ExitSignal(code);
      }) as (code: number) => never,
    });

    await expect(
      program.parseAsync([
        "node",
        "test",
        "verify",
        "--model",
        "claude-sonnet-4-5",
      ]),
    ).rejects.toMatchObject({ code: 1 });
  });
});
