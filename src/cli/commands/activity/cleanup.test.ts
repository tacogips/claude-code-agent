/**
 * Tests for CLI Activity Cleanup Command
 *
 * @module cli/commands/activity/cleanup.test
 */

import { describe, test, expect } from "vitest";
import { createActivityCleanupCommand } from "./cleanup";

describe("createActivityCleanupCommand", () => {
  test("creates command with correct configuration", () => {
    const command = createActivityCleanupCommand();

    expect(command.name()).toBe("cleanup");
    expect(command.description()).toBe("Remove stale activity entries");
  });

  test("has --older-than option with default value", () => {
    const command = createActivityCleanupCommand();
    const option = command.options.find((opt) => opt.long === "--older-than");

    expect(option).toBeDefined();
    expect(option?.description).toBe("Hours threshold for cleanup");
    expect(option?.defaultValue).toBe("24");
  });
});
