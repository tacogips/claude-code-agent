/**
 * SDK Error Types
 *
 * Error classes for claude-code-agent SDK operations including CLI connection,
 * tool execution, control protocol, and session state errors.
 */

/**
 * Base error class for all SDK errors.
 *
 * Provides a consistent error interface with error codes for programmatic handling.
 */
export class ClaudeCodeAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ClaudeCodeAgentError";
    Object.setPrototypeOf(this, ClaudeCodeAgentError.prototype);
  }
}

/**
 * CLI binary not found at the specified path.
 *
 * Thrown when the Claude Code CLI executable cannot be located.
 */
export class CLINotFoundError extends ClaudeCodeAgentError {
  constructor(public readonly path: string) {
    super(`Claude Code CLI not found at: ${path}`, "CLI_NOT_FOUND");
    this.name = "CLINotFoundError";
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

/**
 * Failed to connect to the Claude Code CLI.
 *
 * Thrown when the subprocess cannot be spawned or communication fails.
 */
export class CLIConnectionError extends ClaudeCodeAgentError {
  constructor(public readonly reason: string) {
    super(`Failed to connect to Claude Code CLI: ${reason}`, "CLI_CONNECTION");
    this.name = "CLIConnectionError";
    Object.setPrototypeOf(this, CLIConnectionError.prototype);
  }
}

/**
 * Tool handler execution failed.
 *
 * Thrown when a registered tool handler throws an error or returns an invalid result.
 */
export class ToolExecutionError extends ClaudeCodeAgentError {
  public override readonly cause: Error | undefined;

  constructor(
    public readonly toolName: string,
    cause: Error | string,
  ) {
    const message = typeof cause === "string" ? cause : cause.message;
    super(`Tool '${toolName}' failed: ${message}`, "TOOL_EXECUTION");
    this.name = "ToolExecutionError";
    this.cause = typeof cause === "string" ? undefined : cause;
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

/**
 * Control protocol communication error.
 *
 * Thrown when JSON-RPC communication between SDK and CLI fails.
 */
export class ControlProtocolError extends ClaudeCodeAgentError {
  constructor(
    message: string,
    public readonly requestId?: string,
  ) {
    super(`Control protocol error: ${message}`, "CONTROL_PROTOCOL");
    this.name = "ControlProtocolError";
    Object.setPrototypeOf(this, ControlProtocolError.prototype);
  }
}

/**
 * Operation timed out.
 *
 * Thrown when an async operation exceeds the specified timeout.
 */
export class TimeoutError extends ClaudeCodeAgentError {
  constructor(
    public readonly operation: string,
    public readonly timeout: number,
  ) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, "TIMEOUT");
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Session is in an invalid state for the requested operation.
 *
 * Thrown when attempting an operation that requires a different session state.
 */
export class InvalidStateError extends ClaudeCodeAgentError {
  constructor(
    public readonly currentState: string,
    public readonly expectedStates: string[],
  ) {
    super(
      `Invalid state: ${currentState}. Expected one of: ${expectedStates.join(", ")}`,
      "INVALID_STATE",
    );
    this.name = "InvalidStateError";
    Object.setPrototypeOf(this, InvalidStateError.prototype);
  }
}

/**
 * Type guard for ClaudeCodeAgentError.
 */
export function isClaudeCodeAgentError(
  error: unknown,
): error is ClaudeCodeAgentError {
  return error instanceof ClaudeCodeAgentError;
}

/**
 * Type guard for CLINotFoundError.
 */
export function isCLINotFoundError(error: unknown): error is CLINotFoundError {
  return error instanceof CLINotFoundError;
}

/**
 * Type guard for CLIConnectionError.
 */
export function isCLIConnectionError(
  error: unknown,
): error is CLIConnectionError {
  return error instanceof CLIConnectionError;
}

/**
 * Type guard for ToolExecutionError.
 */
export function isToolExecutionError(
  error: unknown,
): error is ToolExecutionError {
  return error instanceof ToolExecutionError;
}

/**
 * Type guard for ControlProtocolError.
 */
export function isControlProtocolError(
  error: unknown,
): error is ControlProtocolError {
  return error instanceof ControlProtocolError;
}

/**
 * Type guard for TimeoutError.
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Type guard for InvalidStateError.
 */
export function isInvalidStateError(
  error: unknown,
): error is InvalidStateError {
  return error instanceof InvalidStateError;
}
