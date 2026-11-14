/**
 * CLI Auth Export Command
 *
 * Exports credentials to file or stdout for transfer to another machine.
 * Supports JSON (structured) and raw (KEY=VALUE) output formats.
 *
 * WARNING: Exported data contains sensitive tokens.
 * Handle with care and delete after import.
 *
 * @module cli/commands/auth/export
 */
import type { Command } from "commander";
/**
 * Create auth export command that exports credentials to file or stdout.
 *
 * Options:
 * - --output/-o: Write to file instead of stdout
 * - --format/-f: Output format (json or raw)
 *
 * Exit codes:
 * - 0: Export successful
 * - 1: Not authenticated or export failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Export to stdout as JSON
 * claude-code-agent auth export
 *
 * # Export to file
 * claude-code-agent auth export --output credentials.json
 *
 * # Export in raw KEY=VALUE format
 * claude-code-agent auth export --format raw
 * ```
 */
export declare function createAuthExportCommand(): Command;
//# sourceMappingURL=export.d.ts.map