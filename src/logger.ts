/**
 * Centralized logger configuration.
 *
 * Provides a configured consola instance with appropriate log levels
 * and formatting for the application.
 *
 * @module logger
 */

import { createConsola, LogLevels } from "consola";

/**
 * Valid log level names that can be used with LOG_LEVEL environment variable.
 */
type LogLevelName =
  | "silent"
  | "fatal"
  | "error"
  | "warn"
  | "log"
  | "info"
  | "success"
  | "debug"
  | "trace"
  | "verbose";

/**
 * Get the log level based on environment configuration.
 *
 * Priority:
 * 1. LOG_LEVEL environment variable (explicit override)
 * 2. NODE_ENV-based defaults:
 *    - production: info level
 *    - test: warn level (quieter tests)
 *    - development/default: debug level
 *
 * @returns Numeric log level for consola
 */
function getLogLevel(): number {
  const env = process.env["NODE_ENV"] ?? "development";
  const logLevelEnv = process.env["LOG_LEVEL"];

  // Allow explicit override via LOG_LEVEL env var
  if (logLevelEnv !== undefined) {
    const normalizedLevel = logLevelEnv.toLowerCase() as LogLevelName;
    const level = LogLevels[normalizedLevel];
    if (level !== undefined) {
      return level;
    }
  }

  switch (env) {
    case "production":
      return LogLevels.info;
    case "test":
      return LogLevels.warn;
    default:
      return LogLevels.debug;
  }
}

/**
 * Check if running in production environment.
 */
function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * Application logger instance.
 *
 * Usage:
 * ```typescript
 * import { logger } from "./logger";
 *
 * logger.info("Server started");
 * logger.debug("Debug info", { details });
 * logger.warn("Warning message");
 * logger.error("Error occurred", error);
 * ```
 */
export const logger = createConsola({
  level: getLogLevel(),
  // Use fancy formatting in development, basic in production
  ...(isProduction() ? {} : { fancy: true }),
});

/**
 * Create a child logger with a specific tag/scope.
 *
 * @param tag - Tag to identify log source (e.g., "sdk", "events")
 * @returns Tagged logger instance
 *
 * @example
 * const sdkLogger = createTaggedLogger("sdk");
 * sdkLogger.info("SDK initialized"); // [sdk] SDK initialized
 */
export function createTaggedLogger(tag: string) {
  return logger.withTag(tag);
}
