import type { ProcessManager } from "../interfaces/process-manager";

export interface ToolVersionInfo {
  version: string | null;
  error: string | null;
}

export interface AgentToolVersions {
  claude: ToolVersionInfo;
  codex: ToolVersionInfo;
  git: ToolVersionInfo;
}

interface VersionCommand {
  readonly key: keyof AgentToolVersions;
  readonly command: string;
  readonly args: readonly string[];
}

const VERSION_COMMANDS: readonly VersionCommand[] = [
  { key: "claude", command: "claude", args: ["--version"] },
  { key: "codex", command: "codex", args: ["--version"] },
  { key: "git", command: "git", args: ["--version"] },
];

const SEMVER_PATTERN = /\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/;

function parseVersionFromOutput(output: string): string | null {
  const match = output.match(SEMVER_PATTERN);
  if (match === null) {
    return null;
  }
  return match[0] ?? null;
}

async function collectLines(stream: AsyncIterable<string>): Promise<string[]> {
  const lines: string[] = [];
  for await (const line of stream) {
    lines.push(line);
  }
  return lines;
}

async function detectCommandVersion(
  processManager: ProcessManager,
  command: string,
  args: readonly string[],
): Promise<ToolVersionInfo> {
  try {
    const process = processManager.spawn(command, args);
    const [stdoutLines, stderrLines, exitCode] = await Promise.all([
      collectLines(process.stdout),
      collectLines(process.stderr),
      process.exitCode,
    ]);

    if (exitCode !== 0) {
      const stderrText = stderrLines.join("\n").trim();
      const errorMessage =
        stderrText.length > 0
          ? stderrText
          : `${command} exited with code ${exitCode}`;
      return { version: null, error: errorMessage };
    }

    const output = stdoutLines.join("\n").trim();
    if (output.length === 0) {
      return { version: null, error: `${command} produced empty output` };
    }

    const version = parseVersionFromOutput(output);
    if (version === null) {
      return {
        version: null,
        error: `${command} version output is malformed: ${output}`,
      };
    }

    return { version, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { version: null, error: message };
  }
}

export async function getToolVersions(
  processManager: ProcessManager,
): Promise<AgentToolVersions> {
  const results = await Promise.all(
    VERSION_COMMANDS.map((versionCommand) =>
      detectCommandVersion(
        processManager,
        versionCommand.command,
        versionCommand.args,
      ),
    ),
  );

  return {
    claude: results[0] ?? { version: null, error: "Version check failed" },
    codex: results[1] ?? { version: null, error: "Version check failed" },
    git: results[2] ?? { version: null, error: "Version check failed" },
  };
}
