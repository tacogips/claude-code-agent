/**
 * Credential Error Types
 *
 * Error classes and types for credential reading operations
 */

/**
 * Error codes for credential operations
 */
export type CredentialErrorCode =
  | "NOT_AUTHENTICATED" // No credentials found
  | "EXPIRED" // Token expired
  | "INVALID_FORMAT" // Corrupted credentials file
  | "KEYCHAIN_ACCESS_DENIED" // macOS keychain permission denied
  | "FILE_NOT_FOUND" // Credentials file missing
  | "PERMISSION_DENIED" // File permission issue
  | "WRITE_FAILED" // Failed to write credentials
  | "DIRECTORY_CREATE_FAILED" // Failed to create directory
  | "DELETE_FAILED" // Failed to delete credentials
  | "INVALID_CREDENTIALS_INPUT" // Invalid credentials input
  | "STORAGE_FULL"; // Storage is full

/**
 * Error class for credential-related failures
 */
export class CredentialError extends Error {
  constructor(
    message: string,
    public readonly code: CredentialErrorCode,
  ) {
    super(message);
    this.name = "CredentialError";
  }

  /**
   * Create error for missing credentials
   */
  static notAuthenticated(): CredentialError {
    return new CredentialError("No credentials found", "NOT_AUTHENTICATED");
  }

  /**
   * Create error for expired credentials
   */
  static expired(): CredentialError {
    return new CredentialError("Credentials expired", "EXPIRED");
  }

  /**
   * Create error for invalid credential format
   */
  static invalidFormat(details: string): CredentialError {
    return new CredentialError(
      `Invalid credentials format: ${details}`,
      "INVALID_FORMAT",
    );
  }

  /**
   * Create error for missing credentials file
   */
  static fileNotFound(path: string): CredentialError {
    return new CredentialError(
      `Credentials file not found: ${path}`,
      "FILE_NOT_FOUND",
    );
  }

  /**
   * Create error for keychain access denial
   */
  static keychainDenied(): CredentialError {
    return new CredentialError(
      "Keychain access denied",
      "KEYCHAIN_ACCESS_DENIED",
    );
  }

  /**
   * Create error for file permission issues
   */
  static permissionDenied(path: string): CredentialError {
    return new CredentialError(
      `Permission denied accessing: ${path}`,
      "PERMISSION_DENIED",
    );
  }

  /**
   * Create error for write failures
   */
  static writeFailed(path: string, reason: string): CredentialError {
    return new CredentialError(
      `Failed to write credentials to ${path}: ${reason}`,
      "WRITE_FAILED",
    );
  }

  /**
   * Create error for directory creation failures
   */
  static directoryCreateFailed(path: string): CredentialError {
    return new CredentialError(
      `Failed to create directory: ${path}`,
      "DIRECTORY_CREATE_FAILED",
    );
  }

  /**
   * Create error for delete failures
   */
  static deleteFailed(path: string, reason: string): CredentialError {
    return new CredentialError(
      `Failed to delete credentials at ${path}: ${reason}`,
      "DELETE_FAILED",
    );
  }

  /**
   * Create error for invalid credentials input
   */
  static invalidCredentialsInput(details: string): CredentialError {
    return new CredentialError(
      `Invalid credentials input: ${details}`,
      "INVALID_CREDENTIALS_INPUT",
    );
  }

  /**
   * Create error for storage full condition
   */
  static storageFull(): CredentialError {
    return new CredentialError("Storage is full", "STORAGE_FULL");
  }
}
