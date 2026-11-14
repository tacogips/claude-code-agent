/**
 * Config Reader for ~/.claude.json
 *
 * Reads account information from Claude Code's config file.
 */
import { type Result } from "../../result";
import type { AccountInfo } from "./types";
import { CredentialError } from "./errors";
/**
 * Reader for Claude Code config file (~/.claude.json)
 */
export declare class ConfigReader {
    private readonly path;
    constructor(path?: string);
    /**
     * Get account information from config file.
     *
     * Returns null if config file doesn't exist or oauthAccount is missing
     * (user not authenticated).
     *
     * @returns Result with AccountInfo or null if not authenticated
     */
    getAccount(): Promise<Result<AccountInfo | null, CredentialError>>;
}
/**
 * Get default config path (~/.claude.json)
 */
export declare function getDefaultConfigPath(): string;
//# sourceMappingURL=config-reader.d.ts.map