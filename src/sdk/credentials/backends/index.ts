/**
 * Credential Backend Factory
 *
 * Provides platform-specific backend selection for credential reading.
 */

import type { CredentialBackend } from "./file";
import { FileCredentialBackend, getDefaultCredentialsPath } from "./file";
import { KeychainCredentialBackend } from "./keychain";

// Re-export the backend interface
export type { CredentialBackend };

/**
 * Platform type for credential backend selection
 */
export type Platform = "linux" | "macos" | "windows";

/**
 * Detect the current platform from Node.js process.platform
 */
export function detectPlatform(): Platform {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    case "linux":
    default:
      return "linux";
  }
}

/**
 * Create a credential backend appropriate for the platform
 *
 * @param platform - Platform to create backend for (auto-detected if not provided)
 * @returns CredentialBackend instance for the platform
 *
 * Platform-specific backends:
 * - macOS: KeychainCredentialBackend (uses macOS Keychain via `security` command)
 * - Linux: FileCredentialBackend (reads from ~/.claude/.credentials.json)
 * - Windows: FileCredentialBackend (reads from ~/.claude/.credentials.json)
 */
export function createCredentialBackend(
  platform?: Platform,
): CredentialBackend {
  const detectedPlatform = platform ?? detectPlatform();

  switch (detectedPlatform) {
    case "macos":
      return new KeychainCredentialBackend();
    case "linux":
    case "windows":
    default:
      return new FileCredentialBackend(getDefaultCredentialsPath());
  }
}
