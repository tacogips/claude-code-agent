/**
 * CLI Auth Verify Command
 *
 * Verifies that stored credentials are valid and not expired.
 * Displays detailed information about credential status.
 *
 * @module cli/commands/auth/verify
 */

import type { Command } from "commander";
import {
  verifyClaudeReadiness,
  type ClaudeReadinessResult,
} from "../../../sdk";
import { formatJson } from "../../output";
import { formatRelativeTime } from "./utils";

export interface AuthVerifyCommandDependencies {
  readonly verifyReadiness?:
    | ((options?: {
        readonly model?: string | undefined;
      }) => Promise<ClaudeReadinessResult>)
    | undefined;
  readonly writeLine?: ((line: string) => void) | undefined;
  readonly exit?: ((code: number) => never) | undefined;
}

function writeCredentialSummary(
  writeLine: (line: string) => void,
  result: ClaudeReadinessResult,
): void {
  writeLine("");
  writeLine("CREDENTIAL VERIFICATION");
  writeLine("-----------------------------------------------------------");

  const authStatus =
    result.auth.state === "missing"
      ? "NOT_FOUND"
      : result.auth.state === "expired"
        ? "EXPIRED"
        : result.auth.available
          ? result.auth.verified
            ? "VALID (VERIFIED)"
            : "VALID"
          : "INVALID";

  writeLine(`Status:           ${authStatus}`);

  if (result.auth.expiresAt !== undefined) {
    writeLine(
      `Token Expires:    ${result.auth.expiresAt.toISOString()} (${formatRelativeTime(result.auth.expiresAt)})`,
    );
  }

  if (result.auth.subscriptionType !== undefined) {
    writeLine(`Subscription:     ${result.auth.subscriptionType}`);
  }

  writeLine(
    `Scopes:           ${result.auth.scopes.length > 0 ? result.auth.scopes.join(", ") : "-"}`,
  );

  if (result.auth.rateLimitTier !== undefined) {
    writeLine(`Rate Limit Tier:  ${result.auth.rateLimitTier}`);
  }

  writeLine(`Storage:          ${result.auth.storageLocation}`);

  if (result.model.requested !== null) {
    writeLine(`Model:            ${result.model.requested}`);
    writeLine(
      `Model Status:     ${result.model.available ? "AVAILABLE" : result.model.checked ? "UNAVAILABLE" : "SKIPPED"}`,
    );
  }

  if (result.auth.message !== undefined) {
    writeLine(`Auth Message:     ${result.auth.message}`);
  }

  if (result.model.message !== undefined) {
    writeLine(`Probe Message:    ${result.model.message}`);
  }

  writeLine("");
  writeLine(
    result.ready
      ? "Credentials are valid and can be used for Claude Code execution."
      : "Credentials or model access could not be verified for Claude Code execution.",
  );
}

/**
 * Create auth verify command that checks credential validity.
 *
 * Displays:
 * - Status (VALID/EXPIRED/NOT_FOUND)
 * - Token expiration time
 * - Subscription type
 * - Granted scopes
 *
 * Exit codes:
 * - 0: Credentials are valid
 * - 1: Credentials are expired or not found
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * claude-code-agent auth verify
 * # Output:
 * # CREDENTIAL VERIFICATION
 * # -----------------------------------------------------------
 * # Status:           VALID
 * # Token Expires:    2026-01-15 12:32:16 (23 hours from now)
 * # Subscription:     max
 * # Scopes:           user:inference, user:profile, user:sessions:claude_code
 * #
 * # Credentials are valid and can be used for Claude Code execution.
 * ```
 */
export function createAuthVerifyCommand(
  dependencies: AuthVerifyCommandDependencies = {},
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

  return new Command("verify")
    .description("Verify stored credentials and optionally probe a model")
    .option("--model <model>", "Probe the specified Claude model")
    .option("--json", "Output structured JSON")
    .action(async (options: { model?: string; json?: boolean }) => {
      const result = await verifyReadiness({
        model: options.model,
      });

      if (options.json === true) {
        writeLine(formatJson(result));
      } else {
        writeCredentialSummary(writeLine, result);
      }

      if (!result.ready) {
        exit(1);
      }
    });
}
