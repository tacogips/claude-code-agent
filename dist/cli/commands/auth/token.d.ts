/**
 * CLI Auth Token Command
 *
 * Displays OAuth token information with security controls.
 * By default, shows redacted tokens to prevent accidental exposure.
 * Use --show-full flag to display complete tokens (with security warning).
 *
 * @module cli/commands/auth/token
 */
import type { Command } from "commander";
/**
 * Create the auth token command.
 *
 * Displays OAuth token information including:
 * - Access token (redacted by default, full with --show-full)
 * - Refresh token (only with --show-full)
 * - Scopes
 * - Expiration time
 *
 * Security:
 * - By default, tokens are redacted to prevent accidental exposure
 * - --show-full flag displays warning before showing full tokens
 * - Never share full tokens in screenshots or logs
 *
 * @returns Commander Command instance
 *
 * @example
 * ```bash
 * # Show redacted token info (safe)
 * claude-code-agent auth token
 * # Output:
 * # Access Token: sk-ant-abc123...xyz9
 * # Scopes: read, write
 * # Expires: 2026-02-15T10:30:00.000Z
 *
 * # Show full token (SECURITY WARNING)
 * claude-code-agent auth token --show-full
 * # Output:
 * # WARNING: Full token displayed. Do not share.
 * # Access Token: sk-ant-abc123456789...
 * # Refresh Token: sk-ant-refresh-...
 * # Scopes: read, write
 * # Expires: 2026-02-15T10:30:00.000Z
 * ```
 */
export declare function createAuthTokenCommand(): Command;
//# sourceMappingURL=token.d.ts.map