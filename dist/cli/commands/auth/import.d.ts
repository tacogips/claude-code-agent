/**
 * CLI Auth Import Command
 *
 * Imports credentials from file, stdin, or individual options.
 * Allows transferring authentication between machines.
 *
 * WARNING: Only import credentials from trusted sources.
 *
 * @module cli/commands/auth/import
 */
import type { Command } from "commander";
/**
 * Create auth import command that imports credentials from various sources.
 *
 * Arguments:
 * - [file]: Input file path (optional)
 *
 * Options:
 * - --stdin: Read from stdin
 * - --access-token: Access token for manual entry
 * - --refresh-token: Refresh token
 * - --expires-at: Expiration timestamp (ms)
 * - --scopes: Comma-separated scopes
 * - --subscription-type: Subscription type
 * - --rate-limit-tier: Rate limit tier
 * - --force: Skip confirmation for overwrite
 *
 * Exit codes:
 * - 0: Import successful
 * - 1: Import failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Import from file
 * claude-code-agent auth import credentials.json
 *
 * # Import from stdin
 * cat credentials.json | claude-code-agent auth import --stdin
 *
 * # Import with individual options
 * claude-code-agent auth import --access-token "sk-ant-oat01-..." \
 *   --refresh-token "sk-ant-ort01-..." --expires-at 1768332736724 \
 *   --scopes "user:inference,user:profile" --subscription-type max \
 *   --rate-limit-tier default_claude_max_20x
 * ```
 */
export declare function createAuthImportCommand(): Command;
//# sourceMappingURL=import.d.ts.map