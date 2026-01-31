/**
 * Tests for CLI Activity Status Command
 *
 * @module cli/commands/activity/status.test
 */

import { describe, test, expect } from "vitest";
import { createActivityStatusCommand } from "./status";

describe("createActivityStatusCommand", () => {
  test("creates command with correct configuration", () => {
    const command = createActivityStatusCommand();

    expect(command.name()).toBe("status");
    expect(command.description()).toBe("Get activity status for a session");
  });

  test("has session-id argument", () => {
    const command = createActivityStatusCommand();
    const args = command.registeredArguments;

    expect(args).toHaveLength(1);
    expect(args[0]?.name()).toBe("session-id");
  });

  test("has --json option", () => {
    const command = createActivityStatusCommand();
    const option = command.options.find((opt) => opt.long === "--json");

    expect(option).toBeDefined();
    expect(option?.description).toBe("Output as JSON");
  });
});
