import type { ProcessManager } from "../interfaces/process-manager";
export interface ToolVersionInfo {
    version: string | null;
    error: string | null;
}
export interface AgentToolVersions {
    claude: ToolVersionInfo;
    codex: ToolVersionInfo;
    git: ToolVersionInfo;
}
export declare function getToolVersions(processManager: ProcessManager): Promise<AgentToolVersions>;
//# sourceMappingURL=tool-versions.d.ts.map