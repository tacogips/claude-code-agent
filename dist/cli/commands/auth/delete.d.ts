/**
 * CLI Auth Delete Command
 *
 * Deletes stored credentials from the system.
 * Requires confirmation before deletion (unless --force is used).
 *
 * @module cli/commands/auth/delete
 */
import type { Command } from "commander";
/**
 * Create auth delete command that removes stored credentials.
 *
 * Options:
 * - --force: Skip confirmation prompt
 *
 * Exit codes:
 * - 0: Deletion successful or no credentials to delete
 * - 1: Deletion failed or cancelled
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Delete with confirmation
 * claude-code-agent auth delete
 *
 * # Delete without confirmation
 * claude-code-agent auth delete --force
 * ```
 */
export declare function createAuthDeleteCommand(): Command;
//# sourceMappingURL=delete.d.ts.map