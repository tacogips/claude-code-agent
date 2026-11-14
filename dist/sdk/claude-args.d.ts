/**
 * Reject print-mode-only Claude Code flags from caller-provided passthrough
 * arguments before they can reach an internal spawn path.
 */
export declare function assertNoPrintModeArgs(args: readonly string[], source: string): void;
//# sourceMappingURL=claude-args.d.ts.map