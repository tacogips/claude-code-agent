/**
 * File change extractor for parsing file modifications from transcripts.
 *
 * Extracts and aggregates file changes from Claude Code session transcripts,
 * tracking Edit, Write, MultiEdit, and NotebookEdit tool invocations.
 *
 * @module sdk/file-changes/extractor
 */
import type { Container } from "../../container";
import type { ChangedFile, ChangedFilesSummary } from "./types";
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
export declare class FileChangeExtractor {
    private readonly fileSystem;
    /**
     * Create a new FileChangeExtractor.
     *
     * @param container - Dependency injection container
     */
    constructor(container: Container);
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
    extractFromSession(sessionId: string, options?: ExtractOptions | undefined): Promise<ChangedFilesSummary>;
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
    extractFromTranscript(transcriptPath: string, options?: ExtractOptions | undefined): Promise<{
        changedFiles: readonly ChangedFile[];
        projectPath: string;
    }>;
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
    private parseToolUse;
    /**
     * Extract file path from tool input.
     *
     * Different tools use different field names for the file path.
     *
     * @param toolName - Name of the tool
     * @param input - Tool input object
     * @returns File path or null if not found
     */
    private extractFilePath;
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
    private createFileChange;
    /**
     * Add a file change to the file map.
     *
     * Aggregates multiple changes to the same file.
     *
     * @param fileMap - Map of file paths to ChangedFile
     * @param change - File change to add
     * @param projectPath - Project root path for normalization
     */
    private addChangeToMap;
    /**
     * Determine file operation type from change.
     *
     * @param change - File change
     * @returns File operation type
     */
    private determineOperation;
    /**
     * Merge tool lists, avoiding duplicates.
     *
     * @param existing - Existing tools
     * @param newTool - New tool to add
     * @returns Merged tool list
     */
    private mergeToolsUsed;
    /**
     * Enrich file map with file-history-snapshot data.
     *
     * Adds version and backup file information from snapshots.
     *
     * @param fileMap - Map of file paths to ChangedFile
     * @param snapshot - Snapshot object from transcript
     */
    private enrichWithSnapshot;
    /**
     * Build ChangedFilesSummary from file map.
     *
     * @param sessionId - Session identifier
     * @param changedFiles - Array of changed files
     * @param projectPath - Project path from session metadata (or derived from transcript path)
     * @returns ChangedFilesSummary
     */
    private buildSummary;
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
    private normalizePath;
    /**
     * Parse transcript content into entries.
     *
     * @param content - JSONL content
     * @returns Array of transcript entries
     */
    private parseTranscript;
    /**
     * Parse a single entry from transcript.
     *
     * @param raw - Raw parsed JSON object
     * @returns TranscriptEntry
     */
    private parseEntry;
    /**
     * Check if a tool name is a modifying tool.
     *
     * @param toolName - Tool name
     * @returns True if tool modifies files
     */
    private isModifyingTool;
    /**
     * Apply filter options to changed files.
     *
     * @param files - Array of changed files
     * @param options - Filter options
     * @returns Filtered array
     */
    private applyFilters;
    /**
     * Resolve transcript path from session ID.
     *
     * If sessionId is already a path, returns it directly.
     * Otherwise constructs path from ~/.claude/projects/<sessionId>/session.jsonl
     *
     * @param sessionId - Session ID or path
     * @returns Transcript file path
     */
    private resolveTranscriptPath;
    /**
     * Extract project path from transcript path.
     *
     * @param transcriptPath - Transcript file path
     * @returns Project path
     */
    private extractProjectPath;
}
//# sourceMappingURL=extractor.d.ts.map