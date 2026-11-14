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
import { type Result } from "../../result";
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
export type ConfigGeneratorError = {
    type: "template_not_found";
    path: string;
} | {
    type: "template_read_failed";
    path: string;
    cause: unknown;
} | {
    type: "config_write_failed";
    path: string;
    cause: unknown;
} | {
    type: "invalid_template";
    message: string;
} | {
    type: "mkdir_failed";
    path: string;
    cause: unknown;
};
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
export declare class ConfigGenerator {
    private readonly container;
    constructor(container: Container);
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
    generateSessionConfig(session: GroupSession, group: SessionGroup): Promise<Result<SessionConfigResult, ConfigGeneratorError>>;
    /**
     * Generate CLAUDE.md content from template with variable substitution.
     *
     * Supports {{variable}} syntax for variable substitution.
     *
     * @param template - Template content (inline) or path (file://)
     * @param variables - Variables to substitute
     * @returns Rendered CLAUDE.md content
     */
    generateClaudeMd(template: string, variables: Record<string, string>): string;
    /**
     * Generate settings.json content with overrides.
     *
     * @param overrides - Partial settings.json overrides
     * @returns settings.json object
     */
    generateSettings(overrides: Record<string, unknown>): object;
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
    resolveTemplate(templatePath: string): Promise<Result<string, ConfigGeneratorError>>;
    /**
     * Generate CLAUDE.md file in config directory.
     *
     * @param configDir - Configuration directory path
     * @param templatePath - Template path or inline content
     * @param session - Session to generate config for
     * @param group - Parent session group
     * @returns Result with CLAUDE.md path or error
     */
    private generateClaudeMdFile;
    /**
     * Generate settings.json file in config directory.
     *
     * @param configDir - Configuration directory path
     * @param overrides - Partial settings.json overrides
     * @returns Result with settings.json path or error
     */
    private generateSettingsFile;
    /**
     * Ensure config directory exists.
     *
     * @param configDir - Configuration directory path
     * @returns Result with void on success or error
     */
    private ensureConfigDir;
    /**
     * Get session config directory path.
     *
     * @param groupId - Group ID
     * @param sessionId - Session ID
     * @returns Config directory path
     */
    private getSessionConfigDir;
    /**
     * Get template directory path.
     *
     * @returns Template directory path
     */
    private getTemplateDir;
}
//# sourceMappingURL=config-generator.d.ts.map