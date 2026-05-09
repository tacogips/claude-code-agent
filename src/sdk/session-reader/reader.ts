/**
 * Session file reader for Claude Code sessions.
 *
 * Reads and parses Claude Code session files from the ~/.claude/projects directory.
 * Session data is stored in JSONL format (JSON Lines).
 *
 * @module sdk/session-reader/reader
 */

import type { Container } from "../../container";
import type { Session, SessionMetadata, TokenUsage } from "../../types/session";
import type { Message } from "../../types/message";
import { isToolRelatedMessage } from "../../types/message";
import type { Task } from "../../types/task";
import type {
  SessionIndex,
  SessionIndexEntry,
  SessionListResponse,
  ListSessionsByPathOptions,
  TranscriptSearchOptions,
  TranscriptSearchResult,
  SearchSessionsOptions,
  SessionSearchResponse,
} from "../../types/session-index";
import { type Result, ok, err } from "../../result";
import { FileNotFoundError, type AgentError } from "../../errors";
import { parseJsonl } from "../jsonl-parser";
import { toSessionMetadata } from "../../types/session";
import { JsonlStreamParser, type TranscriptEvent } from "../../polling/parser";
import { isSessionFile } from "./constants";
import {
  aggregateUsage,
  extractMessage,
  extractTasks,
  extractUsage,
} from "./message-extract";
import {
  encodeProjectPath as pathToEncodedClaudeProjectsDirName,
  deriveProjectPath,
  deriveSessionIdFromPath,
  getDefaultClaudeProjectsDir,
  matchesSessionSource,
  matchesWorkingDirectoryPrefix,
} from "./path-meta";
import { searchTranscriptInContent } from "./transcript-search";
import { buildSessionIndexEntriesFromJsonl } from "./session-index-builder";

/**
 * SessionReader reads and parses Claude Code session files.
 *
 * Uses the FileSystem abstraction from the container for testability.
 * Parses JSONL files to extract session data.
 */
export class SessionReader {
  private readonly fileSystem;

  constructor(container: Container) {
    this.fileSystem = container.fileSystem;
  }

  /**
   * Encode a working directory path to Claude Code project directory name format.
   */
  static encodeProjectPath(workingDirectory: string): string {
    return pathToEncodedClaudeProjectsDirName(workingDirectory);
  }

  async readSession(path: string): Promise<Result<Session, AgentError>> {
    let content: string;
    try {
      content = await this.fileSystem.readFile(path);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(path));
    }

    const parseResult = parseJsonl<unknown>(content, path);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const lines = parseResult.value;

    const messages: Message[] = [];
    const usages: TokenUsage[] = [];
    let sessionId = "";
    let projectPath = "";
    const status: Session["status"] = "active";
    let createdAt = "";
    let updatedAt = "";
    let tasks: readonly Task[] = [];

    for (const line of lines) {
      if (typeof line !== "object" || line === null) {
        continue;
      }

      const record = line as Record<string, unknown>;

      const message = extractMessage(record);
      if (message) {
        messages.push(message);
      }

      const type = record["type"] as string | undefined;
      if (type === "assistant") {
        const extractedTasks = extractTasks(record);
        if (extractedTasks.length > 0) {
          tasks = extractedTasks;
        }

        const usage = extractUsage(record);
        if (usage) {
          usages.push(usage);
        }
      }

      if (typeof record["sessionId"] === "string") {
        sessionId = record["sessionId"];
      }

      if (!projectPath && typeof record["cwd"] === "string") {
        projectPath = record["cwd"];
      }

      if (typeof record["timestamp"] === "string") {
        if (!createdAt) {
          createdAt = record["timestamp"];
        }
        updatedAt = record["timestamp"];
      }
    }

    if (!projectPath) {
      projectPath = deriveProjectPath(path);
    }

    const now = new Date().toISOString();
    if (createdAt === "") {
      createdAt = now;
    }
    if (updatedAt === "") {
      updatedAt = now;
    }

    if (sessionId === "") {
      sessionId = deriveSessionIdFromPath(path);
    }

    const tokenUsage = aggregateUsage(usages);

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

  async readMessages(
    path: string,
    options?: { excludeToolMessages?: boolean },
  ): Promise<Result<readonly Message[], AgentError>> {
    const sessionResult = await this.readSession(path);
    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    if (options?.excludeToolMessages) {
      return ok(
        sessionResult.value.messages.filter(
          (message) => !isToolRelatedMessage(message),
        ),
      );
    }

    return ok(sessionResult.value.messages);
  }

  async findSessionFiles(projectPath: string): Promise<readonly string[]> {
    const sessionFiles: string[] = [];

    const pathExists = await this.fileSystem.exists(projectPath);
    if (!pathExists) {
      return sessionFiles;
    }

    try {
      const stat = await this.fileSystem.stat(projectPath);
      if (!stat.isDirectory) {
        const filename = projectPath.split("/").pop() ?? "";
        if (isSessionFile(filename)) {
          return [projectPath];
        }
        return sessionFiles;
      }
    } catch {
      return sessionFiles;
    }

    try {
      const entries = await this.fileSystem.readDir(projectPath);

      for (const entry of entries) {
        const entryPath = `${projectPath}/${entry}`;

        if (isSessionFile(entry)) {
          sessionFiles.push(entryPath);
          continue;
        }

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
          /* ignore per-entry failures */
        }
      }
    } catch {
      /* ignore directory traversal failures */
    }

    return sessionFiles;
  }

  async listSessions(
    projectPath?: string,
  ): Promise<readonly SessionMetadata[]> {
    const searchPath = projectPath ?? getDefaultClaudeProjectsDir();
    const sessionPaths = await this.findSessionFiles(searchPath);
    const sessions: SessionMetadata[] = [];

    for (const filePath of sessionPaths) {
      const result = await this.readSession(filePath);
      if (result.isOk()) {
        sessions.push(toSessionMetadata(result.value));
      }
    }

    return sessions;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const claudeDir = getDefaultClaudeProjectsDir();
    const sessionPaths = await this.findSessionFiles(claudeDir);

    for (const filePath of sessionPaths) {
      const result = await this.readSession(filePath);
      if (result.isOk() && result.value.id === sessionId) {
        return result.value;
      }
    }

    return null;
  }

  async getMessages(
    sessionId: string,
    options?: { excludeToolMessages?: boolean },
  ): Promise<readonly Message[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    if (options?.excludeToolMessages) {
      return session.messages.filter(
        (message) => !isToolRelatedMessage(message),
      );
    }

    return session.messages;
  }

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

    const encodedPath = SessionReader.encodeProjectPath(workingDirectory);
    const projectDirPath = `${getDefaultClaudeProjectsDir()}/${encodedPath}`;

    let entries: SessionIndexEntry[] = [];
    const indexPath = `${projectDirPath}/sessions-index.json`;

    try {
      const indexContent = await this.fileSystem.readFile(indexPath);
      const index = JSON.parse(indexContent) as SessionIndex;
      if (Array.isArray(index.entries)) {
        entries = [...index.entries];
      }
    } catch {
      /* no index file */
    }

    if (entries.length === 0) {
      entries = await buildSessionIndexEntriesFromJsonl(
        {
          findSessionFiles: (p) => this.findSessionFiles(p),
          readFile: (p) => this.fileSystem.readFile(p),
        },
        projectDirPath,
        workingDirectory,
      );
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.firstPrompt.toLowerCase().includes(lowerSearch) ||
          e.summary.toLowerCase().includes(lowerSearch),
      );
    }

    entries.sort((a, b) => {
      const aVal = sortBy === "modified" ? a.modified : a.created;
      const bVal = sortBy === "modified" ? b.modified : b.created;
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const total = entries.length;

    const paginated = entries.slice(offset, offset + limit);

    return {
      sessions: paginated,
      total,
      offset,
      limit,
    };
  }

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

    const parser = new JsonlStreamParser();
    const allEvents = parser.feed(content);
    const flushed = parser.flush();
    const events = [...allEvents, ...flushed];

    const total = events.length;

    const usages: TokenUsage[] = [];
    for (const event of events) {
      if (event.type === "assistant") {
        const usage = extractUsage(event.raw as Record<string, unknown>);
        if (usage) {
          usages.push(usage);
        }
      }
    }
    const tokenUsage = aggregateUsage(usages);

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? total;
    const paginatedEvents = events.slice(offset, offset + limit);

    if (tokenUsage !== undefined) {
      return ok({ events: paginatedEvents, total, tokenUsage });
    }
    return ok({ events: paginatedEvents, total });
  }

  async readSessionUsage(
    sessionId: string,
  ): Promise<Result<TokenUsage | undefined, AgentError>> {
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

    const parseResult = parseJsonl<unknown>(content, filePath);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const lines = parseResult.value;
    const usages: TokenUsage[] = [];

    for (const line of lines) {
      if (typeof line !== "object" || line === null) {
        continue;
      }

      const record = line as Record<string, unknown>;

      const type = record["type"] as string | undefined;
      if (type === "assistant") {
        const usage = extractUsage(record);
        if (usage) {
          usages.push(usage);
        }
      }
    }

    const tokenUsage = aggregateUsage(usages);
    return ok(tokenUsage);
  }

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
      searchTranscriptInContent(sessionId, content, trimmedQuery, options),
    );
  }

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

    const searchPath = options.projectPath ?? getDefaultClaudeProjectsDir();
    const allSessionFiles = await this.findSessionFiles(searchPath);
    const source = options.source ?? "all";
    const workingDirectoryPrefix = options.workingDirectoryPrefix;
    const projectPathPrefix = options.projectPathPrefix;
    const sessionFiles = allSessionFiles.filter((filePath) => {
      if (!matchesSessionSource(filePath, source)) {
        return false;
      }
      if (
        workingDirectoryPrefix !== undefined &&
        !matchesWorkingDirectoryPrefix(filePath, workingDirectoryPrefix)
      ) {
        return false;
      }
      if (
        projectPathPrefix !== undefined &&
        !matchesWorkingDirectoryPrefix(filePath, projectPathPrefix)
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
      const sid = deriveSessionIdFromPath(filePath);

      let content: string;
      try {
        content = await this.fileSystem.readFile(filePath);
      } catch {
        continue;
      }

      const searchResult = searchTranscriptInContent(
        sid,
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
        matchedSessionIds.push(sid);
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

  private async findSessionFilePath(sessionId: string): Promise<string | null> {
    const claudeDir = getDefaultClaudeProjectsDir();
    const sessionPaths = await this.findSessionFiles(claudeDir);

    for (const filePath of sessionPaths) {
      const derivedId = deriveSessionIdFromPath(filePath);
      if (derivedId === sessionId) {
        return filePath;
      }
    }

    return null;
  }
}
