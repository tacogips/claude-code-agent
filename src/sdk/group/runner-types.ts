/**
 * Types for Group Runner.
 *
 * @module sdk/group/runner-types
 */

import type { GroupSession } from "./types";
import type { ManagedProcess } from "../../interfaces/process-manager";

/**
 * Options for running a session group.
 */
export interface RunOptions {
  /** Override max concurrent sessions (uses group config if not specified) */
  readonly maxConcurrent?: number | undefined;
  /** Whether to respect session dependencies (default: true) */
  readonly respectDependencies?: boolean | undefined;
  /** Whether to pause on session error (default: true) */
  readonly pauseOnError?: boolean | undefined;
  /** Number of failures before pausing group (default: 2) */
  readonly errorThreshold?: number | undefined;
  /** Resume from paused state (uses --resume flag for sessions) */
  readonly resume?: boolean | undefined;
}

/**
 * State of a running worker.
 */
export interface WorkerState {
  /** Session being executed */
  readonly session: GroupSession;
  /** Process handle */
  readonly process: ManagedProcess;
  /** Start timestamp */
  readonly startedAt: number;
}

/**
 * Pause reasons for the group runner.
 */
export type PauseReason = "manual" | "budget_exceeded" | "error_threshold";

/**
 * Group execution state.
 */
export type RunnerState =
  | "idle"
  | "running"
  | "paused"
  | "stopped"
  | "completed";
