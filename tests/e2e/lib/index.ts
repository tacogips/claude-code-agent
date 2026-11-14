/**
 * E2E test library index.
 *
 * @module tests/e2e/lib
 */

export { CDPClient } from "./cdp-client";
export type { ScreenshotOptions } from "./cdp-client";

export { createMockServer } from "./mock-server";
export type { MockServerConfig, MockServerInstance } from "./mock-server";

export { E2ETestRunner } from "./test-runner";
export type {
  TestStatus,
  TestResult,
  TestSuiteResult,
  TestContext,
  TestFn,
} from "./test-runner";
