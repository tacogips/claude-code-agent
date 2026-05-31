/**
 * Stats Reader for ~/.claude/stats-cache.json
 *
 * Reads and transforms usage statistics from Claude Code's stats cache.
 */
import { type Result } from "../../result";
import type { UsageStats } from "./stats-types";
import { CredentialError } from "./errors";
/**
 * Reader for Claude Code usage statistics
 */
export declare class StatsReader {
    private readonly path;
    constructor(path?: string);
    /**
     * Read and parse usage statistics from stats-cache.json
     * Returns null if stats file doesn't exist (user hasn't used Claude Code yet)
     */
    getStats(): Promise<Result<UsageStats | null, CredentialError>>;
    /**
     * Transform raw stats cache to typed UsageStats
     */
    private transformToUsageStats;
    /**
     * Transform raw model usage Record to Map with calculated totals
     */
    private transformModelUsage;
    /**
     * Find the hour (0-23) with most activity
     */
    private findPeakHour;
}
/**
 * Get default path to stats-cache.json
 */
export declare function getDefaultStatsPath(): string;
//# sourceMappingURL=stats-reader.d.ts.map