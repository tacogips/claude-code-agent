/**
 * CLI Auth Command Group
 *
 * Manages authentication and displays account information.
 * Provides subcommands for viewing account details, usage statistics,
 * authentication status, token information, and credential management.
 *
 * @module cli/commands/auth
 */
import type { Command } from "commander";
/**
 * Create the auth command group.
 *
 * Provides access to authentication-related commands:
 * - `info`: Display account information
 * - `stats`: Show usage statistics
 * - `status`: Check authentication status
 * - `token`: Display token information
 * - `export`: Export credentials for transfer
 * - `import`: Import credentials from file or options
 * - `delete`: Delete stored credentials
 * - `verify`: Verify credential validity
 *
 * All commands read from Claude Code's credentials stored in
 * ~/.claude/.credentials.json (Linux/Windows) or Keychain (macOS).
 *
 * @returns Commander Command instance with registered subcommands
 *
 * @example
 * ```bash
 * # Show help for auth commands
 * claude-code-agent auth --help
 *
 * # Check authentication status
 * claude-code-agent auth status
 *
 * # Display account information
 * claude-code-agent auth info
 *
 * # Show usage statistics
 * claude-code-agent auth stats
 *
 * # Display token information
 * claude-code-agent auth token
 *
 * # Export credentials
 * claude-code-agent auth export --output credentials.json
 *
 * # Import credentials
 * claude-code-agent auth import credentials.json
 *
 * # Verify credentials
 * claude-code-agent auth verify
 *
 * # Delete credentials
 * claude-code-agent auth delete
 * ```
 */
export declare function createAuthCommand(): Command;
//# sourceMappingURL=index.d.ts.map