/**
 * CLI Auth Verify Command
 *
 * Verifies that stored credentials are valid and not expired.
 * Displays detailed information about credential status.
 *
 * @module cli/commands/auth/verify
 */
import type { Command } from "commander";
import { type ClaudeReadinessResult } from "../../../sdk";
export interface AuthVerifyCommandDependencies {
    readonly verifyReadiness?: ((options?: {
        readonly model?: string | undefined;
    }) => Promise<ClaudeReadinessResult>) | undefined;
    readonly writeLine?: ((line: string) => void) | undefined;
    readonly exit?: ((code: number) => never) | undefined;
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
export declare function createAuthVerifyCommand(dependencies?: AuthVerifyCommandDependencies): Command;
//# sourceMappingURL=verify.d.ts.map