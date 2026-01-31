# Auth Credentials Writer Specification

This document extends `spec-auth-credentials.md` with write capabilities for managing Claude Code authentication tokens across machines.

---

## 1. Overview

### 1.1 Purpose

Enable claude-code-agent to:
- Write OAuth tokens to credentials storage (file or keychain)
- Import credentials from one machine to another
- Support token migration for controlled environments
- Provide CLI commands for credential import/export

### 1.2 Use Case

**Primary Use Case**: Transfer authentication between machines in controlled environments where:
- User has Claude Code subscription on Machine A
- User wants to use same subscription on Machine B without re-authentication
- Security risks are acknowledged and accepted
- Limited to trusted environments (not recommended for shared/public machines)

### 1.3 Security Warning

This feature enables credential transfer which carries inherent security risks:
- Tokens can be intercepted if transferred insecurely
- Stolen tokens provide full account access until expiration
- No audit trail of token usage across machines
- Recommended only for:
  - Personal development machines
  - Air-gapped or isolated environments
  - Temporary testing scenarios

### 1.4 Design Constraints

- **Read-only account data**: Only OAuth tokens can be written; account info in ~/.claude.json remains read-only
- **No token generation**: Only imports existing tokens; does not implement OAuth flow
- **No automatic sync**: One-time import; credentials are not synchronized
- **Platform parity**: Write support matches read support (file for Linux, keychain for macOS)

---

## 2. SDK Interface

### 2.1 CredentialWriter Class

```typescript
interface CredentialWriterOptions {
  configDir?: string;  // Default: ~/.claude
  platform?: 'linux' | 'macos' | 'windows';  // Auto-detected
}

class CredentialWriter {
  constructor(options?: CredentialWriterOptions);

  /**
   * Write OAuth credentials to platform-specific storage.
   * Overwrites existing credentials if present.
   *
   * @throws CredentialError on write failure
   */
  writeCredentials(credentials: OAuthTokensInput): Promise<Result<void, CredentialError>>;

  /**
   * Delete existing credentials from storage.
   * Safe to call if no credentials exist.
   */
  deleteCredentials(): Promise<Result<void, CredentialError>>;

  /**
   * Check if credentials storage location is writable.
   */
  isWritable(): Promise<boolean>;

  /**
   * Get the credentials storage path/location.
   */
  getStorageLocation(): string;
}
```

### 2.2 Input Types

```typescript
/**
 * Input for writing credentials - mirrors raw token structure
 */
interface OAuthTokensInput {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;  // Unix timestamp in milliseconds
  scopes: string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
}

/**
 * Convenience type for import/export
 */
interface CredentialsExport {
  version: 1;
  exportedAt: string;  // ISO date
  credentials: OAuthTokensInput;
}
```

### 2.3 Backend Interface Extension

```typescript
interface CredentialBackend {
  read(): Promise<Result<ClaudeCredentials, CredentialError>>;

  // New methods
  write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>>;
  delete(): Promise<Result<void, CredentialError>>;
  isWritable(): Promise<boolean>;
  getLocation(): string;
}
```

---

## 3. CLI Interface

### 3.1 Commands

```bash
# Export credentials to file or stdout
claude-code-agent auth export
claude-code-agent auth export --output credentials.json
claude-code-agent auth export --format json  # default, structured format
claude-code-agent auth export --format raw   # raw token values only

# Import credentials from file or stdin
claude-code-agent auth import credentials.json
claude-code-agent auth import --stdin < credentials.json
claude-code-agent auth import --access-token "TOKEN" --refresh-token "TOKEN" \
  --expires-at TIMESTAMP --scopes "scope1,scope2" \
  --subscription-type max --rate-limit-tier default

# Delete credentials (with confirmation)
claude-code-agent auth delete
claude-code-agent auth delete --force  # Skip confirmation

# Verify imported credentials
claude-code-agent auth verify
```

### 3.2 Output Examples

**auth export**:
```json
{
  "version": 1,
  "exportedAt": "2026-01-14T12:00:00Z",
  "credentials": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1768332736724,
    "scopes": ["user:inference", "user:profile", "user:sessions:claude_code"],
    "subscriptionType": "max",
    "rateLimitTier": "default_claude_max_20x"
  }
}
```

**auth export --format raw**:
```
ACCESS_TOKEN=sk-ant-oat01-...
REFRESH_TOKEN=sk-ant-ort01-...
EXPIRES_AT=1768332736724
SCOPES=user:inference,user:profile,user:sessions:claude_code
SUBSCRIPTION_TYPE=max
RATE_LIMIT_TIER=default_claude_max_20x
```

**auth import** (success):
```
CREDENTIAL IMPORT
-----------------------------------------------------------
Status:           SUCCESS
Storage Location: /home/user/.claude/.credentials.json
Token Expiry:     2026-01-15 12:32:16 (23 hours from now)
Subscription:     max

WARNING: These credentials provide full account access.
         Do not share the exported file.
```

**auth delete** (confirmation):
```
WARNING: This will delete your Claude Code credentials.
You will need to re-authenticate using 'claude /login'.

Type 'delete' to confirm:
```

**auth verify**:
```
CREDENTIAL VERIFICATION
-----------------------------------------------------------
Status:           VALID
Token Expires:    2026-01-15 12:32:16 (23 hours from now)
Subscription:     max
Scopes:           user:inference, user:profile, user:sessions:claude_code

Credentials are valid and can be used for Claude Code execution.
```

---

## 4. Backend Implementation

### 4.1 File Backend (Linux)

```typescript
class FileCredentialBackend implements CredentialBackend {
  constructor(private readonly path: string) {}

  async write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>> {
    try {
      // Ensure directory exists
      const dir = dirname(this.path);
      await mkdir(dir, { recursive: true, mode: 0o700 });

      // Write with restrictive permissions (owner read/write only)
      const content = JSON.stringify(credentials, null, 2);
      await writeFile(this.path, content, { mode: 0o600 });

      return ok(undefined);
    } catch (error) {
      // Handle permission denied, disk full, etc.
    }
  }

  async delete(): Promise<Result<void, CredentialError>> {
    try {
      await unlink(this.path);
      return ok(undefined);
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return ok(undefined); // Already deleted
      }
      // Handle other errors
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
```

### 4.2 Keychain Backend (macOS)

```typescript
class KeychainCredentialBackend implements CredentialBackend {
  private readonly service = 'claude-code';
  private readonly account = 'credentials';

  async write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>> {
    try {
      const jsonData = JSON.stringify(credentials);

      // Delete existing entry first (if exists)
      await this.delete();

      // Add new keychain entry
      await execAsync(
        `security add-generic-password -s "${this.service}" -a "${this.account}" -w "${escapeShellArg(jsonData)}" -U`
      );

      return ok(undefined);
    } catch (error) {
      // Handle keychain errors
    }
  }

  async delete(): Promise<Result<void, CredentialError>> {
    try {
      await execAsync(
        `security delete-generic-password -s "${this.service}" -a "${this.account}"`
      );
      return ok(undefined);
    } catch (error) {
      if (isExecError(error) && error.stderr?.includes('could not be found')) {
        return ok(undefined); // Already deleted
      }
      // Handle other errors
    }
  }

  async isWritable(): Promise<boolean> {
    // Keychain is always writable if user has access
    // Could test by writing/deleting a test entry
    return true;
  }

  getLocation(): string {
    return `macOS Keychain (service: ${this.service}, account: ${this.account})`;
  }
}
```

---

## 5. Error Handling

### 5.1 New Error Codes

```typescript
type CredentialErrorCode =
  // Existing codes
  | 'NOT_AUTHENTICATED'
  | 'EXPIRED'
  | 'INVALID_FORMAT'
  | 'KEYCHAIN_ACCESS_DENIED'
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  // New codes for writing
  | 'WRITE_FAILED'
  | 'DIRECTORY_CREATE_FAILED'
  | 'DELETE_FAILED'
  | 'INVALID_CREDENTIALS_INPUT'
  | 'STORAGE_FULL';
```

### 5.2 Static Factory Methods

```typescript
class CredentialError extends Error {
  // Existing methods...

  static writeFailed(path: string, reason: string): CredentialError {
    return new CredentialError(`Failed to write credentials to ${path}: ${reason}`, 'WRITE_FAILED');
  }

  static directoryCreateFailed(path: string): CredentialError {
    return new CredentialError(`Failed to create directory: ${path}`, 'DIRECTORY_CREATE_FAILED');
  }

  static deleteFailed(path: string, reason: string): CredentialError {
    return new CredentialError(`Failed to delete credentials at ${path}: ${reason}`, 'DELETE_FAILED');
  }

  static invalidCredentialsInput(details: string): CredentialError {
    return new CredentialError(`Invalid credentials input: ${details}`, 'INVALID_CREDENTIALS_INPUT');
  }

  static storageFull(): CredentialError {
    return new CredentialError('Storage is full', 'STORAGE_FULL');
  }
}
```

---

## 6. Validation

### 6.1 Input Validation

```typescript
function validateCredentialsInput(input: unknown): Result<OAuthTokensInput, CredentialError> {
  // Validate structure exists
  if (typeof input !== 'object' || input === null) {
    return err(CredentialError.invalidCredentialsInput('Input must be an object'));
  }

  const obj = input as Record<string, unknown>;

  // Validate access token format
  if (typeof obj.accessToken !== 'string' || !obj.accessToken.startsWith('sk-ant-')) {
    return err(CredentialError.invalidCredentialsInput('Invalid access token format'));
  }

  // Validate refresh token format
  if (typeof obj.refreshToken !== 'string' || !obj.refreshToken.startsWith('sk-ant-')) {
    return err(CredentialError.invalidCredentialsInput('Invalid refresh token format'));
  }

  // Validate expiration
  if (typeof obj.expiresAt !== 'number' || obj.expiresAt < Date.now()) {
    return err(CredentialError.invalidCredentialsInput('Token is expired or invalid expiration'));
  }

  // Validate scopes
  if (!Array.isArray(obj.scopes) || obj.scopes.length === 0) {
    return err(CredentialError.invalidCredentialsInput('Scopes must be a non-empty array'));
  }

  // Validate subscription type
  const validSubscriptionTypes = ['max', 'pro', 'free', 'enterprise', 'unknown'];
  if (!validSubscriptionTypes.includes(obj.subscriptionType as string)) {
    return err(CredentialError.invalidCredentialsInput('Invalid subscription type'));
  }

  // Validate rate limit tier
  if (typeof obj.rateLimitTier !== 'string' || obj.rateLimitTier.length === 0) {
    return err(CredentialError.invalidCredentialsInput('Invalid rate limit tier'));
  }

  return ok(obj as OAuthTokensInput);
}
```

### 6.2 Token Format Patterns

| Field | Pattern | Example |
|-------|---------|---------|
| accessToken | `sk-ant-oat01-*` | `sk-ant-oat01-abc123...` |
| refreshToken | `sk-ant-ort01-*` | `sk-ant-ort01-xyz789...` |
| expiresAt | Unix timestamp (ms) | `1768332736724` |
| scopes | Array of strings | `["user:inference"]` |
| subscriptionType | Enum | `max`, `pro`, `free` |
| rateLimitTier | Non-empty string | `default_claude_max_20x` |

---

## 7. Security Considerations

### 7.1 File Permissions

- Credentials file: `0600` (owner read/write only)
- Parent directory: `0700` (owner full access only)
- Umask applied during creation

### 7.2 Export Security

- Never log full tokens
- Display security warning on export
- Recommend secure transfer methods (not email, not unencrypted chat)
- Suggest deleting export file after import

### 7.3 Import Security

- Validate token format before writing
- Verify token expiration
- Display warning about credential sharing risks
- Prompt for confirmation before overwriting existing credentials

### 7.4 Shell Escaping

When writing to keychain, properly escape JSON to prevent shell injection:

```typescript
function escapeShellArg(arg: string): string {
  // Replace single quotes with escaped version
  return arg.replace(/'/g, "'\\''");
}
```

---

## 8. Integration

### 8.1 CredentialManager Class

Combined read/write interface:

```typescript
class CredentialManager {
  private readonly reader: CredentialReader;
  private readonly writer: CredentialWriter;

  constructor(options?: CredentialManagerOptions);

  // Read operations (delegate to CredentialReader)
  getCredentials(): Promise<OAuthCredentialsResult | null>;
  getAccount(): Promise<AccountInfo | null>;
  getStats(): Promise<UsageStats | null>;
  isAuthenticated(): Promise<boolean>;
  getSubscriptionType(): Promise<SubscriptionType | null>;

  // Write operations (delegate to CredentialWriter)
  writeCredentials(credentials: OAuthTokensInput): Promise<Result<void, CredentialError>>;
  deleteCredentials(): Promise<Result<void, CredentialError>>;

  // Export/Import helpers
  exportCredentials(): Promise<Result<CredentialsExport, CredentialError>>;
  importCredentials(data: CredentialsExport): Promise<Result<void, CredentialError>>;
}
```

### 8.2 CLI Command Group Update

```typescript
export function createAuthCommand(): Command {
  return new Command('auth')
    .description('Manage authentication and view account info')
    // Existing commands
    .addCommand(createAuthInfoCommand())
    .addCommand(createAuthStatsCommand())
    .addCommand(createAuthStatusCommand())
    .addCommand(createAuthTokenCommand())
    // New commands
    .addCommand(createAuthExportCommand())
    .addCommand(createAuthImportCommand())
    .addCommand(createAuthDeleteCommand())
    .addCommand(createAuthVerifyCommand());
}
```

---

## 9. File Structure Updates

```
src/
+-- sdk/
|   +-- credentials/
|   |   +-- index.ts              # Add writer exports
|   |   +-- reader.ts             # Existing reader
|   |   +-- writer.ts             # NEW: CredentialWriter class
|   |   +-- manager.ts            # NEW: Combined CredentialManager
|   |   +-- validation.ts         # NEW: Input validation
|   |   +-- backends/
|   |   |   +-- index.ts          # Add write method exports
|   |   |   +-- file.ts           # Add write/delete methods
|   |   |   +-- keychain.ts       # Add write/delete methods
|   |   +-- types.ts              # Add OAuthTokensInput, CredentialsExport
|   |   +-- errors.ts             # Add new error codes
+-- cli/
    +-- commands/
        +-- auth/
            +-- index.ts          # Register new commands
            +-- export.ts         # NEW: auth export command
            +-- import.ts         # NEW: auth import command
            +-- delete.ts         # NEW: auth delete command
            +-- verify.ts         # NEW: auth verify command
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Validation function tests with valid/invalid inputs
- File backend write tests with mocked fs
- Keychain backend write tests with mocked exec
- Error handling tests for all error codes
- Shell escaping tests

### 10.2 Integration Tests

- Export/import round-trip test
- Overwrite existing credentials test
- Delete credentials test
- Platform-specific storage tests

### 10.3 Security Tests

- File permission verification after write
- Shell injection prevention tests
- Token format validation tests

---

## 11. Dependencies

Existing dependencies only:
- `fs/promises` - File operations (writeFile, mkdir, unlink, access)
- `child_process` - macOS Keychain access (exec)
- `util` - Promisify

No new external dependencies required.
