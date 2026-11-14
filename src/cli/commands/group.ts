/**
 * Group command implementations for CLI.
 *
 * Provides thin wrappers around SDK GroupManager and GroupRunner methods,
 * handling argument parsing, output formatting, and error handling.
 *
 * @module cli/commands/group
 */

import { Command } from "commander";
import type { ClaudeCodeAgent } from "../../sdk";
import { formatTable, formatJson, printError, printSuccess } from "../output";
import { createTaggedLogger } from "../../logger";

const logger = createTaggedLogger("cli-group");

/**
 * Register all group subcommands.
 *
 * Adds group-related commands to the CLI program:
 * - create: Create new session group
 * - list: List session groups with optional filtering
 * - show: Show detailed group information
 * - run: Execute session group
 * - watch: Watch group execution progress (placeholder)
 * - pause: Pause running group
 * - resume: Resume paused group
 * - archive: Archive completed group (placeholder)
 * - delete: Delete group with confirmation
 *
 * @param program - Commander program instance
 * @param getAgent - Async function to get initialized ClaudeCodeAgent
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerGroupCommands(program, async () => {
 *   const container = createProductionContainer();
 *   return ClaudeCodeAgent.create(container);
 * });
 * ```
 */
export function registerGroupCommands(
  program: Command,
  getAgent: () => Promise<ClaudeCodeAgent>,
): void {
  const groupCmd = program
    .command("group")
    .description("Manage session groups");

  // group create <slug>
  groupCmd
    .command("create")
    .description("Create new session group")
    .argument("<slug>", "URL-safe slug for the group")
    .option("--name <name>", "Human-readable name (defaults to slug)")
    .option("--description <text>", "Group description")
    .action(
      async (
        slug: string,
        options: { name?: string; description?: string },
      ) => {
        try {
          const agent = await getAgent();
          const group = await agent.groups.createGroup({
            name: options.name ?? slug,
            description: options.description,
          });

          const formatOpt = program.opts()["format"] as string;
          if (formatOpt === "json") {
            console.log(formatJson(group));
          } else {
            printSuccess(`Group created: ${group.id}`);
            console.log(`  Name: ${group.name}`);
            console.log(`  Status: ${group.status}`);
            console.log(`  Created: ${group.createdAt}`);
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

  // group list
  groupCmd
    .command("list")
    .description("List session groups")
    .option(
      "--status <status>",
      "Filter by status (created, running, paused, completed, failed, archived)",
    )
    .action(async (options: { status?: string }) => {
      try {
        const agent = await getAgent();

        // Build filter
        const filter =
          options.status !== undefined
            ? { status: options.status as any }
            : undefined;

        const groups = await agent.groups.listGroups(filter);

        const formatOpt = program.opts()["format"] as string;
        if (formatOpt === "json") {
          console.log(formatJson(groups));
        } else {
          if (groups.length === 0) {
            console.log("No groups found.");
            return;
          }

          const table = formatTable(
            groups as unknown as Record<string, unknown>[],
            [
              { key: "id", header: "ID", width: 35 },
              { key: "name", header: "Name", width: 30 },
              { key: "status", header: "Status", width: 12 },
              {
                key: "sessions",
                header: "Sessions",
                width: 8,
                align: "right",
                format: (sessions: unknown) => {
                  if (Array.isArray(sessions)) {
                    return String(sessions.length);
                  }
                  return "0";
                },
              },
              { key: "createdAt", header: "Created", width: 20 },
            ],
          );
          console.log(table);
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

  // group show <group-id>
  groupCmd
    .command("show")
    .description("Show group details")
    .argument("<group-id>", "Group identifier")
    .action(async (groupId: string) => {
      try {
        const agent = await getAgent();
        const group = await agent.groups.getGroup(groupId);

        if (group === null) {
          printError(`Group not found: ${groupId}`);
          process.exit(1);
        }

        const formatOpt = program.opts()["format"] as string;
        if (formatOpt === "json") {
          console.log(formatJson(group));
        } else {
          console.log(`Group: ${group.name}`);
          console.log(`  ID: ${group.id}`);
          console.log(`  Slug: ${group.slug}`);
          console.log(`  Status: ${group.status}`);
          if (group.description !== undefined) {
            console.log(`  Description: ${group.description}`);
          }
          console.log(`  Created: ${group.createdAt}`);
          console.log(`  Updated: ${group.updatedAt}`);
          if (group.startedAt !== undefined) {
            console.log(`  Started: ${group.startedAt}`);
          }
          if (group.completedAt !== undefined) {
            console.log(`  Completed: ${group.completedAt}`);
          }
          console.log(`\nConfiguration:`);
          console.log(`  Model: ${group.config.model}`);
          console.log(`  Max Budget: $${group.config.maxBudgetUsd.toFixed(2)}`);
          console.log(
            `  Max Concurrent: ${group.config.maxConcurrentSessions}`,
          );
          console.log(`  Budget Policy: ${group.config.onBudgetExceeded}`);

          console.log(`\nSessions (${group.sessions.length}):`);
          if (group.sessions.length === 0) {
            console.log("  (no sessions)");
          } else {
            const sessionsTable = formatTable(
              group.sessions as unknown as Record<string, unknown>[],
              [
                { key: "id", header: "ID", width: 25 },
                { key: "status", header: "Status", width: 12 },
                { key: "projectPath", header: "Project", width: 40 },
                {
                  key: "cost",
                  header: "Cost",
                  width: 8,
                  align: "right",
                  format: (cost: unknown) => {
                    if (typeof cost === "number") {
                      return `$${cost.toFixed(2)}`;
                    }
                    return "-";
                  },
                },
              ],
            );
            console.log(sessionsTable);
          }
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

  // group run <group-id>
  groupCmd
    .command("run")
    .description("Run session group")
    .argument("<group-id>", "Group identifier")
    .option("--concurrent <n>", "Maximum concurrent sessions", (val) =>
      parseInt(val, 10),
    )
    .option("--respect-dependencies", "Honor dependency graph")
    .action(
      async (
        groupId: string,
        options: { concurrent?: number; respectDependencies?: boolean },
      ) => {
        try {
          const agent = await getAgent();
          const group = await agent.groups.getGroup(groupId);

          if (group === null) {
            printError(`Group not found: ${groupId}`);
            process.exit(1);
          }

          logger.info(`Starting group execution: ${group.name}`);

          // Start the group runner
          // Note: This is a long-running operation. In a real implementation,
          // this would likely need to be run in the background or with a watch mode.
          await agent.groupRunner.run(group, {
            maxConcurrent: options.concurrent,
            respectDependencies: options.respectDependencies ?? true,
          });

          printSuccess(`Group execution started: ${group.id}`);
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

  // group watch <group-id>
  groupCmd
    .command("watch")
    .description("Watch group progress (placeholder)")
    .argument("<group-id>", "Group identifier")
    .action(async (groupId: string) => {
      try {
        logger.warn("group watch: Not yet implemented");
        logger.info(`Would watch progress for group: ${groupId}`);
        logger.info(
          "This command will stream real-time progress updates when implemented.",
        );
        printError("group watch: Not yet implemented");
        process.exit(1);
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // group pause <group-id>
  groupCmd
    .command("pause")
    .description("Pause running group")
    .argument("<group-id>", "Group identifier")
    .action(async (groupId: string) => {
      try {
        const agent = await getAgent();

        // Pause the group runner
        await agent.groupRunner.pause("manual");

        printSuccess(`Group paused: ${groupId}`);
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // group resume <group-id>
  groupCmd
    .command("resume")
    .description("Resume paused group")
    .argument("<group-id>", "Group identifier")
    .action(async (groupId: string) => {
      try {
        const agent = await getAgent();

        // Resume the group runner
        await agent.groupRunner.resume();

        printSuccess(`Group resumed: ${groupId}`);
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // group archive <group-id>
  groupCmd
    .command("archive")
    .description("Archive completed group (placeholder)")
    .argument("<group-id>", "Group identifier")
    .action(async (groupId: string) => {
      try {
        const agent = await getAgent();

        // Call archive method
        await agent.groups.archiveGroup(groupId);

        printSuccess(`Group archived: ${groupId}`);
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });

  // group delete <group-id>
  groupCmd
    .command("delete")
    .description("Delete group")
    .argument("<group-id>", "Group identifier")
    .option("--force", "Skip confirmation prompt")
    .action(async (groupId: string, options: { force?: boolean }) => {
      try {
        const agent = await getAgent();
        const group = await agent.groups.getGroup(groupId);

        if (group === null) {
          printError(`Group not found: ${groupId}`);
          process.exit(1);
        }

        // Confirm deletion unless --force is specified
        if (options.force !== true) {
          logger.warn(`About to delete group: ${group.name} (${group.id})`);
          logger.warn("This action cannot be undone.");
          logger.warn("Use --force to skip this confirmation.");
          printError("Deletion cancelled. Use --force to proceed.");
          process.exit(1);
        }

        await agent.groups.deleteGroup(groupId);
        printSuccess(`Group deleted: ${groupId}`);
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
