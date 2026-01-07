/**
 * Main SDK agent class providing unified access to all managers.
 *
 * This class acts as a facade for all SDK functionality, providing
 * a single entry point for external applications and the daemon server.
 *
 * @module sdk/agent
 */

import type { Container } from "../container";
import { EventEmitter } from "./events";
import { SessionReader } from "./session-reader";
import { GroupManager, GroupRunner } from "./group";
import { QueueManager, QueueRunner } from "./queue";
import { BookmarkManager } from "./bookmarks";
import { parseMarkdown } from "./markdown-parser";

/**
 * Main SDK agent providing unified access to all claude-code-agent functionality.
 *
 * The ClaudeCodeAgent class serves as the primary interface for programmatic
 * integration with claude-code-agent. It provides access to all managers and
 * utilities through a single, cohesive API.
 *
 * @example Basic usage
 * ```typescript
 * import { ClaudeCodeAgent } from "claude-code-agent/sdk";
 * import { createContainer } from "claude-code-agent/container";
 *
 * const container = createContainer();
 * const agent = await ClaudeCodeAgent.create(container);
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
export class ClaudeCodeAgent {
  /**
   * Container for dependency injection
   */
  public readonly container: Container;

  /**
   * Event emitter for SDK-wide events
   */
  public readonly events: EventEmitter;

  /**
   * Session reader for transcript parsing and monitoring
   */
  public readonly sessions: SessionReader;

  /**
   * Group manager for session group CRUD operations
   */
  public readonly groups: GroupManager;

  /**
   * Group runner for executing session groups
   */
  public readonly groupRunner: GroupRunner;

  /**
   * Queue manager for command queue CRUD operations
   */
  public readonly queues: QueueManager;

  /**
   * Queue runner for executing command queues
   */
  public readonly queueRunner: QueueRunner;

  /**
   * Bookmark manager for bookmark operations
   */
  public readonly bookmarks: BookmarkManager;

  /**
   * Private constructor - use ClaudeCodeAgent.create() instead.
   *
   * @param container - Dependency injection container
   * @private
   */
  private constructor(container: Container) {
    this.container = container;
    this.events = new EventEmitter();

    // Initialize managers
    this.sessions = new SessionReader(container);
    this.groups = new GroupManager(container, container.groupRepository, this.events);
    this.groupRunner = new GroupRunner(container, container.groupRepository, this.events);
    this.queues = new QueueManager(container, container.queueRepository, this.events);
    this.queueRunner = new QueueRunner(container, container.queueRepository, this.events);
    this.bookmarks = new BookmarkManager(container);
  }

  /**
   * Create and initialize a new ClaudeCodeAgent instance.
   *
   * This is the recommended way to create an agent instance as it ensures
   * all dependencies are properly initialized.
   *
   * @param container - Dependency injection container
   * @returns Initialized ClaudeCodeAgent instance
   */
  static async create(container: Container): Promise<ClaudeCodeAgent> {
    const agent = new ClaudeCodeAgent(container);
    // Future: Add any async initialization here
    return agent;
  }

  /**
   * Parse markdown content from messages.
   *
   * Convenience method for markdown parsing.
   *
   * @param content - Raw markdown content
   * @returns Parsed markdown structure
   */
  parseMarkdown(content: string) {
    return parseMarkdown(content);
  }
}
