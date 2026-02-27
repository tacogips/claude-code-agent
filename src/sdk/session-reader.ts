/**
 * Session file reader for Claude Code sessions.
 *
 * Reads and parses Claude Code session files from the ~/.claude/projects directory.
 * Session data is stored in JSONL format (JSON Lines).
 *
 * @module sdk/session-reader
 */

import type { Container } from "../container";
import type { Session, SessionMetadata, TokenUsage } from "../types/session";
import type { Message, ToolCall, ToolResult } from "../types/message";
import type { Task } from "../types/task";
import type {
  SessionIndex,
  SessionIndexEntry,
  SessionListResponse,
  ListSessionsByPathOptions,
  TranscriptSearchOptions,
  TranscriptSearchResult,
  SearchSessionsOptions,
  SessionSearchResponse,
  TranscriptSearchRole,
  SessionSearchSource,
} from "../types/session-index";
import { type Result, ok, err } from "../result";
import { FileNotFoundError, type AgentError } from "../errors";
import { parseJsonl } from "./jsonl-parser";
import { toSessionMetadata } from "../types/session";
import { getDefaultConfig } from "../types/config";
import { JsonlStreamParser, type TranscriptEvent } from "../polling/parser";

/**
 * Pattern for UUID-named session files.
 * Claude Code stores main session files as: {uuid}.jsonl
 */
const UUID_SESSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

/**
 * Check if a filename matches a session file pattern.
 * Supports both UUID-named files ({uuid}.jsonl) and legacy session.jsonl format.
 *
 * @param filename - Name of the file to check (not full path)
 * @returns true if filename matches session file pattern, false otherwise
 */
function isSessionFile(filename: string): boolean {
  return UUID_SESSION_PATTERN.test(filename) || filename === "session.jsonl";
}

/**
 * Raw message entry structure from Claude Code session JSONL files.
 * This interface documents the expected structure for message entries.
 * @internal
 */
// @ts-expect-error - Interface used for documentation purposes
interface RawMessageEntry {
  readonly type: "user" | "assistant";
  readonly uuid: string;
  readonly sessionId: string;
  readonly timestamp: string;
  readonly message: {
    readonly role: "user" | "assistant";
    readonly content: string | readonly ContentBlock[];
    readonly id?: string;
    readonly model?: string;
    readonly usage?: RawUsageStats;
  };
}

/**
 * Content block within a message (text, tool_use, tool_result).
 */
interface ContentBlock {
  readonly type: "text" | "tool_use" | "tool_result";
  // For text blocks
  readonly text?: string;
  // For tool_use blocks
  readonly id?: string;
  readonly name?: string;
  readonly input?: Record<string, unknown>;
  // For tool_result blocks
  readonly tool_use_id?: string;
  readonly content?: string | Record<string, unknown>;
  readonly is_error?: boolean;
}

/**
 * Raw usage statistics from assistant messages.
 */
interface RawUsageStats {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
}

/**
 * SessionReader reads and parses Claude Code session files.
 *
 * Uses the FileSystem abstraction from the container for testability.
 * Parses JSONL files to extract session data.
 */
export class SessionReader {
  private readonly fileSystem;

  /**
   * Create a new SessionReader.
   *
   * @param container - Dependency injection container
   */
  constructor(container: Container) {
    this.fileSystem = container.fileSystem;
  }

  /**
   * Encode a working directory path to Claude Code project directory name format.
   *
   * Claude Code replaces all forward slashes with dashes when creating project directories.
   * Example: `/g/gits/tacogips/QraftBox` becomes `-g-gits-tacogips-QraftBox`
   *
   * @param workingDirectory - Absolute working directory path
   * @returns Encoded directory name
   */
  static encodeProjectPath(workingDirectory: string): string {
    return workingDirectory.replace(/\//g, "-");
  }

  /**
   * Extract a message from a raw JSONL record.
   *
   * Parses the nested message structure from Claude Code session files.
   * Returns null if the record is not a user or assistant message.
   *
   * @param record - Raw JSONL record object (expected structure: RawMessageEntry)
   * @returns Parsed Message or null if not a message record
   * @private
   */
  private extractMessage(record: Record<string, unknown>): Message | null {
    // Check if this is a user or assistant entry
    const type = record["type"] as string | undefined;
    if (type !== "user" && type !== "assistant") {
      return null;
    }

    // Extract message object
    const message = record["message"] as Record<string, unknown> | undefined;
    if (!message || typeof message !== "object") {
      return null;
    }

    // Extract basic fields
    const uuid = record["uuid"] as string | undefined;
    const timestamp = record["timestamp"] as string | undefined;
    const role = message["role"] as string | undefined;
    const content = message["content"];

    if (!uuid || !timestamp || !role || content === undefined) {
      return null;
    }

    // Extract content blocks if content is array
    let textContent: string;
    let toolCalls: readonly ToolCall[] | undefined;
    let toolResults: readonly ToolResult[] | undefined;

    if (typeof content === "string") {
      textContent = content;
    } else if (Array.isArray(content)) {
      const extracted = this.extractContentBlocks(content);
      textContent = extracted.textContent;
      toolCalls = extracted.toolCalls;
      toolResults = extracted.toolResults;
    } else {
      textContent = "";
    }

    return {
      id: uuid,
      role: role as Message["role"],
      content: textContent,
      timestamp,
      toolCalls,
      toolResults,
    };
  }

  /**
   * Extract content blocks from message content array.
   *
   * Parses text, tool_use, and tool_result blocks from the content array.
   *
   * @param content - Array of content blocks
   * @returns Extracted text content, tool calls, and tool results
   * @private
   */
  private extractContentBlocks(content: readonly ContentBlock[]): {
    textContent: string;
    toolCalls: readonly ToolCall[] | undefined;
    toolResults: readonly ToolResult[] | undefined;
  } {
    const textParts: string[] = [];
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];

    for (const block of content) {
      switch (block.type) {
        case "text":
          if (block.text) {
            textParts.push(block.text);
          }
          break;
        case "tool_use":
          if (block.id && block.name) {
            toolCalls.push({
              id: block.id,
              name: block.name,
              input: block.input ?? {},
            });
          }
          break;
        case "tool_result":
          if (block.tool_use_id) {
            const output =
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content ?? "");
            toolResults.push({
              id: block.tool_use_id,
              output,
              isError: block.is_error ?? false,
            });
          }
          break;
      }
    }

    return {
      textContent: textParts.join("\n"),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };
  }

  /**
   * Extract tasks from TodoWrite tool calls in assistant messages.
   *
   * Scans message content for TodoWrite tool_use blocks and extracts the todos array.
   * Returns empty array if no TodoWrite calls found or if input structure is invalid.
   *
   * @param record - Raw JSONL record object (expected structure: RawMessageEntry)
   * @returns Array of extracted tasks (empty if none found)
   * @private
   */
  private extractTasks(record: Record<string, unknown>): readonly Task[] {
    // Extract message object
    const message = record["message"] as Record<string, unknown> | undefined;
    if (!message || typeof message !== "object") {
      return [];
    }

    // Get content array
    const content = message["content"];
    if (!Array.isArray(content)) {
      return [];
    }

    // Scan content blocks for TodoWrite tool calls
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        block.type === "tool_use" &&
        block.name === "TodoWrite"
      ) {
        // Extract input.todos
        const input = block.input as { todos?: unknown } | undefined;
        if (!input || typeof input !== "object") {
          continue;
        }

        const todos = input.todos;
        if (!Array.isArray(todos)) {
          continue;
        }

        // Validate and map todos to Task interface
        const tasks: Task[] = [];
        for (const todo of todos) {
          if (typeof todo !== "object" || todo === null) {
            continue;
          }

          // Type guard: check that todo has required fields
          const content = (todo as Record<string, unknown>)["content"];
          const status = (todo as Record<string, unknown>)["status"];
          const activeForm = (todo as Record<string, unknown>)["activeForm"];

          if (
            typeof content === "string" &&
            typeof status === "string" &&
            (status === "pending" ||
              status === "in_progress" ||
              status === "completed") &&
            typeof activeForm === "string"
          ) {
            tasks.push({
              content,
              status,
              activeForm,
            });
          }
        }

        // Return tasks from first TodoWrite call found
        return tasks;
      }
    }

    return [];
  }

  /**
   * Extract token usage statistics from an assistant message record.
   *
   * Parses usage field from assistant messages containing token counts.
   * Returns undefined if no usage data is present.
   *
   * @param record - Raw JSONL record object (expected structure: RawMessageEntry)
   * @returns Token usage stats or undefined if not present
   * @private
   */
  private extractUsage(
    record: Record<string, unknown>,
  ): TokenUsage | undefined {
    const message = record["message"] as Record<string, unknown> | undefined;
    const usage = message?.["usage"] as Record<string, unknown> | undefined;

    if (!usage) {
      return undefined;
    }

    return {
      input: (usage["input_tokens"] as number) ?? 0,
      output: (usage["output_tokens"] as number) ?? 0,
      cacheRead: usage["cache_read_input_tokens"] as number | undefined,
      cacheWrite: usage["cache_creation_input_tokens"] as number | undefined,
    };
  }

  /**
   * Aggregate token usage across multiple messages.
   *
   * Sums up token counts from all usage entries.
   * Returns undefined if no usage data provided.
   *
   * @param usages - Array of token usage entries to aggregate
   * @returns Aggregated token usage or undefined if empty
   * @private
   */
  private aggregateUsage(
    usages: readonly TokenUsage[],
  ): TokenUsage | undefined {
    if (usages.length === 0) {
      return undefined;
    }

    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;

    for (const usage of usages) {
      totalInput += usage.input;
      totalOutput += usage.output;
      totalCacheRead += usage.cacheRead ?? 0;
      totalCacheWrite += usage.cacheWrite ?? 0;
    }

    return {
      input: totalInput,
      output: totalOutput,
      cacheRead: totalCacheRead > 0 ? totalCacheRead : undefined,
      cacheWrite: totalCacheWrite > 0 ? totalCacheWrite : undefined,
    };
  }

  /**
   * Read and parse a complete session from a session file.
   *
   * Reads the session.jsonl file and parses it into a Session object.
   * The file should contain JSONL-formatted session data.
   *
   * @param path - Path to the session.jsonl file
   * @returns Result containing the parsed Session or an error
   */
  async readSession(path: string): Promise<Result<Session, AgentError>> {
    // Read file content
    let content: string;
    try {
      content = await this.fileSystem.readFile(path);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(path));
    }

    // Parse JSONL content
    const parseResult = parseJsonl<unknown>(content, path);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const lines = parseResult.value;

    // Extract session metadata and messages from parsed lines
    // Claude Code session files contain various event types (user, assistant, system, etc.)
    // We need to extract messages and metadata from these events
    const messages: Message[] = [];
    const usages: TokenUsage[] = [];
    let sessionId = "";
    let projectPath = "";
    let status: Session["status"] = "active";
    let createdAt = "";
    let updatedAt = "";
    let tasks: readonly Task[] = [];

    for (const line of lines) {
      // Type guard: ensure line is an object
      if (typeof line !== "object" || line === null) {
        continue;
      }

      const record = line as Record<string, unknown>;

      // Extract messages from user/assistant entries
      const message = this.extractMessage(record);
      if (message) {
        messages.push(message);
      }

      // Extract tasks and usage from assistant messages
      const type = record["type"] as string | undefined;
      if (type === "assistant") {
        // Extract tasks from TodoWrite calls (keep latest)
        const extractedTasks = this.extractTasks(record);
        if (extractedTasks.length > 0) {
          tasks = extractedTasks;
        }

        // Extract token usage statistics
        const usage = this.extractUsage(record);
        if (usage) {
          usages.push(usage);
        }
      }

      // Extract session metadata
      if (typeof record["sessionId"] === "string") {
        sessionId = record["sessionId"];
      }

      // Extract project path from cwd field (most accurate)
      if (!projectPath && typeof record["cwd"] === "string") {
        projectPath = record["cwd"];
      }

      // Track timestamps for createdAt/updatedAt
      if (typeof record["timestamp"] === "string") {
        if (!createdAt) {
          createdAt = record["timestamp"];
        }
        updatedAt = record["timestamp"];
      }
    }

    // Fallback to deriving project path from directory name if not found in session
    if (!projectPath) {
      projectPath = this.deriveProjectPath(path);
    }

    // Use current timestamp if not found in file
    const now = new Date().toISOString();
    if (createdAt === "") {
      createdAt = now;
    }
    if (updatedAt === "") {
      updatedAt = now;
    }

    // Derive session ID from path if not found in content
    if (sessionId === "") {
      sessionId = this.deriveSessionIdFromPath(path);
    }

    // Aggregate token usage from all assistant messages
    const tokenUsage = this.aggregateUsage(usages);

    const session: Session = {
      id: sessionId,
      projectPath,
      status,
      createdAt,
      updatedAt,
      messages,
      tasks,
      tokenUsage,
    };

    return ok(session);
  }

  /**
   * Read and parse messages from a session file.
   *
   * Returns only the messages, without other session metadata.
   * Useful for streaming or partial session reading.
   *
   * @param path - Path to the session.jsonl file
   * @returns Result containing array of messages or an error
   */
  async readMessages(
    path: string,
  ): Promise<Result<readonly Message[], AgentError>> {
    const sessionResult = await this.readSession(path);
    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    return ok(sessionResult.value.messages);
  }

  /**
   * Find all session files in a project directory.
   *
   * Searches for UUID-named session files (e.g., {uuid}.jsonl) in the Claude Code project directory.
   * Session files are stored flat within each project hash subdirectory.
   * The directory structure is: ~/.claude/projects/<project-hash>/{uuid}.jsonl
   *
   * When searching from ~/.claude/projects, this will look one level deep into each project-hash
   * directory. When searching from a specific project-hash directory, it searches that directory only.
   *
   * @param projectPath - Path to the project root or Claude directory
   * @returns Array of paths to session files
   */
  async findSessionFiles(projectPath: string): Promise<readonly string[]> {
    const sessionFiles: string[] = [];

    // Check if the path exists
    const pathExists = await this.fileSystem.exists(projectPath);
    if (!pathExists) {
      return sessionFiles;
    }

    // Check if it's a directory
    try {
      const stat = await this.fileSystem.stat(projectPath);
      if (!stat.isDirectory) {
        // If it's a file matching session pattern, return it directly
        const filename = projectPath.split("/").pop() ?? "";
        if (isSessionFile(filename)) {
          return [projectPath];
        }
        return sessionFiles;
      }
    } catch {
      return sessionFiles;
    }

    // Read directory contents
    try {
      const entries = await this.fileSystem.readDir(projectPath);

      for (const entry of entries) {
        const entryPath = `${projectPath}/${entry}`;

        // Check if entry matches session file pattern
        if (isSessionFile(entry)) {
          sessionFiles.push(entryPath);
          continue;
        }

        // Check subdirectories (one level deep for ~/.claude/projects structure)
        try {
          const entryStat = await this.fileSystem.stat(entryPath);
          if (entryStat.isDirectory) {
            const subEntries = await this.fileSystem.readDir(entryPath);
            for (const subEntry of subEntries) {
              if (isSessionFile(subEntry)) {
                sessionFiles.push(`${entryPath}/${subEntry}`);
              }
            }
          }
        } catch {
          // Ignore errors for individual entries
        }
      }
    } catch {
      // Ignore errors during directory traversal
    }

    return sessionFiles;
  }

  /**
   * List all sessions with optional filtering by project path.
   *
   * Returns lightweight SessionMetadata objects (without full messages)
   * suitable for listing and indexing. If no projectPath is provided,
   * searches all sessions in the default Claude data directory.
   *
   * @param projectPath - Optional path to filter sessions by project
   * @returns Array of session metadata objects
   */
  async listSessions(
    projectPath?: string,
  ): Promise<readonly SessionMetadata[]> {
    const searchPath = projectPath ?? this.getDefaultClaudeProjectsDir();
    const sessionFiles = await this.findSessionFiles(searchPath);
    const sessions: SessionMetadata[] = [];

    for (const filePath of sessionFiles) {
      const result = await this.readSession(filePath);
      if (result.isOk()) {
        sessions.push(toSessionMetadata(result.value));
      }
    }

    return sessions;
  }

  /**
   * Get a single session by its ID.
   *
   * Searches for the session in the Claude data directory and returns
   * the full Session object if found.
   *
   * @param sessionId - Unique session identifier
   * @returns Session object if found, null otherwise
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const claudeDir = this.getDefaultClaudeProjectsDir();
    const sessionFiles = await this.findSessionFiles(claudeDir);

    for (const filePath of sessionFiles) {
      const result = await this.readSession(filePath);
      if (result.isOk() && result.value.id === sessionId) {
        return result.value;
      }
    }

    return null;
  }

  /**
   * Get messages for a specific session by ID.
   *
   * Convenience method that finds the session and returns only its messages.
   *
   * @param sessionId - Unique session identifier
   * @returns Array of messages if session found, empty array otherwise
   */
  async getMessages(sessionId: string): Promise<readonly Message[]> {
    const session = await this.getSession(sessionId);
    return session?.messages ?? [];
  }

  /**
   * List sessions by working directory path.
   *
   * Reads session entries from sessions-index.json if present, otherwise builds
   * entries by parsing JSONL files in the project directory.
   *
   * @param options - Filtering, sorting, and pagination options
   * @returns Paginated response containing session entries
   */
  async listSessionsByWorkingDirectory(
    options: ListSessionsByPathOptions,
  ): Promise<SessionListResponse> {
    const {
      workingDirectory,
      search,
      offset = 0,
      limit = 50,
      sortBy = "modified",
      sortOrder = "desc",
    } = options;

    // Encode path to directory name
    const encodedPath = SessionReader.encodeProjectPath(workingDirectory);
    const projectDirPath = `${this.getDefaultClaudeProjectsDir()}/${encodedPath}`;

    // Try sessions-index.json first
    let entries: SessionIndexEntry[] = [];
    const indexPath = `${projectDirPath}/sessions-index.json`;

    try {
      const indexContent = await this.fileSystem.readFile(indexPath);
      const index = JSON.parse(indexContent) as SessionIndex;
      if (Array.isArray(index.entries)) {
        entries = [...index.entries];
      }
    } catch {
      // No sessions-index.json or parse error - fall back to building from JSONL files
    }

    // If no entries from index, build from JSONL files
    if (entries.length === 0) {
      entries = await this.buildEntriesFromJsonlFiles(
        projectDirPath,
        workingDirectory,
      );
    }

    // Apply search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.firstPrompt.toLowerCase().includes(lowerSearch) ||
          e.summary.toLowerCase().includes(lowerSearch),
      );
    }

    // Sort
    entries.sort((a, b) => {
      const aVal = sortBy === "modified" ? a.modified : a.created;
      const bVal = sortBy === "modified" ? b.modified : b.created;
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    // Total before pagination
    const total = entries.length;

    // Apply pagination
    const paginated = entries.slice(offset, offset + limit);

    return {
      sessions: paginated,
      total,
      offset,
      limit,
    };
  }

  /**
   * Read raw transcript events from a session's JSONL file.
   *
   * Returns parsed TranscriptEvent objects with pagination support.
   * Uses JsonlStreamParser for consistent parsing with the polling system.
   *
   * @param sessionId - Unique session identifier
   * @param options - Pagination options (offset and limit)
   * @returns Result containing events array, total count, and token usage, or an error
   */
  async readTranscript(
    sessionId: string,
    options?: { offset?: number; limit?: number },
  ): Promise<
    Result<
      {
        events: readonly TranscriptEvent[];
        total: number;
        tokenUsage?: TokenUsage;
      },
      AgentError
    >
  > {
    // Find session file path
    const filePath = await this.findSessionFilePath(sessionId);
    if (filePath === null) {
      return err(new FileNotFoundError(`Session not found: ${sessionId}`));
    }

    // Read file content
    let content: string;
    try {
      content = await this.fileSystem.readFile(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(filePath));
    }

    // Parse all events using JsonlStreamParser
    const parser = new JsonlStreamParser();
    const allEvents = parser.feed(content);
    const flushed = parser.flush();
    const events = [...allEvents, ...flushed];

    const total = events.length;

    // Extract and aggregate token usage from assistant events
    const usages: TokenUsage[] = [];
    for (const event of events) {
      if (event.type === "assistant") {
        const usage = this.extractUsage(event.raw as Record<string, unknown>);
        if (usage) {
          usages.push(usage);
        }
      }
    }
    const tokenUsage = this.aggregateUsage(usages);

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? total;
    const paginatedEvents = events.slice(offset, offset + limit);

    // Build result object with optional tokenUsage field
    if (tokenUsage !== undefined) {
      return ok({ events: paginatedEvents, total, tokenUsage });
    }
    return ok({ events: paginatedEvents, total });
  }

  /**
   * Read token usage for a specific session by ID.
   *
   * Extracts and aggregates token usage from all assistant messages
   * in the session without parsing full message content.
   *
   * @param sessionId - Unique session identifier
   * @returns Result containing token usage or undefined if no usage data, or an error
   */
  async readSessionUsage(
    sessionId: string,
  ): Promise<Result<TokenUsage | undefined, AgentError>> {
    // Find session file path
    const filePath = await this.findSessionFilePath(sessionId);
    if (filePath === null) {
      return err(new FileNotFoundError(`Session not found: ${sessionId}`));
    }

    // Read file content
    let content: string;
    try {
      content = await this.fileSystem.readFile(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(filePath));
    }

    // Parse JSONL and extract usage data
    const parseResult = parseJsonl<unknown>(content, filePath);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const lines = parseResult.value;
    const usages: TokenUsage[] = [];

    for (const line of lines) {
      // Type guard: ensure line is an object
      if (typeof line !== "object" || line === null) {
        continue;
      }

      const record = line as Record<string, unknown>;

      // Extract usage from assistant messages
      const type = record["type"] as string | undefined;
      if (type === "assistant") {
        const usage = this.extractUsage(record);
        if (usage) {
          usages.push(usage);
        }
      }
    }

    const tokenUsage = this.aggregateUsage(usages);
    return ok(tokenUsage);
  }

  /**
   * Search full transcript content for a single session.
   *
   * Scans the entire JSONL transcript line-by-line by default and supports
   * case sensitivity, role filtering, byte limits, match limits, and timeout.
   *
   * @param sessionId - Unique session identifier
   * @param query - Search text
   * @param options - Search behavior options
   * @returns Result containing transcript search summary, or an error
   */
  async searchTranscript(
    sessionId: string,
    query: string,
    options: TranscriptSearchOptions = {},
  ): Promise<Result<TranscriptSearchResult, AgentError>> {
    const trimmedQuery = query.trim();
    if (trimmedQuery === "") {
      return ok({
        sessionId,
        matched: false,
        matchCount: 0,
        scannedBytes: 0,
        scannedLines: 0,
        truncated: false,
        timedOut: false,
      });
    }

    const filePath = await this.findSessionFilePath(sessionId);
    if (filePath === null) {
      return err(new FileNotFoundError(`Session not found: ${sessionId}`));
    }

    let content: string;
    try {
      content = await this.fileSystem.readFile(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(filePath));
    }

    return ok(
      this.searchTranscriptInContent(sessionId, content, trimmedQuery, options),
    );
  }

  /**
   * Search multiple sessions and return matching session IDs.
   *
   * @param query - Search text
   * @param options - Search and pagination options
   * @returns Paginated list of matching session IDs and scan metadata
   */
  async searchSessions(
    query: string,
    options: SearchSessionsOptions = {},
  ): Promise<SessionSearchResponse> {
    const trimmedQuery = query.trim();
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;

    if (trimmedQuery === "") {
      return {
        sessionIds: [],
        total: 0,
        offset,
        limit,
        scannedSessions: 0,
        truncated: false,
        timedOut: false,
      };
    }

    const searchPath = options.projectPath ?? this.getDefaultClaudeProjectsDir();
    const allSessionFiles = await this.findSessionFiles(searchPath);
    const source = options.source ?? "all";
    const workingDirectoryPrefix = options.workingDirectoryPrefix;
    const projectPathPrefix = options.projectPathPrefix;
    const sessionFiles = allSessionFiles.filter((filePath) => {
      if (!this.matchesSessionSource(filePath, source)) {
        return false;
      }
      if (
        workingDirectoryPrefix !== undefined &&
        !this.matchesWorkingDirectoryPrefix(filePath, workingDirectoryPrefix)
      ) {
        return false;
      }
      if (
        projectPathPrefix !== undefined &&
        !this.matchesWorkingDirectoryPrefix(filePath, projectPathPrefix)
      ) {
        return false;
      }
      return true;
    });

    const matchedSessionIds: string[] = [];
    const maxSessions = options.maxSessions;
    const maxSessionsToScan =
      maxSessions !== undefined && maxSessions >= 0
        ? maxSessions
        : Number.POSITIVE_INFINITY;

    let scannedSessions = 0;
    let truncated = false;
    let timedOut = false;

    for (const filePath of sessionFiles) {
      if (scannedSessions >= maxSessionsToScan) {
        truncated = true;
        break;
      }

      scannedSessions += 1;
      const sessionId = this.deriveSessionIdFromPath(filePath);

      let content: string;
      try {
        content = await this.fileSystem.readFile(filePath);
      } catch {
        continue;
      }

      const searchResult = this.searchTranscriptInContent(
        sessionId,
        content,
        trimmedQuery,
        options,
      );

      if (searchResult.timedOut) {
        timedOut = true;
      }
      if (searchResult.truncated) {
        truncated = true;
      }
      if (searchResult.matched) {
        matchedSessionIds.push(sessionId);
      }
    }

    const total = matchedSessionIds.length;
    const paginatedSessionIds = matchedSessionIds.slice(offset, offset + limit);

    return {
      sessionIds: paginatedSessionIds,
      total,
      offset,
      limit,
      scannedSessions,
      truncated,
      timedOut,
    };
  }

  /**
   * Find the file path for a session by its ID.
   *
   * Searches all session files in the Claude projects directory and
   * returns the path of the file matching the given session ID.
   * The session ID is derived from the filename (UUID.jsonl -> UUID).
   *
   * @param sessionId - Unique session identifier
   * @returns File path if found, null otherwise
   * @private
   */
  private async findSessionFilePath(sessionId: string): Promise<string | null> {
    const claudeDir = this.getDefaultClaudeProjectsDir();
    const sessionFiles = await this.findSessionFiles(claudeDir);

    // The session ID is derived from filename: uuid.jsonl -> uuid
    for (const filePath of sessionFiles) {
      const derivedId = this.deriveSessionIdFromPath(filePath);
      if (derivedId === sessionId) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Search transcript content without filesystem access.
   *
   * @param sessionId - Session identifier to include in result
   * @param content - JSONL transcript text
   * @param query - Non-empty query string
   * @param options - Search options
   * @returns Search result with scan metadata
   * @private
   */
  private searchTranscriptInContent(
    sessionId: string,
    content: string,
    query: string,
    options: TranscriptSearchOptions,
  ): TranscriptSearchResult {
    const caseSensitive = options.caseSensitive ?? false;
    const role = options.role ?? "both";
    const maxMatches = options.maxMatches ?? 1;
    const maxBytes = options.maxBytes;
    const timeoutMs = options.timeoutMs;
    const deadline =
      timeoutMs !== undefined && timeoutMs >= 0 ? Date.now() + timeoutMs : null;

    const normalizedQuery = caseSensitive ? query : query.toLowerCase();
    const lines = content.split(/\r?\n/);

    let matchCount = 0;
    let scannedBytes = 0;
    let scannedLines = 0;
    let truncated = false;
    let timedOut = false;

    for (const line of lines) {
      if (line.trim() === "") {
        continue;
      }

      if (deadline !== null && Date.now() > deadline) {
        truncated = true;
        timedOut = true;
        break;
      }

      const lineBytes = Buffer.byteLength(line, "utf8") + 1;
      if (
        maxBytes !== undefined &&
        maxBytes >= 0 &&
        scannedBytes + lineBytes > maxBytes
      ) {
        truncated = true;
        break;
      }

      scannedBytes += lineBytes;
      scannedLines += 1;

      const parsed = this.tryParseJsonRecord(line);
      if (parsed === null) {
        continue;
      }

      if (!this.matchesRoleFilter(parsed, role)) {
        continue;
      }

      const searchableText = this.extractSearchableText(parsed);
      if (searchableText === "") {
        continue;
      }

      const normalizedText = caseSensitive
        ? searchableText
        : searchableText.toLowerCase();
      if (normalizedText.includes(normalizedQuery)) {
        matchCount += 1;
        if (maxMatches >= 0 && matchCount >= maxMatches) {
          truncated = scannedLines < lines.length;
          break;
        }
      }
    }

    return {
      sessionId,
      matched: matchCount > 0,
      matchCount,
      scannedBytes,
      scannedLines,
      truncated,
      timedOut,
    };
  }

  /**
   * Parse a JSONL line into a record.
   *
   * @param line - Raw JSON line
   * @returns Parsed record or null when invalid
   * @private
   */
  private tryParseJsonRecord(line: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(line) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Check whether a record matches the requested role filter.
   *
   * @param record - Parsed transcript record
   * @param role - Role filter
   * @returns True when record should be included in scan
   * @private
   */
  private matchesRoleFilter(
    record: Record<string, unknown>,
    role: TranscriptSearchRole,
  ): boolean {
    if (role === "both") {
      return true;
    }

    const type = record["type"];
    if (type === "user" || type === "assistant") {
      return type === role;
    }

    const message = record["message"];
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const messageRole = (message as Record<string, unknown>)["role"];
    return messageRole === role;
  }

  /**
   * Extract searchable text from a transcript record.
   *
   * @param record - Parsed transcript record
   * @returns Concatenated text to scan
   * @private
   */
  private extractSearchableText(record: Record<string, unknown>): string {
    const collected: string[] = [];
    this.collectStringValues(record["message"], collected, 0, 6);

    // Fallback for entries that store text outside message object
    if (collected.length === 0) {
      this.collectStringValues(record, collected, 0, 4);
    }

    return collected.join("\n");
  }

  /**
   * Recursively collect string values from nested JSON-like data.
   *
   * @param value - Value to scan
   * @param output - Mutable output string array
   * @param depth - Current recursion depth
   * @param maxDepth - Maximum recursion depth
   * @private
   */
  private collectStringValues(
    value: unknown,
    output: string[],
    depth: number,
    maxDepth: number,
  ): void {
    if (value === null || value === undefined || depth > maxDepth) {
      return;
    }

    if (typeof value === "string") {
      output.push(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.collectStringValues(item, output, depth + 1, maxDepth);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    for (const child of Object.values(value)) {
      this.collectStringValues(child, output, depth + 1, maxDepth);
    }
  }

  /**
   * Check if a session file path matches source filter.
   *
   * @param filePath - Full transcript file path
   * @param source - Source filter
   * @returns True when file should be searched
   * @private
   */
  private matchesSessionSource(
    filePath: string,
    source: SessionSearchSource,
  ): boolean {
    if (source === "all") {
      return true;
    }

    const filename = filePath.split("/").pop() ?? "";
    if (source === "legacy") {
      return filename === "session.jsonl";
    }

    return UUID_SESSION_PATTERN.test(filename);
  }

  /**
   * Check whether a session file belongs to a project path prefix.
   *
   * Uses path-derived project metadata, so it can be applied before reading
   * transcript content.
   *
   * @param filePath - Full transcript file path
   * @param workingDirectoryPrefix - Required project path prefix
   * @returns True when session's project path starts with the prefix
   * @private
   */
  private matchesWorkingDirectoryPrefix(
    filePath: string,
    workingDirectoryPrefix: string,
  ): boolean {
    const prefix = workingDirectoryPrefix.trim();
    if (prefix === "") {
      return true;
    }

    const projectPath = this.deriveProjectPath(filePath);
    return projectPath.startsWith(prefix);
  }

  /**
   * Get the default Claude projects directory.
   *
   * Returns the path to ~/.claude/projects where Claude Code stores sessions.
   *
   * @returns Path to Claude projects directory
   * @private
   */
  private getDefaultClaudeProjectsDir(): string {
    const config = getDefaultConfig();
    const claudeDataDir =
      config.claudeDataDir ?? `${process.env["HOME"] ?? ""}/.claude`;
    return `${claudeDataDir}/projects`;
  }

  /**
   * Derive a session ID from the file path.
   *
   * For UUID-named files: Extracts UUID from filename
   *   Example: ~/.claude/projects/abc123/88487b4c-xxx.jsonl -> 88487b4c-xxx
   *
   * For legacy session.jsonl: Extracts directory name
   *   Example: ~/.claude/projects/abc123/session.jsonl -> abc123
   *
   * @param path - Path to the session file
   * @returns Derived session ID
   */
  private deriveSessionIdFromPath(path: string): string {
    // Extract filename from path
    const parts = path.split("/");
    const filename = parts[parts.length - 1] ?? "unknown.jsonl";

    // For legacy session.jsonl format, use parent directory name
    if (filename === "session.jsonl") {
      const dirName = parts[parts.length - 2];
      return dirName ?? "unknown";
    }

    // For UUID files, remove .jsonl extension to get UUID
    if (filename.endsWith(".jsonl")) {
      return filename.slice(0, -".jsonl".length);
    }

    return filename;
  }

  /**
   * Derive project path from the encoded directory name in Claude file path.
   *
   * Claude Code encodes project paths by replacing slashes with dashes.
   * Example: ~/.claude/projects/-g-gits-project/session.jsonl -> /g/gits/project
   *
   * @param filePath - Full path to the session file
   * @returns Decoded project path, or empty string if path doesn't contain "projects/" segment
   */
  private deriveProjectPath(filePath: string): string {
    // Split path into segments
    const parts = filePath.split("/");

    // Find the "projects" segment
    const projectsIndex = parts.indexOf("projects");

    // Check if "projects" segment exists and has a next segment (the encoded path)
    if (projectsIndex >= 0 && projectsIndex + 1 < parts.length) {
      const encodedPath = parts[projectsIndex + 1];

      // Handle undefined case (noUncheckedIndexedAccess)
      if (!encodedPath) {
        return "";
      }

      // Decode: replace dashes with slashes
      // Claude encodes "/g/gits/project" as "-g-gits-project"
      // Leading dash indicates root, remaining dashes are path separators
      if (encodedPath.startsWith("-")) {
        return encodedPath.replace(/-/g, "/");
      }

      // If no leading dash, it's a relative path (shouldn't happen in practice)
      return encodedPath.replace(/-/g, "/");
    }

    return "";
  }

  /**
   * Build SessionIndexEntry objects from JSONL files when sessions-index.json is missing.
   *
   * Scans all JSONL session files in the project directory and extracts metadata
   * to construct SessionIndexEntry objects.
   *
   * @param projectDirPath - Path to the project directory
   * @param workingDirectory - Original working directory path (for projectPath field)
   * @returns Array of session index entries built from JSONL files
   * @private
   */
  private async buildEntriesFromJsonlFiles(
    projectDirPath: string,
    workingDirectory: string,
  ): Promise<SessionIndexEntry[]> {
    const sessionFiles = await this.findSessionFiles(projectDirPath);
    const entries: SessionIndexEntry[] = [];

    for (const filePath of sessionFiles) {
      try {
        const content = await this.fileSystem.readFile(filePath);
        const parseResult = parseJsonl<unknown>(content, filePath);
        if (parseResult.isErr()) {
          continue;
        }

        const lines = parseResult.value;
        let firstPrompt = "";
        let summary = "";
        let sessionId = "";
        let gitBranch = "";
        let firstTimestamp = "";
        let lastTimestamp = "";

        for (const line of lines) {
          if (typeof line !== "object" || line === null) {
            continue;
          }
          const record = line as Record<string, unknown>;

          // Extract sessionId
          if (!sessionId && typeof record["sessionId"] === "string") {
            sessionId = record["sessionId"];
          }

          // Extract git branch
          if (!gitBranch && typeof record["gitBranch"] === "string") {
            gitBranch = record["gitBranch"];
          }

          // Track timestamps
          if (typeof record["timestamp"] === "string") {
            if (!firstTimestamp) {
              firstTimestamp = record["timestamp"];
            }
            lastTimestamp = record["timestamp"];
          }

          // Extract first user prompt
          const type = record["type"] as string | undefined;
          if (type === "user" && !firstPrompt) {
            const message = record["message"] as
              | Record<string, unknown>
              | undefined;
            if (message && typeof message === "object") {
              const msgContent = message["content"];
              if (typeof msgContent === "string") {
                firstPrompt = msgContent.slice(0, 200);
              } else if (Array.isArray(msgContent)) {
                // Extract text from content blocks
                for (const block of msgContent) {
                  if (
                    typeof block === "object" &&
                    block !== null &&
                    (block as Record<string, unknown>)["type"] === "text"
                  ) {
                    const text = (block as Record<string, unknown>)["text"];
                    if (typeof text === "string") {
                      firstPrompt = text.slice(0, 200);
                      break;
                    }
                  }
                }
              }
            }
          }

          // Extract summary from the last summary event
          if (type === "summary") {
            const message = record["message"] as
              | Record<string, unknown>
              | undefined;
            if (message && typeof message === "object") {
              const msgContent = message["content"];
              if (typeof msgContent === "string") {
                summary = msgContent.slice(0, 200);
              }
            }
          }
        }

        // Derive session ID from path if not found
        if (!sessionId) {
          sessionId = this.deriveSessionIdFromPath(filePath);
        }

        const now = new Date().toISOString();

        entries.push({
          sessionId,
          fullPath: filePath,
          firstPrompt,
          summary,
          modified: lastTimestamp || now,
          created: firstTimestamp || now,
          gitBranch,
          projectPath: workingDirectory,
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return entries;
  }
}
