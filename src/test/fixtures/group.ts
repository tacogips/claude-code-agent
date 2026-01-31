/**
 * Test fixtures for session group types.
 *
 * Provides factory functions for creating test group and session objects
 * with sensible defaults.
 *
 * @module test/fixtures/group
 */

import type {
  SessionGroup,
  GroupSession,
  GroupStatus,
} from "../../repository/group-repository";
import type { SessionStatus } from "../../types/session";
import type { GroupConfig } from "../../sdk/group/types";
import { DEFAULT_GROUP_CONFIG } from "../../sdk/group/types";

/**
 * Create a test session group with optional overrides.
 *
 * Provides a valid SessionGroup object with sensible defaults.
 * All fields can be customized via the overrides parameter.
 *
 * @param overrides - Partial group properties to override defaults
 * @returns Mock session group object
 *
 * @example
 * ```typescript
 * const group = createTestGroup({
 *   id: "my-group",
 *   name: "Test Group",
 *   status: "running",
 *   sessions: [createTestGroupSession()],
 * });
 * ```
 */
export function createTestGroup(
  overrides: Partial<SessionGroup> = {},
): SessionGroup {
  return {
    id: "group-123",
    name: "Test Group",
    slug: "test-group",
    sessions: [],
    status: "created" as GroupStatus,
    config: DEFAULT_GROUP_CONFIG as GroupConfig,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Create a test group session with optional overrides.
 *
 * Provides a valid GroupSession object with sensible defaults.
 * All fields can be customized via the overrides parameter.
 *
 * @param overrides - Partial session properties to override defaults
 * @returns Mock group session object
 *
 * @example
 * ```typescript
 * const session = createTestGroupSession({
 *   id: "001-auth",
 *   prompt: "Implement auth",
 *   status: "completed",
 *   dependsOn: ["000-base"],
 * });
 * ```
 */
export function createTestGroupSession(
  overrides: Partial<GroupSession> = {},
): GroupSession {
  return {
    id: "session-1",
    projectPath: "/test/project",
    prompt: "Test prompt",
    status: "pending" as SessionStatus,
    dependsOn: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}
