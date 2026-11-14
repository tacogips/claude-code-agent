/**
 * Command Queue CLI commands.
 *
 * Provides CLI subcommands for managing Command Queues including:
 * - CRUD operations (create, list, show, delete)
 * - Execution control (run, pause, resume, stop)
 * - Command management (add, edit, remove, move, toggle-mode)
 * - Web UI access
 *
 * @module cli/commands/queue
 */

import { Command } from "commander";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import type { CommandQueue, QueueCommand } from "../../repository";
import {
  printSuccess,
  printError,
  formatTable,
  formatJson,
  type ColumnDef,
} from "../output";

/**
 * Queue display type with index signature for formatTable compatibility.
 */
type QueueDisplay = CommandQueue & Record<string, unknown>;

/**
 * Command display type with index and index signature for formatTable compatibility.
 */
type CommandDisplay = QueueCommand & { index: number } & Record<
    string,
    unknown
  >;

/**
 * Register all queue-related subcommands on the main CLI program.
 *
 * Sets up the following command structure:
 * - queue create <slug>
 * - queue list
 * - queue show <queue-id>
 * - queue run <queue-id>
 * - queue pause <queue-id>
 * - queue resume <queue-id>
 * - queue stop <queue-id>
 * - queue delete <queue-id>
 * - queue ui [queue-id]
 * - queue command add <queue-id>
 * - queue command edit <queue-id> <index>
 * - queue command toggle-mode <queue-id> <index>
 * - queue command remove <queue-id> <index>
 * - queue command move <queue-id> <from> <to>
 *
 * @param program - Main CLI program to register commands on
 * @param getAgent - Async function to get ClaudeCodeAgent instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerQueueCommands(program, async () => agent);
 * await program.parseAsync(process.argv);
 * ```
 */
export function registerQueueCommands(
  program: Command,
  getAgent: () => Promise<ClaudeCodeAgent>,
): void {
  const queueCmd = program
    .command("queue")
    .description("Manage command queues");

  // queue create <slug>
  queueCmd
    .command("create")
    .description("Create a new command queue")
    .argument("<slug>", "Queue slug identifier")
    .requiredOption("--project <path>", "Project directory path")
    .option("--name <name>", "Human-readable queue name")
    .action(
      async (slug: string, options: { project: string; name?: string }) => {
        try {
          const agent = await getAgent();
          const queue = await agent.queues.createQueue({
            projectPath: options.project,
            name: options.name ?? slug,
          });

          printSuccess(`Queue created: ${queue.id}`);
          console.log(formatJson({ id: queue.id, name: queue.name }));
        } catch (error) {
          printError(error instanceof Error ? error : String(error));
          process.exit(1);
        }
      },
    );

  // queue list
  queueCmd
    .command("list")
    .description("List all command queues")
    .option(
      "--status <status>",
      "Filter by status (pending, running, paused, completed, failed, stopped)",
    )
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (options: { status?: string; format: string }) => {
      try {
        const agent = await getAgent();
        const queues = await agent.queues.listQueues({
          filter:
            options.status !== undefined
              ? { status: options.status as never }
              : undefined,
        });

        if (queues.length === 0) {
          console.log("No queues found");
          return;
        }

        if (options.format === "json") {
          console.log(formatJson(queues));
        } else {
          const columns: ColumnDef<QueueDisplay>[] = [
            { key: "id", header: "ID", width: 30 },
            { key: "name", header: "Name", width: 25 },
            { key: "status", header: "Status", width: 12 },
            {
              key: "commands",
              header: "Commands",
              width: 10,
              align: "right",
              format: (val) => String((val as readonly unknown[]).length),
            },
            {
              key: "currentIndex",
              header: "Progress",
              width: 12,
              format: (val) => String(val),
            },
          ];

          console.log(formatTable(queues as readonly QueueDisplay[], columns));
        }
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue show <queue-id>
  queueCmd
    .command("show")
    .description("Show queue details")
    .argument("<queue-id>", "Queue ID")
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (queueId: string, options: { format: string }) => {
      try {
        const agent = await getAgent();
        const queue = await agent.queues.getQueue(queueId);

        if (queue === null) {
          printError(`Queue not found: ${queueId}`);
          process.exit(1);
        }

        if (options.format === "json") {
          console.log(formatJson(queue));
        } else {
          console.log(`Queue: ${queue.name} (${queue.id})`);
          console.log(`Status: ${queue.status}`);
          console.log(`Project: ${queue.projectPath}`);
          console.log(`Commands: ${queue.commands.length}`);
          console.log(
            `Progress: ${queue.currentIndex}/${queue.commands.length}`,
          );
          console.log(`Created: ${queue.createdAt}`);

          if (queue.commands.length > 0) {
            console.log("\nCommands:");

            // Add index to commands for display
            const commandsWithIndex: CommandDisplay[] = queue.commands.map(
              (cmd, idx) => ({
                ...cmd,
                index: idx,
              }),
            );

            const columns: ColumnDef<CommandDisplay>[] = [
              {
                key: "index",
                header: "#",
                width: 3,
                align: "right",
              },
              {
                key: "prompt",
                header: "Prompt",
                width: 50,
                format: (val) => {
                  const str = String(val);
                  return str.length > 47 ? str.slice(0, 44) + "..." : str;
                },
              },
              {
                key: "sessionMode",
                header: "Mode",
                width: 10,
              },
              {
                key: "status",
                header: "Status",
                width: 12,
              },
            ];

            console.log(formatTable(commandsWithIndex, columns));
          }
        }
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue run <queue-id>
  queueCmd
    .command("run")
    .description("Run a command queue")
    .argument("<queue-id>", "Queue ID")
    .action(async (queueId: string) => {
      try {
        const agent = await getAgent();
        const queue = await agent.queues.getQueue(queueId);
        if (queue === null) {
          printError(`Queue not found: ${queueId}`);
          process.exit(1);
        }

        printSuccess(`Running queue: ${queueId}`);

        // Create a map to track command indices by ID
        const commandIndexMap = new Map<string, number>();
        queue.commands.forEach((cmd, idx) => {
          commandIndexMap.set(cmd.id, idx);
        });

        const result = await agent.queueRunner.run(queueId, {
          onCommandStart: (cmd) => {
            const idx = commandIndexMap.get(cmd.id);
            console.log(`\n[${idx ?? "?"}] Starting: ${cmd.prompt}`);
          },
          onCommandComplete: (cmd) => {
            const idx = commandIndexMap.get(cmd.id);
            console.log(`[${idx ?? "?"}] Completed: ${cmd.prompt}`);
          },
          onCommandFail: (cmd, error) => {
            const idx = commandIndexMap.get(cmd.id);
            console.error(`[${idx ?? "?"}] Failed: ${cmd.prompt}`);
            console.error(`  Error: ${error}`);
          },
        });

        console.log("\nQueue execution completed");
        console.log(`Status: ${result.status}`);
        console.log(`Completed: ${result.completedCommands}`);
        console.log(`Failed: ${result.failedCommands}`);
        console.log(`Skipped: ${result.skippedCommands}`);
        console.log(`Duration: ${result.totalDurationMs}ms`);
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue pause <queue-id>
  queueCmd
    .command("pause")
    .description("Pause a running queue")
    .argument("<queue-id>", "Queue ID")
    .action(async (queueId: string) => {
      try {
        const agent = await getAgent();
        await agent.queueRunner.pause(queueId);
        printSuccess(`Queue paused: ${queueId}`);
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue resume <queue-id>
  queueCmd
    .command("resume")
    .description("Resume a paused queue")
    .argument("<queue-id>", "Queue ID")
    .action(async (queueId: string) => {
      try {
        const agent = await getAgent();
        printSuccess(`Resuming queue: ${queueId}`);

        const result = await agent.queueRunner.resume(queueId);

        console.log("\nQueue resumed and completed");
        console.log(`Status: ${result.status}`);
        console.log(`Completed: ${result.completedCommands}`);
        console.log(`Failed: ${result.failedCommands}`);
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue stop <queue-id>
  queueCmd
    .command("stop")
    .description("Stop a queue (cannot be resumed)")
    .argument("<queue-id>", "Queue ID")
    .action(async (queueId: string) => {
      try {
        const agent = await getAgent();
        await agent.queueRunner.stop(queueId);
        printSuccess(`Queue stopped: ${queueId}`);
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue delete <queue-id>
  queueCmd
    .command("delete")
    .description("Delete a queue")
    .argument("<queue-id>", "Queue ID")
    .option("--force", "Skip confirmation prompt")
    .action(async (queueId: string, options: { force?: boolean }) => {
      try {
        const agent = await getAgent();
        const deleted = await agent.queues.deleteQueue(
          queueId,
          options.force ?? false,
        );

        if (deleted) {
          printSuccess(`Queue deleted: ${queueId}`);
        } else {
          printError(`Queue not found: ${queueId}`);
          process.exit(1);
        }
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue ui [queue-id]
  queueCmd
    .command("ui")
    .description("Open Web UI for queue management")
    .argument("[queue-id]", "Optional queue ID to open directly")
    .action(async (queueId?: string) => {
      try {
        // TODO: Implement viewer server integration
        // For now, this is a placeholder
        if (queueId !== undefined) {
          console.log(`Opening viewer for queue: ${queueId}`);
          console.log("Viewer URL: http://localhost:3000/queues/" + queueId);
        } else {
          console.log("Opening queue viewer UI");
          console.log("Viewer URL: http://localhost:3000/queues");
        }
        printError("Web UI not yet implemented");
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue command subcommands
  const commandCmd = queueCmd
    .command("command")
    .description("Manage queue commands");

  // queue command add <queue-id>
  commandCmd
    .command("add")
    .description("Add a command to a queue")
    .argument("<queue-id>", "Queue ID")
    .requiredOption("--prompt <text>", "Command prompt text")
    .option(
      "--session-mode <mode>",
      "Session mode: continue or new",
      "continue",
    )
    .option("--position <index>", "Insert position (default: end)", parseInt)
    .action(
      async (
        queueId: string,
        options: { prompt: string; sessionMode: string; position?: number },
      ) => {
        try {
          const agent = await getAgent();
          const command = await agent.queues.addCommand(queueId, {
            prompt: options.prompt,
            sessionMode: options.sessionMode as "continue" | "new",
            position: options.position,
          });

          // Find the position of the added command
          const queue = await agent.queues.getQueue(queueId);
          const position =
            queue?.commands.findIndex((c) => c.id === command.id) ?? -1;

          printSuccess(`Command added at index ${position}`);
          console.log(formatJson(command));
        } catch (error) {
          printError(error instanceof Error ? error : String(error));
          process.exit(1);
        }
      },
    );

  // queue command edit <queue-id> <index>
  commandCmd
    .command("edit")
    .description("Edit a command in a queue")
    .argument("<queue-id>", "Queue ID")
    .argument("<index>", "Command index", parseInt)
    .option("--prompt <text>", "Updated prompt text")
    .option("--session-mode <mode>", "Session mode: continue or new")
    .action(
      async (
        queueId: string,
        index: number,
        options: { prompt?: string; sessionMode?: string },
      ) => {
        try {
          const agent = await getAgent();
          const command = await agent.queues.updateCommand(queueId, index, {
            prompt: options.prompt,
            sessionMode: options.sessionMode as "continue" | "new" | undefined,
          });

          printSuccess(`Command ${index} updated`);
          console.log(formatJson(command));
        } catch (error) {
          printError(error instanceof Error ? error : String(error));
          process.exit(1);
        }
      },
    );

  // queue command toggle-mode <queue-id> <index>
  commandCmd
    .command("toggle-mode")
    .description("Toggle session mode (continue <-> new)")
    .argument("<queue-id>", "Queue ID")
    .argument("<index>", "Command index", parseInt)
    .action(async (queueId: string, index: number) => {
      try {
        const agent = await getAgent();
        const command = await agent.queues.toggleSessionMode(queueId, index);

        printSuccess(`Session mode toggled to: ${command.sessionMode}`);
        console.log(formatJson(command));
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue command remove <queue-id> <index>
  commandCmd
    .command("remove")
    .description("Remove a command from a queue")
    .argument("<queue-id>", "Queue ID")
    .argument("<index>", "Command index", parseInt)
    .action(async (queueId: string, index: number) => {
      try {
        const agent = await getAgent();
        await agent.queues.removeCommand(queueId, index);

        printSuccess(`Command ${index} removed`);
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });

  // queue command move <queue-id> <from> <to>
  commandCmd
    .command("move")
    .description("Move a command to a different position")
    .argument("<queue-id>", "Queue ID")
    .argument("<from>", "Source index", parseInt)
    .argument("<to>", "Target index", parseInt)
    .action(async (queueId: string, from: number, to: number) => {
      try {
        const agent = await getAgent();
        await agent.queues.reorderCommand(queueId, from, to);

        printSuccess(`Command moved from ${from} to ${to}`);
      } catch (error) {
        printError(error instanceof Error ? error : String(error));
        process.exit(1);
      }
    });
}
