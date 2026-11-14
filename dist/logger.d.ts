/**
 * Centralized logger configuration.
 *
 * Provides a configured consola instance with appropriate log levels
 * and formatting for the application.
 *
 * @module logger
 */
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
export declare const logger: import("consola").ConsolaInstance;
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
export declare function createTaggedLogger(tag: string): import("consola").ConsolaInstance;
//# sourceMappingURL=logger.d.ts.map