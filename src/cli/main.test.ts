/**
 * Tests for CLI entry point.
 *
 * @module cli/main.test
 */

import { describe, test, expect } from "vitest";
import { createCli } from "./main";

describe("createCli", () => {
  test("creates CLI program with correct name", () => {
    const program = createCli();
    expect(program.name()).toBe("claude-code-agent");
  });

  test("has --format global option", () => {
    const program = createCli();
    const opts = program.opts();

    // Default format should be 'table'
    expect(opts["format"]).toBe("table");
  });

  test("registers session subcommand", () => {
    const program = createCli();
    const commands = program.commands.map((cmd) => cmd.name());

    expect(commands).toContain("session");
  });

  test("registers group subcommand", () => {
    const program = createCli();
    const commands = program.commands.map((cmd) => cmd.name());

    expect(commands).toContain("group");
  });

  test("registers bookmark subcommand", () => {
    const program = createCli();
    const commands = program.commands.map((cmd) => cmd.name());

    expect(commands).toContain("bookmark");
  });

  test("registers server subcommand", () => {
    const program = createCli();
    const commands = program.commands.map((cmd) => cmd.name());

    expect(commands).toContain("server");
  });

  test("registers daemon subcommand", () => {
    const program = createCli();
    const commands = program.commands.map((cmd) => cmd.name());

    expect(commands).toContain("daemon");
  });

  test("registers token subcommand", () => {
    const program = createCli();
    const commands = program.commands.map((cmd) => cmd.name());

    expect(commands).toContain("token");
  });

  test("session command has run, add, show, watch subcommands", () => {
    const program = createCli();
    const sessionCmd = program.commands.find((cmd) => cmd.name() === "session");

    expect(sessionCmd).toBeDefined();
    if (sessionCmd === undefined) return;

    const subcommands = sessionCmd.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("run");
    expect(subcommands).toContain("add");
    expect(subcommands).toContain("show");
    expect(subcommands).toContain("watch");
  });

  test("group command has create, list, run, watch, pause, resume subcommands", () => {
    const program = createCli();
    const groupCmd = program.commands.find((cmd) => cmd.name() === "group");

    expect(groupCmd).toBeDefined();
    if (groupCmd === undefined) return;

    const subcommands = groupCmd.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("create");
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("run");
    expect(subcommands).toContain("watch");
    expect(subcommands).toContain("pause");
    expect(subcommands).toContain("resume");
  });

  test("bookmark command has add, list, search, show, delete subcommands", () => {
    const program = createCli();
    const bookmarkCmd = program.commands.find(
      (cmd) => cmd.name() === "bookmark",
    );

    expect(bookmarkCmd).toBeDefined();
    if (bookmarkCmd === undefined) return;

    const subcommands = bookmarkCmd.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("add");
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("search");
    expect(subcommands).toContain("show");
    expect(subcommands).toContain("delete");
  });

  test("token command has create, list, revoke, rotate subcommands", () => {
    const program = createCli();
    const tokenCmd = program.commands.find((cmd) => cmd.name() === "token");

    expect(tokenCmd).toBeDefined();
    if (tokenCmd === undefined) return;

    const subcommands = tokenCmd.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("create");
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("revoke");
    expect(subcommands).toContain("rotate");
  });
});
