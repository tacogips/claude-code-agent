/**
 * Mock implementations for testing.
 *
 * This module exports all mock implementations that can be used
 * in tests to provide deterministic behavior without external dependencies.
 *
 * @module test/mocks
 */

export { MockFileSystem } from "./filesystem";
export {
  MockProcessManager,
  MockManagedProcess,
  type MockProcessConfig,
  type SpawnRecord,
} from "./process-manager";
export { MockClock } from "./clock";
