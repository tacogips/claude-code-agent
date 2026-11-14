/**
 * Test fixtures for session group types.
 *
 * Provides factory functions for creating test group and session objects
 * with sensible defaults.
 *
 * @module test/fixtures/group
 */
import type { SessionGroup, GroupSession } from "../../repository/group-repository";
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
export declare function createTestGroup(overrides?: Partial<SessionGroup>): SessionGroup;
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
export declare function createTestGroupSession(overrides?: Partial<GroupSession>): GroupSession;
//# sourceMappingURL=group.d.ts.map