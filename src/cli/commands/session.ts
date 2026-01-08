/**
 * Session subcommands for the CLI.
 *
 * Provides commands for managing Claude Code sessions, including run, add to group,
 * show session details, watch session progress, and list sessions.
 *
 * @module cli/commands/session
 */

import type { Command } from "commander";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import { formatTable, formatJson, printError } from "../output";

/**
 * Global CLI options passed from parent command.
 */
interface GlobalOptions {
  readonly format: "table" | "json";
}

/**
 * Register all session-related subcommands on the program.
 *
 * Attaches session run, add, show, watch, and list subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns ClaudeCodeAgent instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerSessionCommands(program, async () => {
 *   const container = createContainer();
 *   return ClaudeCodeAgent.create(container);
 * });
 * ```
 */
export function registerSessionCommands(
  program: Command,
  getAgent: () => Promise<ClaudeCodeAgent>,
): void {
  const sessionCmd = program
    .command("session")
    .description("Manage Claude Code sessions");

  // session run
  sessionCmd
    .command("run")
    .description("Run standalone session")
    .option("--project <path>", "Project directory (default: cwd)")
    .option("--prompt <text>", "Prompt text")
    .option("--template <name>", "Template name")
    .action(
      async (options: {
        project?: string;
        prompt?: string;
        template?: string;
      }) => {
        try {
          printError("session run: Not yet implemented");
          printError(
            "Placeholder for running a standalone Claude Code session",
          );
          printError(`Options: ${JSON.stringify(options)}`);
          process.exit(1);
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

  // session add
  sessionCmd
    .command("add <group-id>")
    .description("Add session to group")
    .option("--project <path>", "Project directory")
    .option("--prompt <text>", "Prompt text")
    .option("--depends-on <id>", "Dependency session ID")
    .option("--template <name>", "Template name")
    .action(
      async (
        groupId: string,
        options: {
          project?: string;
          prompt?: string;
          dependsOn?: string;
          template?: string;
        },
      ) => {
        try {
          printError("session add: Not yet implemented");
          printError(`Placeholder for adding session to group: ${groupId}`);
          printError(`Options: ${JSON.stringify(options)}`);
          process.exit(1);
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

  // session show
  sessionCmd
    .command("show <session-id>")
    .description("Show session details")
    .option("--parse-markdown", "Parse message content as markdown")
    .action(async (sessionId: string, options: { parseMarkdown?: boolean }) => {
      try {
        const agent = await getAgent();
        const globalOpts = program.opts() as GlobalOptions;

        // Get session from agent
        const session = await agent.sessions.getSession(sessionId);

        if (session === null) {
          printError(`Session not found: ${sessionId}`);
          process.exit(1);
        }

        // Parse markdown if requested
        if (options.parseMarkdown) {
          const messagesWithParsed = session.messages.map((message) => {
            const parsed = agent.parseMarkdown(message.content);
            return {
              ...message,
              parsed,
            };
          });

          if (globalOpts.format === "json") {
            console.log(
              formatJson({
                ...session,
                messages: messagesWithParsed,
              }),
            );
          } else {
            // Table format for messages with parsed markdown
            console.log(`Session: ${session.id}`);
            console.log(`Project: ${session.projectPath}`);
            console.log(`Status: ${session.status}`);
            console.log(`Created: ${session.createdAt}`);
            console.log(`Updated: ${session.updatedAt}`);
            console.log(`\nMessages (${session.messages.length}):`);
            console.log(
              formatTable(
                messagesWithParsed as unknown as Record<string, unknown>[],
                [
                  { key: "id", header: "ID", width: 12 },
                  { key: "role", header: "Role", width: 10 },
                  {
                    key: "content",
                    header: "Content Preview",
                    width: 50,
                    format: (value) => {
                      const text = String(value);
                      return text.length > 50
                        ? text.substring(0, 47) + "..."
                        : text;
                    },
                  },
                  {
                    key: "parsed",
                    header: "Sections",
                    width: 10,
                    align: "right",
                    format: (value) => {
                      if (
                        typeof value === "object" &&
                        value !== null &&
                        "sections" in value &&
                        Array.isArray(value.sections)
                      ) {
                        return String(value.sections.length);
                      }
                      return "0";
                    },
                  },
                ],
              ),
            );
          }
        } else {
          // Without markdown parsing
          if (globalOpts.format === "json") {
            console.log(formatJson(session));
          } else {
            // Table format for messages
            console.log(`Session: ${session.id}`);
            console.log(`Project: ${session.projectPath}`);
            console.log(`Status: ${session.status}`);
            console.log(`Created: ${session.createdAt}`);
            console.log(`Updated: ${session.updatedAt}`);
            console.log(`\nMessages (${session.messages.length}):`);
            console.log(
              formatTable(
                session.messages as unknown as Record<string, unknown>[],
                [
                  { key: "id", header: "ID", width: 12 },
                  { key: "role", header: "Role", width: 10 },
                  {
                    key: "content",
                    header: "Content Preview",
                    width: 60,
                    format: (value) => {
                      const text = String(value);
                      return text.length > 60
                        ? text.substring(0, 57) + "..."
                        : text;
                    },
                  },
                  { key: "timestamp", header: "Timestamp", width: 24 },
                ],
              ),
            );
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

  // session watch
  sessionCmd
    .command("watch <session-id>")
    .description("Watch session progress in real-time")
    .action(async (sessionId: string) => {
      try {
        printError("session watch: Not yet implemented");
        printError(
          `Placeholder for watching session progress in real-time: ${sessionId}`,
        );
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

  // session list
  sessionCmd
    .command("list")
    .description("List all sessions")
    .option("--project <path>", "Filter by project path")
    .option(
      "--status <status>",
      "Filter by status (active, paused, completed, failed)",
    )
    .action(async (options: { project?: string; status?: string }) => {
      try {
        const agent = await getAgent();
        const globalOpts = program.opts() as GlobalOptions;

        // Get sessions from agent
        const sessions = await agent.sessions.listSessions(options.project);

        // Apply status filter if provided
        let filteredSessions = [...sessions];
        if (options.status !== undefined) {
          const statusFilter = options.status as
            | "active"
            | "paused"
            | "completed"
            | "failed";
          filteredSessions = sessions.filter(
            (session) => session.status === statusFilter,
          );
        }

        if (filteredSessions.length === 0) {
          if (globalOpts.format === "json") {
            console.log(formatJson([]));
          } else {
            console.log("No sessions found.");
          }
          return;
        }

        // Format output
        if (globalOpts.format === "json") {
          console.log(formatJson(filteredSessions));
        } else {
          // Table format
          console.log(
            formatTable(
              filteredSessions as unknown as Record<string, unknown>[],
              [
                { key: "id", header: "ID", width: 20 },
                { key: "projectPath", header: "Project", width: 40 },
                { key: "status", header: "Status", width: 10 },
                {
                  key: "messageCount",
                  header: "Messages",
                  width: 8,
                  align: "right",
                },
                { key: "createdAt", header: "Created", width: 24 },
              ],
            ),
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
}
