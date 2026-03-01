/**
 * Session subcommands for the CLI.
 *
 * Provides commands for managing Claude Code sessions, including run, add to group,
 * show session details, watch session progress, and list sessions.
 *
 * @module cli/commands/session
 */

import type { Command } from "commander";
import { LogLevels } from "consola";
import {
  type SdkManager,
  type SessionRunner,
  type SessionRunnerOptions,
} from "../../sdk/agent";
import { logger } from "../../logger";
import { formatTable, formatJson, printError } from "../output";
import { calculateTaskProgress } from "../../types/task";

/**
 * Global CLI options passed from parent command.
 */
interface GlobalOptions {
  readonly format: "table" | "json";
}

type StreamGranularity = "event" | "char";

interface SessionRunOptions {
  project?: string;
  prompt?: string;
  template?: string;
  streamGranularity?: string;
  charDelayMs?: string;
}

type SessionRunnerFactory = (options?: SessionRunnerOptions) => SessionRunner;

/**
 * Register all session-related subcommands on the program.
 *
 * Attaches session run, add, show, watch, and list subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns SdkManager instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerSessionCommands(program, async () => {
 *   const container = createContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export function registerSessionCommands(
  program: Command,
  getAgent: () => Promise<SdkManager>,
  createSessionRunner?: SessionRunnerFactory,
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
    .option(
      "--stream-granularity <mode>",
      "Streaming output mode (char or event, default: char)",
      "char",
    )
    .option(
      "--char-delay-ms <n>",
      "Delay per rendered character in ms for char mode (default: 8)",
      "8",
    )
    .action(
      async (options: SessionRunOptions) => {
        try {
          const prompt = options.prompt?.trim();
          if (prompt === undefined || prompt.length === 0) {
            printError("Usage: claude-code-agent session run --prompt <text>");
            process.exit(1);
          }
          if (options.template !== undefined) {
            printError("session run: --template is not supported yet");
            process.exit(1);
          }

          const streamGranularity = parseStreamGranularity(
            options.streamGranularity,
          );
          if (streamGranularity === null) {
            printError(
              `Invalid --stream-granularity: ${options.streamGranularity ?? ""} (expected: char or event)`,
            );
            process.exit(1);
          }

          const charDelayMs = parseCharDelayMs(options.charDelayMs);
          if (charDelayMs === null) {
            printError(
              `Invalid --char-delay-ms: ${options.charDelayMs ?? ""} (expected: non-negative integer)`,
            );
            process.exit(1);
          }

          if (logger.level > LogLevels.warn) {
            logger.level = LogLevels.warn;
          }

          const runnerOptions: SessionRunnerOptions = {};
          if (options.project !== undefined) {
            runnerOptions.cwd = options.project;
          }
          const runner =
            createSessionRunner !== undefined
              ? createSessionRunner(runnerOptions)
              : await createDefaultSessionRunner(runnerOptions);

          const sessionConfig: Parameters<SessionRunner["startSession"]>[0] = {
            prompt,
          };
          if (options.project !== undefined) {
            sessionConfig.projectPath = options.project;
          }
          const session = await runner.startSession(sessionConfig);

          if (streamGranularity === "event") {
            for await (const message of session.messages()) {
              console.log(JSON.stringify(message));
            }
          } else {
            const renderedByMessageId = new Map<string, string>();
            for await (const message of session.messages()) {
              const extracted = extractAssistantText(message);
              if (extracted === null) {
                continue;
              }

              const previous = renderedByMessageId.get(extracted.messageId) ?? "";
              const nextText = extracted.text;
              const delta = nextText.startsWith(previous)
                ? nextText.slice(previous.length)
                : nextText;
              renderedByMessageId.set(extracted.messageId, nextText);

              for (const char of Array.from(delta)) {
                process.stdout.write(char);
                if (charDelayMs > 0) {
                  await sleep(charDelayMs);
                }
              }
            }
            process.stdout.write("\n");
          }

          const result = await session.waitForCompletion();
          if (!result.success) {
            process.exitCode = 1;
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
    .option("--tasks", "Include tasks in output")
    .action(
      async (
        sessionId: string,
        options: { parseMarkdown?: boolean; tasks?: boolean },
      ) => {
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
              const output: Record<string, unknown> = {
                ...session,
                messages: messagesWithParsed,
              };

              // Add taskProgress if --tasks specified
              if (options.tasks) {
                output["taskProgress"] = calculateTaskProgress(session.tasks);
              }

              console.log(formatJson(output));
            } else {
              // Table format for messages with parsed markdown
              console.log(`Session: ${session.id}`);
              console.log(`Project: ${session.projectPath}`);
              console.log(`Status: ${session.status}`);
              console.log(`Created: ${session.createdAt}`);
              console.log(`Updated: ${session.updatedAt}`);

              // Show tasks if requested
              if (options.tasks) {
                console.log("");
                if (session.tasks.length === 0) {
                  console.log("No tasks found.");
                } else {
                  const progress = calculateTaskProgress(session.tasks);
                  console.log(
                    `Tasks (${progress.completed}/${progress.total} completed, ${progress.inProgress} in progress):`,
                  );

                  const tasksWithIndex = session.tasks.map((task, i) => ({
                    index: i + 1,
                    ...task,
                  }));

                  console.log(
                    formatTable(
                      tasksWithIndex as unknown as Record<string, unknown>[],
                      [
                        { key: "index", header: "#", width: 5, align: "right" },
                        { key: "status", header: "Status", width: 12 },
                        { key: "content", header: "Content", width: 50 },
                      ],
                    ),
                  );
                }
              }

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
              const output: Record<string, unknown> = { ...session };

              // Add taskProgress if --tasks specified
              if (options.tasks) {
                output["taskProgress"] = calculateTaskProgress(session.tasks);
              }

              console.log(formatJson(output));
            } else {
              // Table format for messages
              console.log(`Session: ${session.id}`);
              console.log(`Project: ${session.projectPath}`);
              console.log(`Status: ${session.status}`);
              console.log(`Created: ${session.createdAt}`);
              console.log(`Updated: ${session.updatedAt}`);

              // Show tasks if requested
              if (options.tasks) {
                console.log("");
                if (session.tasks.length === 0) {
                  console.log("No tasks found.");
                } else {
                  const progress = calculateTaskProgress(session.tasks);
                  console.log(
                    `Tasks (${progress.completed}/${progress.total} completed, ${progress.inProgress} in progress):`,
                  );

                  const tasksWithIndex = session.tasks.map((task, i) => ({
                    index: i + 1,
                    ...task,
                  }));

                  console.log(
                    formatTable(
                      tasksWithIndex as unknown as Record<string, unknown>[],
                      [
                        { key: "index", header: "#", width: 5, align: "right" },
                        { key: "status", header: "Status", width: 12 },
                        { key: "content", header: "Content", width: 50 },
                      ],
                    ),
                  );
                }
              }

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
      },
    );

  // session tasks
  sessionCmd
    .command("tasks <session-id>")
    .description("List tasks for a session")
    .action(async (sessionId: string) => {
      try {
        const agent = await getAgent();
        const globalOpts = program.opts() as GlobalOptions;

        // Get session from agent
        const session = await agent.sessions.getSession(sessionId);

        if (session === null) {
          printError(`Session not found: ${sessionId}`);
          process.exit(1);
        }

        // Calculate progress
        const progress = calculateTaskProgress(session.tasks);

        if (globalOpts.format === "json") {
          // JSON format output
          console.log(
            formatJson({
              sessionId: session.id,
              projectPath: session.projectPath,
              tasks: session.tasks,
              progress,
            }),
          );
        } else {
          // Table format output
          console.log(`Session: ${session.id}`);
          console.log(`Project: ${session.projectPath}`);
          console.log("");

          if (session.tasks.length === 0) {
            console.log("No tasks found.");
            return;
          }

          console.log(
            `Progress: ${progress.completed}/${progress.total} completed (${progress.inProgress} in progress)`,
          );
          console.log("");

          // Add index to tasks for table display
          const tasksWithIndex = session.tasks.map((task, i) => ({
            index: i + 1,
            ...task,
          }));

          console.log(
            formatTable(
              tasksWithIndex as unknown as Record<string, unknown>[],
              [
                { key: "index", header: "#", width: 5, align: "right" },
                { key: "status", header: "Status", width: 12 },
                { key: "content", header: "Content", width: 50 },
                { key: "activeForm", header: "Active Form", width: 40 },
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

function parseStreamGranularity(
  value: string | undefined,
): StreamGranularity | null {
  if (value === "char" || value === "event") {
    return value;
  }
  return null;
}

function parseCharDelayMs(value: string | undefined): number | null {
  if (value === undefined) {
    return 8;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function extractAssistantText(
  message: object,
): { messageId: string; text: string } | null {
  const root = toRecord(message);
  if (root === null) {
    return null;
  }

  const topLevelType = typeof root["type"] === "string" ? root["type"] : null;
  const roleFromRoot = typeof root["role"] === "string" ? root["role"] : null;
  const messageRecord = toRecord(root["message"]);
  const roleFromMessage =
    messageRecord !== null && typeof messageRecord["role"] === "string"
      ? messageRecord["role"]
      : null;
  const isAssistant =
    topLevelType === "assistant" ||
    roleFromRoot === "assistant" ||
    roleFromMessage === "assistant";

  if (!isAssistant) {
    return null;
  }

  const contentSource =
    messageRecord?.["content"] ?? root["content"] ?? messageRecord;
  const text = extractTextFromContent(contentSource);
  if (text.length === 0) {
    return null;
  }

  const explicitId = selectMessageId(root, messageRecord);
  return {
    messageId: explicitId,
    text,
  };
}

function selectMessageId(
  root: Record<string, unknown>,
  messageRecord: Record<string, unknown> | null,
): string {
  if (typeof root["uuid"] === "string" && root["uuid"] !== "") {
    return root["uuid"];
  }
  if (typeof root["id"] === "string" && root["id"] !== "") {
    return root["id"];
  }
  if (
    messageRecord !== null &&
    typeof messageRecord["id"] === "string" &&
    messageRecord["id"] !== ""
  ) {
    return messageRecord["id"];
  }
  return "assistant-default";
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "string") {
      parts.push(block);
      continue;
    }

    const record = toRecord(block);
    if (record === null) {
      continue;
    }

    const textValue = record["text"];
    if (
      typeof textValue === "string" &&
      textValue.length > 0 &&
      (record["type"] === "text" ||
        record["type"] === "output_text" ||
        record["type"] === "input_text")
    ) {
      parts.push(textValue);
    }
  }

  return parts.join("");
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createDefaultSessionRunner(
  options?: SessionRunnerOptions,
): Promise<SessionRunner> {
  if (process.env["LOG_LEVEL"] === undefined) {
    process.env["LOG_LEVEL"] = "warn";
  }
  const sdkModule = await import("../../sdk/agent");
  return new sdkModule.SessionRunner(options);
}
