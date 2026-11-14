/**
 * Claude Code readiness verification helpers.
 *
 * Provides a reusable library API for checking whether stored authentication
 * is usable and, optionally, whether a specific model can be executed through
 * the Claude Code CLI.
 *
 * @module sdk/readiness
 */

import { BunProcessManager } from "../interfaces/bun-process-manager";
import type {
  ManagedProcess,
  ProcessManager,
  SpawnOptions,
} from "../interfaces/process-manager";
import { CredentialManager } from "./credentials";
import type {
  OAuthCredentialsResult,
  SubscriptionType,
} from "./credentials/types";

const DEFAULT_PROBE_PROMPT = "Reply with exactly READY.";
const DEFAULT_TIMEOUT_MS = 20_000;

type ProbeFailureKind = "auth" | "model" | "cli" | "timeout" | "unknown";

export interface ClaudeReadinessCredentialSource {
  getCredentials(): Promise<OAuthCredentialsResult | null>;
  getStorageLocation(): string;
}

export interface VerifyClaudeReadinessOptions {
  /**
   * Model to probe through the Claude Code CLI.
   *
   * When omitted, the check validates stored authentication only.
   */
  readonly model?: string | undefined;

  /**
   * Claude Code CLI binary path.
   * @default "claude"
   */
  readonly cliPath?: string | undefined;

  /**
   * Working directory for the CLI probe.
   */
  readonly cwd?: string | undefined;

  /**
   * Extra environment variables for the CLI probe.
   */
  readonly env?: Readonly<Record<string, string>> | undefined;

  /**
   * Prompt used for the live probe.
   */
  readonly prompt?: string | undefined;

  /**
   * Timeout for the live probe.
   * @default 20000
   */
  readonly timeoutMs?: number | undefined;

  /**
   * Injected process manager for tests and advanced integrations.
   */
  readonly processManager?: ProcessManager | undefined;

  /**
   * Injected credential reader for tests and advanced integrations.
   */
  readonly credentialSource?: ClaudeReadinessCredentialSource | undefined;
}

export interface ClaudeAuthReadiness {
  readonly state: "missing" | "expired" | "configured";
  readonly available: boolean;
  readonly verified: boolean;
  readonly storageLocation: string;
  readonly expiresAt?: Date | undefined;
  readonly subscriptionType?: SubscriptionType | undefined;
  readonly scopes: readonly string[];
  readonly rateLimitTier?: string | undefined;
  readonly message?: string | undefined;
}

export interface ClaudeCliReadiness {
  readonly checked: boolean;
  readonly available: boolean;
  readonly command: string;
  readonly exitCode?: number | null | undefined;
  readonly message?: string | undefined;
}

export interface ClaudeModelReadiness {
  readonly requested: string | null;
  readonly checked: boolean;
  readonly available: boolean;
  readonly timedOut: boolean;
  readonly exitCode?: number | null | undefined;
  readonly stdout: string;
  readonly stderr: string;
  readonly failureKind?: ProbeFailureKind | undefined;
  readonly message?: string | undefined;
  readonly commandArgs: readonly string[];
}

export interface ClaudeReadinessResult {
  readonly ready: boolean;
  readonly auth: ClaudeAuthReadiness;
  readonly cli: ClaudeCliReadiness;
  readonly model: ClaudeModelReadiness;
}

interface ProbeExecutionResult {
  readonly cli: ClaudeCliReadiness;
  readonly model: ClaudeModelReadiness;
}

function joinLines(lines: readonly string[]): string {
  return lines.join("\n").trim();
}

async function collectLines(stream: AsyncIterable<string>): Promise<string[]> {
  const lines: string[] = [];
  for await (const line of stream) {
    lines.push(line);
  }
  return lines;
}

async function waitForExitOrTimeout(
  process: ManagedProcess,
  processManager: ProcessManager,
  timeoutMs: number,
): Promise<{ readonly exitCode: number | null; readonly timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      process.exitCode.then((exitCode) => ({
        exitCode,
        timedOut: false,
      })),
      new Promise<{ readonly exitCode: null; readonly timedOut: true }>(
        (resolve) => {
          timer = setTimeout(() => {
            void processManager
              .kill(process.pid, "SIGTERM")
              .finally(() => resolve({ exitCode: null, timedOut: true }));
          }, timeoutMs);
        },
      ),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function classifyProbeFailure(output: string): ProbeFailureKind {
  const normalized = output.toLowerCase();

  if (
    normalized.includes("login") ||
    normalized.includes("log in") ||
    normalized.includes("authentication") ||
    normalized.includes("authenticated") ||
    normalized.includes("unauthorized") ||
    normalized.includes("credential") ||
    normalized.includes("access token")
  ) {
    return "auth";
  }

  if (
    normalized.includes("model") &&
    (normalized.includes("unknown") ||
      normalized.includes("not available") ||
      normalized.includes("not supported") ||
      normalized.includes("not found") ||
      normalized.includes("unsupported") ||
      normalized.includes("access"))
  ) {
    return "model";
  }

  return "unknown";
}

function createInitialAuthReadiness(
  credentials: OAuthCredentialsResult | null,
  storageLocation: string,
): ClaudeAuthReadiness {
  if (credentials === null) {
    return {
      state: "missing",
      available: false,
      verified: false,
      storageLocation,
      scopes: [],
      message: "No stored Claude Code credentials were found.",
    };
  }

  return {
    state: credentials.isExpired ? "expired" : "configured",
    available: !credentials.isExpired,
    verified: false,
    storageLocation,
    expiresAt: credentials.expiresAt,
    subscriptionType: credentials.subscriptionType,
    scopes: [...credentials.scopes],
    rateLimitTier: credentials.rateLimitTier,
    message: credentials.isExpired
      ? "Stored credentials are expired."
      : undefined,
  };
}

function buildProbeArgs(
  model: string,
  prompt: string | undefined,
): readonly string[] {
  const args = ["-p", "--output-format", "stream-json", "--model", model];
  args.push(prompt ?? DEFAULT_PROBE_PROMPT);
  return args;
}

async function executeModelProbe(
  processManager: ProcessManager,
  cliPath: string,
  args: readonly string[],
  spawnOptions: SpawnOptions,
  timeoutMs: number,
): Promise<ProbeExecutionResult> {
  try {
    const process = processManager.spawn(cliPath, args, spawnOptions);
    const stdoutPromise = collectLines(process.stdout);
    const stderrPromise = collectLines(process.stderr);

    const exitResult = await waitForExitOrTimeout(
      process,
      processManager,
      timeoutMs,
    );
    const [stdoutLines, stderrLines] = await Promise.all([
      stdoutPromise,
      stderrPromise,
    ]);

    const stdout = joinLines(stdoutLines);
    const stderr = joinLines(stderrLines);

    if (exitResult.timedOut) {
      const timeoutMessage = `Probe timed out after ${timeoutMs}ms.`;
      return {
        cli: {
          checked: true,
          available: false,
          command: cliPath,
          exitCode: null,
          message: timeoutMessage,
        },
        model: {
          requested: args[4] ?? null,
          checked: true,
          available: false,
          timedOut: true,
          exitCode: null,
          stdout,
          stderr,
          failureKind: "timeout",
          message: timeoutMessage,
          commandArgs: [...args],
        },
      };
    }

    if (exitResult.exitCode === 0) {
      return {
        cli: {
          checked: true,
          available: true,
          command: cliPath,
          exitCode: 0,
        },
        model: {
          requested: args[4] ?? null,
          checked: true,
          available: true,
          timedOut: false,
          exitCode: 0,
          stdout,
          stderr,
          commandArgs: [...args],
        },
      };
    }

    const combinedOutput = [stderr, stdout]
      .filter((value) => value.length > 0)
      .join("\n");
    const failureKind = classifyProbeFailure(combinedOutput);
    const failureMessage =
      combinedOutput.length > 0
        ? combinedOutput
        : `Claude exited with code ${exitResult.exitCode ?? "unknown"}.`;

    return {
      cli: {
        checked: true,
        available: true,
        command: cliPath,
        exitCode: exitResult.exitCode,
        message: failureMessage,
      },
      model: {
        requested: args[4] ?? null,
        checked: true,
        available: false,
        timedOut: false,
        exitCode: exitResult.exitCode,
        stdout,
        stderr,
        failureKind,
        message: failureMessage,
        commandArgs: [...args],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      cli: {
        checked: true,
        available: false,
        command: cliPath,
        message,
      },
      model: {
        requested: args[4] ?? null,
        checked: true,
        available: false,
        timedOut: false,
        stdout: "",
        stderr: "",
        failureKind: "cli",
        message,
        commandArgs: [...args],
      },
    };
  }
}

/**
 * Verify whether Claude Code authentication is usable and, optionally,
 * whether a specific model can be executed successfully.
 */
export async function verifyClaudeReadiness(
  options: VerifyClaudeReadinessOptions = {},
): Promise<ClaudeReadinessResult> {
  const credentialSource = options.credentialSource ?? new CredentialManager();
  const processManager = options.processManager ?? new BunProcessManager();
  const cliPath = options.cliPath ?? "claude";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const credentials = await credentialSource.getCredentials();
  let auth = createInitialAuthReadiness(
    credentials,
    credentialSource.getStorageLocation(),
  );

  const baseResult: ClaudeReadinessResult = {
    ready: auth.available,
    auth,
    cli: {
      checked: false,
      available: false,
      command: cliPath,
    },
    model: {
      requested: options.model ?? null,
      checked: false,
      available: false,
      timedOut: false,
      stdout: "",
      stderr: "",
      commandArgs:
        options.model !== undefined
          ? buildProbeArgs(options.model, options.prompt)
          : [],
      message:
        options.model !== undefined && !auth.available
          ? "Live model probe was skipped because authentication is unavailable."
          : undefined,
    },
  };

  if (options.model === undefined) {
    return baseResult;
  }

  if (!auth.available) {
    return {
      ...baseResult,
      ready: false,
    };
  }

  const args = buildProbeArgs(options.model, options.prompt);
  const probeResult = await executeModelProbe(
    processManager,
    cliPath,
    args,
    {
      cwd: options.cwd,
      env: options.env,
    },
    timeoutMs,
  );

  if (probeResult.model.available) {
    auth = {
      ...auth,
      verified: true,
    };

    return {
      ready: true,
      auth,
      cli: probeResult.cli,
      model: probeResult.model,
    };
  }

  if (probeResult.model.failureKind === "auth") {
    auth = {
      ...auth,
      available: false,
      verified: true,
      message: probeResult.model.message,
    };
  } else if (probeResult.cli.available) {
    auth = {
      ...auth,
      verified: true,
    };
  }

  return {
    ready: false,
    auth,
    cli: probeResult.cli,
    model: probeResult.model,
  };
}
