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
import { type ClaudeReadinessResult } from "../../../sdk";
export interface AuthStatusCommandDependencies {
    readonly verifyReadiness?: (() => Promise<ClaudeReadinessResult>) | undefined;
    readonly writeLine?: ((line: string) => void) | undefined;
    readonly exit?: ((code: number) => never) | undefined;
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
export declare function createAuthStatusCommand(dependencies?: AuthStatusCommandDependencies): Command;
//# sourceMappingURL=status.d.ts.map