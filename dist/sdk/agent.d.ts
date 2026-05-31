/**
 * Main SDK agent class providing unified access to all managers.
 *
 * This class acts as a facade for all SDK functionality, providing
 * a single entry point for external applications and the CLI.
 *
 * @module sdk/agent
 */
import type { Container } from "../container";
import { EventEmitter } from "./events";
import { SessionReader } from "./session-reader";
import { GroupManager, GroupRunner } from "./group";
import { QueueManager, QueueRunner } from "./queue";
import { BookmarkManager } from "./bookmarks";
import { ActivityManager } from "./activity/manager";
import { type AgentToolVersions } from "./tool-versions";
export { RunningSession, SessionRunner, type ClaudeReasoningEffort, type PermissionMode, type SessionAttachment, type SessionConfig, type SessionResult, type SessionRunnerOptions, } from "./session-runner";
/**
 * Main SDK agent providing unified access to all claude-code-agent functionality.
 *
 * The SdkManager class serves as the primary interface for programmatic
 * integration with claude-code-agent. It provides access to all managers and
 * utilities through a single, cohesive API.
 *
 * @example Basic usage
 * ```typescript
 * import { SdkManager } from "claude-code-agent/sdk";
 * import { createProductionContainer } from "claude-code-agent/container";
 *
 * const container = createProductionContainer();
 * const agent = await SdkManager.create(container);
 *
 * // Use session reader
 * const sessions = await agent.sessions.listSessions();
 *
 * // Use group manager
 * const group = await agent.groups.createGroup({
 *   name: "My Group",
 *   description: "Test group"
 * });
 * ```
 */
export declare class SdkManager {
    /**
     * Container for dependency injection
     */
    readonly container: Container;
    /**
     * Event emitter for SDK-wide events
     */
    readonly events: EventEmitter;
    /**
     * Session reader for transcript parsing and monitoring
     */
    readonly sessions: SessionReader;
    /**
     * Group manager for session group CRUD operations
     */
    readonly groups: GroupManager;
    /**
     * Group runner for executing session groups
     */
    readonly groupRunner: GroupRunner;
    /**
     * Queue manager for command queue CRUD operations
     */
    readonly queues: QueueManager;
    /**
     * Queue runner for executing command queues
     */
    readonly queueRunner: QueueRunner;
    /**
     * Bookmark manager for bookmark operations
     */
    readonly bookmarks: BookmarkManager;
    /**
     * Activity manager for session activity tracking
     */
    readonly activity: ActivityManager;
    /**
     * Private constructor - use SdkManager.create() instead.
     *
     * @param container - Dependency injection container
     * @private
     */
    private constructor();
    /**
     * Create and initialize a new SdkManager instance.
     *
     * This is the recommended way to create an agent instance as it ensures
     * all dependencies are properly initialized.
     *
     * @param container - Dependency injection container
     * @returns Initialized SdkManager instance
     */
    static create(container: Container): Promise<SdkManager>;
    /**
     * Parse markdown content from messages.
     *
     * Convenience method for markdown parsing.
     *
     * @param content - Raw markdown content
     * @returns Parsed markdown structure
     */
    parseMarkdown(content: string): import("./markdown-parser").ParsedMarkdown;
    /**
     * Retrieve installed CLI tool versions used by the agent runtime.
     *
     * Returns structured success/error results for each tool so host
     * applications can display health and availability without shelling out.
     */
    getToolVersions(): Promise<AgentToolVersions>;
}
//# sourceMappingURL=agent.d.ts.map