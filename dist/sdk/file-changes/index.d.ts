/**
 * File Changes Module
 *
 * Provides tools for tracking and querying file modifications from Claude Code sessions.
 * Enables bidirectional search:
 * - Session -> Files: What files were changed in a session?
 * - File -> Sessions: What sessions modified a specific file?
 *
 * @example Forward lookup (Session -> Files)
 * ```typescript
 * const service = new FileChangeService(container);
 * const summary = await service.getSessionChangedFiles(sessionId);
 * console.log(`${summary.totalFilesChanged} files changed`);
 * ```
 *
 * @example Reverse lookup (File -> Sessions)
 * ```typescript
 * const service = new FileChangeService(container);
 * const history = await service.findSessionsByFile("/path/to/file.ts");
 * console.log(`Modified in ${history.totalSessions} sessions`);
 * ```
 *
 * @example Index building
 * ```typescript
 * const service = new FileChangeService(container);
 * await service.buildIndex(); // Build index for fast reverse lookups
 * const stats = await service.getIndexStats();
 * ```
 *
 * @module sdk/file-changes
 */
export type { ModifyingTool, FileOperation, FileChange, ChangedFile, ChangedFilesSummary, FileSessionMatch, FileHistory, IndexStats, } from "./types";
export { FileChangeService, type GetFilesOptions, type FindOptions, } from "./service";
export { FileChangeExtractor, type ExtractOptions } from "./extractor";
export { FileChangeIndex } from "./index-manager";
//# sourceMappingURL=index.d.ts.map