/**
 * CLI Activity Setup Command
 *
 * Configures Claude Code hooks for automatic activity tracking.
 * Modifies settings.json to add activity update hooks that trigger
 * on UserPromptSubmit, PermissionRequest, and Stop events.
 *
 * @module cli/commands/activity/setup
 */

import type { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Hook configuration for Claude Code settings.json.
 * Each hook type can have multiple hook entries.
 */
interface ClaudeSettings {
  readonly hooks?: Record<string, ClaudeHookEntry[]> | undefined;
  readonly [key: string]: unknown;
}

/**
 * Claude Code hook entry format.
 * Each hook entry contains an array of hook definitions.
 */
interface ClaudeHookEntry {
  readonly hooks: ClaudeHookDefinition[];
}

/**
 * Individual hook definition.
 */
interface ClaudeHookDefinition {
  readonly type: "command";
  readonly command: string;
}

/**
 * Options for setup command.
 */
interface SetupOptions {
  readonly global?: boolean;
  readonly project?: boolean;
  readonly dryRun?: boolean;
}

/**
 * Activity hooks to be configured.
 * These hooks will call 'claude-code-agent activity update' on each event.
 */
const ACTIVITY_HOOKS: Record<string, ClaudeHookEntry[]> = {
  UserPromptSubmit: [
    {
      hooks: [
        {
          type: "command",
          command: "claude-code-agent activity update",
        },
      ],
    },
  ],
  PermissionRequest: [
    {
      hooks: [
        {
          type: "command",
          command: "claude-code-agent activity update",
        },
      ],
    },
  ],
  Stop: [
    {
      hooks: [
        {
          type: "command",
          command: "claude-code-agent activity update",
        },
      ],
    },
  ],
};

/**
 * Create the activity setup command.
 *
 * Configures Claude Code hooks for activity tracking by modifying
 * settings.json. Supports both global (~/.claude/settings.json) and
 * project-local (.claude/settings.json) configuration.
 *
 * Options:
 * - --global: Configure in ~/.claude/settings.json
 * - --project: Configure in .claude/settings.json (default)
 * - --dry-run: Show changes without applying
 *
 * Exit codes:
 * - 0: Setup successful
 * - 1: Setup failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Setup for current project
 * claude-code-agent activity setup
 *
 * # Setup globally
 * claude-code-agent activity setup --global
 *
 * # Preview changes without applying
 * claude-code-agent activity setup --dry-run
 * ```
 */
export function createActivitySetupCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("setup")
    .description("Configure Claude Code hooks for activity tracking")
    .option("--global", "Configure in ~/.claude/settings.json")
    .option("--project", "Configure in .claude/settings.json (default)")
    .option("--dry-run", "Show changes without applying")
    .action(async (options: SetupOptions) => {
      try {
        // Determine settings path
        const settingsPath = getSettingsPath(options);

        // Read existing settings
        const settings = await readSettings(settingsPath);

        // Merge hooks
        const updatedSettings = mergeHooks(settings);

        // Show changes
        if (options.dryRun === true) {
          console.log("DRY RUN - Changes will not be applied");
          console.log("");
          displayDiff(settings, updatedSettings);
          return;
        }

        // Write settings
        await writeSettings(settingsPath, updatedSettings);

        // Display success message
        console.log("Activity tracking hooks configured successfully");
        console.log("");
        console.log(`Settings file: ${settingsPath}`);
        console.log("");
        console.log("Hooks added:");
        console.log("  - UserPromptSubmit: claude-code-agent activity update");
        console.log("  - PermissionRequest: claude-code-agent activity update");
        console.log("  - Stop: claude-code-agent activity update");
        console.log("");
        console.log(
          "These hooks will automatically track session activity status.",
        );
      } catch (error) {
        console.error(
          "Setup failed:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });
}

/**
 * Get settings.json path based on options.
 *
 * @param options - Command options
 * @returns Absolute path to settings.json
 */
function getSettingsPath(options: SetupOptions): string {
  if (options.global === true) {
    // Global: ~/.claude/settings.json
    const home = process.env["HOME"];
    if (home === undefined || home === "") {
      throw new Error("HOME environment variable not set");
    }
    return path.join(home, ".claude", "settings.json");
  }

  // Project (default): .claude/settings.json in current directory
  return path.join(process.cwd(), ".claude", "settings.json");
}

/**
 * Read settings.json file.
 * Returns empty object if file doesn't exist.
 *
 * @param settingsPath - Path to settings.json
 * @returns Parsed settings object
 */
async function readSettings(settingsPath: string): Promise<ClaudeSettings> {
  try {
    const content = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(content);

    // Validate it's an object
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("settings.json must contain a JSON object");
    }

    return parsed as ClaudeSettings;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      // File doesn't exist - return empty settings
      return {};
    }
    throw error;
  }
}

/**
 * Merge activity hooks into existing settings.
 *
 * For each hook type (UserPromptSubmit, PermissionRequest, Stop):
 * - If the hook type doesn't exist, add it
 * - If the hook type exists, merge the activity hook if not already present
 * - Avoid duplicating existing activity update commands
 *
 * @param settings - Existing settings
 * @returns Updated settings with merged hooks
 */
function mergeHooks(settings: ClaudeSettings): ClaudeSettings {
  const existingHooks = settings.hooks ?? {};
  const mergedHooks: Record<string, ClaudeHookEntry[]> = { ...existingHooks };

  for (const [hookType, hookEntries] of Object.entries(ACTIVITY_HOOKS)) {
    if (mergedHooks[hookType] === undefined) {
      // Hook type doesn't exist - add it
      mergedHooks[hookType] = hookEntries;
    } else {
      // Hook type exists - check if activity update command is already present
      const hasActivityUpdate = mergedHooks[hookType]?.some((entry) =>
        entry.hooks.some(
          (hook) =>
            hook.type === "command" &&
            hook.command === "claude-code-agent activity update",
        ),
      );

      if (hasActivityUpdate !== true) {
        // Activity update not present - add it
        const existing = mergedHooks[hookType];
        if (existing !== undefined) {
          mergedHooks[hookType] = [...existing, ...hookEntries];
        }
      }
    }
  }

  return {
    ...settings,
    hooks: mergedHooks,
  };
}

/**
 * Write settings to file.
 * Creates directory if it doesn't exist.
 *
 * @param settingsPath - Path to settings.json
 * @param settings - Settings object to write
 */
async function writeSettings(
  settingsPath: string,
  settings: ClaudeSettings,
): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(settingsPath);
  await fs.mkdir(dir, { recursive: true });

  // Write settings with 2-space indent
  const content = JSON.stringify(settings, null, 2);
  await fs.writeFile(settingsPath, content + "\n", "utf8");
}

/**
 * Display diff between original and updated settings.
 *
 * @param original - Original settings
 * @param updated - Updated settings
 */
function displayDiff(original: ClaudeSettings, updated: ClaudeSettings): void {
  console.log("BEFORE:");
  console.log("-----------------------------------------------------------");
  console.log(JSON.stringify(original, null, 2));
  console.log("");

  console.log("AFTER:");
  console.log("-----------------------------------------------------------");
  console.log(JSON.stringify(updated, null, 2));
  console.log("");
}

/**
 * Type guard for Node.js error with code property.
 *
 * @param error - Error to check
 * @returns True if error has code property
 */
function isNodeError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}
