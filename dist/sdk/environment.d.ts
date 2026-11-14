/**
 * Type-safe environment variable helpers for Claude Code subprocesses.
 *
 * @module sdk/environment
 */
/**
 * Environment variable record accepted by Claude Code subprocess launch APIs.
 */
export type ClaudeEnvironmentShape = Readonly<Record<string, string>>;
/**
 * Value object for environment variables passed to Claude Code.
 *
 * Use this when you want to keep an explicit typed variable in application
 * code instead of passing an unstructured record inline.
 */
export declare class ClaudeEnvironment<TVariables extends ClaudeEnvironmentShape = ClaudeEnvironmentShape> {
    private readonly values;
    constructor(values: TVariables);
    /**
     * Create a new instance from a typed object.
     */
    static from<TVariables extends ClaudeEnvironmentShape>(values: TVariables): ClaudeEnvironment<TVariables>;
    /**
     * Return a cloned record for subprocess APIs.
     */
    toRecord(): TVariables;
    /**
     * Merge this environment with another record or value object.
     * Later values override earlier ones.
     */
    merge<TAdditional extends ClaudeEnvironmentShape>(additional: ClaudeEnvironmentInput<TAdditional>): ClaudeEnvironment<TVariables & TAdditional>;
}
/**
 * Accepted input form for Claude subprocess environment variables.
 */
export type ClaudeEnvironmentInput<TVariables extends ClaudeEnvironmentShape = ClaudeEnvironmentShape> = TVariables | ClaudeEnvironment<TVariables>;
/**
 * Helper for defining a typed Claude environment variable object.
 */
export declare function defineClaudeEnvironment<TVariables extends ClaudeEnvironmentShape>(values: TVariables): ClaudeEnvironment<TVariables>;
/**
 * Normalize environment input to a plain record for process spawning.
 */
export declare function toClaudeEnvironmentRecord<TVariables extends ClaudeEnvironmentShape>(input: ClaudeEnvironment<TVariables>): TVariables;
export declare function toClaudeEnvironmentRecord<TVariables extends ClaudeEnvironmentShape>(input: TVariables): TVariables;
export declare function toClaudeEnvironmentRecord<TVariables extends ClaudeEnvironmentShape>(input: ClaudeEnvironmentInput<TVariables> | undefined): TVariables | undefined;
export declare function toClaudeEnvironmentRecord(input: undefined): undefined;
//# sourceMappingURL=environment.d.ts.map