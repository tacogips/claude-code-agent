/**
 * Subprocess Transport
 *
 * Transport implementation that spawns Claude Code CLI as a subprocess
 * and communicates via stdin/stdout using JSON-RPC messages.
 *
 * @module sdk/transport/subprocess
 */

import type { Subprocess, FileSink } from "bun";
import { CLINotFoundError, CLIConnectionError } from "../errors";
import type { Transport } from "./transport";

/**
 * Options for subprocess transport configuration.
 */
export interface TransportOptions {
  /**
   * Path to Claude Code CLI binary.
   * @default 'claude'
   */
  cliPath?: string;

  /**
   * Working directory for CLI subprocess.
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Environment variables for CLI subprocess.
   * Merged with current process.env.
   */
  env?: Record<string, string>;

  /**
   * MCP server configuration to pass to CLI.
   * Serialized to JSON and passed via --mcp-config.
   */
  mcpConfig?: object;

  /**
   * Permission mode for tool execution.
   * Values: 'ask' | 'allow_all' | 'deny_all'
   */
  permissionMode?: string;

  /**
   * Model to use for the session.
   * Example: 'claude-opus-4' | 'claude-sonnet-4'
   */
  model?: string;

  /**
   * Maximum budget in USD for the session.
   */
  maxBudgetUsd?: number;

  /**
   * Maximum number of turns in the session.
   */
  maxTurns?: number;

  /**
   * System prompt to prepend to the session.
   */
  systemPrompt?: string;

  /**
   * List of allowed tools (whitelist).
   * Only these tools can be executed.
   */
  allowedTools?: string[];

  /**
   * List of disallowed tools (blacklist).
   * These tools cannot be executed.
   */
  disallowedTools?: string[];

  /**
   * Session ID to resume. When set, CLI is invoked with --resume flag.
   */
  resumeSessionId?: string;

  /**
   * Initial prompt to send. When set with resumeSessionId, used as --prompt.
   */
  prompt?: string;

  /**
   * Additional CLI arguments to pass to Claude Code.
   * These are appended as-is to the command line.
   * Example: ['--dangerously-skip-permissions', '--model', 'claude-opus-4-6']
   */
  additionalArgs?: string[];
}

/**
 * Subprocess transport that spawns Claude Code CLI.
 *
 * Communicates with CLI via stdin/stdout using newline-delimited JSON.
 * Each message is a complete JSON object on a single line.
 *
 * @example
 * ```typescript
 * const transport = new SubprocessTransport({
 *   cliPath: 'claude',
 *   model: 'claude-opus-4',
 *   permissionMode: 'ask'
 * });
 *
 * await transport.connect();
 *
 * // Write message to CLI
 * await transport.write(JSON.stringify({ type: 'user', content: 'Hello' }));
 *
 * // Read messages from CLI
 * for await (const msg of transport.readMessages()) {
 *   console.log(msg);
 * }
 *
 * await transport.close();
 * ```
 */
export class SubprocessTransport implements Transport {
  private process: Subprocess | null = null;
  private stdin: FileSink | null = null;
  private stdout: ReadableStream<Uint8Array> | null = null;
  private stderr: ReadableStream<Uint8Array> | null = null;
  private connected: boolean = false;
  private closed: boolean = false;
  private readonly options: TransportOptions;

  /**
   * Create a new subprocess transport.
   *
   * @param options - Configuration options
   */
  constructor(options?: TransportOptions) {
    this.options = options ?? {};
  }

  /**
   * Spawn CLI process and establish communication.
   *
   * @throws {CLINotFoundError} If CLI binary not found
   * @throws {CLIConnectionError} If connection fails
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error("Transport already connected");
    }

    if (this.closed) {
      throw new Error("Cannot connect to closed transport");
    }

    const cliPath = this.options.cliPath ?? "claude";
    const args = this.buildCommand();

    try {
      // Spawn subprocess with Bun.spawn
      this.process = Bun.spawn(args, {
        cwd: this.options.cwd ?? process.cwd(),
        env: {
          ...process.env,
          ...this.options.env,
        },
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });

      // Check if process started successfully
      const stdin = this.process.stdin;
      const stdout = this.process.stdout;
      const stderr = this.process.stderr;

      if (stdin === null || stdin === undefined || typeof stdin === "number") {
        throw new CLIConnectionError("Failed to open stdin pipe");
      }
      if (
        stdout === null ||
        stdout === undefined ||
        typeof stdout === "number"
      ) {
        throw new CLIConnectionError("Failed to open stdout pipe");
      }
      if (
        stderr === null ||
        stderr === undefined ||
        typeof stderr === "number"
      ) {
        throw new CLIConnectionError("Failed to open stderr pipe");
      }

      // Store stdin FileSink directly
      this.stdin = stdin;
      this.stdout = stdout;
      this.stderr = stderr;

      // Start stderr reader in background
      void this.readStderr();

      this.connected = true;
    } catch (error: unknown) {
      // Check if CLI binary not found
      if (error instanceof Error) {
        if (
          error.message.includes("ENOENT") ||
          error.message.includes("not found")
        ) {
          throw new CLINotFoundError(cliPath);
        }
        throw new CLIConnectionError(error.message);
      }
      throw new CLIConnectionError(String(error));
    }
  }

  /**
   * Write a JSON message to CLI stdin.
   *
   * Message is serialized as a single line and sent to CLI.
   *
   * @param data - JSON string to write
   * @throws {Error} If not connected or closed
   */
  async write(data: string): Promise<void> {
    if (!this.connected || this.stdin === null) {
      if (this.closed) {
        throw new Error("Transport closed");
      }
      throw new Error("Transport not connected");
    }

    try {
      // Write data with newline to stdin using Bun's FileSink write method
      this.stdin.write(data + "\n");
      // Flush to ensure data is sent immediately
      await this.stdin.flush();
    } catch (error: unknown) {
      throw new Error(
        `Failed to write to CLI stdin: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Async iterator that yields parsed JSON messages from stdout.
   *
   * Each message is a complete JSON line from the CLI.
   * Parses line by line and yields each parsed object.
   *
   * @yields Parsed JSON objects from CLI stdout
   * @throws {Error} If not connected
   */
  async *readMessages(): AsyncIterable<object> {
    if (!this.connected || this.stdout === null) {
      throw new Error("Transport not connected");
    }

    const reader = this.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (!this.closed) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        // Keep incomplete last line in buffer
        buffer = lines[lines.length - 1] ?? "";

        // Process complete lines (all except last)
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line === undefined || line.trim() === "") {
            continue;
          }

          try {
            const message = JSON.parse(line) as object;
            yield message;
          } catch (error: unknown) {
            // Log parse error but continue
            console.error(
              `Failed to parse JSON from CLI: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error(`Line: ${line}`);
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim() !== "") {
        try {
          const message = JSON.parse(buffer) as object;
          yield message;
        } catch (error: unknown) {
          console.error(
            `Failed to parse final JSON from CLI: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Signal end of input to CLI.
   *
   * Closes stdin to signal that no more input will be sent.
   */
  async endInput(): Promise<void> {
    if (!this.connected || this.stdin === null) {
      throw new Error("Transport not connected");
    }

    try {
      await this.stdin.end();
      this.stdin = null;
    } catch (error: unknown) {
      // Ignore errors when closing stdin
      console.error(
        `Error closing stdin: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Terminate subprocess and clean up resources.
   *
   * Sends SIGTERM to CLI process and waits for graceful shutdown.
   * Falls back to SIGKILL if process doesn't exit within timeout.
   */
  async close(): Promise<void> {
    if (this.closed) {
      return; // Already closed
    }

    this.closed = true;
    this.connected = false;

    // Close stdin if still open
    if (this.stdin !== null) {
      try {
        await this.stdin.end();
      } catch {
        // Ignore errors
      }
      this.stdin = null;
    }

    // Terminate process
    if (this.process !== null) {
      try {
        this.process.kill();

        // Wait for process to exit (with timeout)
        const exitPromise = this.process.exited;
        const timeoutPromise = new Promise<void>((resolve) =>
          setTimeout(resolve, 5000),
        );

        await Promise.race([exitPromise, timeoutPromise]);

        // If still running after timeout, force kill
        if (!this.process.killed) {
          this.process.kill(9); // SIGKILL
        }
      } catch (error: unknown) {
        console.error(
          `Error terminating CLI process: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.process = null;
    }

    this.stdout = null;
    this.stderr = null;
  }

  /**
   * Check if transport is connected.
   *
   * @returns True if connected to CLI
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Build CLI command arguments from options.
   *
   * Constructs the full command line with all flags and options.
   *
   * @returns Array of command arguments
   * @private
   */
  private buildCommand(): string[] {
    const cliPath = this.options.cliPath ?? "claude";
    const args = [
      cliPath,
      "--output-format",
      "stream-json",
      "--input-format",
      "stream-json",
      "--verbose",
    ];

    if (this.options.mcpConfig !== undefined) {
      args.push("--mcp-config", JSON.stringify(this.options.mcpConfig));
    }

    if (this.options.permissionMode !== undefined) {
      args.push("--permission-mode", this.options.permissionMode);
    }

    if (this.options.model !== undefined) {
      args.push("--model", this.options.model);
    }

    if (this.options.maxBudgetUsd !== undefined) {
      args.push("--max-budget", String(this.options.maxBudgetUsd));
    }

    if (this.options.maxTurns !== undefined) {
      args.push("--max-turns", String(this.options.maxTurns));
    }

    if (this.options.systemPrompt !== undefined) {
      args.push("--system-prompt", this.options.systemPrompt);
    }

    if (
      this.options.allowedTools !== undefined &&
      this.options.allowedTools.length > 0
    ) {
      args.push("--allowed-tools", this.options.allowedTools.join(","));
    }

    if (
      this.options.disallowedTools !== undefined &&
      this.options.disallowedTools.length > 0
    ) {
      args.push("--disallowed-tools", this.options.disallowedTools.join(","));
    }

    if (this.options.resumeSessionId !== undefined) {
      args.push("--resume", this.options.resumeSessionId);
    }

    // Append additional CLI arguments as-is
    if (
      this.options.additionalArgs !== undefined &&
      this.options.additionalArgs.length > 0
    ) {
      args.push(...this.options.additionalArgs);
    }

    // Note: --prompt is not a supported CLI flag.
    // For resume sessions with a prompt, the prompt is sent via stdin
    // as a user message after initialization (handled in agent.ts).

    return args;
  }

  /**
   * Read stderr in background and log errors.
   *
   * Reads stderr from CLI process and logs to console.error.
   *
   * @private
   */
  private async readStderr(): Promise<void> {
    if (this.stderr === null) {
      return;
    }

    const reader = this.stderr.getReader();
    const decoder = new TextDecoder();

    try {
      while (!this.closed) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const text = decoder.decode(value, { stream: true });
        if (text.trim() !== "") {
          console.error(`[CLI stderr] ${text.trim()}`);
        }
      }
    } catch (error: unknown) {
      // Ignore errors when reading stderr
      console.error(
        `Error reading stderr: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      reader.releaseLock();
    }
  }
}
