/**
 * Token management subcommands for the CLI.
 *
 * Provides commands for creating, listing, revoking, and rotating API tokens
 * used for daemon authentication. Token commands work directly with TokenManager.
 *
 * @module cli/commands/token
 */

import type { Command } from "commander";
import { TokenManager } from "../../daemon/auth";
import type { Permission } from "../../daemon/types";
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
 * @param permissionsStr - Comma-separated permissions (e.g., "read,write")
 * @returns Array of Permission values
 * @throws Error if any permission is invalid
 */
function parsePermissions(permissionsStr: string): readonly Permission[] {
  const parts = permissionsStr.split(",").map((p) => p.trim());

  // Validate each permission
  const validPermissions: Permission[] = [
    "session:create",
    "session:read",
    "session:cancel",
    "group:create",
    "group:run",
    "queue:*",
    "bookmark:*",
  ];

  const permissions: Permission[] = [];
  for (const part of parts) {
    if (!validPermissions.includes(part as Permission)) {
      throw new Error(
        `Invalid permission: ${part}. Valid permissions: ${validPermissions.join(", ")}`,
      );
    }
    permissions.push(part as Permission);
  }

  return permissions;
}

/**
 * Parse duration string like "365d" into an ISO 8601 date string.
 *
 * Supports formats: 365d, 1y, 30d, 7w, 24h
 *
 * @param durationStr - Duration string (e.g., "365d")
 * @returns ISO 8601 date string for the expiration time
 * @throws Error if format is invalid
 */
function parseDurationToExpiry(durationStr: string): string {
  const match = /^(\d+)([dwyhm])$/.exec(durationStr);
  if (!match) {
    throw new Error(
      `Invalid duration format: ${durationStr}. Expected format: <number><unit> (e.g., 365d, 30d, 1y)`,
    );
  }

  const amountStr = match[1];
  const unit = match[2];

  if (amountStr === undefined || unit === undefined) {
    throw new Error(`Invalid duration format: ${durationStr}`);
  }

  const amount = parseInt(amountStr, 10);

  const multipliers: Record<string, number> = {
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
    y: 365 * 24 * 60 * 60 * 1000, // years
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Unknown duration unit: ${unit}`);
  }

  const expiryMs = Date.now() + amount * multiplier;
  return new Date(expiryMs).toISOString();
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

          // Create TokenManager
          const container = createProductionContainer();
          const tokenFilePath = getDefaultTokenFilePath();
          const tokenManager = new TokenManager(container, tokenFilePath);
          await tokenManager.initialize();

          // Create token with or without expiration
          let fullToken: string;
          if (options.expires !== undefined) {
            // Validate format by attempting to parse
            parseDurationToExpiry(options.expires);
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
          if (error instanceof Error) {
            printError(error);
          } else {
            printError(String(error));
          }
          process.exit(1);
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

        // Create TokenManager
        const container = createProductionContainer();
        const tokenFilePath = getDefaultTokenFilePath();
        const tokenManager = new TokenManager(container, tokenFilePath);
        await tokenManager.initialize();

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
          const tableData = tokens.map((token) => ({
            id: token.id,
            name: token.name,
            permissions: token.permissions.join(", "),
            expires: token.expiresAt ?? "Never",
            created: token.createdAt,
            lastUsed: token.lastUsedAt ?? "Never",
          }));

          console.log(
            formatTable(tableData as unknown as Record<string, unknown>[], [
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
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // token revoke
  tokenCmd
    .command("revoke <token-id>")
    .description("Revoke API token")
    .action(async (tokenId: string) => {
      try {
        // Create TokenManager
        const container = createProductionContainer();
        const tokenFilePath = getDefaultTokenFilePath();
        const tokenManager = new TokenManager(container, tokenFilePath);
        await tokenManager.initialize();

        // Revoke token
        await tokenManager.revokeToken(tokenId);

        printSuccess(`Token revoked: ${tokenId}`);
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // token rotate
  tokenCmd
    .command("rotate <token-id>")
    .description("Rotate API token (create new, revoke old)")
    .action(async (tokenId: string) => {
      try {
        // Create TokenManager
        const container = createProductionContainer();
        const tokenFilePath = getDefaultTokenFilePath();
        const tokenManager = new TokenManager(container, tokenFilePath);
        await tokenManager.initialize();

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
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });
}
