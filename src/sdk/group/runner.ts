/**
 * Session Group Runner for executing Session Groups with worker pool.
 *
 * Provides concurrent execution of sessions within a group, respecting
 * dependencies and concurrency limits. Uses a worker pool pattern for
 * efficient resource utilization.
 *
 * @module sdk/group/runner
 */

import type { Container } from "../../container";
import type { ManagedProcess } from "../../interfaces/process-manager";
import type {
  GroupRepository,
  GroupSession,
} from "../../repository/group-repository";
import { createTaggedLogger } from "../../logger";
import type { EventEmitter } from "../events/emitter";
import { DependencyGraph } from "./dependency-graph";
import { ConfigGenerator } from "./config-generator";
import type { SessionGroup } from "./types";
import {
  ProgressAggregator,
  createSessionProgress,
  calculateBudgetUsage,
  isBudgetWarning,
  isBudgetExceeded,
  type GroupProgress,
} from "./progress";

const logger = createTaggedLogger("group-runner");

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
interface WorkerState {
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

/**
 * Group Runner for executing Session Groups.
 *
 * Manages concurrent execution of sessions with dependency ordering,
 * budget enforcement, and progress tracking.
 *
 * @example
 * ```typescript
 * const runner = new GroupRunner(container, repository, emitter);
 *
 * // Run a group
 * await runner.run(group, { maxConcurrent: 3 });
 *
 * // Pause execution
 * await runner.pause("manual");
 *
 * // Resume execution
 * await runner.resume();
 *
 * // Get current progress
 * const progress = runner.getProgress();
 * ```
 */
export class GroupRunner {
  private readonly container: Container;
  private readonly repository: GroupRepository;
  private readonly eventEmitter: EventEmitter;
  private readonly configGenerator: ConfigGenerator;

  /** Current runner state */
  private state: RunnerState = "idle";

  /** Group being executed */
  private currentGroup: SessionGroup | null = null;

  /** Run options - required and non-undefined after initialization */
  private currentOptions: {
    maxConcurrent: number;
    respectDependencies: boolean;
    pauseOnError: boolean;
    errorThreshold: number;
    resume: boolean;
  } = {
    maxConcurrent: 3,
    respectDependencies: true,
    pauseOnError: true,
    errorThreshold: 2,
    resume: false,
  };

  /** Active workers */
  private readonly workers: Map<string, WorkerState> = new Map();

  /** Dependency graph for execution ordering */
  private dependencyGraph: DependencyGraph | null = null;

  /** Progress aggregator */
  private progressAggregator: ProgressAggregator | null = null;

  /** Failure count for error threshold */
  private failureCount = 0;

  /** Budget warning emitted flag */
  private budgetWarningEmitted = false;

  /** Pause reason (if paused) */
  private pauseReason: PauseReason | null = null;

  /** Interrupt signal for execution loop */
  private interruptSignal: (() => void) | null = null;

  constructor(
    container: Container,
    repository: GroupRepository,
    eventEmitter: EventEmitter,
  ) {
    this.container = container;
    this.repository = repository;
    this.eventEmitter = eventEmitter;
    this.configGenerator = new ConfigGenerator(container);
  }

  /**
   * Run a session group.
   *
   * Executes all sessions in the group, respecting dependencies and
   * concurrency limits. Returns when all sessions complete or the
   * group is paused/stopped.
   *
   * @param group - Session group to execute
   * @param options - Run options
   */
  async run(group: SessionGroup, options?: RunOptions): Promise<void> {
    if (this.state === "running") {
      throw new Error("Runner is already executing a group");
    }

    // Reset state
    this.currentGroup = group;
    this.state = "running";
    this.failureCount = 0;
    this.budgetWarningEmitted = false;
    this.pauseReason = null;
    this.workers.clear();

    // Merge options with defaults and group config
    this.currentOptions = {
      maxConcurrent:
        options?.maxConcurrent ??
        group.config.concurrency?.maxConcurrent ??
        group.config.maxConcurrentSessions ??
        3,
      respectDependencies:
        options?.respectDependencies ??
        group.config.concurrency?.respectDependencies ??
        true,
      pauseOnError:
        options?.pauseOnError ?? group.config.concurrency?.pauseOnError ?? true,
      errorThreshold:
        options?.errorThreshold ??
        group.config.concurrency?.errorThreshold ??
        2,
      resume: options?.resume ?? false,
    };

    // Build dependency graph
    this.dependencyGraph = new DependencyGraph(group.sessions);

    // Initialize progress aggregator
    const startTime = this.container.clock.now().getTime();
    this.progressAggregator = new ProgressAggregator(startTime);

    // Initialize session progress
    for (const session of group.sessions) {
      this.progressAggregator.updateSession(createSessionProgress(session));
    }

    // Update group status to running
    await this.updateGroupStatus("running", {
      startedAt: this.container.clock.now().toISOString(),
    });

    // Emit group started event
    const timestamp = this.container.clock.now().toISOString();
    this.eventEmitter.emit("group_started", {
      type: "group_started",
      timestamp,
      groupId: group.id,
      totalSessions: group.sessions.length,
      maxConcurrent: this.currentOptions.maxConcurrent,
    });

    logger.info(`Started group ${group.id}`, {
      sessions: group.sessions.length,
      maxConcurrent: this.currentOptions.maxConcurrent,
    });

    // Execute sessions
    await this.executeLoop();
  }

  /**
   * Pause the running group.
   *
   * Sends SIGTERM to all running sessions and blocks pending sessions.
   *
   * @param reason - Reason for pausing
   */
  async pause(reason: PauseReason = "manual"): Promise<void> {
    if (this.state !== "running") {
      throw new Error("Cannot pause: runner is not running");
    }

    this.state = "paused";
    this.pauseReason = reason;

    logger.info(`Pausing group ${this.currentGroup?.id}`, { reason });

    // Trigger interrupt signal to break out of waitForCompletion
    if (this.interruptSignal !== null) {
      this.interruptSignal();
    }

    // Send SIGTERM to all running workers
    const killPromises: Promise<void>[] = [];
    const workerSessionIds = Array.from(this.workers.keys());
    for (const [sessionId, worker] of this.workers) {
      logger.debug(`Sending SIGTERM to session ${sessionId}`);
      worker.process.kill("SIGTERM");
      killPromises.push(
        worker.process.exitCode.then(() => {
          logger.debug(`Session ${sessionId} terminated`);
        }),
      );
    }

    // Wait for all processes to terminate
    await Promise.all(killPromises);

    // Update running sessions to paused status
    for (const sessionId of workerSessionIds) {
      await this.updateSessionStatus(sessionId, "paused");
    }

    this.workers.clear();

    // Update group status
    await this.updateGroupStatus("paused");

    // Emit paused event
    const timestamp = this.container.clock.now().toISOString();
    this.eventEmitter.emit("group_paused", {
      type: "group_paused",
      timestamp,
      groupId: this.currentGroup!.id,
      runningSessions: 0,
      reason,
    });
  }

  /**
   * Resume a paused group.
   *
   * Restarts paused sessions with --resume flag and continues
   * executing pending sessions.
   */
  async resume(): Promise<void> {
    if (this.state !== "paused") {
      throw new Error("Cannot resume: runner is not paused");
    }

    if (this.currentGroup === null || this.dependencyGraph === null) {
      throw new Error("Cannot resume: no group loaded");
    }

    this.state = "running";
    this.currentOptions = { ...this.currentOptions, resume: true };
    this.pauseReason = null;

    // Update group status to running
    await this.updateGroupStatus("running");

    // Emit resumed event
    const timestamp = this.container.clock.now().toISOString();
    const pendingSessions = this.dependencyGraph.getRemainingCount();
    this.eventEmitter.emit("group_resumed", {
      type: "group_resumed",
      timestamp,
      groupId: this.currentGroup.id,
      pendingSessions,
    });

    logger.info(`Resumed group ${this.currentGroup.id}`, { pendingSessions });

    // Continue execution
    await this.executeLoop();
  }

  /**
   * Stop the running group.
   *
   * Terminates all running sessions and marks the group as failed.
   * Unlike pause, stopped groups cannot be resumed.
   */
  async stop(): Promise<void> {
    if (this.state !== "running" && this.state !== "paused") {
      throw new Error("Cannot stop: runner is not running or paused");
    }

    this.state = "stopped";

    logger.info(`Stopping group ${this.currentGroup?.id}`);

    // Trigger interrupt signal to break out of waitForCompletion
    if (this.interruptSignal !== null) {
      this.interruptSignal();
    }

    // Kill all running workers
    const workerSessionIds = Array.from(this.workers.keys());
    for (const [sessionId, worker] of this.workers) {
      logger.debug(`Killing session ${sessionId}`);
      worker.process.kill("SIGKILL");
    }

    // Wait for processes to exit
    const exitPromises = Array.from(this.workers.values()).map(
      (w) => w.process.exitCode,
    );
    await Promise.all(exitPromises);

    // Mark running sessions as failed
    for (const sessionId of workerSessionIds) {
      await this.updateSessionStatus(sessionId, "failed");
    }

    this.workers.clear();

    // Update group status to failed
    await this.updateGroupStatus("failed", {
      completedAt: this.container.clock.now().toISOString(),
    });

    // Emit failed event
    const timestamp = this.container.clock.now().toISOString();
    const failedSessions =
      this.currentGroup?.sessions.filter((s) => s.status === "failed").length ??
      0;
    this.eventEmitter.emit("group_failed", {
      type: "group_failed",
      timestamp,
      groupId: this.currentGroup!.id,
      failedSessions,
      reason: "Manually stopped",
    });
  }

  /**
   * Get current execution progress.
   *
   * @returns Current group progress or null if not running
   */
  getProgress(): GroupProgress | null {
    if (this.currentGroup === null || this.progressAggregator === null) {
      return null;
    }

    return this.progressAggregator.computeProgress(this.currentGroup);
  }

  /**
   * Get current runner state.
   */
  getState(): RunnerState {
    return this.state;
  }

  /**
   * Get pause reason (if paused).
   */
  getPauseReason(): PauseReason | null {
    return this.pauseReason;
  }

  /**
   * Main execution loop.
   *
   * Continuously schedules ready sessions until all complete,
   * the group is paused, or an error threshold is reached.
   */
  private async executeLoop(): Promise<void> {
    while (this.state === "running") {
      // Check budget
      if (this.checkBudget()) {
        break;
      }

      // Check if state changed (pause/stop might have been called)
      if (this.state !== "running") {
        break;
      }

      // Get ready sessions
      const readySessions =
        this.dependencyGraph !== null
          ? this.dependencyGraph.getReadySessions()
          : [];

      // If no ready sessions and no running workers, we're done
      if (readySessions.length === 0 && this.workers.size === 0) {
        await this.completeGroup();
        break;
      }

      // Schedule ready sessions up to max concurrent
      for (const session of readySessions) {
        if (this.workers.size >= this.currentOptions.maxConcurrent) {
          break;
        }

        if (this.state !== "running") {
          break;
        }

        // Start the session
        await this.startSession(session);

        // Check state again after starting
        if (this.state !== "running") {
          break;
        }
      }

      // Check state before waiting
      if (this.state !== "running") {
        break;
      }

      // Wait for any worker to complete
      if (this.workers.size > 0) {
        await this.waitForCompletion();
      } else if (readySessions.length === 0 && this.dependencyGraph !== null) {
        // No ready sessions and no workers - might be blocked by failed dependencies
        const blocked = this.dependencyGraph.getBlockedSessions();
        if (blocked.length > 0) {
          // All remaining sessions are blocked by failed dependencies
          logger.warn(
            `Group ${this.currentGroup?.id} has blocked sessions due to failed dependencies`,
          );
          await this.failGroup("Blocked sessions due to failed dependencies");
          break;
        }
      }
    }
  }

  /**
   * Start a session execution.
   */
  private async startSession(session: GroupSession): Promise<void> {
    logger.info(`Starting session ${session.id}`, {
      projectPath: session.projectPath,
    });

    // Generate session configuration
    const configResult = await this.configGenerator.generateSessionConfig(
      session,
      this.currentGroup!,
    );

    if (configResult.isErr()) {
      logger.error(`Failed to generate config for session ${session.id}`, {
        error: configResult.error,
      });
      await this.handleSessionFailure(
        session.id,
        "Configuration generation failed",
      );
      return;
    }

    // Build Claude Code command
    // TODO: [Future Enhancement] Process Pool per Working Directory
    // See src/sdk/queue/runner.ts for detailed description of the planned enhancement.
    // Summary: Reuse long-lived processes via /clear instead of spawning new processes.
    const args = ["-p", "--output-format", "stream-json"];
    if (this.currentOptions.resume) {
      args.push("--resume");
    }
    args.push(session.prompt);

    // Set up environment with config directory
    const env: Record<string, string> = {
      CLAUDE_CONFIG_DIR: configResult.value.configDir,
    };

    // Spawn Claude Code process
    const process = this.container.processManager.spawn("claude", args, {
      cwd: session.projectPath,
      env,
    });

    // Track the worker
    const workerState: WorkerState = {
      session,
      process,
      startedAt: this.container.clock.now().getTime(),
    };
    this.workers.set(session.id, workerState);

    // Update session status to active
    const timestamp = this.container.clock.now().toISOString();
    await this.updateSessionStatus(session.id, "active", {
      startedAt: timestamp,
    });

    // Emit session started event
    this.eventEmitter.emit("group_session_started", {
      type: "group_session_started",
      timestamp,
      groupId: this.currentGroup!.id,
      sessionId: session.id,
      projectPath: session.projectPath,
      prompt: session.prompt,
    });

    // Start output processing (non-blocking)
    this.processSessionOutput(session.id, process);
  }

  /**
   * Process session output streams.
   */
  private async processSessionOutput(
    sessionId: string,
    process: ManagedProcess,
  ): Promise<void> {
    // Process stdout for progress updates
    // In a real implementation, we'd parse the JSON output
    // to extract cost, token usage, and tool activity
    try {
      for await (const _line of process.stdout) {
        // Parse JSON output for progress updates
        // This is simplified - real implementation would parse
        // the stream-json output format
      }
    } catch (error) {
      logger.debug(`stdout closed for session ${sessionId}`);
    }

    // Process stderr for errors
    try {
      for await (const line of process.stderr) {
        logger.warn(`Session ${sessionId} stderr: ${line}`);
      }
    } catch (error) {
      logger.debug(`stderr closed for session ${sessionId}`);
    }
  }

  /**
   * Wait for any worker to complete or for an interrupt signal.
   */
  private async waitForCompletion(): Promise<void> {
    if (this.workers.size === 0) {
      return;
    }

    // Create a promise that resolves when any worker completes
    const completionPromises = Array.from(this.workers.entries()).map(
      async ([sessionId, worker]) => {
        const exitCode = await worker.process.exitCode;
        return { sessionId, worker, exitCode, interrupted: false as const };
      },
    );

    // Create an interrupt promise that resolves when interrupted
    const interruptPromise = new Promise<{ interrupted: true }>((resolve) => {
      this.interruptSignal = () => {
        resolve({ interrupted: true });
      };
    });

    // Wait for the first completion or interrupt
    const result = await Promise.race([
      ...completionPromises,
      interruptPromise,
    ]);

    // Clear interrupt signal
    this.interruptSignal = null;

    // If interrupted, don't process the completion
    if (result.interrupted === true) {
      return;
    }

    await this.handleSessionCompletion(result);
  }

  /**
   * Handle session completion.
   */
  private async handleSessionCompletion(result: {
    sessionId: string;
    worker: WorkerState;
    exitCode: number | null;
    interrupted: false;
  }): Promise<void> {
    const { sessionId, worker, exitCode } = result;
    const durationMs = this.container.clock.now().getTime() - worker.startedAt;

    // Remove from workers
    this.workers.delete(sessionId);

    const timestamp = this.container.clock.now().toISOString();
    const success = exitCode === 0;

    if (success) {
      // Mark as completed in dependency graph
      if (this.dependencyGraph !== null) {
        this.dependencyGraph.markCompleted(sessionId);
      }

      // Update session status
      await this.updateSessionStatus(sessionId, "completed", {
        completedAt: timestamp,
      });

      // Emit completion event
      if (this.currentGroup !== null) {
        this.eventEmitter.emit("group_session_completed", {
          type: "group_session_completed",
          timestamp,
          groupId: this.currentGroup.id,
          sessionId,
          status: "completed",
          durationMs,
        });
      }

      logger.info(`Session ${sessionId} completed`, { durationMs });

      // Emit dependency resolved events
      await this.emitDependencyResolved(sessionId);
    } else {
      await this.handleSessionFailure(
        sessionId,
        `Process exited with code ${exitCode}`,
        durationMs,
      );
    }

    // Update group progress event
    this.emitGroupProgress();
  }

  /**
   * Handle session failure.
   */
  private async handleSessionFailure(
    sessionId: string,
    error: string,
    _durationMs?: number,
  ): Promise<void> {
    const timestamp = this.container.clock.now().toISOString();

    // Mark as failed in dependency graph
    if (this.dependencyGraph !== null) {
      this.dependencyGraph.markFailed(sessionId);
    }

    // Update session status
    await this.updateSessionStatus(sessionId, "failed", {
      completedAt: timestamp,
    });

    // Emit failure event
    if (this.currentGroup !== null) {
      this.eventEmitter.emit("group_session_failed", {
        type: "group_session_failed",
        timestamp,
        groupId: this.currentGroup.id,
        sessionId,
        error,
      });
    }

    logger.error(`Session ${sessionId} failed`, { error });

    // Increment failure count
    this.failureCount++;

    // Check error threshold
    if (
      this.currentOptions.pauseOnError &&
      this.failureCount >= this.currentOptions.errorThreshold
    ) {
      logger.warn(
        `Error threshold reached (${this.failureCount}/${this.currentOptions.errorThreshold})`,
      );
      await this.pause("error_threshold");
    }
  }

  /**
   * Check budget and handle exceeded state.
   *
   * @returns True if budget exceeded and group should stop
   */
  private checkBudget(): boolean {
    if (this.currentGroup === null || this.progressAggregator === null) {
      return false;
    }

    const progress = this.progressAggregator.computeProgress(this.currentGroup);
    const config = this.currentGroup.config;
    const currentCost = progress.totalCost;
    const maxBudget = config.maxBudgetUsd;

    // Check warning threshold
    if (
      !this.budgetWarningEmitted &&
      isBudgetWarning(currentCost, maxBudget, config.warningThreshold)
    ) {
      this.budgetWarningEmitted = true;
      const timestamp = this.container.clock.now().toISOString();
      const percentUsed = calculateBudgetUsage(currentCost, maxBudget);

      this.eventEmitter.emit("budget_warning", {
        type: "budget_warning",
        timestamp,
        groupId: this.currentGroup.id,
        currentUsage: currentCost,
        limit: maxBudget,
        percentUsed,
      });

      logger.warn(`Budget warning: ${percentUsed.toFixed(1)}% used`, {
        currentCost,
        maxBudget,
      });
    }

    // Check if exceeded
    if (isBudgetExceeded(currentCost, maxBudget)) {
      const timestamp = this.container.clock.now().toISOString();

      this.eventEmitter.emit("budget_exceeded", {
        type: "budget_exceeded",
        timestamp,
        groupId: this.currentGroup.id,
        usage: currentCost,
        limit: maxBudget,
        action: config.onBudgetExceeded,
      });

      logger.warn(`Budget exceeded`, { currentCost, maxBudget });

      switch (config.onBudgetExceeded) {
        case "stop":
          // Stop immediately
          void this.stop();
          return true;
        case "pause":
          // Pause the group
          void this.pause("budget_exceeded");
          return true;
        case "warn":
          // Just warn, continue execution
          return false;
      }
    }

    return false;
  }

  /**
   * Complete the group successfully.
   */
  private async completeGroup(): Promise<void> {
    this.state = "completed";

    const timestamp = this.container.clock.now().toISOString();
    const progress = this.progressAggregator!.computeProgress(
      this.currentGroup!,
    );

    // Update group status
    await this.updateGroupStatus("completed", {
      completedAt: timestamp,
    });

    // Emit completion event
    this.eventEmitter.emit("group_completed", {
      type: "group_completed",
      timestamp,
      groupId: this.currentGroup!.id,
      completedSessions: progress.completed,
      failedSessions: progress.failed,
      totalCostUsd: progress.totalCost,
      elapsedMs: progress.elapsedTime ?? 0,
    });

    logger.info(`Group ${this.currentGroup!.id} completed`, {
      completed: progress.completed,
      failed: progress.failed,
      totalCost: progress.totalCost,
    });
  }

  /**
   * Fail the group.
   */
  private async failGroup(reason: string): Promise<void> {
    this.state = "stopped";

    const timestamp = this.container.clock.now().toISOString();
    const failedSessions =
      this.currentGroup?.sessions.filter((s) => s.status === "failed").length ??
      0;

    // Update group status
    await this.updateGroupStatus("failed", {
      completedAt: timestamp,
    });

    // Emit failure event
    this.eventEmitter.emit("group_failed", {
      type: "group_failed",
      timestamp,
      groupId: this.currentGroup!.id,
      failedSessions,
      reason,
    });

    logger.error(`Group ${this.currentGroup!.id} failed`, { reason });
  }

  /**
   * Update group status in repository.
   */
  private async updateGroupStatus(
    status: SessionGroup["status"],
    updates?: Partial<SessionGroup>,
  ): Promise<void> {
    if (this.currentGroup === null) {
      return;
    }

    const timestamp = this.container.clock.now().toISOString();
    const updated: SessionGroup = {
      ...this.currentGroup,
      ...updates,
      status,
      updatedAt: timestamp,
    };

    await this.repository.save(updated);
    this.currentGroup = updated;
  }

  /**
   * Update session status in repository.
   */
  private async updateSessionStatus(
    sessionId: string,
    status: GroupSession["status"],
    updates?: Partial<GroupSession>,
  ): Promise<void> {
    if (this.currentGroup === null) {
      return;
    }

    await this.repository.updateSession(this.currentGroup.id, sessionId, {
      ...updates,
      status,
    });

    // Update local copy
    const sessionIndex = this.currentGroup.sessions.findIndex(
      (s) => s.id === sessionId,
    );
    if (sessionIndex !== -1) {
      const sessions = [...this.currentGroup.sessions];
      const existingSession = sessions[sessionIndex];
      if (existingSession !== undefined) {
        sessions[sessionIndex] = {
          ...existingSession,
          ...updates,
          id: existingSession.id, // Ensure id is preserved
          status,
        };
        this.currentGroup = {
          ...this.currentGroup,
          sessions,
        };
      }
    }

    // Update progress aggregator
    if (this.progressAggregator !== null) {
      const session = this.currentGroup.sessions.find(
        (s) => s.id === sessionId,
      );
      if (session !== undefined) {
        this.progressAggregator.updateSession(createSessionProgress(session));
      }
    }
  }

  /**
   * Emit dependency resolved events for sessions unblocked by completion.
   */
  private async emitDependencyResolved(
    completedSessionId: string,
  ): Promise<void> {
    if (this.currentGroup === null || this.dependencyGraph === null) {
      return;
    }

    const timestamp = this.container.clock.now().toISOString();

    // Find sessions that were waiting on this one
    for (const session of this.currentGroup.sessions) {
      if (session.dependsOn.includes(completedSessionId)) {
        // Check if all dependencies are now resolved
        const allResolved = session.dependsOn.every(
          (depId) =>
            this.dependencyGraph!.getCompleted().has(depId) ||
            this.dependencyGraph!.getFailed().has(depId),
        );

        if (allResolved) {
          this.eventEmitter.emit("dependency_resolved", {
            type: "dependency_resolved",
            timestamp,
            groupId: this.currentGroup.id,
            sessionId: session.id,
            resolvedDependencies: session.dependsOn,
          });
        }
      }
    }
  }

  /**
   * Emit group progress event.
   */
  private emitGroupProgress(): void {
    if (this.currentGroup === null || this.progressAggregator === null) {
      return;
    }

    const progress = this.progressAggregator.computeProgress(this.currentGroup);
    const timestamp = this.container.clock.now().toISOString();

    this.eventEmitter.emit("group_progress", {
      type: "group_progress",
      timestamp,
      groupId: this.currentGroup.id,
      completed: progress.completed,
      running: progress.running,
      pending: progress.pending,
      failed: progress.failed,
      totalCostUsd: progress.totalCost,
    });
  }
}
