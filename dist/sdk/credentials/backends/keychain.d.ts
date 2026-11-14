/**
 * macOS Keychain Credential Backend
 *
 * Reads and writes Claude Code OAuth credentials from macOS Keychain using the `security` command.
 */
import { type Result } from "../../../result";
import type { ClaudeCredentials } from "../types";
import { CredentialError } from "../errors";
import type { CredentialBackend } from "./file";
/**
 * macOS Keychain credential backend
 *
 * Note: The exact service/account names for Claude Code's keychain entries
 * may need adjustment based on actual Claude Code behavior.
 */
export declare class KeychainCredentialBackend implements CredentialBackend {
    private readonly service;
    private readonly account;
    read(): Promise<Result<ClaudeCredentials, CredentialError>>;
    write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>>;
    delete(): Promise<Result<void, CredentialError>>;
    isWritable(): Promise<boolean>;
    getLocation(): string;
}
//# sourceMappingURL=keychain.d.ts.map