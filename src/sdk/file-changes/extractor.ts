/**
 * File change extractor for parsing file modifications from transcripts.
 *
 * Extracts and aggregates file changes from Claude Code session transcripts,
 * tracking Edit, Write, MultiEdit, and NotebookEdit tool invocations.
 *
 * @module sdk/file-changes/extractor
 */

import type { Container } from "../../container";
import type {
  FileChange,
  ChangedFile,
  ChangedFilesSummary,
  ModifyingTool,
  FileOperation,
} from "./types";
import { createTaggedLogger } from "../../logger";
import path from "node:path";

const logger = createTaggedLogger("file-changes");

/**
 * TranscriptEntry represents a parsed line from a Claude Code transcript.
 *
 * This is the raw structure we get from transcript JSONL files.
 */
interface TranscriptEntry {
  readonly type: string;
  readonly uuid?: string | undefined;
  readonly timestamp?: string | undefined;
  readonly content?: unknown;
  readonly raw: object;
}

/**
 * Options for extracting file changes.
 */
export interface ExtractOptions {
  /** Include old/new content in FileChange objects (default: false) */
  readonly includeContent?: boolean | undefined;

  /** Filter by file extensions (e.g., [".ts", ".tsx"]) */
  readonly extensions?: readonly string[] | undefined;

  /** Filter by directory prefixes (e.g., ["src/", "tests/"]) */
  readonly directories?: readonly string[] | undefined;
}

/**
 * FileChangeExtractor parses file changes from Claude Code transcripts.
 *
 * Reads transcript JSONL files and extracts all file modification operations
 * (Edit, Write, MultiEdit, NotebookEdit), aggregating them by file path.
 *
 * Usage:
 * ```typescript
 * const extractor = new FileChangeExtractor(container);
 * const summary = await extractor.extractFromSession(sessionId);
 * ```
 */
export class FileChangeExtractor {
  private readonly fileSystem;

  /**
   * Create a new FileChangeExtractor.
   *
   * @param container - Dependency injection container
   */
  constructor(container: Container) {
    this.fileSystem = container.fileSystem;
  }

  /**
   * Extract file changes from a session.
   *
   * Reads the session's transcript file and extracts all file modifications,
   * returning a complete summary with statistics.
   *
   * @param sessionId - Session UUID or transcript path
   * @param options - Extraction options (content inclusion, filters)
   * @returns Promise resolving to ChangedFilesSummary
   */
  async extractFromSession(
    sessionId: string,
    options?: ExtractOptions | undefined,
  ): Promise<ChangedFilesSummary> {
    // Resolve transcript path from session ID
    const transcriptPath = this.resolveTranscriptPath(sessionId);

    logger.debug(`Extracting file changes from: ${transcriptPath}`);

    // Extract changed files and project path
    const result = await this.extractFromTranscript(transcriptPath, options);

    // Build summary
    const summary = this.buildSummary(
      sessionId,
      result.changedFiles,
      result.projectPath,
    );

    logger.debug(
      `Extracted ${summary.totalFilesChanged} files with ${summary.totalChanges} changes`,
    );

    return summary;
  }

  /**
   * Extract file changes from a transcript file.
   *
   * Parses the transcript JSONL file and returns all changed files
   * with their modifications.
   *
   * @param transcriptPath - Path to transcript JSONL file
   * @param options - Extraction options
   * @returns Promise resolving to object with changedFiles and projectPath
   */
  async extractFromTranscript(
    transcriptPath: string,
    options?: ExtractOptions | undefined,
  ): Promise<{ changedFiles: readonly ChangedFile[]; projectPath: string }> {
    // Read transcript file
    const content = await this.fileSystem.readFile(transcriptPath);

    // Parse JSONL entries
    const entries = this.parseTranscript(content);

    // Track changes by file path
    const fileMap = new Map<string, ChangedFile>();

    // Extract project path for normalization
    let projectPath = "";

    // Process each entry
    for (const entry of entries) {
      // Extract project path from session metadata
      if (
        entry.type === "session" &&
        typeof entry.raw === "object" &&
        entry.raw !== null &&
        "projectPath" in entry.raw &&
        typeof entry.raw.projectPath === "string"
      ) {
        projectPath = entry.raw.projectPath;
      }

      // Parse tool use entries
      const changes = this.parseToolUse(entry, options);
      for (const change of changes) {
        this.addChangeToMap(fileMap, change, projectPath);
      }

      // Enrich with file-history-snapshot data
      if (entry.type === "file-history-snapshot") {
        this.enrichWithSnapshot(fileMap, entry.raw);
      }
    }

    // Filter results
    const filtered = this.applyFilters(Array.from(fileMap.values()), options);

    // Use project path from session metadata, or fall back to deriving from transcript path
    const finalProjectPath =
      projectPath !== ""
        ? projectPath
        : this.extractProjectPath(transcriptPath);

    return { changedFiles: filtered, projectPath: finalProjectPath };
  }

  /**
   * Parse tool use entry and extract file changes if applicable.
   *
   * Looks for Edit, Write, MultiEdit, and NotebookEdit tool calls
   * and extracts the file path and content changes.
   *
   * Note: MultiEdit can modify multiple files, so this returns an array.
   *
   * @param entry - Transcript entry
   * @param options - Extraction options
   * @returns Array of FileChange (may be empty)
   */
  private parseToolUse(
    entry: TranscriptEntry,
    options?: ExtractOptions | undefined,
  ): FileChange[] {
    // Only process assistant messages with tool_use content
    if (entry.type !== "assistant") {
      return [];
    }

    const raw = entry.raw as Record<string, unknown>;

    // Extract message content array
    if (
      !("message" in raw) ||
      typeof raw["message"] !== "object" ||
      raw["message"] === null
    ) {
      return [];
    }

    const message = raw["message"] as Record<string, unknown>;
    if (
      !("content" in message) ||
      !Array.isArray(message["content"]) ||
      message["content"].length === 0
    ) {
      return [];
    }

    const changes: FileChange[] = [];

    // Find tool_use entries
    for (const content of message["content"]) {
      if (
        typeof content !== "object" ||
        content === null ||
        !("type" in content) ||
        content.type !== "tool_use"
      ) {
        continue;
      }

      const toolUse = content as Record<string, unknown>;

      // Check if it's a modifying tool
      if (!("name" in toolUse) || typeof toolUse["name"] !== "string") {
        continue;
      }

      const toolName = toolUse["name"];
      if (!this.isModifyingTool(toolName)) {
        continue;
      }

      // Extract file path and create change
      if (!("input" in toolUse) || typeof toolUse["input"] !== "object") {
        continue;
      }

      const input = toolUse["input"] as Record<string, unknown>;
      const timestamp = entry.timestamp ?? new Date().toISOString();
      const messageUuid = entry.uuid ?? "unknown";

      // Handle MultiEdit specially (multiple files)
      if (
        toolName === "MultiEdit" &&
        "edits" in input &&
        Array.isArray(input["edits"])
      ) {
        for (const edit of input["edits"]) {
          if (typeof edit !== "object" || edit === null) {
            continue;
          }

          const editRecord = edit as Record<string, unknown>;
          const filePath =
            typeof editRecord["file_path"] === "string"
              ? editRecord["file_path"]
              : null;

          if (filePath !== null) {
            const change = this.createFileChange(
              toolName as ModifyingTool,
              toolUse,
              editRecord,
              timestamp,
              messageUuid,
              filePath,
              options,
            );
            changes.push(change);
          }
        }
      } else {
        // Single file tools
        const filePath = this.extractFilePath(toolName, input);
        if (filePath !== null) {
          const change = this.createFileChange(
            toolName as ModifyingTool,
            toolUse,
            input,
            timestamp,
            messageUuid,
            filePath,
            options,
          );
          changes.push(change);
        }
      }
    }

    return changes;
  }

  /**
   * Extract file path from tool input.
   *
   * Different tools use different field names for the file path.
   *
   * @param toolName - Name of the tool
   * @param input - Tool input object
   * @returns File path or null if not found
   */
  private extractFilePath(
    toolName: string,
    input: Record<string, unknown>,
  ): string | null {
    switch (toolName) {
      case "Edit":
      case "Write":
        return typeof input["file_path"] === "string"
          ? input["file_path"]
          : null;

      case "NotebookEdit":
        return typeof input["notebook_path"] === "string"
          ? input["notebook_path"]
          : null;

      case "MultiEdit":
        // MultiEdit has an array of edits, take the first one
        if (
          "edits" in input &&
          Array.isArray(input["edits"]) &&
          input["edits"].length > 0
        ) {
          const firstEdit = input["edits"][0];
          if (
            typeof firstEdit === "object" &&
            firstEdit !== null &&
            "file_path" in firstEdit &&
            typeof firstEdit["file_path"] === "string"
          ) {
            return firstEdit["file_path"];
          }
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Create a FileChange object from tool use data.
   *
   * @param tool - Tool name
   * @param toolUse - Tool use object
   * @param input - Tool input object (for single edit within MultiEdit, this is the individual edit)
   * @param timestamp - Change timestamp
   * @param messageUuid - Message UUID
   * @param filePath - File path for this change
   * @param options - Extraction options
   * @returns FileChange object
   */
  private createFileChange(
    tool: ModifyingTool,
    toolUse: Record<string, unknown>,
    input: Record<string, unknown>,
    timestamp: string,
    messageUuid: string,
    filePath: string,
    options?: ExtractOptions | undefined,
  ): FileChange {
    const toolUseId =
      typeof toolUse["id"] === "string" ? toolUse["id"] : "unknown";

    // Extract content based on tool type
    let oldContent: string | undefined;
    let newContent = "";

    if (options?.includeContent === true) {
      switch (tool) {
        case "Edit":
          oldContent =
            typeof input["old_string"] === "string"
              ? input["old_string"]
              : undefined;
          newContent =
            typeof input["new_string"] === "string" ? input["new_string"] : "";
          break;

        case "Write":
          oldContent = undefined;
          newContent =
            typeof input["content"] === "string" ? input["content"] : "";
          break;

        case "MultiEdit":
          // For individual MultiEdit entry
          oldContent =
            typeof input["old_string"] === "string"
              ? input["old_string"]
              : undefined;
          newContent =
            typeof input["new_string"] === "string" ? input["new_string"] : "";
          break;

        case "NotebookEdit":
          // For notebooks, we could extract cell content
          newContent =
            typeof input["content"] === "string" ? input["content"] : "";
          break;
      }
    }

    const change: FileChange = {
      changeId: `${toolUseId}-${filePath}`,
      tool,
      timestamp,
      oldContent,
      newContent,
      toolUseId,
      messageUuid,
    };

    return change;
  }

  /**
   * Add a file change to the file map.
   *
   * Aggregates multiple changes to the same file.
   *
   * @param fileMap - Map of file paths to ChangedFile
   * @param change - File change to add
   * @param projectPath - Project root path for normalization
   */
  private addChangeToMap(
    fileMap: Map<string, ChangedFile>,
    change: FileChange,
    projectPath: string,
  ): void {
    // Extract file path from changeId
    // changeId format: "toolUseId-filePath" but toolUseId may contain dashes (e.g., "tool-001")
    // File paths always start with "/" for absolute paths
    // Find the index of the first "/" in the changeId
    const slashIndex = change.changeId.indexOf("/");
    if (slashIndex === -1) {
      return;
    }

    // Everything from the first "/" is the file path
    const filePath = change.changeId.slice(slashIndex);
    const normalizedPath = this.normalizePath(filePath, projectPath);
    const existing = fileMap.get(normalizedPath);

    if (existing !== undefined) {
      // Update existing entry
      const updatedChanges = [...existing.changes, change];
      const toolsUsed = this.mergeToolsUsed(existing.toolsUsed, change.tool);

      const updated: ChangedFile = {
        ...existing,
        changeCount: updatedChanges.length,
        lastModified: change.timestamp,
        toolsUsed,
        changes: updatedChanges,
      };

      fileMap.set(normalizedPath, updated);
    } else {
      // Create new entry
      const operation = this.determineOperation(change);

      const newFile: ChangedFile = {
        path: normalizedPath,
        operation,
        changeCount: 1,
        firstModified: change.timestamp,
        lastModified: change.timestamp,
        toolsUsed: [change.tool],
        changes: [change],
      };

      fileMap.set(normalizedPath, newFile);
    }
  }

  /**
   * Determine file operation type from change.
   *
   * @param change - File change
   * @returns File operation type
   */
  private determineOperation(change: FileChange): FileOperation {
    switch (change.tool) {
      case "Write":
        // Write creates new files or overwrites existing
        return change.oldContent === undefined ? "created" : "modified";

      case "Edit":
      case "MultiEdit":
      case "NotebookEdit":
        return "modified";

      default:
        return "modified";
    }
  }

  /**
   * Merge tool lists, avoiding duplicates.
   *
   * @param existing - Existing tools
   * @param newTool - New tool to add
   * @returns Merged tool list
   */
  private mergeToolsUsed(
    existing: readonly ModifyingTool[],
    newTool: ModifyingTool,
  ): readonly ModifyingTool[] {
    if (existing.includes(newTool)) {
      return existing;
    }
    return [...existing, newTool];
  }

  /**
   * Enrich file map with file-history-snapshot data.
   *
   * Adds version and backup file information from snapshots.
   *
   * @param fileMap - Map of file paths to ChangedFile
   * @param snapshot - Snapshot object from transcript
   */
  private enrichWithSnapshot(
    fileMap: Map<string, ChangedFile>,
    snapshot: object,
  ): void {
    if (
      typeof snapshot !== "object" ||
      snapshot === null ||
      !("snapshot" in snapshot)
    ) {
      return;
    }

    const snapshotData = snapshot["snapshot"] as Record<string, unknown>;
    if (
      !("trackedFileBackups" in snapshotData) ||
      typeof snapshotData["trackedFileBackups"] !== "object" ||
      snapshotData["trackedFileBackups"] === null
    ) {
      return;
    }

    const backups = snapshotData["trackedFileBackups"] as Record<
      string,
      unknown
    >;

    for (const [filePath, backup] of Object.entries(backups)) {
      const existing = fileMap.get(filePath);
      if (existing === undefined) {
        continue;
      }

      if (
        typeof backup === "object" &&
        backup !== null &&
        "version" in backup &&
        typeof backup.version === "number" &&
        "backupFileName" in backup &&
        typeof backup.backupFileName === "string"
      ) {
        const enriched: ChangedFile = {
          ...existing,
          version: backup.version,
          backupFileName: backup.backupFileName,
        };

        fileMap.set(filePath, enriched);
      }
    }
  }

  /**
   * Build ChangedFilesSummary from file map.
   *
   * @param sessionId - Session identifier
   * @param changedFiles - Array of changed files
   * @param projectPath - Project path from session metadata (or derived from transcript path)
   * @returns ChangedFilesSummary
   */
  private buildSummary(
    sessionId: string,
    changedFiles: readonly ChangedFile[],
    projectPath: string,
  ): ChangedFilesSummary {
    const totalFilesChanged = changedFiles.length;
    const totalChanges = changedFiles.reduce(
      (sum, file) => sum + file.changeCount,
      0,
    );

    // Calculate byExtension
    const byExtension: Record<string, number> = {};
    for (const file of changedFiles) {
      const ext = path.extname(file.path);
      const key = ext || "(no extension)";
      byExtension[key] = (byExtension[key] ?? 0) + 1;
    }

    // Calculate byDirectory
    const byDirectory: Record<string, number> = {};
    for (const file of changedFiles) {
      const dir = path.dirname(file.path);
      byDirectory[dir] = (byDirectory[dir] ?? 0) + 1;
    }

    // Determine session start/end from timestamps
    const timestamps = changedFiles.flatMap((file) =>
      file.changes.map((c) => c.timestamp),
    );
    const sessionStart =
      timestamps.length > 0 ? timestamps[0]! : new Date().toISOString();
    const sessionEnd =
      timestamps.length > 0
        ? timestamps[timestamps.length - 1]!
        : new Date().toISOString();

    const summary: ChangedFilesSummary = {
      sessionId,
      projectPath,
      totalFilesChanged,
      totalChanges,
      files: changedFiles,
      sessionStart,
      sessionEnd,
      byExtension,
      byDirectory,
    };

    return summary;
  }

  /**
   * Normalize file path to absolute path.
   *
   * Resolves relative paths against project path and normalizes
   * path separators.
   *
   * @param filePath - File path (absolute or relative)
   * @param projectPath - Project root path
   * @returns Normalized absolute path
   */
  private normalizePath(filePath: string, projectPath: string): string {
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(projectPath, filePath);

    return path.normalize(absolute);
  }

  /**
   * Parse transcript content into entries.
   *
   * @param content - JSONL content
   * @returns Array of transcript entries
   */
  private parseTranscript(content: string): TranscriptEntry[] {
    const lines = content.split("\n");
    const entries: TranscriptEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        continue;
      }

      try {
        const raw = JSON.parse(trimmed) as object;
        const entry = this.parseEntry(raw);
        entries.push(entry);
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    return entries;
  }

  /**
   * Parse a single entry from transcript.
   *
   * @param raw - Raw parsed JSON object
   * @returns TranscriptEntry
   */
  private parseEntry(raw: object): TranscriptEntry {
    const record = raw as Record<string, unknown>;

    const type =
      typeof record["type"] === "string" ? record["type"] : "unknown";
    const uuid =
      typeof record["uuid"] === "string" ? record["uuid"] : undefined;
    const timestamp =
      typeof record["timestamp"] === "string" ? record["timestamp"] : undefined;
    const content = "content" in record ? record["content"] : undefined;

    return {
      type,
      uuid,
      timestamp,
      content,
      raw,
    };
  }

  /**
   * Check if a tool name is a modifying tool.
   *
   * @param toolName - Tool name
   * @returns True if tool modifies files
   */
  private isModifyingTool(toolName: string): boolean {
    return (
      toolName === "Edit" ||
      toolName === "Write" ||
      toolName === "MultiEdit" ||
      toolName === "NotebookEdit"
    );
  }

  /**
   * Apply filter options to changed files.
   *
   * @param files - Array of changed files
   * @param options - Filter options
   * @returns Filtered array
   */
  private applyFilters(
    files: readonly ChangedFile[],
    options?: ExtractOptions | undefined,
  ): readonly ChangedFile[] {
    let filtered = files;

    // Filter by extension
    if (options?.extensions !== undefined && options.extensions.length > 0) {
      filtered = filtered.filter((file) => {
        const ext = path.extname(file.path);
        return options.extensions!.includes(ext);
      });
    }

    // Filter by directory
    if (options?.directories !== undefined && options.directories.length > 0) {
      filtered = filtered.filter((file) => {
        return options.directories!.some((dir) => file.path.startsWith(dir));
      });
    }

    return filtered;
  }

  /**
   * Resolve transcript path from session ID.
   *
   * If sessionId is already a path, returns it directly.
   * Otherwise constructs path from ~/.claude/projects/<sessionId>/session.jsonl
   *
   * @param sessionId - Session ID or path
   * @returns Transcript file path
   */
  private resolveTranscriptPath(sessionId: string): string {
    // If it looks like a path, use it directly
    if (sessionId.includes("/") || sessionId.endsWith(".jsonl")) {
      return sessionId;
    }

    // Otherwise construct standard path
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    return path.join(
      homeDir,
      ".claude",
      "projects",
      sessionId,
      "session.jsonl",
    );
  }

  /**
   * Extract project path from transcript path.
   *
   * @param transcriptPath - Transcript file path
   * @returns Project path
   */
  private extractProjectPath(transcriptPath: string): string {
    // Remove session.jsonl from the end
    const dir = path.dirname(transcriptPath);
    return dir;
  }
}
