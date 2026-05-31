/**
 * CLI command for displaying account information.
 *
 * Shows Claude Code account details including email, organization, and billing info.
 * Supports both table and JSON output formats.
 *
 * @module cli/commands/auth/info
 */
import type { Command } from "commander";
/**
 * Create the auth info command.
 *
 * Displays account information from Claude Code credentials including:
 * - Account UUID
 * - Email address
 * - Display name
 * - Organization details (name, role, billing type)
 *
 * @returns Commander Command instance
 *
 * @example
 * ```bash
 * # Show account info in table format (default)
 * claude-code-agent auth info
 *
 * # Show account info in JSON format
 * claude-code-agent auth info --format json
 * ```
 */
export declare function createAuthInfoCommand(): Command;
//# sourceMappingURL=info.d.ts.map