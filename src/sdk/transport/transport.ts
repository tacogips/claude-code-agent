/**
 * Transport interface for Claude Code CLI communication.
 *
 * Defines the contract for all transport implementations
 * (subprocess, mock, etc.)
 *
 * @module sdk/transport/transport
 */

/**
 * Abstract transport interface for CLI communication.
 *
 * All transport implementations must implement this interface.
 * Provides methods for connecting, reading, writing, and closing
 * communication with the Claude Code CLI.
 */
export interface Transport {
  /**
   * Connect to the transport.
   *
   * For subprocess: spawns CLI process.
   * For mock: initializes internal state.
   *
   * @throws {CLINotFoundError} If CLI binary not found
   * @throws {CLIConnectionError} If connection fails
   */
  connect(): Promise<void>;

  /**
   * Write data to the transport.
   *
   * @param data - JSON string to send to CLI
   * @throws {Error} If transport is not connected or closed
   */
  write(data: string): Promise<void>;

  /**
   * Read messages from the transport as async iterable.
   *
   * Yields parsed JSON objects from the CLI stdout.
   * Messages are expected to be newline-delimited JSON.
   *
   * @yields Parsed JSON objects from the CLI
   * @throws {Error} If transport is not connected
   */
  readMessages(): AsyncIterable<object>;

  /**
   * Signal end of input.
   *
   * For subprocess: closes stdin to signal no more input.
   * For mock: signals no more messages will be read.
   */
  endInput(): Promise<void>;

  /**
   * Close the transport and clean up resources.
   *
   * For subprocess: terminates the CLI process.
   * For mock: cleans up internal state.
   */
  close(): Promise<void>;
}
