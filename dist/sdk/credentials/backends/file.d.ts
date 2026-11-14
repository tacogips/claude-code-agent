/**
 * File-based Credential Backend for Linux
 *
 * Reads Claude Code OAuth credentials from ~/.claude/.credentials.json
 */
import { type Result } from "../../../result";
import type { ClaudeCredentials } from "../types";
import { CredentialError } from "../errors";
/**
 * Generic credential backend interface
 */
export interface CredentialBackend {
    read(): Promise<Result<ClaudeCredentials, CredentialError>>;
    write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>>;
    delete(): Promise<Result<void, CredentialError>>;
    isWritable(): Promise<boolean>;
    getLocation(): string;
}
/**
 * File-based credential backend for Linux systems
 */
export declare class FileCredentialBackend implements CredentialBackend {
    private readonly path;
    private readonly lockService;
    private readonly atomicWriter;
    constructor(path: string);
    read(): Promise<Result<ClaudeCredentials, CredentialError>>;
    write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>>;
    delete(): Promise<Result<void, CredentialError>>;
    isWritable(): Promise<boolean>;
    getLocation(): string;
}
/**
 * Get default credentials file path
 */
export declare function getDefaultCredentialsPath(): string;
//# sourceMappingURL=file.d.ts.map