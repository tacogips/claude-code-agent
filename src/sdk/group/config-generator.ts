/**
 * Configuration Generator for Session Groups.
 *
 * Generates per-session configuration files including CLAUDE.md templates,
 * settings.json, and other configuration files for individual sessions.
 *
 * @module sdk/group/config-generator
 */

import type { Container } from "../../container";
import type { SessionGroup, GroupSession } from "./types";
import { Result, ok, err } from "../../result";
import { createTaggedLogger } from "../../logger";
import Mustache from "mustache";

const logger = createTaggedLogger("config-generator");

/**
 * Result of session configuration generation.
 */
export interface SessionConfigResult {
  /** Path to the generated configuration directory */
  readonly configDir: string;
  /** Path to generated CLAUDE.md (if generated) */
  readonly claudeMdPath?: string | undefined;
  /** Path to generated settings.json (if generated) */
  readonly settingsPath?: string | undefined;
}

/**
 * Error types for configuration generation.
 */
export type ConfigGeneratorError =
  | { type: "template_not_found"; path: string }
  | { type: "template_read_failed"; path: string; cause: unknown }
  | { type: "config_write_failed"; path: string; cause: unknown }
  | { type: "invalid_template"; message: string }
  | { type: "mkdir_failed"; path: string; cause: unknown };

/**
 * Configuration Generator.
 *
 * Generates session-specific configuration files including CLAUDE.md templates,
 * settings.json, and manages configuration inheritance from group settings.
 *
 * Features:
 * - Template rendering with variable substitution ({{variable}} syntax)
 * - Template resolution from file or inline string
 * - Shared config inheritance from group
 * - settings.json generation with overrides
 */
export class ConfigGenerator {
  private readonly container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Generate session configuration directory with all files.
   *
   * Creates a configuration directory for a session with the following files:
   * - CLAUDE.md (if template specified or generateClaudeMd is true)
   * - settings.json (if settingsOverride provided or generateSettings is true)
   *
   * @param session - Session to generate config for
   * @param group - Parent session group
   * @returns Result with config directory info or error
   */
  async generateSessionConfig(
    session: GroupSession,
    group: SessionGroup,
  ): Promise<Result<SessionConfigResult, ConfigGeneratorError>> {
    const sessionConfig = session.config ?? group.config.sessionDefaults;
    const configDir = this.getSessionConfigDir(group.id, session.id);

    // Create config directory
    const mkdirResult = await this.ensureConfigDir(configDir);
    if (mkdirResult.isErr()) {
      return err(mkdirResult.error);
    }

    let claudeMdPath: string | undefined = undefined;
    let settingsPath: string | undefined = undefined;

    // Generate CLAUDE.md if requested
    if (sessionConfig?.generateClaudeMd) {
      const templatePath = sessionConfig.claudeMdTemplate ?? session.template;
      if (templatePath !== undefined) {
        const claudeMdResult = await this.generateClaudeMdFile(
          configDir,
          templatePath,
          session,
          group,
        );
        if (claudeMdResult.isErr()) {
          return err(claudeMdResult.error);
        }
        claudeMdPath = claudeMdResult.value;
      }
    }

    // Generate settings.json if requested
    if (
      sessionConfig?.generateSettings &&
      sessionConfig.settingsOverride !== undefined
    ) {
      const settingsResult = await this.generateSettingsFile(
        configDir,
        sessionConfig.settingsOverride,
      );
      if (settingsResult.isErr()) {
        return err(settingsResult.error);
      }
      settingsPath = settingsResult.value;
    }

    const result: SessionConfigResult = {
      configDir,
      claudeMdPath,
      settingsPath,
    };

    logger.debug("Generated session config", {
      sessionId: session.id,
      configDir,
      claudeMd: result.claudeMdPath !== undefined,
      settings: result.settingsPath !== undefined,
    });

    return ok(result);
  }

  /**
   * Generate CLAUDE.md content from template with variable substitution.
   *
   * Supports {{variable}} syntax for variable substitution.
   *
   * @param template - Template content (inline) or path (file://)
   * @param variables - Variables to substitute
   * @returns Rendered CLAUDE.md content
   */
  generateClaudeMd(
    template: string,
    variables: Record<string, string>,
  ): string {
    // Use Mustache for template rendering with custom behavior:
    // 1. Disable HTML escaping (preserve paths like /tmp/test)
    // 2. Preserve unmatched variables as-is (e.g., {{unknown}} stays {{unknown}})

    // Store original escape function and override with no-op
    const originalEscape = Mustache.escape;
    Mustache.escape = (text: string) => text;

    try {
      // Parse template to identify all variables
      const parsed = Mustache.parse(template);
      const allVariableNames = new Set<string>();

      // Extract variable names from parsed template
      const extractVariables = (tokens: unknown[]): void => {
        for (const token of tokens) {
          if (Array.isArray(token)) {
            const [type, name, _start, _end, children] = token as [
              string,
              string,
              number,
              number,
              unknown[]?,
            ];
            // Type 'name' or '&' means a variable reference
            if (type === "name" || type === "&") {
              allVariableNames.add(name);
            }
            // Recursively process nested tokens (like in sections)
            if (children !== undefined) {
              extractVariables(children);
            }
          }
        }
      };

      extractVariables(parsed);

      // Create extended variables object that preserves unknowns
      const extendedVariables: Record<string, string> = { ...variables };
      for (const varName of allVariableNames) {
        if (!(varName in variables)) {
          // Preserve unmatched variables by providing them as {{varName}}
          extendedVariables[varName] = `{{${varName}}}`;
        }
      }

      // Render with Mustache
      return Mustache.render(template, extendedVariables);
    } finally {
      // Restore original escape function
      Mustache.escape = originalEscape;
    }
  }

  /**
   * Generate settings.json content with overrides.
   *
   * @param overrides - Partial settings.json overrides
   * @returns settings.json object
   */
  generateSettings(overrides: Record<string, unknown>): object {
    // Base settings that can be overridden
    const baseSettings = {
      // Default settings
    };

    return {
      ...baseSettings,
      ...overrides,
    };
  }

  /**
   * Resolve template content from path or inline string.
   *
   * Supports:
   * - Inline template (plain string)
   * - File path (absolute or relative to template directory)
   *
   * @param templatePath - Template path or inline content
   * @returns Result with template content or error
   */
  async resolveTemplate(
    templatePath: string,
  ): Promise<Result<string, ConfigGeneratorError>> {
    // If templatePath looks like a file path (starts with / or ./), read it
    if (templatePath.startsWith("/") || templatePath.startsWith("./")) {
      try {
        const content = await this.container.fileSystem.readFile(templatePath);
        return ok(content);
      } catch (cause: unknown) {
        logger.error("Failed to read template file", {
          path: templatePath,
          error: cause,
        });
        return err({ type: "template_read_failed", path: templatePath, cause });
      }
    }

    // Check if it's a template name (resolve from template directory)
    const templateDir = this.getTemplateDir();
    const fullPath = `${templateDir}/${templatePath}`;

    const exists = await this.container.fileSystem.exists(fullPath);
    if (!exists) {
      logger.error("Template not found", { path: fullPath });
      return err({ type: "template_not_found", path: fullPath });
    }

    try {
      const content = await this.container.fileSystem.readFile(fullPath);
      return ok(content);
    } catch (cause: unknown) {
      logger.error("Failed to read template file", {
        path: fullPath,
        error: cause,
      });
      return err({ type: "template_read_failed", path: fullPath, cause });
    }
  }

  /**
   * Generate CLAUDE.md file in config directory.
   *
   * @param configDir - Configuration directory path
   * @param templatePath - Template path or inline content
   * @param session - Session to generate config for
   * @param group - Parent session group
   * @returns Result with CLAUDE.md path or error
   */
  private async generateClaudeMdFile(
    configDir: string,
    templatePath: string,
    session: GroupSession,
    group: SessionGroup,
  ): Promise<Result<string, ConfigGeneratorError>> {
    const templateResult = await this.resolveTemplate(templatePath);
    if (templateResult.isErr()) {
      return err(templateResult.error);
    }

    // Build variables for substitution
    const variables: Record<string, string> = {
      session_id: session.id,
      group_id: group.id,
      group_name: group.name,
      project_path: session.projectPath,
      prompt: session.prompt,
      model: group.config.model,
    };

    const content = this.generateClaudeMd(templateResult.value, variables);
    const claudeMdPath = `${configDir}/CLAUDE.md`;

    try {
      await this.container.fileSystem.writeFile(claudeMdPath, content);
      logger.debug("Generated CLAUDE.md", { path: claudeMdPath });
      return ok(claudeMdPath);
    } catch (cause: unknown) {
      logger.error("Failed to write CLAUDE.md", {
        path: claudeMdPath,
        error: cause,
      });
      return err({ type: "config_write_failed", path: claudeMdPath, cause });
    }
  }

  /**
   * Generate settings.json file in config directory.
   *
   * @param configDir - Configuration directory path
   * @param overrides - Partial settings.json overrides
   * @returns Result with settings.json path or error
   */
  private async generateSettingsFile(
    configDir: string,
    overrides: Record<string, unknown>,
  ): Promise<Result<string, ConfigGeneratorError>> {
    const settings = this.generateSettings(overrides);
    const settingsPath = `${configDir}/settings.json`;

    try {
      const content = JSON.stringify(settings, null, 2);
      await this.container.fileSystem.writeFile(settingsPath, content);
      logger.debug("Generated settings.json", { path: settingsPath });
      return ok(settingsPath);
    } catch (cause: unknown) {
      logger.error("Failed to write settings.json", {
        path: settingsPath,
        error: cause,
      });
      return err({ type: "config_write_failed", path: settingsPath, cause });
    }
  }

  /**
   * Ensure config directory exists.
   *
   * @param configDir - Configuration directory path
   * @returns Result with void on success or error
   */
  private async ensureConfigDir(
    configDir: string,
  ): Promise<Result<void, ConfigGeneratorError>> {
    try {
      const exists = await this.container.fileSystem.exists(configDir);
      if (!exists) {
        await this.container.fileSystem.mkdir(configDir, { recursive: true });
        logger.debug("Created config directory", { path: configDir });
      }
      return ok(undefined);
    } catch (cause: unknown) {
      logger.error("Failed to create config directory", {
        path: configDir,
        error: cause,
      });
      return err({ type: "mkdir_failed", path: configDir, cause });
    }
  }

  /**
   * Get session config directory path.
   *
   * @param groupId - Group ID
   * @param sessionId - Session ID
   * @returns Config directory path
   */
  private getSessionConfigDir(groupId: string, sessionId: string): string {
    const home = process.env["HOME"] ?? "";
    const xdgDataHome = process.env["XDG_DATA_HOME"] ?? `${home}/.local/share`;
    return `${xdgDataHome}/claude-code-agent/session-groups/${groupId}/sessions/${sessionId}/claude-config`;
  }

  /**
   * Get template directory path.
   *
   * @returns Template directory path
   */
  private getTemplateDir(): string {
    const home = process.env["HOME"] ?? "";
    const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`;
    return `${xdgConfigHome}/claude-code-agent/templates`;
  }
}
