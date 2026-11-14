/**
 * Credential Error Types
 *
 * Error classes and types for credential reading operations
 */
/**
 * Error codes for credential operations
 */
export type CredentialErrorCode = "NOT_AUTHENTICATED" | "EXPIRED" | "INVALID_FORMAT" | "KEYCHAIN_ACCESS_DENIED" | "FILE_NOT_FOUND" | "PERMISSION_DENIED" | "WRITE_FAILED" | "DIRECTORY_CREATE_FAILED" | "DELETE_FAILED" | "INVALID_CREDENTIALS_INPUT" | "STORAGE_FULL";
/**
 * Error class for credential-related failures
 */
export declare class CredentialError extends Error {
    readonly code: CredentialErrorCode;
    constructor(message: string, code: CredentialErrorCode);
    /**
     * Create error for missing credentials
     */
    static notAuthenticated(): CredentialError;
    /**
     * Create error for expired credentials
     */
    static expired(): CredentialError;
    /**
     * Create error for invalid credential format
     */
    static invalidFormat(details: string): CredentialError;
    /**
     * Create error for missing credentials file
     */
    static fileNotFound(path: string): CredentialError;
    /**
     * Create error for keychain access denial
     */
    static keychainDenied(): CredentialError;
    /**
     * Create error for file permission issues
     */
    static permissionDenied(path: string): CredentialError;
    /**
     * Create error for write failures
     */
    static writeFailed(path: string, reason: string): CredentialError;
    /**
     * Create error for directory creation failures
     */
    static directoryCreateFailed(path: string): CredentialError;
    /**
     * Create error for delete failures
     */
    static deleteFailed(path: string, reason: string): CredentialError;
    /**
     * Create error for invalid credentials input
     */
    static invalidCredentialsInput(details: string): CredentialError;
    /**
     * Create error for storage full condition
     */
    static storageFull(): CredentialError;
}
//# sourceMappingURL=errors.d.ts.map