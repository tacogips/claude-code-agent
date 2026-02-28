import type { Command } from "commander";
import type { SdkManager } from "../../sdk/agent";
import { formatJson, formatTable, printError } from "../output";
import { getPackageVersion } from "../version";

interface GlobalOptions {
  readonly format: "table" | "json";
}

interface VersionRow {
  tool: string;
  version: string;
  error: string;
}

/**
 * Register version introspection command.
 */
export function registerVersionCommands(
  program: Command,
  getAgent: () => Promise<SdkManager>,
): void {
  program
    .command("version")
    .description("Show claude-code-agent and tool versions")
    .option("--json", "Output JSON")
    .action(async (options: { json?: boolean }) => {
      try {
        const agent = await getAgent();
        const toolVersions = await agent.getToolVersions();
        const output = {
          agent: getPackageVersion(),
          tools: toolVersions,
        };

        const globalOpts = program.opts() as GlobalOptions;
        const shouldJson = options.json === true || globalOpts.format === "json";

        if (shouldJson) {
          console.log(formatJson(output));
          return;
        }

        const rows: VersionRow[] = [
          { tool: "claude-code-agent", version: output.agent, error: "" },
          {
            tool: "claude",
            version: output.tools.claude.version ?? "-",
            error: output.tools.claude.error ?? "",
          },
          {
            tool: "codex",
            version: output.tools.codex.version ?? "-",
            error: output.tools.codex.error ?? "",
          },
          {
            tool: "git",
            version: output.tools.git.version ?? "-",
            error: output.tools.git.error ?? "",
          },
        ];

        console.log(
          formatTable(rows as unknown as Record<string, unknown>[], [
            { key: "tool", header: "Tool", width: 18 },
            { key: "version", header: "Version", width: 16 },
            { key: "error", header: "Error" },
          ]),
        );
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
