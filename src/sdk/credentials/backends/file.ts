/**
 * File-based Credential Backend for Linux
 *
 * Reads Claude Code OAuth credentials from ~/.claude/.credentials.json
 */

import {
  readFile,
  mkdir,
  unlink,
  access,
  constants,
  chmod,
} from "fs/promises";
import { dirname } from "path";
import { Result, ok, err } from "../../../result";
import type { ClaudeCredentials } from "../types";
import { CredentialError } from "../errors";
import { isValidCredentials, isNodeError } from "./type-guards";
import { FileLockServiceImpl } from "../../../services/file-lock";
import { AtomicWriter } from "../../../services/atomic-writer";
import { BunFileSystem } from "../../../interfaces/bun-filesystem";
import { SystemClock } from "../../../interfaces/system-clock";

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
export class FileCredentialBackend implements CredentialBackend {
  private readonly lockService: FileLockServiceImpl;
  private readonly atomicWriter: AtomicWriter;

  constructor(private readonly path: string) {
    const fs = new BunFileSystem();
    const clock = new SystemClock();
    this.lockService = new FileLockServiceImpl(fs, clock);
    this.atomicWriter = new AtomicWriter(fs);
  }

  async read(): Promise<Result<ClaudeCredentials, CredentialError>> {
    try {
      // Read file contents
      const fileContent = await readFile(this.path, "utf-8");

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(fileContent);
      } catch (parseError) {
        return err(
          CredentialError.invalidFormat(
            `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          ),
        );
      }

      // Validate structure
      if (!isValidCredentials(parsed)) {
        return err(
          CredentialError.invalidFormat(
            "Missing or invalid claudeAiOauth field",
          ),
        );
      }

      return ok(parsed);
    } catch (error) {
      // Handle file system errors
      if (isNodeError(error)) {
        switch (error.code) {
          case "ENOENT":
            return err(CredentialError.fileNotFound(this.path));
          case "EACCES":
            return err(CredentialError.permissionDenied(this.path));
          default:
            return err(
              CredentialError.invalidFormat(
                `File system error: ${error.message}`,
              ),
            );
        }
      }

      return err(
        CredentialError.invalidFormat(
          `Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }

  async write(
    credentials: ClaudeCredentials,
  ): Promise<Result<void, CredentialError>> {
    try {
      await this.lockService.withLock(this.path, async () => {
        // Ensure directory exists with restrictive permissions (owner only)
        const dir = dirname(this.path);
        await mkdir(dir, { recursive: true, mode: 0o700 });

        // Use atomic writer to write credentials
        await this.atomicWriter.writeJson(this.path, credentials);

        // Set restrictive permissions (owner read/write only) after atomic write
        await chmod(this.path, 0o600);
      });

      return ok(undefined);
    } catch (error) {
      // Handle file system errors
      if (isNodeError(error)) {
        switch (error.code) {
          case "EACCES":
            return err(CredentialError.permissionDenied(this.path));
          case "ENOSPC":
            return err(CredentialError.storageFull());
          default:
            return err(CredentialError.writeFailed(this.path, error.message));
        }
      }

      return err(
        CredentialError.writeFailed(
          this.path,
          error instanceof Error ? error.message : "Unknown error",
        ),
      );
    }
  }

  async delete(): Promise<Result<void, CredentialError>> {
    try {
      await this.lockService.withLock(this.path, async () => {
        await unlink(this.path);
      });
      return ok(undefined);
    } catch (error) {
      // Handle file system errors
      if (isNodeError(error)) {
        // Idempotent: if file doesn't exist, deletion is already complete
        if (error.code === "ENOENT") {
          return ok(undefined);
        }

        if (error.code === "EACCES") {
          return err(CredentialError.permissionDenied(this.path));
        }

        return err(CredentialError.deleteFailed(this.path, error.message));
      }

      return err(
        CredentialError.deleteFailed(
          this.path,
          error instanceof Error ? error.message : "Unknown error",
        ),
      );
    }
  }

  async isWritable(): Promise<boolean> {
    try {
      const dir = dirname(this.path);
      await access(dir, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  getLocation(): string {
    return this.path;
  }
}

/**
 * Get default credentials file path
 */
export function getDefaultCredentialsPath(): string {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude/.credentials.json`;
}
