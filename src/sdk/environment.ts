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
export class ClaudeEnvironment<
  TVariables extends ClaudeEnvironmentShape = ClaudeEnvironmentShape,
> {
  private readonly values: TVariables;

  constructor(values: TVariables) {
    this.values = Object.freeze({ ...values }) as TVariables;
  }

  /**
   * Create a new instance from a typed object.
   */
  static from<TVariables extends ClaudeEnvironmentShape>(
    values: TVariables,
  ): ClaudeEnvironment<TVariables> {
    return new ClaudeEnvironment(values);
  }

  /**
   * Return a cloned record for subprocess APIs.
   */
  toRecord(): TVariables {
    return { ...this.values };
  }

  /**
   * Merge this environment with another record or value object.
   * Later values override earlier ones.
   */
  merge<TAdditional extends ClaudeEnvironmentShape>(
    additional: ClaudeEnvironmentInput<TAdditional>,
  ): ClaudeEnvironment<TVariables & TAdditional> {
    const additionalRecord = toClaudeEnvironmentRecord(additional);

    return new ClaudeEnvironment<TVariables & TAdditional>({
      ...this.values,
      ...additionalRecord,
    } as TVariables & TAdditional);
  }
}

/**
 * Accepted input form for Claude subprocess environment variables.
 */
export type ClaudeEnvironmentInput<
  TVariables extends ClaudeEnvironmentShape = ClaudeEnvironmentShape,
> = TVariables | ClaudeEnvironment<TVariables>;

/**
 * Helper for defining a typed Claude environment variable object.
 */
export function defineClaudeEnvironment<
  TVariables extends ClaudeEnvironmentShape,
>(values: TVariables): ClaudeEnvironment<TVariables> {
  return ClaudeEnvironment.from(values);
}

/**
 * Normalize environment input to a plain record for process spawning.
 */
export function toClaudeEnvironmentRecord<
  TVariables extends ClaudeEnvironmentShape,
>(input: ClaudeEnvironment<TVariables>): TVariables;
export function toClaudeEnvironmentRecord<
  TVariables extends ClaudeEnvironmentShape,
>(input: TVariables): TVariables;
export function toClaudeEnvironmentRecord<
  TVariables extends ClaudeEnvironmentShape,
>(input: ClaudeEnvironmentInput<TVariables> | undefined): TVariables | undefined;
export function toClaudeEnvironmentRecord(input: undefined): undefined;
export function toClaudeEnvironmentRecord<
  TVariables extends ClaudeEnvironmentShape,
>(input: ClaudeEnvironmentInput<TVariables> | undefined): TVariables | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (input instanceof ClaudeEnvironment) {
    return input.toRecord();
  }
  return { ...input };
}
