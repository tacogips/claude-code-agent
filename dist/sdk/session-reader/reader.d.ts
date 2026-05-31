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
import type { SessionListResponse, ListSessionsByPathOptions, TranscriptSearchOptions, TranscriptSearchResult, SearchSessionsOptions, SessionSearchResponse } from "../../types/session-index";
import { type Result } from "../../result";
import { type AgentError } from "../../errors";
import { type TranscriptEvent } from "../../polling/parser";
/**
 * SessionReader reads and parses Claude Code session files.
 *
 * Uses the FileSystem abstraction from the container for testability.
 * Parses JSONL files to extract session data.
 */
export declare class SessionReader {
    private readonly fileSystem;
    constructor(container: Container);
    /**
     * Encode a working directory path to Claude Code project directory name format.
     */
    static encodeProjectPath(workingDirectory: string): string;
    readSession(path: string): Promise<Result<Session, AgentError>>;
    readMessages(path: string, options?: {
        excludeToolMessages?: boolean;
    }): Promise<Result<readonly Message[], AgentError>>;
    findSessionFiles(projectPath: string): Promise<readonly string[]>;
    listSessions(projectPath?: string): Promise<readonly SessionMetadata[]>;
    getSession(sessionId: string): Promise<Session | null>;
    getMessages(sessionId: string, options?: {
        excludeToolMessages?: boolean;
    }): Promise<readonly Message[]>;
    listSessionsByWorkingDirectory(options: ListSessionsByPathOptions): Promise<SessionListResponse>;
    readTranscript(sessionId: string, options?: {
        offset?: number;
        limit?: number;
    }): Promise<Result<{
        events: readonly TranscriptEvent[];
        total: number;
        tokenUsage?: TokenUsage;
    }, AgentError>>;
    readSessionUsage(sessionId: string): Promise<Result<TokenUsage | undefined, AgentError>>;
    searchTranscript(sessionId: string, query: string, options?: TranscriptSearchOptions): Promise<Result<TranscriptSearchResult, AgentError>>;
    searchSessions(query: string, options?: SearchSessionsOptions): Promise<SessionSearchResponse>;
    private findSessionFilePath;
}
//# sourceMappingURL=reader.d.ts.map