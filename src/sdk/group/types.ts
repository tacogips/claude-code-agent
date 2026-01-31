/**
 * Session Group types and interfaces.
 *
 * Session Groups enable multi-project orchestration with concurrent execution,
 * dependency management, budget enforcement, and unified progress tracking.
 *
 * @module sdk/group/types
 */

import type { SessionStatus, TokenUsage } from "../../types/session";

/**
 * Lifecycle states for a session group.
 */
export type GroupStatus =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "archived"
  | "deleted";

/**
 * Budget enforcement configuration.
 *
 * @example Example data
 * ```json
 * {
 *   "maxBudgetUsd": 25.0,
 *   "onBudgetExceeded": "pause",
 *   "warningThreshold": 0.8
 * }
 * ```
 */
export interface BudgetConfig {
  /** Maximum budget in USD */
  readonly maxBudgetUsd: number;
  /** Action to take when budget is exceeded */
  readonly onBudgetExceeded: "stop" | "warn" | "pause";
  /** Threshold (0-1) at which to emit warning */
  readonly warningThreshold: number;
}

/**
 * Concurrency configuration for session group execution.
 *
 * @example Example data
 * ```json
 * {
 *   "maxConcurrent": 3,
 *   "respectDependencies": true,
 *   "pauseOnError": true,
 *   "errorThreshold": 2
 * }
 * ```
 */
export interface ConcurrencyConfig {
  /** Maximum number of concurrent sessions */
  readonly maxConcurrent: number;
  /** Whether to respect session dependencies */
  readonly respectDependencies: boolean;
  /** Whether to pause on session error */
  readonly pauseOnError: boolean;
  /** Number of failures before pausing group */
  readonly errorThreshold: number;
}

/**
 * Per-session configuration overrides.
 */
export interface SessionConfig {
  /** Whether to generate CLAUDE.md from template */
  readonly generateClaudeMd: boolean;
  /** Whether to generate settings.json */
  readonly generateSettings: boolean;
  /** Template name or path for CLAUDE.md */
  readonly claudeMdTemplate?: string | undefined;
  /** Partial settings.json overrides */
  readonly settingsOverride?: Record<string, unknown> | undefined;
}

/**
 * Session group configuration.
 */
export interface GroupConfig {
  /** Model to use (e.g., "opus", "sonnet") */
  readonly model: string;
  /** Maximum budget in USD */
  readonly maxBudgetUsd: number;
  /** Maximum concurrent sessions */
  readonly maxConcurrentSessions: number;
  /** Action when budget exceeded */
  readonly onBudgetExceeded: "stop" | "warn" | "pause";
  /** Budget warning threshold (0-1) */
  readonly warningThreshold: number;
  /** Concurrency settings */
  readonly concurrency?: ConcurrencyConfig | undefined;
  /** Default session configuration */
  readonly sessionDefaults?: SessionConfig | undefined;
}

/**
 * Session within a session group.
 *
 * @example Pending session (not yet started)
 * ```json
 * {
 *   "id": "001-auth-service",
 *   "projectPath": "/home/user/projects/auth-service",
 *   "prompt": "Implement JWT token validation",
 *   "status": "pending",
 *   "dependsOn": [],
 *   "createdAt": "2026-01-10T10:00:00.000Z"
 * }
 * ```
 *
 * @example Running session with dependencies
 * ```json
 * {
 *   "id": "002-api-gateway",
 *   "projectPath": "/home/user/projects/api-gateway",
 *   "prompt": "Integrate auth service for request validation",
 *   "status": "active",
 *   "dependsOn": ["001-auth-service"],
 *   "claudeSessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "createdAt": "2026-01-10T10:00:00.000Z",
 *   "startedAt": "2026-01-10T10:15:00.000Z",
 *   "tokens": {
 *     "input": 1500,
 *     "output": 4200,
 *     "cacheRead": 50000
 *   },
 *   "cost": 0.0325
 * }
 * ```
 *
 * @example Completed session
 * ```json
 * {
 *   "id": "001-auth-service",
 *   "projectPath": "/home/user/projects/auth-service",
 *   "prompt": "Implement JWT token validation",
 *   "status": "completed",
 *   "dependsOn": [],
 *   "claudeSessionId": "abc12345-def6-7890-ghij-klmnopqrstuv",
 *   "createdAt": "2026-01-10T10:00:00.000Z",
 *   "startedAt": "2026-01-10T10:00:30.000Z",
 *   "completedAt": "2026-01-10T10:12:45.000Z",
 *   "tokens": {
 *     "input": 2800,
 *     "output": 8500,
 *     "cacheRead": 120000,
 *     "cacheWrite": 45000
 *   },
 *   "cost": 0.0892
 * }
 * ```
 */
export interface GroupSession {
  /** Unique session identifier (e.g., "001-uuid-session1") */
  readonly id: string;
  /** Project directory path */
  readonly projectPath: string;
  /** Prompt to execute */
  readonly prompt: string;
  /** Current session status */
  readonly status: SessionStatus;
  /** Session IDs this session depends on */
  readonly dependsOn: readonly string[];
  /** Optional template for configuration */
  readonly template?: string | undefined;
  /** Claude Code session ID (once started) */
  readonly claudeSessionId?: string | undefined;
  /** ISO timestamp when created */
  readonly createdAt: string;
  /** ISO timestamp when started */
  readonly startedAt?: string | undefined;
  /** ISO timestamp when completed */
  readonly completedAt?: string | undefined;
  /** Total cost in USD */
  readonly cost?: number | undefined;
  /** Token usage */
  readonly tokens?: TokenUsage | undefined;
  /** Per-session configuration overrides */
  readonly config?: SessionConfig | undefined;
}

/**
 * Session Group data model.
 *
 * Represents a collection of related sessions that can span multiple projects,
 * execute concurrently, and share configuration.
 *
 * @example Complete SessionGroup
 * ```json
 * {
 *   "id": "20260110-100000-auth-refactor",
 *   "name": "Authentication System Refactor",
 *   "slug": "auth-refactor",
 *   "description": "Refactor auth across all microservices",
 *   "status": "running",
 *   "sessions": [
 *     {
 *       "id": "001-auth-service",
 *       "projectPath": "/home/user/projects/auth-service",
 *       "prompt": "Implement JWT token validation",
 *       "status": "completed",
 *       "dependsOn": [],
 *       "claudeSessionId": "abc12345-def6-7890-ghij-klmnopqrstuv",
 *       "createdAt": "2026-01-10T10:00:00.000Z",
 *       "startedAt": "2026-01-10T10:00:30.000Z",
 *       "completedAt": "2026-01-10T10:12:45.000Z",
 *       "cost": 0.0892
 *     },
 *     {
 *       "id": "002-api-gateway",
 *       "projectPath": "/home/user/projects/api-gateway",
 *       "prompt": "Integrate auth service",
 *       "status": "active",
 *       "dependsOn": ["001-auth-service"],
 *       "claudeSessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *       "createdAt": "2026-01-10T10:00:00.000Z",
 *       "startedAt": "2026-01-10T10:13:00.000Z",
 *       "cost": 0.0325
 *     },
 *     {
 *       "id": "003-user-service",
 *       "projectPath": "/home/user/projects/user-service",
 *       "prompt": "Update user endpoints with new auth",
 *       "status": "pending",
 *       "dependsOn": ["001-auth-service"],
 *       "createdAt": "2026-01-10T10:00:00.000Z"
 *     }
 *   ],
 *   "config": {
 *     "model": "sonnet",
 *     "maxBudgetUsd": 25.0,
 *     "maxConcurrentSessions": 3,
 *     "onBudgetExceeded": "pause",
 *     "warningThreshold": 0.8
 *   },
 *   "createdAt": "2026-01-10T10:00:00.000Z",
 *   "updatedAt": "2026-01-10T10:15:30.000Z",
 *   "startedAt": "2026-01-10T10:00:30.000Z"
 * }
 * ```
 */
export interface SessionGroup {
  /** Unique identifier (e.g., "20260104-143022-cross-project-refactor") */
  readonly id: string;
  /** User-friendly group name */
  readonly name: string;
  /** URL-safe slug */
  readonly slug: string;
  /** Optional description */
  readonly description?: string | undefined;
  /** Current group status */
  readonly status: GroupStatus;
  /** Sessions in this group */
  readonly sessions: readonly GroupSession[];
  /** Group configuration */
  readonly config: GroupConfig;
  /** ISO timestamp when created */
  readonly createdAt: string;
  /** ISO timestamp when last updated */
  readonly updatedAt: string;
  /** ISO timestamp when started */
  readonly startedAt?: string | undefined;
  /** ISO timestamp when completed */
  readonly completedAt?: string | undefined;
}

/**
 * Check if a group status is terminal (completed, failed, deleted).
 */
export function isTerminalGroupStatus(status: GroupStatus): boolean {
  return status === "completed" || status === "failed" || status === "deleted";
}

/**
 * Check if a group can be resumed.
 */
export function canResumeGroup(status: GroupStatus): boolean {
  return status === "paused";
}

/**
 * Check if a group is currently active.
 */
export function isActiveGroup(status: GroupStatus): boolean {
  return status === "running";
}

/**
 * Default budget configuration.
 */
export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  maxBudgetUsd: 10.0,
  onBudgetExceeded: "pause",
  warningThreshold: 0.8,
} as const;

/**
 * Default concurrency configuration.
 */
export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrent: 3,
  respectDependencies: true,
  pauseOnError: true,
  errorThreshold: 2,
} as const;

/**
 * Default session configuration.
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  generateClaudeMd: true,
  generateSettings: false,
} as const;

/**
 * Default group configuration.
 */
export const DEFAULT_GROUP_CONFIG: GroupConfig = {
  model: "sonnet",
  maxBudgetUsd: DEFAULT_BUDGET_CONFIG.maxBudgetUsd,
  maxConcurrentSessions: DEFAULT_CONCURRENCY_CONFIG.maxConcurrent,
  onBudgetExceeded: DEFAULT_BUDGET_CONFIG.onBudgetExceeded,
  warningThreshold: DEFAULT_BUDGET_CONFIG.warningThreshold,
} as const;
