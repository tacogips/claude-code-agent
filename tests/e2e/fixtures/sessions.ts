/**
 * Production-like session fixtures for E2E testing.
 *
 * These fixtures are modeled after actual ~/.claude JSONL data structure
 * to provide realistic test scenarios.
 *
 * @module tests/e2e/fixtures/sessions
 */

import type { Session, SessionMetadata } from "../../../src/types/session";
import type { Message, ToolCall } from "../../../src/types/message";
import type { Task } from "../../../src/types/task";

/**
 * Generate a unique session ID in UUID format.
 */
function generateSessionId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a unique message ID in UUID format.
 */
function generateMessageId(): string {
  return generateSessionId();
}

/**
 * Create a realistic user message.
 */
function createUserMessage(
  content: string,
  timestamp: string,
): Message {
  return {
    id: generateMessageId(),
    role: "user",
    content,
    timestamp,
  };
}

/**
 * Create a realistic assistant message with optional tool calls.
 */
function createAssistantMessage(
  content: string,
  timestamp: string,
  toolCalls?: ToolCall[],
): Message {
  return {
    id: generateMessageId(),
    role: "assistant",
    content,
    timestamp,
    toolCalls,
  };
}

/**
 * Create a tool call object.
 */
function createToolCall(
  name: string,
  input: Record<string, unknown>,
): ToolCall {
  return {
    id: `toolu_${generateMessageId().replace(/-/g, "").substring(0, 20)}`,
    name,
    input,
  };
}

// Fixture: Active session with ongoing work
export const activeSession: Session = {
  id: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
  projectPath: "/home/user/projects/my-typescript-app",
  status: "active",
  createdAt: "2026-01-12T10:00:00.000Z",
  updatedAt: "2026-01-12T10:15:00.000Z",
  messages: [
    createUserMessage(
      "Help me implement a new feature for user authentication",
      "2026-01-12T10:00:00.000Z",
    ),
    createAssistantMessage(
      "I will continue thinking and providing output in English. I acknowledge that I have read CLAUDE.md and will comply with its contents.\n\nI understand you are asking me to implement a user authentication feature. Let me start by exploring the codebase to understand the current structure.",
      "2026-01-12T10:00:30.000Z",
      [
        createToolCall("Glob", { pattern: "src/**/*.ts" }),
        createToolCall("Read", { file_path: "/home/user/projects/my-typescript-app/package.json" }),
      ],
    ),
    createUserMessage(
      "Yes, please proceed with JWT-based authentication",
      "2026-01-12T10:05:00.000Z",
    ),
    createAssistantMessage(
      "I'll implement JWT-based authentication. Let me create the authentication module with the following structure:\n\n1. Auth middleware for token verification\n2. Login and registration endpoints\n3. Token generation utilities\n\nLet me start by creating the auth types...",
      "2026-01-12T10:05:30.000Z",
      [
        createToolCall("Write", {
          file_path: "/home/user/projects/my-typescript-app/src/auth/types.ts",
          content: "export interface User { id: string; email: string; }",
        }),
      ],
    ),
  ],
  tasks: [
    {
      content: "Create authentication types",
      status: "completed",
      activeForm: "Creating authentication types",
    },
    {
      content: "Implement JWT utilities",
      status: "in_progress",
      activeForm: "Implementing JWT utilities",
    },
    {
      content: "Create auth middleware",
      status: "pending",
      activeForm: "Creating auth middleware",
    },
  ],
  tokenUsage: {
    input: 15420,
    output: 8234,
    cacheRead: 12000,
    cacheWrite: 5000,
  },
  costUsd: 0.1847,
};

// Fixture: Completed session
export const completedSession: Session = {
  id: "b2c3d4e5-f6a7-4890-bcde-f01234567890",
  projectPath: "/home/user/projects/api-service",
  status: "completed",
  createdAt: "2026-01-11T14:00:00.000Z",
  updatedAt: "2026-01-11T15:30:00.000Z",
  messages: [
    createUserMessage(
      "Fix the bug in the payment processing module",
      "2026-01-11T14:00:00.000Z",
    ),
    createAssistantMessage(
      "I will analyze the payment processing module to identify and fix the bug. Let me first read the relevant files.",
      "2026-01-11T14:00:30.000Z",
      [
        createToolCall("Read", { file_path: "/home/user/projects/api-service/src/payments/processor.ts" }),
        createToolCall("Grep", { pattern: "processPayment", path: "src/" }),
      ],
    ),
    createAssistantMessage(
      "I found the issue. The payment validation was not checking for expired cards. I've applied the fix:\n\n```typescript\nif (card.expiryDate < new Date()) {\n  throw new PaymentError('Card has expired');\n}\n```\n\nThe tests are now passing.",
      "2026-01-11T15:25:00.000Z",
    ),
  ],
  tasks: [
    {
      content: "Identify payment bug",
      status: "completed",
      activeForm: "Identifying payment bug",
    },
    {
      content: "Apply fix for expired card validation",
      status: "completed",
      activeForm: "Applying fix for expired card validation",
    },
    {
      content: "Run tests to verify fix",
      status: "completed",
      activeForm: "Running tests to verify fix",
    },
  ],
  tokenUsage: {
    input: 25000,
    output: 12000,
    cacheRead: 18000,
    cacheWrite: 8000,
  },
  costUsd: 0.3245,
};

// Fixture: Failed session
export const failedSession: Session = {
  id: "c3d4e5f6-a7b8-4901-cdef-012345678901",
  projectPath: "/home/user/projects/legacy-app",
  status: "failed",
  createdAt: "2026-01-10T09:00:00.000Z",
  updatedAt: "2026-01-10T09:15:00.000Z",
  messages: [
    createUserMessage(
      "Refactor the entire codebase to use TypeScript strict mode",
      "2026-01-10T09:00:00.000Z",
    ),
    createAssistantMessage(
      "I'll help you refactor the codebase to use TypeScript strict mode. This is a significant change that will require updating many files.",
      "2026-01-10T09:00:30.000Z",
      [
        createToolCall("Read", { file_path: "/home/user/projects/legacy-app/tsconfig.json" }),
      ],
    ),
    createAssistantMessage(
      "Error: The session was terminated due to memory constraints. The codebase is too large to process in a single session. Please consider breaking this task into smaller chunks.",
      "2026-01-10T09:15:00.000Z",
    ),
  ],
  tasks: [
    {
      content: "Analyze current TypeScript configuration",
      status: "completed",
      activeForm: "Analyzing current TypeScript configuration",
    },
    {
      content: "Enable strict mode in tsconfig",
      status: "in_progress",
      activeForm: "Enabling strict mode in tsconfig",
    },
  ],
  tokenUsage: {
    input: 50000,
    output: 2000,
  },
  costUsd: 0.0856,
};

// Fixture: Paused session
export const pausedSession: Session = {
  id: "d4e5f6a7-b8c9-4012-def0-123456789012",
  projectPath: "/home/user/projects/mobile-app",
  status: "paused",
  createdAt: "2026-01-12T08:00:00.000Z",
  updatedAt: "2026-01-12T08:30:00.000Z",
  messages: [
    createUserMessage(
      "Help me set up the React Native navigation",
      "2026-01-12T08:00:00.000Z",
    ),
    createAssistantMessage(
      "I'll help you set up React Native navigation. Let me first check your current project structure and dependencies.",
      "2026-01-12T08:00:30.000Z",
      [
        createToolCall("Read", { file_path: "/home/user/projects/mobile-app/package.json" }),
      ],
    ),
  ],
  tasks: [
    {
      content: "Install navigation dependencies",
      status: "pending",
      activeForm: "Installing navigation dependencies",
    },
  ],
  tokenUsage: {
    input: 5000,
    output: 1500,
  },
  costUsd: 0.0234,
};

// Fixture: Session with many messages (for pagination/scrolling tests)
export const longSession: Session = {
  id: "e5f6a7b8-c9d0-4123-ef01-234567890123",
  projectPath: "/home/user/projects/complex-project",
  status: "completed",
  createdAt: "2026-01-09T10:00:00.000Z",
  updatedAt: "2026-01-09T16:00:00.000Z",
  messages: Array.from({ length: 50 }, (_, i) => {
    const hour = 10 + Math.floor(i / 10);
    const minute = (i % 10) * 6;
    const timestamp = `2026-01-09T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00.000Z`;

    if (i % 2 === 0) {
      return createUserMessage(
        `Task ${Math.floor(i / 2) + 1}: ${["Implement feature", "Fix bug", "Add test", "Refactor code", "Update docs"][Math.floor(i / 2) % 5]}`,
        timestamp,
      );
    } else {
      return createAssistantMessage(
        `Working on task ${Math.floor(i / 2) + 1}. I'll analyze the requirements and implement the changes.\n\nHere's my approach:\n1. Review existing code\n2. Implement changes\n3. Write tests\n4. Verify everything works`,
        timestamp,
        [
          createToolCall("Read", { file_path: `/src/module${Math.floor(i / 2)}.ts` }),
        ],
      );
    }
  }),
  tasks: Array.from({ length: 25 }, (_, i) => ({
    content: `Complete task ${i + 1}`,
    status: (i < 20 ? "completed" : i < 23 ? "in_progress" : "pending") as const,
    activeForm: `Completing task ${i + 1}`,
  })),
  tokenUsage: {
    input: 150000,
    output: 80000,
    cacheRead: 100000,
    cacheWrite: 40000,
  },
  costUsd: 2.4567,
};

// Fixture: Session with thinking blocks
export const sessionWithThinking: Session = {
  id: "f6a7b8c9-d0e1-4234-f012-345678901234",
  projectPath: "/home/user/projects/algorithm-project",
  status: "completed",
  createdAt: "2026-01-08T14:00:00.000Z",
  updatedAt: "2026-01-08T14:45:00.000Z",
  messages: [
    createUserMessage(
      "Implement an efficient sorting algorithm for large datasets",
      "2026-01-08T14:00:00.000Z",
    ),
    {
      id: generateMessageId(),
      role: "assistant",
      content: "<thinking>\nLet me analyze the requirements:\n1. Large datasets mean O(n log n) complexity is important\n2. Memory efficiency matters\n3. Should consider parallelization\n\nOptions:\n- Quicksort: Good average case but O(n^2) worst case\n- Mergesort: Stable O(n log n) but needs extra space\n- Heapsort: In-place O(n log n)\n- Timsort: Best for partially sorted data\n</thinking>\n\nI'll implement a hybrid sorting algorithm that combines the best aspects of multiple approaches. For large datasets, I recommend using Timsort as it's optimized for real-world data that often has some ordering.",
      timestamp: "2026-01-08T14:05:00.000Z",
      toolCalls: [
        createToolCall("Write", {
          file_path: "/home/user/projects/algorithm-project/src/sort/timsort.ts",
          content: "export function timsort<T>(arr: T[], compare: (a: T, b: T) => number): T[] { ... }",
        }),
      ],
    },
  ],
  tasks: [
    {
      content: "Implement Timsort algorithm",
      status: "completed",
      activeForm: "Implementing Timsort algorithm",
    },
  ],
  tokenUsage: {
    input: 8000,
    output: 4500,
  },
  costUsd: 0.0789,
};

/**
 * All session fixtures as a readonly array.
 */
export const allSessions: readonly Session[] = [
  activeSession,
  completedSession,
  failedSession,
  pausedSession,
  longSession,
  sessionWithThinking,
];

/**
 * Session metadata for list view.
 */
export const sessionMetadataList: readonly SessionMetadata[] = allSessions.map((session) => ({
  id: session.id,
  projectPath: session.projectPath,
  status: session.status,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  messageCount: session.messages.length,
  tokenUsage: session.tokenUsage,
  costUsd: session.costUsd,
}));
