/**
 * File-based implementation of GroupRepository.
 *
 * Stores session groups as JSON files in the local filesystem at:
 * ~/.local/claude-code-agent/session-groups/{id}/meta.json
 *
 * @module repository/file/group-repository
 */

import * as path from "node:path";
import * as os from "node:os";
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
import type {
  GroupFilter,
  GroupRepository,
  GroupSession,
  GroupSort,
  SessionGroup,
} from "../group-repository";
import { FileLockServiceImpl } from "../../services/file-lock";
import { AtomicWriter } from "../../services/atomic-writer";

/**
 * File-based implementation of GroupRepository.
 *
 * Stores each group in a separate directory with a meta.json file.
 * Directory structure:
 * ~/.local/claude-code-agent/session-groups/
 *   {group-id}/
 *     meta.json
 *     sessions/
 */
export class FileGroupRepository implements GroupRepository {
  private readonly baseDir: string;
  private readonly lockService: FileLockServiceImpl;
  private readonly atomicWriter: AtomicWriter;

  constructor(
    private readonly fs: FileSystem,
    clock: Clock,
    baseDir?: string,
  ) {
    this.baseDir =
      baseDir ??
      path.join(os.homedir(), ".local", "claude-code-agent", "session-groups");
    this.lockService = new FileLockServiceImpl(fs, clock);
    this.atomicWriter = new AtomicWriter(fs);
  }

  /**
   * Find a group by its ID.
   *
   * @param id - Group ID
   * @returns Group if found, null otherwise
   */
  async findById(id: string): Promise<SessionGroup | null> {
    const metaPath = this.getMetaPath(id);

    try {
      const exists = await this.fs.exists(metaPath);
      if (!exists) {
        return null;
      }

      const content = await this.fs.readFile(metaPath);
      return JSON.parse(content) as SessionGroup;
    } catch (error: unknown) {
      // If file doesn't exist or is invalid JSON, return null
      return null;
    }
  }

  /**
   * Find groups by status.
   *
   * @param status - Status to filter by
   * @returns Array of groups with the status
   */
  async findByStatus(
    status: SessionGroup["status"],
  ): Promise<readonly SessionGroup[]> {
    return this.list({ status });
  }

  /**
   * List groups with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of groups matching the filter
   */
  async list(
    filter?: GroupFilter,
    sort?: GroupSort,
  ): Promise<readonly SessionGroup[]> {
    // Ensure base directory exists
    const baseExists = await this.fs.exists(this.baseDir);
    if (!baseExists) {
      return [];
    }

    // Read all group directories
    const entries = await this.fs.readDir(this.baseDir);
    const groups: SessionGroup[] = [];

    for (const entry of entries) {
      const metaPath = this.getMetaPath(entry);
      try {
        const exists = await this.fs.exists(metaPath);
        if (!exists) {
          continue;
        }

        const content = await this.fs.readFile(metaPath);
        const group = JSON.parse(content) as SessionGroup;
        groups.push(group);
      } catch {
        // Skip invalid or unreadable groups
        continue;
      }
    }

    // Apply filters
    let results = groups;
    if (filter) {
      results = this.applyFilter(results, filter);
    }

    // Apply sorting
    if (sort) {
      results = this.applySort(results, sort);
    }

    return results;
  }

  /**
   * Save a group.
   *
   * Creates a new group or updates an existing one.
   *
   * @param group - Group to save
   */
  async save(group: SessionGroup): Promise<void> {
    const metaPath = this.getMetaPath(group.id);
    await this.lockService.withLock(metaPath, async () => {
      const groupDir = this.getGroupDir(group.id);
      await this.fs.mkdir(groupDir, { recursive: true });
      await this.atomicWriter.writeJson(metaPath, group);
    });
  }

  /**
   * Delete a group by ID.
   *
   * @param id - Group ID to delete
   * @returns True if group was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const groupDir = this.getGroupDir(id);
    const exists = await this.fs.exists(groupDir);
    if (!exists) {
      return false;
    }

    const metaPath = this.getMetaPath(id);
    return this.lockService.withLock(metaPath, async () => {
      // Double-check existence within lock to prevent TOCTOU
      const stillExists = await this.fs.exists(groupDir);
      if (!stillExists) {
        return false;
      }
      await this.fs.rm(groupDir, { recursive: true });
      return true;
    });
  }

  /**
   * Update a session within a group.
   *
   * @param groupId - Group ID
   * @param sessionId - Session ID within the group
   * @param updates - Partial session updates
   * @returns True if session was updated, false if not found
   */
  async updateSession(
    groupId: string,
    sessionId: string,
    updates: Partial<Omit<GroupSession, "id">>,
  ): Promise<boolean> {
    const metaPath = this.getMetaPath(groupId);
    return this.lockService.withLock(metaPath, async () => {
      const group = await this.findById(groupId);
      if (!group) {
        return false;
      }

      const sessionIndex = group.sessions.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) {
        return false;
      }

      // Create updated session
      const currentSession = group.sessions[sessionIndex];
      if (!currentSession) {
        return false;
      }

      const updatedSession: GroupSession = {
        ...currentSession,
        ...updates,
      };

      // Create updated sessions array
      const updatedSessions = [...group.sessions];
      updatedSessions[sessionIndex] = updatedSession;

      // Update group
      const updatedGroup: SessionGroup = {
        ...group,
        sessions: updatedSessions,
        updatedAt: new Date().toISOString(),
      };

      await this.atomicWriter.writeJson(metaPath, updatedGroup);
      return true;
    });
  }

  /**
   * Count groups matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching groups
   */
  async count(filter?: GroupFilter): Promise<number> {
    const groups = await this.list(filter);
    return groups.length;
  }

  /**
   * Get the directory path for a group.
   */
  private getGroupDir(id: string): string {
    return path.join(this.baseDir, id);
  }

  /**
   * Get the meta.json path for a group.
   */
  private getMetaPath(id: string): string {
    return path.join(this.getGroupDir(id), "meta.json");
  }

  /**
   * Apply filter criteria to group array.
   */
  private applyFilter(
    groups: SessionGroup[],
    filter: GroupFilter,
  ): SessionGroup[] {
    let results = groups;

    if (filter.status !== undefined) {
      results = results.filter((g) => g.status === filter.status);
    }

    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((g) =>
        g.name.toLowerCase().includes(searchTerm),
      );
    }

    if (filter.since !== undefined) {
      const sinceTime = filter.since.getTime();
      results = results.filter(
        (g) => new Date(g.createdAt).getTime() >= sinceTime,
      );
    }

    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Apply sort options to group array.
   */
  private applySort(groups: SessionGroup[], sort: GroupSort): SessionGroup[] {
    const sorted = [...groups];
    const direction = sort.direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sort.field) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          compareValue =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return compareValue * direction;
    });

    return sorted;
  }
}
