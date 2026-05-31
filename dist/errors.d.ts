/**
 * Error types for claude-code-agent.
 *
 * All application errors extend AgentError which provides
 * a consistent structure with error codes and recoverability
 * information.
 *
 * @module errors
 */
/**
 * Abstract base class for all application errors.
 *
 * Provides a consistent error structure with:
 * - Unique error code for programmatic handling
 * - Recoverability flag for error handling decisions
 * - Stack trace preservation
 */
export declare abstract class AgentError extends Error {
    /**
     * Unique error code for this error type.
     * Used for programmatic error identification.
     */
    abstract readonly code: string;
    /**
     * Whether this error is recoverable.
     *
     * Recoverable errors can potentially be retried or handled gracefully.
     * Non-recoverable errors typically require user intervention or
     * indicate a fundamental problem.
     */
    abstract readonly recoverable: boolean;
    constructor(message: string);
}
/**
 * Error thrown when a required file does not exist.
 */
export declare class FileNotFoundError extends AgentError {
    readonly code: "FILE_NOT_FOUND";
    readonly recoverable = false;
    /** The path that was not found */
    readonly path: string;
    constructor(path: string);
}
/**
 * Error thrown when a session cannot be found.
 */
export declare class SessionNotFoundError extends AgentError {
    readonly code: "SESSION_NOT_FOUND";
    readonly recoverable = false;
    /** The session ID that was not found */
    readonly sessionId: string;
    constructor(sessionId: string);
}
/**
 * Error thrown when parsing fails.
 *
 * This error is recoverable because the system can typically
 * skip malformed lines and continue processing.
 */
export declare class ParseError extends AgentError {
    readonly code: "PARSE_ERROR";
    readonly recoverable = true;
    /** File being parsed when error occurred */
    readonly file: string;
    /** Line number where error occurred (1-indexed) */
    readonly line: number;
    /** Additional error details */
    readonly details: string;
    constructor(file: string, line: number, details: string);
}
/**
 * Error thrown when a process execution fails.
 */
export declare class ProcessError extends AgentError {
    readonly code: "PROCESS_ERROR";
    readonly recoverable = false;
    /** Command that failed */
    readonly command: string;
    /** Exit code from the process */
    readonly exitCode: number;
    /** Standard error output */
    readonly stderr: string;
    constructor(command: string, exitCode: number, stderr: string);
}
/**
 * Error thrown when a budget limit is exceeded.
 */
export declare class BudgetExceededError extends AgentError {
    readonly code: "BUDGET_EXCEEDED";
    readonly recoverable = false;
    /** Session that exceeded the budget */
    readonly sessionId: string;
    /** Actual usage amount */
    readonly usage: number;
    /** Budget limit that was exceeded */
    readonly limit: number;
    constructor(sessionId: string, usage: number, limit: number);
}
/**
 * Error thrown when a session group is not found.
 */
export declare class GroupNotFoundError extends AgentError {
    readonly code: "GROUP_NOT_FOUND";
    readonly recoverable = false;
    /** The group ID that was not found */
    readonly groupId: string;
    constructor(groupId: string);
}
/**
 * Error thrown when a command queue is not found.
 */
export declare class QueueNotFoundError extends AgentError {
    readonly code: "QUEUE_NOT_FOUND";
    readonly recoverable = false;
    /** The queue ID that was not found */
    readonly queueId: string;
    constructor(queueId: string);
}
/**
 * Error thrown when a circular dependency is detected.
 */
export declare class CircularDependencyError extends AgentError {
    readonly code: "CIRCULAR_DEPENDENCY";
    readonly recoverable = false;
    /** IDs involved in the circular dependency */
    readonly cycle: readonly string[];
    constructor(cycle: readonly string[]);
}
/**
 * Error thrown when validation fails.
 *
 * Recoverable because the user can provide corrected input.
 */
export declare class ValidationError extends AgentError {
    readonly code: "VALIDATION_ERROR";
    readonly recoverable = true;
    /** Field that failed validation */
    readonly field: string;
    /** Reason for validation failure */
    readonly reason: string;
    constructor(field: string, reason: string);
}
/**
 * Union type of all error codes for exhaustive matching.
 */
export type AgentErrorCode = "FILE_NOT_FOUND" | "SESSION_NOT_FOUND" | "PARSE_ERROR" | "PROCESS_ERROR" | "BUDGET_EXCEEDED" | "GROUP_NOT_FOUND" | "QUEUE_NOT_FOUND" | "CIRCULAR_DEPENDENCY" | "VALIDATION_ERROR";
//# sourceMappingURL=errors.d.ts.map