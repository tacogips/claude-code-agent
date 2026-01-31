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

// ============================================================================
// Types
// ============================================================================

export type {
  // Tool and operation types
  ModifyingTool,
  FileOperation,
  // File change
  FileChange,
  ChangedFile,
  // Session summary
  ChangedFilesSummary,
  // File history
  FileSessionMatch,
  FileHistory,
  // Index statistics
  IndexStats,
} from "./types";

// ============================================================================
// Service
// ============================================================================

export {
  FileChangeService,
  type GetFilesOptions,
  type FindOptions,
} from "./service";

// ============================================================================
// Extractor
// ============================================================================

export { FileChangeExtractor, type ExtractOptions } from "./extractor";

// ============================================================================
// Index Manager
// ============================================================================

export { FileChangeIndex } from "./index-manager";
