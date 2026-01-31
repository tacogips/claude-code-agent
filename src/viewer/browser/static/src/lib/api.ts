/**
 * API client for browser viewer.
 *
 * Provides type-safe access to REST API endpoints.
 *
 * @module lib/api
 */

/**
 * Session metadata from list endpoint.
 */
export interface SessionMetadata {
  readonly id: string;
  readonly projectPath: string;
  readonly status: "pending" | "active" | "paused" | "completed" | "failed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messageCount: number;
  readonly tokenUsage?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  readonly costUsd?: number;
}

/**
 * Full session object with messages.
 */
export interface Session {
  readonly id: string;
  readonly projectPath: string;
  readonly status: "pending" | "active" | "paused" | "completed" | "failed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: readonly Message[];
  readonly tasks: readonly Task[];
  readonly tokenUsage?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  readonly costUsd?: number;
}

/**
 * Message in a session.
 */
export interface Message {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly timestamp: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolResults?: readonly ToolResult[];
}

/**
 * Tool call within a message.
 */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
}

/**
 * Tool execution result.
 */
export interface ToolResult {
  readonly id: string;
  readonly output: string;
  readonly isError: boolean;
}

/**
 * Task tracked via TodoWrite.
 */
export interface Task {
  readonly id: string;
  readonly description: string;
  readonly status: "pending" | "in_progress" | "completed" | "cancelled";
  readonly createdAt: string;
  readonly updatedAt?: string;
}

/**
 * Command queue.
 */
export interface CommandQueue {
  readonly id: string;
  readonly name: string;
  readonly projectPath: string;
  readonly status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "stopped";
  readonly commands: readonly QueueCommand[];
  readonly currentIndex: number;
  readonly currentSessionId?: string;
  readonly totalCostUsd: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
}

/**
 * Command within a queue.
 */
export interface QueueCommand {
  readonly id: string;
  readonly prompt: string;
  readonly sessionMode: "continue" | "new";
  readonly status: "pending" | "running" | "completed" | "failed" | "skipped";
  readonly sessionId?: string;
  readonly costUsd?: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly error?: string;
}

/**
 * API error response.
 */
export interface ApiError {
  readonly error: string;
  readonly message: string;
}

/**
 * Base URL for API endpoints.
 * Uses relative paths to work with SvelteKit proxy.
 */
const BASE_URL = "";

/**
 * Generic fetch wrapper with error handling.
 *
 * @param url - Endpoint URL
 * @returns Parsed JSON response
 * @throws Error on HTTP errors or network failures
 */
async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${url}`);

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(`${errorData.error}: ${errorData.message}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`API request failed: ${String(error)}`);
  }
}

/**
 * Type-safe API client for REST endpoints.
 */
const api = {
  sessions: {
    /**
     * List all sessions.
     *
     * @returns Array of session metadata
     */
    async list(): Promise<SessionMetadata[]> {
      const response = await fetchJson<{ sessions: SessionMetadata[] }>(
        "/api/sessions",
      );
      return response.sessions;
    },

    /**
     * Get a single session with full details.
     *
     * @param id - Session ID
     * @returns Full session object
     */
    async get(id: string): Promise<Session> {
      const response = await fetchJson<{ session: Session }>(
        `/api/sessions/${id}`,
      );
      return response.session;
    },

    /**
     * Get messages for a session.
     *
     * @param id - Session ID
     * @returns Array of messages
     */
    async getMessages(id: string): Promise<Message[]> {
      const response = await fetchJson<{ messages: Message[] }>(
        `/api/sessions/${id}/messages`,
      );
      return response.messages;
    },
  },

  projects: {
    /**
     * List all projects.
     *
     * @returns Array of project paths
     */
    async list(): Promise<string[]> {
      const response = await fetchJson<{ projects: string[] }>("/api/projects");
      return response.projects;
    },
  },

  queues: {
    /**
     * List all command queues.
     *
     * @returns Array of queues
     */
    async list(): Promise<CommandQueue[]> {
      const response = await fetchJson<{ queues: CommandQueue[] }>(
        "/api/queues",
      );
      return response.queues;
    },

    /**
     * Get a single queue with full details.
     *
     * @param id - Queue ID
     * @returns Queue object
     */
    async get(id: string): Promise<CommandQueue> {
      const response = await fetchJson<{ queue: CommandQueue }>(
        `/api/queues/${id}`,
      );
      return response.queue;
    },
  },
};

export default api;
