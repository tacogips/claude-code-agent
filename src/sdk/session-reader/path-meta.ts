/**
 * Claude project directory naming and transcript path decoding.
 *
 * @module sdk/session-reader/path-meta
 */

import { getDefaultConfig } from "../../types/config";
import { UUID_SESSION_PATTERN } from "./constants";
import type { SessionSearchSource } from "../../types/session-index";

/**
 * Encode a working directory path to Claude Code project directory name format.
 */
export function encodeProjectPath(workingDirectory: string): string {
  return workingDirectory.replace(/\//g, "-");
}

/**
 * Get the default Claude projects directory (~/.claude/projects).
 */
export function getDefaultClaudeProjectsDir(): string {
  const config = getDefaultConfig();
  const claudeDataDir =
    config.claudeDataDir ?? `${process.env["HOME"] ?? ""}/.claude`;
  return `${claudeDataDir}/projects`;
}

export function deriveSessionIdFromPath(path: string): string {
  const parts = path.split("/");
  const filename = parts[parts.length - 1] ?? "unknown.jsonl";

  if (filename === "session.jsonl") {
    const dirName = parts[parts.length - 2];
    return dirName ?? "unknown";
  }

  if (filename.endsWith(".jsonl")) {
    return filename.slice(0, -".jsonl".length);
  }

  return filename;
}

export function deriveProjectPath(filePath: string): string {
  const parts = filePath.split("/");
  const projectsIndex = parts.indexOf("projects");

  if (projectsIndex >= 0 && projectsIndex + 1 < parts.length) {
    const encodedPath = parts[projectsIndex + 1];

    if (!encodedPath) {
      return "";
    }

    return encodedPath.replace(/-/g, "/");
  }

  return "";
}

export function matchesSessionSource(
  filePath: string,
  source: SessionSearchSource,
): boolean {
  if (source === "all") {
    return true;
  }

  const filename = filePath.split("/").pop() ?? "";
  if (source === "legacy") {
    return filename === "session.jsonl";
  }

  return UUID_SESSION_PATTERN.test(filename);
}

export function matchesWorkingDirectoryPrefix(
  filePath: string,
  workingDirectoryPrefix: string,
): boolean {
  const prefix = workingDirectoryPrefix.trim();
  if (prefix === "") {
    return true;
  }

  const projectPath = deriveProjectPath(filePath);
  return projectPath.startsWith(prefix);
}
