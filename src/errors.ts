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
export abstract class AgentError extends Error {
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

  constructor(message: string) {
    super(message);
    // Preserve prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when a required file does not exist.
 */
export class FileNotFoundError extends AgentError {
  readonly code = "FILE_NOT_FOUND" as const;
  readonly recoverable = false;

  /** The path that was not found */
  readonly path: string;

  constructor(path: string) {
    super(`File not found: ${path}`);
    this.path = path;
  }
}

/**
 * Error thrown when a session cannot be found.
 */
export class SessionNotFoundError extends AgentError {
  readonly code = "SESSION_NOT_FOUND" as const;
  readonly recoverable = false;

  /** The session ID that was not found */
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when parsing fails.
 *
 * This error is recoverable because the system can typically
 * skip malformed lines and continue processing.
 */
export class ParseError extends AgentError {
  readonly code = "PARSE_ERROR" as const;
  readonly recoverable = true;

  /** File being parsed when error occurred */
  readonly file: string;
  /** Line number where error occurred (1-indexed) */
  readonly line: number;
  /** Additional error details */
  readonly details: string;

  constructor(file: string, line: number, details: string) {
    super(`Parse error in ${file} at line ${line}: ${details}`);
    this.file = file;
    this.line = line;
    this.details = details;
  }
}

/**
 * Error thrown when a process execution fails.
 */
export class ProcessError extends AgentError {
  readonly code = "PROCESS_ERROR" as const;
  readonly recoverable = false;

  /** Command that failed */
  readonly command: string;
  /** Exit code from the process */
  readonly exitCode: number;
  /** Standard error output */
  readonly stderr: string;

  constructor(command: string, exitCode: number, stderr: string) {
    super(`Process '${command}' failed with exit code ${exitCode}: ${stderr}`);
    this.command = command;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Error thrown when a budget limit is exceeded.
 */
export class BudgetExceededError extends AgentError {
  readonly code = "BUDGET_EXCEEDED" as const;
  readonly recoverable = false;

  /** Session that exceeded the budget */
  readonly sessionId: string;
  /** Actual usage amount */
  readonly usage: number;
  /** Budget limit that was exceeded */
  readonly limit: number;

  constructor(sessionId: string, usage: number, limit: number) {
    super(
      `Budget exceeded for session ${sessionId}: usage ${usage.toFixed(2)} exceeds limit ${limit.toFixed(2)}`,
    );
    this.sessionId = sessionId;
    this.usage = usage;
    this.limit = limit;
  }
}

/**
 * Error thrown when a session group is not found.
 */
export class GroupNotFoundError extends AgentError {
  readonly code = "GROUP_NOT_FOUND" as const;
  readonly recoverable = false;

  /** The group ID that was not found */
  readonly groupId: string;

  constructor(groupId: string) {
    super(`Session group not found: ${groupId}`);
    this.groupId = groupId;
  }
}

/**
 * Error thrown when a command queue is not found.
 */
export class QueueNotFoundError extends AgentError {
  readonly code = "QUEUE_NOT_FOUND" as const;
  readonly recoverable = false;

  /** The queue ID that was not found */
  readonly queueId: string;

  constructor(queueId: string) {
    super(`Command queue not found: ${queueId}`);
    this.queueId = queueId;
  }
}

/**
 * Error thrown when a circular dependency is detected.
 */
export class CircularDependencyError extends AgentError {
  readonly code = "CIRCULAR_DEPENDENCY" as const;
  readonly recoverable = false;

  /** IDs involved in the circular dependency */
  readonly cycle: readonly string[];

  constructor(cycle: readonly string[]) {
    super(`Circular dependency detected: ${cycle.join(" -> ")}`);
    this.cycle = cycle;
  }
}

/**
 * Error thrown when validation fails.
 *
 * Recoverable because the user can provide corrected input.
 */
export class ValidationError extends AgentError {
  readonly code = "VALIDATION_ERROR" as const;
  readonly recoverable = true;

  /** Field that failed validation */
  readonly field: string;
  /** Reason for validation failure */
  readonly reason: string;

  constructor(field: string, reason: string) {
    super(`Validation failed for '${field}': ${reason}`);
    this.field = field;
    this.reason = reason;
  }
}

/**
 * Union type of all error codes for exhaustive matching.
 */
export type AgentErrorCode =
  | "FILE_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "PARSE_ERROR"
  | "PROCESS_ERROR"
  | "BUDGET_EXCEEDED"
  | "GROUP_NOT_FOUND"
  | "QUEUE_NOT_FOUND"
  | "CIRCULAR_DEPENDENCY"
  | "VALIDATION_ERROR";
