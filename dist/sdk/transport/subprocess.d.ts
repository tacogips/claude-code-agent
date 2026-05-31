/**
 * Subprocess Transport
 *
 * Transport implementation that spawns Claude Code CLI as a subprocess
 * and communicates via stdin/stdout using JSON-RPC messages.
 *
 * @module sdk/transport/subprocess
 */
import type { ClaudeEnvironmentShape } from "../environment";
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
    env?: ClaudeEnvironmentShape;
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
     * Effort level for the session.
     */
    effort?: string;
    /**
     * Maximum budget in USD for the session.
     *
     * Claude Code currently exposes this as a print-mode-only flag, so the
     * subprocess transport does not pass it when running in interactive mode.
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
     * Initial prompt to send at startup.
     * Passed as a CLI positional argument (not stdin) to trigger immediate turn
     * processing while keeping stdin open for control protocol messages.
     */
    prompt?: string;
    /**
     * Attachment file paths for the initial prompt.
     * Used to grant Claude Code tool-access to parent directories via --add-dir.
     */
    attachmentPaths?: string[];
    /**
     * Additional CLI arguments to pass to Claude Code.
     * These are appended to the command line after rejecting print-mode flags.
     * Example: ['--dangerously-skip-permissions', '--model', 'claude-opus-4-6']
     */
    additionalArgs?: string[];
}
/**
 * Build Claude Code CLI command arguments from transport options.
 *
 * The initial prompt is appended as a positional argument at the end so CLI
 * begins processing immediately without waiting for stdin user messages.
 */
export declare function buildSubprocessCommand(options: TransportOptions): string[];
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
export declare class SubprocessTransport implements Transport {
    private process;
    private stdin;
    private stdout;
    private stderr;
    private connected;
    private closed;
    private readonly options;
    /**
     * Create a new subprocess transport.
     *
     * @param options - Configuration options
     */
    constructor(options?: TransportOptions);
    /**
     * Spawn CLI process and establish communication.
     *
     * @throws {CLINotFoundError} If CLI binary not found
     * @throws {CLIConnectionError} If connection fails
     */
    connect(): Promise<void>;
    /**
     * Write a JSON message to CLI stdin.
     *
     * Message is serialized as a single line and sent to CLI.
     *
     * @param data - JSON string to write
     * @throws {Error} If not connected or closed
     */
    write(data: string): Promise<void>;
    /**
     * Async iterator that yields parsed JSON messages from stdout.
     *
     * Each message is a complete JSON line from the CLI.
     * Parses line by line and yields each parsed object.
     *
     * @yields Parsed JSON objects from CLI stdout
     * @throws {Error} If not connected
     */
    readMessages(): AsyncIterable<object>;
    /**
     * Signal end of input to CLI.
     *
     * Closes stdin to signal that no more input will be sent.
     */
    endInput(): Promise<void>;
    /**
     * Terminate subprocess and clean up resources.
     *
     * Sends SIGTERM to CLI process and waits for graceful shutdown.
     * Falls back to SIGKILL if process doesn't exit within timeout.
     */
    close(): Promise<void>;
    /**
     * Check if transport is connected.
     *
     * @returns True if connected to CLI
     */
    isConnected(): boolean;
    /**
     * Build CLI command arguments from options.
     *
     * Constructs the full command line with all flags and options.
     *
     * @returns Array of command arguments
     * @private
     */
    private buildCommand;
    /**
     * Read stderr in background and log errors.
     *
     * Reads stderr from CLI process and logs to console.error.
     *
     * @private
     */
    private readStderr;
}
//# sourceMappingURL=subprocess.d.ts.map