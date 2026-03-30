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

interface CommandProbeResult {
  readonly stdoutText: string;
  readonly stderrText: string;
  readonly exitCode: number | null;
}

interface ShellWrappedCommand {
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

async function runCommandProbe(
  processManager: ProcessManager,
  command: string,
  args: readonly string[],
): Promise<CommandProbeResult> {
  const process = processManager.spawn(command, args);
  const [stdoutLines, stderrLines, exitCode] = await Promise.all([
    collectLines(process.stdout),
    collectLines(process.stderr),
    process.exitCode,
  ]);

  return {
    stdoutText: stdoutLines.join("\n").trim(),
    stderrText: stderrLines.join("\n").trim(),
    exitCode,
  };
}

function formatProbeFailure(
  command: string,
  probeResult: CommandProbeResult,
): string {
  if (probeResult.stderrText.length > 0) {
    return probeResult.stderrText;
  }

  if (probeResult.stdoutText.length > 0) {
    return probeResult.stdoutText;
  }

  return `${command} exited with code ${probeResult.exitCode}`;
}

function getProbeOutputText(probeResult: CommandProbeResult): string {
  if (probeResult.stdoutText.length > 0) {
    return probeResult.stdoutText;
  }

  return probeResult.stderrText;
}

function getShellProgramName(shellPath: string): string {
  const normalized = shellPath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return segments.at(-1)?.toLowerCase() ?? normalized.toLowerCase();
}

function getShellWrappedCommand(
  command: string,
  args: readonly string[],
): ShellWrappedCommand | null {
  if (command !== "claude") {
    return null;
  }

  // This fallback is only used for fixed internal version probes.
  const invocation = [command, ...args].join(" ");

  if (process.platform === "win32") {
    return {
      command: process.env["ComSpec"]?.trim() || "cmd.exe",
      args: ["/d", "/s", "/c", invocation],
    };
  }

  const shellPath = process.env["SHELL"]?.trim() || "sh";
  const shellName = getShellProgramName(shellPath);
  const shellArgs =
    shellName === "bash" || shellName === "zsh"
      ? ["-lc", invocation]
      : ["-c", invocation];

  return {
    command: shellPath,
    args: shellArgs,
  };
}

async function runShellWrappedFallback(
  processManager: ProcessManager,
  command: string,
  args: readonly string[],
): Promise<ToolVersionInfo | null> {
  const shellCommand = getShellWrappedCommand(command, args);
  if (shellCommand === null) {
    return null;
  }

  try {
    const fallbackProbe = await runCommandProbe(
      processManager,
      shellCommand.command,
      shellCommand.args,
    );

    if (fallbackProbe.exitCode !== 0) {
      return {
        version: null,
        error: `${command} produced empty output; shell fallback failed: ${formatProbeFailure(shellCommand.command, fallbackProbe)}`,
      };
    }

    const fallbackOutput = getProbeOutputText(fallbackProbe);
    if (fallbackOutput.length === 0) {
      return {
        version: null,
        error: `${command} produced empty output; shell fallback also produced empty output`,
      };
    }

    const version = parseVersionFromOutput(fallbackOutput);
    if (version === null) {
      return {
        version: null,
        error: `${command} version output is malformed: ${fallbackOutput}`,
      };
    }

    return { version, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      version: null,
      error: `${command} produced empty output; shell fallback failed: ${message}`,
    };
  }
}

async function detectCommandVersion(
  processManager: ProcessManager,
  command: string,
  args: readonly string[],
): Promise<ToolVersionInfo> {
  try {
    const probeResult = await runCommandProbe(processManager, command, args);

    if (probeResult.exitCode !== 0) {
      return {
        version: null,
        error: formatProbeFailure(command, probeResult),
      };
    }

    const output = getProbeOutputText(probeResult);
    if (output.length === 0) {
      const fallbackResult = await runShellWrappedFallback(
        processManager,
        command,
        args,
      );

      if (fallbackResult !== null) {
        return fallbackResult;
      }

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
