/**
 * File-based repository implementations.
 *
 * Provides persistent storage using JSON files in the filesystem.
 * All implementations use the Container for dependency injection.
 *
 * @module repository/file
 */

export { FileBookmarkRepository } from "./bookmark-repository";
export { FileGroupRepository } from "./group-repository";
export { FileQueueRepository } from "./queue-repository";
