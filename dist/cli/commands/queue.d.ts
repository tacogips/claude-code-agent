/**
 * Command Queue CLI commands.
 *
 * Provides CLI subcommands for managing Command Queues including:
 * - CRUD operations (create, list, show, delete)
 * - Execution control (run, pause, resume, stop)
 * - Command management (add, edit, remove, move, toggle-mode)
 *
 * @module cli/commands/queue
 */
import type { Command } from "commander";
import type { SdkManager } from "../../sdk/agent";
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
 * - queue command add <queue-id>
 * - queue command edit <queue-id> <index>
 * - queue command toggle-mode <queue-id> <index>
 * - queue command remove <queue-id> <index>
 * - queue command move <queue-id> <from> <to>
 *
 * @param program - Main CLI program to register commands on
 * @param getAgent - Async function to get SdkManager instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerQueueCommands(program, async () => agent);
 * await program.parseAsync(process.argv);
 * ```
 */
export declare function registerQueueCommands(program: Command, getAgent: () => Promise<SdkManager>): void;
//# sourceMappingURL=queue.d.ts.map