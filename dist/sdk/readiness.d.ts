/**
 * Claude Code readiness verification helpers.
 *
 * Provides a reusable library API for checking whether stored authentication
 * is usable and, optionally, whether a specific model can be executed through
 * the Claude Code CLI.
 *
 * @module sdk/readiness
 */
import type { ProcessManager } from "../interfaces/process-manager";
import type { OAuthCredentialsResult, SubscriptionType } from "./credentials/types";
type ProbeFailureKind = "auth" | "model" | "cli" | "timeout" | "unknown";
export interface ClaudeReadinessCredentialSource {
    getCredentials(): Promise<OAuthCredentialsResult | null>;
    getStorageLocation(): string;
}
export interface VerifyClaudeReadinessOptions {
    /**
     * Model to probe through the Claude Code CLI.
     *
     * When omitted, the check validates stored authentication only.
     */
    readonly model?: string | undefined;
    /**
     * Claude Code CLI binary path.
     * @default "claude"
     */
    readonly cliPath?: string | undefined;
    /**
     * Working directory for the CLI probe.
     */
    readonly cwd?: string | undefined;
    /**
     * Extra environment variables for the CLI probe.
     */
    readonly env?: Readonly<Record<string, string>> | undefined;
    /**
     * Prompt used for the live probe.
     */
    readonly prompt?: string | undefined;
    /**
     * Timeout for the live probe.
     * @default 20000
     */
    readonly timeoutMs?: number | undefined;
    /**
     * Injected process manager for tests and advanced integrations.
     */
    readonly processManager?: ProcessManager | undefined;
    /**
     * Injected credential reader for tests and advanced integrations.
     */
    readonly credentialSource?: ClaudeReadinessCredentialSource | undefined;
}
export interface ClaudeAuthReadiness {
    readonly state: "missing" | "expired" | "configured";
    readonly available: boolean;
    readonly verified: boolean;
    readonly storageLocation: string;
    readonly expiresAt?: Date | undefined;
    readonly subscriptionType?: SubscriptionType | undefined;
    readonly scopes: readonly string[];
    readonly rateLimitTier?: string | undefined;
    readonly message?: string | undefined;
}
export interface ClaudeCliReadiness {
    readonly checked: boolean;
    readonly available: boolean;
    readonly command: string;
    readonly exitCode?: number | null | undefined;
    readonly message?: string | undefined;
}
export interface ClaudeModelReadiness {
    readonly requested: string | null;
    readonly checked: boolean;
    readonly available: boolean;
    readonly timedOut: boolean;
    readonly exitCode?: number | null | undefined;
    readonly stdout: string;
    readonly stderr: string;
    readonly failureKind?: ProbeFailureKind | undefined;
    readonly message?: string | undefined;
    readonly commandArgs: readonly string[];
}
export interface ClaudeReadinessResult {
    readonly ready: boolean;
    readonly auth: ClaudeAuthReadiness;
    readonly cli: ClaudeCliReadiness;
    readonly model: ClaudeModelReadiness;
}
/**
 * Verify whether Claude Code authentication is usable and, optionally,
 * whether a specific model can be executed successfully.
 */
export declare function verifyClaudeReadiness(options?: VerifyClaudeReadinessOptions): Promise<ClaudeReadinessResult>;
export {};
//# sourceMappingURL=readiness.d.ts.map