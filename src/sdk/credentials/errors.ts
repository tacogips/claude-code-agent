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
  | "PERMISSION_DENIED"; // File permission issue

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
}
