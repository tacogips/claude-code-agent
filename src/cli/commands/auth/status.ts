/**
 * CLI Auth Status Command
 *
 * Checks and displays current authentication status with Claude Code.
 * Shows whether credentials are valid, expired, or missing, along with
 * subscription type and expiration time.
 *
 * @module cli/commands/auth/status
 */

import type { Command } from "commander";
import {
  verifyClaudeReadiness,
  type ClaudeReadinessResult,
} from "../../../sdk";
import { formatJson } from "../../output";

export interface AuthStatusCommandDependencies {
  readonly verifyReadiness?:
    | (() => Promise<ClaudeReadinessResult>)
    | undefined;
  readonly writeLine?: ((line: string) => void) | undefined;
  readonly exit?: ((code: number) => never) | undefined;
}

function writeStatusSummary(
  writeLine: (line: string) => void,
  result: ClaudeReadinessResult,
): void {
  const statusLabel =
    result.auth.state === "missing"
      ? "NOT AUTHENTICATED"
      : result.auth.state === "expired"
        ? "EXPIRED"
        : "VALID";

  writeLine(`Authentication Status: ${statusLabel}`);

  if (result.auth.state === "missing") {
    writeLine("Run: claude /login");
    return;
  }

  if (result.auth.subscriptionType !== undefined) {
    writeLine(`Subscription: ${result.auth.subscriptionType}`);
  }

  if (result.auth.expiresAt !== undefined) {
    writeLine(`Expires: ${result.auth.expiresAt.toISOString()}`);
  }

  if (result.auth.message !== undefined) {
    writeLine(`Message: ${result.auth.message}`);
  }
}

/**
 * Create auth status command that checks authentication status
 *
 * Displays:
 * - Authentication status (VALID/EXPIRED/NOT_AUTHENTICATED)
 * - Subscription type
 * - Expiration time
 *
 * Exit codes:
 * - 0: Credentials are ready for execution
 * - 1: Credentials are missing, expired, or otherwise unusable
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * claude-code-agent auth status
 * # Output:
 * # Authentication Status: VALID
 * # Subscription: pro
 * # Expires: 2026-02-15T10:30:00.000Z
 * ```
 */
export function createAuthStatusCommand(
  dependencies: AuthStatusCommandDependencies = {},
): Command {
  const { Command } = require("commander") as typeof import("commander");
  const verifyReadiness = dependencies.verifyReadiness ?? verifyClaudeReadiness;
  const writeLine =
    dependencies.writeLine ?? ((line: string) => console.log(line));
  const exit =
    dependencies.exit ??
    ((code: number): never => {
      process.exit(code);
    });

  return new Command("status")
    .description("Check authentication status")
    .option("--json", "Output structured JSON")
    .action(async (options: { json?: boolean }) => {
      const result = await verifyReadiness();

      if (options.json === true) {
        writeLine(formatJson(result));
      } else {
        writeStatusSummary(writeLine, result);
      }

      if (!result.ready) {
        exit(1);
      }
    });
}
