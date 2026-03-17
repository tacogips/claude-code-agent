import * as os from "node:os";
import * as path from "node:path";

const AGENT_DATA_DIRECTORY = "claude-code-agent";

interface ResolveAgentDataDirOptions {
  readonly respectXdgDataHome?: boolean | undefined;
}

export function resolveAgentDataDir(
  dataDir?: string,
  options?: ResolveAgentDataDirOptions,
): string {
  if (dataDir !== undefined) {
    return dataDir;
  }

  const xdgDataHome = process.env["XDG_DATA_HOME"];
  if (
    options?.respectXdgDataHome === true &&
    xdgDataHome !== undefined &&
    xdgDataHome.length > 0
  ) {
    return path.join(xdgDataHome, AGENT_DATA_DIRECTORY);
  }

  return path.join(os.homedir(), ".local", AGENT_DATA_DIRECTORY);
}

export function resolveAgentDataPath(
  dataDir: string | undefined,
  ...segments: readonly string[]
): string {
  return path.join(resolveAgentDataDir(dataDir), ...segments);
}

export function resolveAgentDataPathFromXdg(
  dataDir: string | undefined,
  ...segments: readonly string[]
): string {
  return path.join(
    resolveAgentDataDir(dataDir, { respectXdgDataHome: true }),
    ...segments,
  );
}
