import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { Command } from "commander";
import { registerVersionCommands } from "./version";
import type { SdkManager } from "../../sdk/agent";
import * as output from "../output";

describe("Version Commands", () => {
  let program: Command;
  let mockAgent: Partial<SdkManager>;
  let consoleLogSpy: MockInstance;
  let printErrorSpy: MockInstance;
  let exitSpy: MockInstance;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    program.option("--format <format>", "Output format", "table");

    mockAgent = {
      getToolVersions: vi.fn().mockResolvedValue({
        claude: { version: "1.2.3", error: null },
        codex: { version: "0.45.1", error: null },
        git: { version: "2.43.0", error: null },
      }),
    };

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);

    registerVersionCommands(program, async () => mockAgent as SdkManager);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows table output by default", async () => {
    await program.parseAsync(["node", "test", "version"]);

    expect(mockAgent.getToolVersions).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleLogSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const outputText = String(firstCall?.[0]);
    expect(outputText).toContain("Tool");
    expect(outputText).toContain("claude");
    expect(outputText).toContain("codex");
    expect(outputText).toContain("git");
  });

  test("shows json output with --format json", async () => {
    await program.parseAsync(["node", "test", "--format", "json", "version"]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleLogSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const parsed = JSON.parse(String(firstCall?.[0])) as {
      agent: string;
      tools: {
        claude: { version: string | null; error: string | null };
      };
    };
    expect(parsed.agent).toBeTypeOf("string");
    expect(parsed.tools.claude.version).toBe("1.2.3");
  });

  test("shows json output with --json option", async () => {
    await program.parseAsync(["node", "test", "version", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleLogSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const parsed = JSON.parse(String(firstCall?.[0])) as {
      tools: {
        git: { version: string | null; error: string | null };
      };
    };
    expect(parsed.tools.git.version).toBe("2.43.0");
  });

  test("prints error and exits when version lookup fails", async () => {
    (mockAgent.getToolVersions as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("lookup failed"),
    );

    try {
      await program.parseAsync(["node", "test", "version"]);
    } catch (_error) {
      // expected from mocked process.exit
    }

    expect(printErrorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
