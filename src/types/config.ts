/**
 * Configuration types for claude-code-agent.
 *
 * These types define configuration options for the SDK,
 * daemon, and various features.
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
 * Configuration for daemon server.
 */
export interface DaemonConfig {
  /** Host to bind to (default: 0.0.0.0) */
  readonly host?: string | undefined;
  /** Port to listen on (default: 8443) */
  readonly port?: number | undefined;
  /** Path to authentication token file */
  readonly authTokenFile?: string | undefined;
  /** Path to TLS certificate file */
  readonly tlsCert?: string | undefined;
  /** Path to TLS private key file */
  readonly tlsKey?: string | undefined;
  /** Whether to include the browser viewer */
  readonly withViewer?: boolean | undefined;
}

/**
 * Configuration for the browser viewer.
 */
export interface ViewerConfig {
  /** Port to listen on (default: 3000) */
  readonly port?: number | undefined;
  /** Host to bind to (default: 127.0.0.1) */
  readonly host?: string | undefined;
  /** Whether to auto-open browser */
  readonly openBrowser?: boolean | undefined;
}

/**
 * Get the default agent configuration.
 *
 * Uses XDG conventions for directory locations.
 */
export function getDefaultConfig(): AgentConfig {
  const home = process.env["HOME"] ?? "";
  const xdgDataHome = process.env["XDG_DATA_HOME"] ?? `${home}/.local/share`;

  return {
    claudeDataDir: `${home}/.claude`,
    metadataDir: `${xdgDataHome}/claude-code-agent`,
    claudeExecutable: "claude",
    defaultModel: undefined,
    logging: {
      level: "info",
      json: false,
      file: undefined,
    },
  };
}

/**
 * Merge user config with defaults.
 *
 * User values override defaults for defined keys.
 */
export function mergeConfig(
  defaults: AgentConfig,
  overrides: Partial<AgentConfig>,
): AgentConfig {
  return {
    claudeDataDir: overrides.claudeDataDir ?? defaults.claudeDataDir,
    metadataDir: overrides.metadataDir ?? defaults.metadataDir,
    claudeExecutable: overrides.claudeExecutable ?? defaults.claudeExecutable,
    defaultModel: overrides.defaultModel ?? defaults.defaultModel,
    logging:
      overrides.logging !== undefined
        ? { ...defaults.logging, ...overrides.logging }
        : defaults.logging,
  };
}
