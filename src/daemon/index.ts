/**
 * Daemon module exports.
 *
 * Provides HTTP daemon server for remote Claude Code execution,
 * token-based authentication, and core daemon types.
 *
 * @module daemon
 */

// Re-export server class
export { DaemonServer } from "./server";

// Re-export authentication classes and functions
export { TokenManager, authMiddleware, requirePermission } from "./auth";

// Re-export all types
export type {
  DaemonConfig,
  DaemonStatus,
  CreateTokenOptions,
  ApiToken,
  Permission,
} from "./types";

// Re-export auth context type
export type { AuthContext } from "./auth";
