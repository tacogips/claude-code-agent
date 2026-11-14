interface ResolveAgentDataDirOptions {
    readonly respectXdgDataHome?: boolean | undefined;
}
export declare function resolveAgentDataDir(dataDir?: string, options?: ResolveAgentDataDirOptions): string;
export declare function resolveAgentDataPath(dataDir: string | undefined, ...segments: readonly string[]): string;
export declare function resolveAgentDataPathFromXdg(dataDir: string | undefined, ...segments: readonly string[]): string;
export {};
//# sourceMappingURL=path-utils.d.ts.map