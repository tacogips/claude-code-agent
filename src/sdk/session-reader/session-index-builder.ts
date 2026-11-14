/**
 * Build session index entries by scanning JSONL files when sessions-index.json is absent.
 *
 * @module sdk/session-reader/session-index-builder
 */

import type { SessionIndexEntry } from "../../types/session-index";
import { parseJsonl } from "../jsonl-parser";
import { deriveSessionIdFromPath } from "./path-meta";

export interface SessionIndexBuilderDeps {
  findSessionFiles(projectPath: string): Promise<readonly string[]>;
  readFile(path: string): Promise<string>;
}

export async function buildSessionIndexEntriesFromJsonl(
  deps: SessionIndexBuilderDeps,
  projectDirPath: string,
  workingDirectory: string,
): Promise<SessionIndexEntry[]> {
  const sessionFiles = await deps.findSessionFiles(projectDirPath);
  const entries: SessionIndexEntry[] = [];

  for (const filePath of sessionFiles) {
    try {
      const content = await deps.readFile(filePath);
      const parseResult = parseJsonl<unknown>(content, filePath);
      if (parseResult.isErr()) {
        continue;
      }

      const lines = parseResult.value;
      let firstPrompt = "";
      let summary = "";
      let sessionId = "";
      let gitBranch = "";
      let firstTimestamp = "";
      let lastTimestamp = "";

      for (const line of lines) {
        if (typeof line !== "object" || line === null) {
          continue;
        }
        const record = line as Record<string, unknown>;

        if (!sessionId && typeof record["sessionId"] === "string") {
          sessionId = record["sessionId"];
        }

        if (!gitBranch && typeof record["gitBranch"] === "string") {
          gitBranch = record["gitBranch"];
        }

        if (typeof record["timestamp"] === "string") {
          if (!firstTimestamp) {
            firstTimestamp = record["timestamp"];
          }
          lastTimestamp = record["timestamp"];
        }

        const type = record["type"] as string | undefined;
        if (type === "user" && !firstPrompt) {
          const message = record["message"] as
            | Record<string, unknown>
            | undefined;
          if (message && typeof message === "object") {
            const msgContent = message["content"];
            if (typeof msgContent === "string") {
              firstPrompt = msgContent.slice(0, 200);
            } else if (Array.isArray(msgContent)) {
              for (const block of msgContent) {
                if (
                  typeof block === "object" &&
                  block !== null &&
                  (block as Record<string, unknown>)["type"] === "text"
                ) {
                  const text = (block as Record<string, unknown>)["text"];
                  if (typeof text === "string") {
                    firstPrompt = text.slice(0, 200);
                    break;
                  }
                }
              }
            }
          }
        }

        if (type === "summary") {
          const message = record["message"] as
            | Record<string, unknown>
            | undefined;
          if (message && typeof message === "object") {
            const msgContent = message["content"];
            if (typeof msgContent === "string") {
              summary = msgContent.slice(0, 200);
            }
          }
        }
      }

      if (!sessionId) {
        sessionId = deriveSessionIdFromPath(filePath);
      }

      const now = new Date().toISOString();

      entries.push({
        sessionId,
        fullPath: filePath,
        firstPrompt,
        summary,
        modified: lastTimestamp || now,
        created: firstTimestamp || now,
        gitBranch,
        projectPath: workingDirectory,
      });
    } catch {
      /* skip files that can't be read */
    }
  }

  return entries;
}
