/**
 * Claude project directory naming and transcript path decoding.
 *
 * @module sdk/session-reader/path-meta
 */
import type { SessionSearchSource } from "../../types/session-index";
/**
 * Encode a working directory path to Claude Code project directory name format.
 */
export declare function encodeProjectPath(workingDirectory: string): string;
/**
 * Get the default Claude projects directory (~/.claude/projects).
 */
export declare function getDefaultClaudeProjectsDir(): string;
export declare function deriveSessionIdFromPath(path: string): string;
export declare function deriveProjectPath(filePath: string): string;
export declare function matchesSessionSource(filePath: string, source: SessionSearchSource): boolean;
export declare function matchesWorkingDirectoryPrefix(filePath: string, workingDirectoryPrefix: string): boolean;
//# sourceMappingURL=path-meta.d.ts.map