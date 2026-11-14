/**
 * Token management subcommands for the CLI.
 *
 * Provides commands for creating, listing, revoking, and rotating API tokens.
 * Token commands work directly with TokenManager.
 *
 * @module cli/commands/token
 */

import type { Command } from "commander";
import {
  isPermission,
  parseTokenDurationMs,
  TokenManager,
  VALID_PERMISSIONS,
} from "../../auth";
import type { Permission } from "../../auth";
import { formatTable, formatJson, printError, printSuccess } from "../output";
import { createProductionContainer } from "../../container";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Global CLI options passed from parent command.
 */
interface GlobalOptions {
  readonly format: "table" | "json";
}

interface TokenTableRow extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly permissions: string;
  readonly expires: string;
  readonly created: string;
  readonly lastUsed: string;
}

/**
 * Default path for token storage file.
 *
 * Uses ~/.config/claude-code-agent/api-tokens.json as the default location.
 */
function getDefaultTokenFilePath(): string {
  return join(homedir(), ".config", "claude-code-agent", "api-tokens.json");
}

/**
 * Parse comma-separated permissions string into Permission array.
 *
 * @param permissionsStr - Comma-separated permissions (e.g., "session:read,queue:*")
 * @returns Array of Permission values
 * @throws Error if any permission is invalid
 */
function parsePermissions(permissionsStr: string): readonly Permission[] {
  const parts = permissionsStr.split(",").map((p) => p.trim());
  const seen = new Set<Permission>();
  const permissions: Permission[] = [];
  for (const part of parts) {
    if (!isPermission(part)) {
      throw new Error(
        `Invalid permission: ${part}. Valid permissions: ${VALID_PERMISSIONS.join(", ")}`,
      );
    }
    if (seen.has(part)) {
      continue;
    }
    seen.add(part);
    permissions.push(part);
  }

  return permissions;
}

async function createDefaultTokenManager(): Promise<TokenManager> {
  const container = createProductionContainer();
  const tokenManager = new TokenManager(container, getDefaultTokenFilePath());
  await tokenManager.initialize();
  return tokenManager;
}

function handleCommandError(error: unknown): never {
  if (error instanceof Error) {
    printError(error);
  } else {
    printError(String(error));
  }
  process.exit(1);
}

/**
 * Register all token management subcommands on the program.
 *
 * Attaches token create, list, revoke, and rotate subcommands to the CLI.
 * All commands work directly with TokenManager without requiring SDK agent.
 *
 * @param program - Commander program instance to attach commands to
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerTokenCommands(program);
 * ```
 */
export function registerTokenCommands(program: Command): void {
  const tokenCmd = program.command("token").description("Manage API tokens");

  // token create
  tokenCmd
    .command("create")
    .description("Create API token")
    .requiredOption("--name <name>", "Token name")
    .option(
      "--permissions <perms>",
      "Comma-separated permissions",
      "session:read,session:create",
    )
    .option("--expires <duration>", "Expiration duration (e.g., 365d, 30d, 7d)")
    .action(
      async (options: {
        name: string;
        permissions: string;
        expires?: string;
      }) => {
        try {
          // Parse permissions
          const permissions = parsePermissions(options.permissions);

          const tokenManager = await createDefaultTokenManager();

          // Create token with or without expiration
          let fullToken: string;
          if (options.expires !== undefined) {
            // Validate format by attempting to parse
            parseTokenDurationMs(options.expires);
            fullToken = await tokenManager.createToken({
              name: options.name,
              permissions,
              expiresIn: options.expires,
            });
          } else {
            fullToken = await tokenManager.createToken({
              name: options.name,
              permissions,
            });
          }

          // Output the full token (only time user sees it)
          printSuccess("Token created successfully!");
          console.log("");
          console.log(
            "Token (save this securely, it will not be shown again):",
          );
          console.log(fullToken);
          console.log("");
          console.log("Token details:");
          console.log(`  Name: ${options.name}`);
          console.log(`  Permissions: ${permissions.join(", ")}`);
          if (options.expires !== undefined) {
            console.log(`  Expires: ${options.expires} from now`);
          } else {
            console.log("  Expires: Never");
          }
        } catch (error) {
          handleCommandError(error);
        }
      },
    );

  // token list
  tokenCmd
    .command("list")
    .description("List API tokens (metadata only)")
    .action(async () => {
      try {
        const globalOpts = program.opts() as GlobalOptions;
        const tokenManager = await createDefaultTokenManager();

        // List tokens
        const tokens = await tokenManager.listTokens();

        if (tokens.length === 0) {
          if (globalOpts.format === "json") {
            console.log(formatJson([]));
          } else {
            console.log("No tokens found.");
          }
          return;
        }

        // Format output
        if (globalOpts.format === "json") {
          console.log(formatJson(tokens));
        } else {
          // Table format (never show full token values, only metadata)
          const tableData: TokenTableRow[] = tokens.map((token) => ({
            id: token.id,
            name: token.name,
            permissions: token.permissions.join(", "),
            expires: token.expiresAt ?? "Never",
            created: token.createdAt,
            lastUsed: token.lastUsedAt ?? "Never",
          }));

          console.log(
            formatTable(tableData, [
              { key: "id", header: "ID", width: 10 },
              { key: "name", header: "Name", width: 20 },
              { key: "permissions", header: "Permissions", width: 30 },
              { key: "expires", header: "Expires", width: 24 },
              { key: "created", header: "Created", width: 24 },
              { key: "lastUsed", header: "Last Used", width: 24 },
            ]),
          );
        }
      } catch (error) {
        handleCommandError(error);
      }
    });

  // token revoke
  tokenCmd
    .command("revoke <token-id>")
    .description("Revoke API token")
    .action(async (tokenId: string) => {
      try {
        const tokenManager = await createDefaultTokenManager();

        // Revoke token
        await tokenManager.revokeToken(tokenId);

        printSuccess(`Token revoked: ${tokenId}`);
      } catch (error) {
        handleCommandError(error);
      }
    });

  // token rotate
  tokenCmd
    .command("rotate <token-id>")
    .description("Rotate API token (create new, revoke old)")
    .action(async (tokenId: string) => {
      try {
        const tokenManager = await createDefaultTokenManager();

        // Rotate token
        const newToken = await tokenManager.rotateToken(tokenId);

        // Output the new token (only time user sees it)
        printSuccess("Token rotated successfully!");
        console.log("");
        console.log(
          "New token (save this securely, it will not be shown again):",
        );
        console.log(newToken);
        console.log("");
        console.log(`Old token (${tokenId}) has been revoked.`);
      } catch (error) {
        handleCommandError(error);
      }
    });
}
