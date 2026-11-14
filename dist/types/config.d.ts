/**
 * Configuration types for claude-code-agent.
 *
 * These types define configuration options for the SDK,
 * and various features.
 *
 * @module types/config
 */
/**
 * Main configuration for claude-code-agent.
 */
export interface AgentConfig {
    /** Path to Claude Code data directory (default: ~/.claude) */
    readonly claudeDataDir?: string | undefined;
    /** Path to agent metadata directory */
    readonly metadataDir?: string | undefined;
    /** Path to Claude Code executable (default: claude) */
    readonly claudeExecutable?: string | undefined;
    /** Default model to use (e.g., "claude-sonnet-4-20250514") */
    readonly defaultModel?: string | undefined;
    /** Logging configuration */
    readonly logging?: LoggingConfig | undefined;
}
/**
 * Logging configuration options.
 */
export interface LoggingConfig {
    /** Log level: debug, info, warn, error */
    readonly level?: "debug" | "info" | "warn" | "error" | undefined;
    /** Whether to output structured JSON logs */
    readonly json?: boolean | undefined;
    /** Path to log file (in addition to console) */
    readonly file?: string | undefined;
}
/**
 * Configuration for session execution.
 */
export interface SessionExecutionConfig {
    /** Maximum budget in USD */
    readonly maxBudgetUsd?: number | undefined;
    /** Maximum number of turns (default: unlimited) */
    readonly maxTurns?: number | undefined;
    /** Model to use for this session */
    readonly model?: string | undefined;
    /** Template name for CLAUDE.md generation */
    readonly template?: string | undefined;
    /** Whether to enable MCP servers */
    readonly enableMcp?: boolean | undefined;
}
/**
 * Get the default agent configuration.
 *
 * Uses XDG conventions for directory locations.
 */
export declare function getDefaultConfig(): AgentConfig;
/**
 * Merge user config with defaults.
 *
 * User values override defaults for defined keys.
 */
export declare function mergeConfig(defaults: AgentConfig, overrides: Partial<AgentConfig>): AgentConfig;
//# sourceMappingURL=config.d.ts.map