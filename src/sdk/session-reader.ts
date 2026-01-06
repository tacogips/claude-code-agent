/**
 * Session file reader for Claude Code sessions.
 *
 * Reads and parses Claude Code session files from the ~/.claude/projects directory.
 * Session data is stored in JSONL format (JSON Lines).
 *
 * @module sdk/session-reader
 */

import type { Container } from "../container";
import type { Session } from "../types/session";
import type { Message, ToolCall, ToolResult } from "../types/message";
import { type Result, ok, err } from "../result";
import { FileNotFoundError, type AgentError } from "../errors";
import { parseJsonl } from "./jsonl-parser";

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
    // Claude Code session files contain various event types
    // We need to reconstruct the session from these events
    const messages: Message[] = [];
    let sessionId = "";
    let projectPath = "";
    let status: Session["status"] = "active";
    let createdAt = "";
    let updatedAt = "";

    for (const line of lines) {
      // Type guard: ensure line is an object
      if (typeof line !== "object" || line === null) {
        continue;
      }

      const record = line as Record<string, unknown>;

      // Extract message data
      if (
        typeof record["id"] === "string" &&
        typeof record["role"] === "string" &&
        typeof record["content"] === "string" &&
        typeof record["timestamp"] === "string"
      ) {
        const toolCalls = this.parseToolCalls(record["toolCalls"]);
        const toolResults = this.parseToolResults(record["toolResults"]);

        const message: Message = {
          id: record["id"],
          role: record["role"] as Message["role"],
          content: record["content"],
          timestamp: record["timestamp"],
          toolCalls,
          toolResults,
        };
        messages.push(message);
      }

      // Extract session metadata
      if (typeof record["sessionId"] === "string") {
        sessionId = record["sessionId"];
      }
      if (typeof record["projectPath"] === "string") {
        projectPath = record["projectPath"];
      }
      if (
        typeof record["status"] === "string" &&
        (record["status"] === "active" ||
          record["status"] === "paused" ||
          record["status"] === "completed" ||
          record["status"] === "failed")
      ) {
        status = record["status"];
      }
      if (typeof record["createdAt"] === "string") {
        createdAt = record["createdAt"];
      }
      if (typeof record["timestamp"] === "string") {
        updatedAt = record["timestamp"];
      }
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

    const session: Session = {
      id: sessionId,
      projectPath,
      status,
      createdAt,
      updatedAt,
      messages,
      tasks: [],
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
   * Searches for session.jsonl files in the Claude Code project directory.
   * The directory structure is typically ~/.claude/projects/<project-hash>/
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
        // If it's a file ending with session.jsonl, return it directly
        if (projectPath.endsWith("session.jsonl")) {
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

        // Check if it's session.jsonl
        if (entry === "session.jsonl") {
          sessionFiles.push(entryPath);
          continue;
        }

        // Recursively search subdirectories
        const entryStat = await this.fileSystem.stat(entryPath);
        if (entryStat.isDirectory) {
          const subFiles = await this.findSessionFiles(entryPath);
          sessionFiles.push(...subFiles);
        }
      }
    } catch {
      // Ignore errors during directory traversal
    }

    return sessionFiles;
  }

  /**
   * Derive a session ID from the file path.
   *
   * Extracts a meaningful ID from the path structure.
   * For example: ~/.claude/projects/abc123/session.jsonl -> abc123
   *
   * @param path - Path to the session file
   * @returns Derived session ID
   */
  private deriveSessionIdFromPath(path: string): string {
    // Remove trailing filename if present
    const dirPath = path.endsWith("session.jsonl")
      ? path.slice(0, -"session.jsonl".length - 1)
      : path;

    // Extract last path component as ID
    const parts = dirPath.split("/");
    const lastPart = parts[parts.length - 1];

    return lastPart ?? "unknown";
  }

  /**
   * Parse and validate toolCalls from unknown data.
   *
   * @param data - Potential toolCalls array
   * @returns Validated toolCalls or undefined
   */
  private parseToolCalls(data: unknown): readonly ToolCall[] | undefined {
    if (!Array.isArray(data) || data.length === 0) {
      return undefined;
    }

    const toolCalls: ToolCall[] = [];
    for (const item of data) {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "input" in item &&
        typeof item.input === "object" &&
        item.input !== null
      ) {
        toolCalls.push({
          id: item.id,
          name: item.name,
          input: item.input as Record<string, unknown>,
        });
      }
    }

    return toolCalls.length > 0 ? toolCalls : undefined;
  }

  /**
   * Parse and validate toolResults from unknown data.
   *
   * @param data - Potential toolResults array
   * @returns Validated toolResults or undefined
   */
  private parseToolResults(data: unknown): readonly ToolResult[] | undefined {
    if (!Array.isArray(data) || data.length === 0) {
      return undefined;
    }

    const toolResults: ToolResult[] = [];
    for (const item of data) {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "output" in item &&
        typeof item.output === "string" &&
        "isError" in item &&
        typeof item.isError === "boolean"
      ) {
        toolResults.push({
          id: item.id,
          output: item.output,
          isError: item.isError,
        });
      }
    }

    return toolResults.length > 0 ? toolResults : undefined;
  }
}
