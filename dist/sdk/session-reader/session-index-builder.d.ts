/**
 * Build session index entries by scanning JSONL files when sessions-index.json is absent.
 *
 * @module sdk/session-reader/session-index-builder
 */
import type { SessionIndexEntry } from "../../types/session-index";
export interface SessionIndexBuilderDeps {
    findSessionFiles(projectPath: string): Promise<readonly string[]>;
    readFile(path: string): Promise<string>;
}
export declare function buildSessionIndexEntriesFromJsonl(deps: SessionIndexBuilderDeps, projectDirPath: string, workingDirectory: string): Promise<SessionIndexEntry[]>;
//# sourceMappingURL=session-index-builder.d.ts.map