# Auth Credentials Writer Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-auth-credentials-writer.md
**Created**: 2026-01-14
**Last Updated**: 2026-01-14

---

## Overview

Implement credential writer for writing, importing, and exporting Claude Code authentication tokens across machines.

### Scope

- Add write/delete methods to credential backends (File, Keychain)
- Create CredentialWriter class for coordinating write operations
- Create validation utilities for credential input
- CLI commands for export, import, delete, and verify
- Integration with existing CredentialReader

### Out of Scope

- Token refresh/generation (Claude Code handles this)
- OAuth flow implementation
- Account info modification (read-only)
- Automatic credential synchronization

---

## Tasks

### TASK-001: Input Types and Validation Types

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/sdk/credentials/validation.ts`

```typescript
// Input type for writing credentials
export interface OAuthTokensInput {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
}

// Export format with metadata
export interface CredentialsExport {
  version: 1;
  exportedAt: string;
  credentials: OAuthTokensInput;
}

// Validation function
export function validateCredentialsInput(input: unknown): Result<OAuthTokensInput, CredentialError>;
export function validateCredentialsExport(input: unknown): Result<CredentialsExport, CredentialError>;
```

**Completion Criteria**:
- [ ] OAuthTokensInput interface defined
- [ ] CredentialsExport interface defined
- [ ] validateCredentialsInput function with token format validation
- [ ] validateCredentialsExport function with version check
- [ ] Token prefix validation (sk-ant-oat01, sk-ant-ort01)
- [ ] Expiration validation (not expired)
- [ ] All validation tests pass

---

### TASK-002: Extended Error Types

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/sdk/credentials/errors.ts` (modify)

```typescript
// Add new error codes
type CredentialErrorCode =
  // Existing...
  | 'WRITE_FAILED'
  | 'DIRECTORY_CREATE_FAILED'
  | 'DELETE_FAILED'
  | 'INVALID_CREDENTIALS_INPUT'
  | 'STORAGE_FULL';

// Add static factory methods
static writeFailed(path: string, reason: string): CredentialError;
static directoryCreateFailed(path: string): CredentialError;
static deleteFailed(path: string, reason: string): CredentialError;
static invalidCredentialsInput(details: string): CredentialError;
static storageFull(): CredentialError;
```

**Completion Criteria**:
- [ ] New error codes added to CredentialErrorCode type
- [ ] Static factory methods for all new error codes
- [ ] Error messages are descriptive and actionable
- [ ] Type checking passes

---

### TASK-003: File Backend Write Methods

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-002]
**Deliverables**: `src/sdk/credentials/backends/file.ts` (modify)

```typescript
// Extend CredentialBackend interface
export interface CredentialBackend {
  read(): Promise<Result<ClaudeCredentials, CredentialError>>;
  write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>>;
  delete(): Promise<Result<void, CredentialError>>;
  isWritable(): Promise<boolean>;
  getLocation(): string;
}

// FileCredentialBackend additions
class FileCredentialBackend {
  async write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>> {
    // Create directory with 0o700
    // Write file with 0o600
    // Handle errors
  }

  async delete(): Promise<Result<void, CredentialError>> {
    // Delete file, ok if ENOENT
  }

  async isWritable(): Promise<boolean>;
  getLocation(): string;
}
```

**Completion Criteria**:
- [ ] CredentialBackend interface extended with write/delete/isWritable/getLocation
- [ ] write() creates directory if needed with mode 0o700
- [ ] write() creates file with mode 0o600
- [ ] write() handles EACCES, ENOSPC errors properly
- [ ] delete() returns ok for ENOENT (idempotent)
- [ ] isWritable() checks directory write permission
- [ ] getLocation() returns file path

---

### TASK-004: Keychain Backend Write Methods

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-002]
**Deliverables**: `src/sdk/credentials/backends/keychain.ts` (modify)

```typescript
// KeychainCredentialBackend additions
class KeychainCredentialBackend {
  async write(credentials: ClaudeCredentials): Promise<Result<void, CredentialError>> {
    // Delete existing entry first
    // Add new entry with security add-generic-password
    // Handle shell escaping for JSON
  }

  async delete(): Promise<Result<void, CredentialError>> {
    // Delete entry, ok if not found
  }

  async isWritable(): Promise<boolean>;
  getLocation(): string;
}

// Shell escaping helper
function escapeShellArg(arg: string): string;
```

**Completion Criteria**:
- [ ] write() deletes existing entry before adding new one
- [ ] write() properly escapes JSON for shell execution
- [ ] write() handles keychain permission errors
- [ ] delete() returns ok when entry not found (idempotent)
- [ ] isWritable() returns true (keychain always writable if accessible)
- [ ] getLocation() returns keychain service/account description
- [ ] escapeShellArg() prevents shell injection

---

### TASK-005: Backend Factory Update

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-003, TASK-004]
**Deliverables**: `src/sdk/credentials/backends/index.ts` (modify)

```typescript
// Re-export extended interface
export { CredentialBackend } from './file';

// Existing factory unchanged (already returns backends with new methods)
export function createCredentialBackend(platform?: Platform): CredentialBackend;
```

**Completion Criteria**:
- [ ] Extended CredentialBackend interface exported
- [ ] Factory function works with updated backends
- [ ] Type checking passes

---

### TASK-006: CredentialWriter Class

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-001, TASK-005]
**Deliverables**: `src/sdk/credentials/writer.ts`

```typescript
export interface CredentialWriterOptions {
  configDir?: string;
  platform?: 'linux' | 'macos' | 'windows';
}

export class CredentialWriter {
  private readonly backend: CredentialBackend;

  constructor(options?: CredentialWriterOptions);

  async writeCredentials(input: OAuthTokensInput): Promise<Result<void, CredentialError>> {
    // Validate input
    // Transform to ClaudeCredentials
    // Write via backend
  }

  async deleteCredentials(): Promise<Result<void, CredentialError>> {
    // Delegate to backend
  }

  async isWritable(): Promise<boolean> {
    // Delegate to backend
  }

  getStorageLocation(): string {
    // Delegate to backend
  }
}
```

**Completion Criteria**:
- [ ] Constructor accepts options and creates appropriate backend
- [ ] writeCredentials() validates input before writing
- [ ] writeCredentials() transforms OAuthTokensInput to ClaudeCredentials
- [ ] deleteCredentials() delegates to backend
- [ ] isWritable() delegates to backend
- [ ] getStorageLocation() delegates to backend
- [ ] All methods return proper Result types

---

### TASK-007: CredentialManager Class

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-006]
**Deliverables**: `src/sdk/credentials/manager.ts`

```typescript
export interface CredentialManagerOptions {
  configDir?: string;
  platform?: 'linux' | 'macos' | 'windows';
}

export class CredentialManager {
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
  writeCredentials(input: OAuthTokensInput): Promise<Result<void, CredentialError>>;
  deleteCredentials(): Promise<Result<void, CredentialError>>;

  // Export/Import helpers
  exportCredentials(): Promise<Result<CredentialsExport, CredentialError>>;
  importCredentials(data: CredentialsExport): Promise<Result<void, CredentialError>>;
}
```

**Completion Criteria**:
- [ ] Constructor creates CredentialReader and CredentialWriter
- [ ] All reader methods delegate correctly
- [ ] All writer methods delegate correctly
- [ ] exportCredentials() reads and wraps in CredentialsExport format
- [ ] importCredentials() validates and writes from CredentialsExport
- [ ] Proper error handling for both read and write operations

---

### TASK-008: Module Index Update

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-007]
**Deliverables**: `src/sdk/credentials/index.ts` (modify)

```typescript
// Add new exports
export { CredentialWriter, type CredentialWriterOptions } from './writer';
export { CredentialManager, type CredentialManagerOptions } from './manager';
export type { OAuthTokensInput, CredentialsExport } from './validation';
export { validateCredentialsInput, validateCredentialsExport } from './validation';
```

**Completion Criteria**:
- [ ] CredentialWriter exported
- [ ] CredentialManager exported
- [ ] Input types exported
- [ ] Validation functions exported
- [ ] Clean public API surface

---

### TASK-009: CLI Auth Export Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-007]
**Deliverables**: `src/cli/commands/auth/export.ts`

```typescript
export function createAuthExportCommand(): Command {
  return new Command('export')
    .description('Export credentials to file or stdout')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .option('-f, --format <type>', 'Output format (json|raw)', 'json')
    .action(async (options) => {
      // Read credentials
      // Format output
      // Write to file or stdout
      // Display security warning
    });
}
```

**Completion Criteria**:
- [ ] Command exports to stdout by default
- [ ] --output writes to file
- [ ] --format json outputs structured CredentialsExport
- [ ] --format raw outputs KEY=VALUE format
- [ ] Security warning displayed
- [ ] Error handling for not authenticated

---

### TASK-010: CLI Auth Import Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-007]
**Deliverables**: `src/cli/commands/auth/import.ts`

```typescript
export function createAuthImportCommand(): Command {
  return new Command('import')
    .description('Import credentials from file or stdin')
    .argument('[file]', 'Input file path')
    .option('--stdin', 'Read from stdin')
    .option('--access-token <token>', 'Access token (for manual entry)')
    .option('--refresh-token <token>', 'Refresh token')
    .option('--expires-at <timestamp>', 'Expiration timestamp (ms)')
    .option('--scopes <scopes>', 'Comma-separated scopes')
    .option('--subscription-type <type>', 'Subscription type')
    .option('--rate-limit-tier <tier>', 'Rate limit tier')
    .option('--force', 'Skip confirmation for overwrite')
    .action(async (file, options) => {
      // Read from file, stdin, or options
      // Validate credentials
      // Confirm overwrite if existing
      // Import credentials
      // Display result
    });
}
```

**Completion Criteria**:
- [ ] Read from file argument
- [ ] Read from stdin with --stdin
- [ ] Accept individual token options
- [ ] Validate input format
- [ ] Confirm before overwriting existing credentials
- [ ] --force skips confirmation
- [ ] Display success with token expiry info
- [ ] Display security warning

---

### TASK-011: CLI Auth Delete Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-007]
**Deliverables**: `src/cli/commands/auth/delete.ts`

```typescript
export function createAuthDeleteCommand(): Command {
  return new Command('delete')
    .description('Delete stored credentials')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
      // Check if credentials exist
      // Prompt for confirmation
      // Delete credentials
      // Display result
    });
}
```

**Completion Criteria**:
- [ ] Prompt for confirmation with "delete" keyword
- [ ] --force skips confirmation
- [ ] Display success message
- [ ] Handle case where no credentials exist
- [ ] Show helpful message about re-authentication

---

### TASK-012: CLI Auth Verify Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-007]
**Deliverables**: `src/cli/commands/auth/verify.ts`

```typescript
export function createAuthVerifyCommand(): Command {
  return new Command('verify')
    .description('Verify stored credentials are valid')
    .action(async () => {
      // Read credentials
      // Check expiration
      // Display verification result
    });
}
```

**Completion Criteria**:
- [ ] Read credentials from storage
- [ ] Check if expired
- [ ] Display status (VALID/EXPIRED/NOT_FOUND)
- [ ] Display token expiry time
- [ ] Display subscription info
- [ ] Display scopes

---

### TASK-013: CLI Auth Command Group Update

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009, TASK-010, TASK-011, TASK-012]
**Deliverables**: `src/cli/commands/auth/index.ts` (modify)

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

**Completion Criteria**:
- [ ] All new commands registered
- [ ] Help text displays all commands
- [ ] Commands work correctly

---

### TASK-014: Unit Tests - Validation

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-001]
**Deliverables**: `src/sdk/credentials/__tests__/validation.test.ts`

```typescript
describe('validateCredentialsInput', () => {
  test('accepts valid input');
  test('rejects invalid access token format');
  test('rejects invalid refresh token format');
  test('rejects expired token');
  test('rejects empty scopes');
  test('rejects invalid subscription type');
  test('rejects empty rate limit tier');
});

describe('validateCredentialsExport', () => {
  test('accepts valid export');
  test('rejects invalid version');
  test('rejects missing exportedAt');
  test('rejects invalid credentials');
});
```

**Completion Criteria**:
- [ ] All validation scenarios tested
- [ ] Tests for edge cases (boundary values)
- [ ] Tests pass

---

### TASK-015: Unit Tests - Writer

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-006]
**Deliverables**: `src/sdk/credentials/__tests__/writer.test.ts`

```typescript
describe('CredentialWriter', () => {
  describe('writeCredentials', () => {
    test('writes valid credentials');
    test('rejects invalid credentials');
    test('handles write permission error');
  });

  describe('deleteCredentials', () => {
    test('deletes existing credentials');
    test('succeeds when no credentials exist');
    test('handles delete permission error');
  });

  describe('isWritable', () => {
    test('returns true when writable');
    test('returns false when not writable');
  });
});
```

**Completion Criteria**:
- [ ] Write operation tests
- [ ] Delete operation tests
- [ ] Permission error handling tests
- [ ] All tests pass

---

### TASK-016: Unit Tests - Manager

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-007]
**Deliverables**: `src/sdk/credentials/__tests__/manager.test.ts`

```typescript
describe('CredentialManager', () => {
  describe('exportCredentials', () => {
    test('exports valid credentials');
    test('handles not authenticated');
  });

  describe('importCredentials', () => {
    test('imports valid export');
    test('rejects invalid export');
    test('overwrites existing credentials');
  });

  // Reader delegation tests
  describe('reader delegation', () => {
    test('getCredentials delegates to reader');
    test('getAccount delegates to reader');
    test('getStats delegates to reader');
  });

  // Writer delegation tests
  describe('writer delegation', () => {
    test('writeCredentials delegates to writer');
    test('deleteCredentials delegates to writer');
  });
});
```

**Completion Criteria**:
- [ ] Export/import tests
- [ ] Reader delegation tests
- [ ] Writer delegation tests
- [ ] All tests pass

---

### TASK-017: Integration Tests

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-016]
**Deliverables**: `src/sdk/credentials/__tests__/integration.test.ts`

```typescript
describe('Credentials Integration', () => {
  test('export/import round-trip preserves data');
  test('write then read returns same credentials');
  test('delete removes credentials');
  test('overwrite replaces existing credentials');

  describe('File Backend', () => {
    test('creates directory with correct permissions');
    test('creates file with correct permissions');
  });
});
```

**Completion Criteria**:
- [ ] Round-trip tests
- [ ] File permission tests
- [ ] All tests pass

---

## Progress Log

### Session: 2026-01-14

**Tasks Created**: TASK-001 through TASK-017
**Notes**: Implementation plan created from design spec

---

## Summary

| Task | Description | Status | Parallelizable |
|------|-------------|--------|----------------|
| TASK-001 | Input Types and Validation | Not Started | Yes |
| TASK-002 | Extended Error Types | Not Started | Yes |
| TASK-003 | File Backend Write Methods | Not Started | No |
| TASK-004 | Keychain Backend Write Methods | Not Started | No |
| TASK-005 | Backend Factory Update | Not Started | No |
| TASK-006 | CredentialWriter Class | Not Started | No |
| TASK-007 | CredentialManager Class | Not Started | No |
| TASK-008 | Module Index Update | Not Started | No |
| TASK-009 | CLI Auth Export Command | Not Started | No |
| TASK-010 | CLI Auth Import Command | Not Started | No |
| TASK-011 | CLI Auth Delete Command | Not Started | No |
| TASK-012 | CLI Auth Verify Command | Not Started | No |
| TASK-013 | CLI Auth Command Group Update | Not Started | No |
| TASK-014 | Unit Tests - Validation | Not Started | No |
| TASK-015 | Unit Tests - Writer | Not Started | No |
| TASK-016 | Unit Tests - Manager | Not Started | No |
| TASK-017 | Integration Tests | Not Started | No |

**Parallelizable first wave**: TASK-001, TASK-002 (2 tasks)
**Current progress**: 0 of 17 tasks completed (0%)
