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
import { CredentialReader } from "../../../sdk/credentials";

/**
 * Command options for auth token command.
 */
interface AuthTokenOptions {
  /**
   * Show full token values (SECURITY WARNING).
   * @default false
   */
  readonly showFull?: boolean;
}

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
export function createAuthTokenCommand(): Command {
  const { Command } = require("commander");
  const cmd = new Command("token");

  return cmd
    .description("Show token information")
    .option("--show-full", "Show full token (SECURITY WARNING)")
    .action(async (options: AuthTokenOptions) => {
      const reader = new CredentialReader();
      const creds = await reader.getCredentials();

      if (!creds) {
        console.error("Not authenticated");
        process.exit(1);
      }

      if (options.showFull) {
        console.warn("WARNING: Full token displayed. Do not share.");
        console.log(`Access Token: ${creds.accessToken}`);
        console.log(`Refresh Token: ${creds.refreshToken}`);
      } else {
        // Redacted display
        const redacted = redactToken(creds.accessToken);
        console.log(`Access Token: ${redacted}`);
      }

      console.log(`Scopes: ${creds.scopes.join(", ")}`);
      console.log(`Expires: ${creds.expiresAt.toISOString()}`);
    });
}

/**
 * Redact token to show only first 15 and last 4 characters.
 *
 * This prevents accidental token exposure in screenshots, logs, or
 * terminal history while still allowing visual verification that
 * a token exists.
 *
 * @param token - Full token string
 * @returns Redacted token string
 *
 * @example
 * ```typescript
 * redactToken('sk-ant-abc123456789xyz')
 * // Returns: 'sk-ant-abc12345...xyz9'
 *
 * redactToken('short')
 * // Returns: '***'
 * ```
 */
function redactToken(token: string): string {
  if (token.length < 20) return "***";
  return `${token.slice(0, 15)}...${token.slice(-4)}`;
}
