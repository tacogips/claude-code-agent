/**
 * Task types for Claude Code sessions.
 *
 * Tasks represent the work items that Claude is working on
 * during a session. They are tracked via the TodoWrite tool.
 *
 * @module types/task
 */

/**
 * The status of a task in a session.
 */
export type TaskStatus = "pending" | "in_progress" | "completed";

/**
 * Represents a task tracked during a session.
 *
 * Tasks are created and updated via the TodoWrite tool
 * and provide visibility into Claude's work progress.
 */
export interface Task {
  /** Task content/description */
  readonly content: string;
  /** Current status of the task */
  readonly status: TaskStatus;
  /** Active form description (for in_progress display) */
  readonly activeForm: string;
}

/**
 * Progress summary for tasks in a session.
 */
export interface TaskProgress {
  /** Total number of tasks */
  readonly total: number;
  /** Number of completed tasks */
  readonly completed: number;
  /** Number of in-progress tasks */
  readonly inProgress: number;
  /** Number of pending tasks */
  readonly pending: number;
}

/**
 * Calculate progress from a list of tasks.
 *
 * @param tasks - Array of tasks to calculate progress for
 * @returns TaskProgress summary
 */
export function calculateTaskProgress(tasks: readonly Task[]): TaskProgress {
  let completed = 0;
  let inProgress = 0;
  let pending = 0;

  for (const task of tasks) {
    switch (task.status) {
      case "completed":
        completed++;
        break;
      case "in_progress":
        inProgress++;
        break;
      case "pending":
        pending++;
        break;
    }
  }

  return {
    total: tasks.length,
    completed,
    inProgress,
    pending,
  };
}
