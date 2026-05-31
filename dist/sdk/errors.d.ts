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
export declare class ClaudeCodeAgentError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
/**
 * CLI binary not found at the specified path.
 *
 * Thrown when the Claude Code CLI executable cannot be located.
 */
export declare class CLINotFoundError extends ClaudeCodeAgentError {
    readonly path: string;
    constructor(path: string);
}
/**
 * Failed to connect to the Claude Code CLI.
 *
 * Thrown when the subprocess cannot be spawned or communication fails.
 */
export declare class CLIConnectionError extends ClaudeCodeAgentError {
    readonly reason: string;
    constructor(reason: string);
}
/**
 * Tool handler execution failed.
 *
 * Thrown when a registered tool handler throws an error or returns an invalid result.
 */
export declare class ToolExecutionError extends ClaudeCodeAgentError {
    readonly toolName: string;
    readonly cause: Error | undefined;
    constructor(toolName: string, cause: Error | string);
}
/**
 * Control protocol communication error.
 *
 * Thrown when JSON-RPC communication between SDK and CLI fails.
 */
export declare class ControlProtocolError extends ClaudeCodeAgentError {
    readonly requestId?: string | undefined;
    constructor(message: string, requestId?: string | undefined);
}
/**
 * Operation timed out.
 *
 * Thrown when an async operation exceeds the specified timeout.
 */
export declare class TimeoutError extends ClaudeCodeAgentError {
    readonly operation: string;
    readonly timeout: number;
    constructor(operation: string, timeout: number);
}
/**
 * Session is in an invalid state for the requested operation.
 *
 * Thrown when attempting an operation that requires a different session state.
 */
export declare class InvalidStateError extends ClaudeCodeAgentError {
    readonly currentState: string;
    readonly expectedStates: string[];
    constructor(currentState: string, expectedStates: string[]);
}
/**
 * Type guard for ClaudeCodeAgentError.
 */
export declare function isClaudeCodeAgentError(error: unknown): error is ClaudeCodeAgentError;
/**
 * Type guard for CLINotFoundError.
 */
export declare function isCLINotFoundError(error: unknown): error is CLINotFoundError;
/**
 * Type guard for CLIConnectionError.
 */
export declare function isCLIConnectionError(error: unknown): error is CLIConnectionError;
/**
 * Type guard for ToolExecutionError.
 */
export declare function isToolExecutionError(error: unknown): error is ToolExecutionError;
/**
 * Type guard for ControlProtocolError.
 */
export declare function isControlProtocolError(error: unknown): error is ControlProtocolError;
/**
 * Type guard for TimeoutError.
 */
export declare function isTimeoutError(error: unknown): error is TimeoutError;
/**
 * Type guard for InvalidStateError.
 */
export declare function isInvalidStateError(error: unknown): error is InvalidStateError;
//# sourceMappingURL=errors.d.ts.map