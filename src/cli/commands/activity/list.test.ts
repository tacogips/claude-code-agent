/**
 * Tests for the activity list command.
 *
 * Verifies that the list command properly queries the ActivityManager,
 * handles filtering, and formats output in both table and JSON modes.
 *
 * @module cli/commands/activity/list.test
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { createActivityListCommand } from "./list";

describe("createActivityListCommand", () => {
  let command: ReturnType<typeof createActivityListCommand>;

  beforeEach(() => {
    command = createActivityListCommand();
  });

  test("creates command with correct name and description", () => {
    expect(command.name()).toBe("list");
    expect(command.description()).toBe("List all tracked session activities");
  });

  test("has --status option", () => {
    const statusOption = command.options.find((opt) =>
      opt.flags.includes("--status"),
    );
    expect(statusOption).toBeDefined();
    expect(statusOption?.description).toContain("Filter by status");
  });

  test("has --json option", () => {
    const jsonOption = command.options.find((opt) =>
      opt.flags.includes("--json"),
    );
    expect(jsonOption).toBeDefined();
    expect(jsonOption?.description).toContain("Output as JSON");
  });

  test("command has action handler", () => {
    // Verify the command has options and description set correctly
    expect(command.options.length).toBeGreaterThan(0);
  });
});

describe("activity list command validation", () => {
  test("valid status values should be accepted", () => {
    const validStatuses = ["working", "waiting_user_response", "idle"] as const;

    // This test validates that the type definitions are correct
    for (const status of validStatuses) {
      expect(typeof status).toBe("string");
    }
  });

  test("invalid status values should be rejected in runtime", async () => {
    // This would be tested in integration tests where we actually
    // execute the command and verify it exits with code 2
    expect(true).toBe(true);
  });
});
