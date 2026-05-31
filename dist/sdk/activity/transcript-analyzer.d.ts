/**
 * Transcript Analyzer for Claude Code Activity Tracking
 *
 * Efficiently analyzes Claude Code transcript files to detect AskUserQuestion
 * tool usage. Reads only the tail of transcript files for performance.
 *
 * @module sdk/activity/transcript-analyzer
 */
/**
 * TranscriptAnalyzer checks for AskUserQuestion tool usage in transcripts.
 *
 * Reads only the tail of the transcript file for efficiency rather than
 * loading the entire file into memory. This is important for long-running
 * sessions with large transcript files.
 */
export interface TranscriptAnalyzer {
    /**
     * Check if the last assistant turn used AskUserQuestion.
     *
     * Reads only the tail of the transcript for efficiency, parses JSONL
     * entries, and searches for tool_use blocks with name "AskUserQuestion".
     *
     * @param transcriptPath - Absolute path to the transcript JSONL file
     * @returns True if AskUserQuestion tool was used in the last assistant message
     */
    hasAskUserQuestion(transcriptPath: string): Promise<boolean>;
}
/**
 * Options for configuring the transcript analyzer.
 */
export interface TranscriptAnalyzerOptions {
    /**
     * Maximum bytes to read from end of file.
     *
     * Larger values provide better detection for sessions with very long
     * final assistant messages, but consume more memory and I/O.
     *
     * @default 10240 (10KB)
     */
    readonly maxReadBytes?: number;
}
/**
 * Create a transcript analyzer.
 *
 * @param options - Configuration options
 * @returns TranscriptAnalyzer instance
 */
export declare function createTranscriptAnalyzer(options?: TranscriptAnalyzerOptions): TranscriptAnalyzer;
//# sourceMappingURL=transcript-analyzer.d.ts.map