/**
 * Credential Backend Factory
 *
 * Provides platform-specific backend selection for credential reading.
 */
import type { CredentialBackend } from "./file";
export type { CredentialBackend };
/**
 * Platform type for credential backend selection
 */
export type Platform = "linux" | "macos" | "windows";
/**
 * Detect the current platform from Node.js process.platform
 */
export declare function detectPlatform(): Platform;
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
export declare function createCredentialBackend(platform?: Platform): CredentialBackend;
//# sourceMappingURL=index.d.ts.map