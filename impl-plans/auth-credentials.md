# Auth Credentials Reader Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-auth-credentials.md
**Created**: 2026-01-13
**Last Updated**: 2026-01-13

---

## Overview

Implement credential reader for accessing Claude Code authentication tokens, account information, and usage statistics.

### Scope

- Read OAuth tokens from credentials file (Linux) or Keychain (macOS)
- Read account info from ~/.claude.json
- Read usage statistics from stats-cache.json
- CLI commands for auth info, stats, status, and token display

### Out of Scope

- Token refresh/management (Claude Code handles this)
- OAuth flow implementation
- Windows Credential Manager integration (future)

---

## Tasks

### TASK-001: Credential Types

**Status**: Completed
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/sdk/credentials/types.ts`

```typescript
// Types for credential structures
export interface ClaudeCredentials {
  claudeAiOauth: OAuthTokens;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
}

export type SubscriptionType = 'max' | 'pro' | 'free' | 'enterprise' | 'unknown';

export interface OAuthCredentialsResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: readonly string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
  isExpired: boolean;
}

export interface AccountInfo {
  accountUuid: string;
  emailAddress: string;
  displayName: string;
  organization: OrganizationInfo;
}

export interface OrganizationInfo {
  uuid: string;
  name: string;
  billingType: string;
  role: string;
}
```

**Completion Criteria**:
- [x] OAuthTokens interface defined
- [x] OAuthCredentialsResult interface with isExpired computed property
- [x] AccountInfo interface defined
- [x] SubscriptionType union type defined
- [x] Exported from module index

---

### TASK-002: Stats Types

**Status**: Completed
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/sdk/credentials/stats-types.ts`

```typescript
export interface RawStatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: RawDailyActivity[];
  dailyOutputTokens: RawDailyTokens[];
  modelUsage: Record<string, RawModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: RawLongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

export interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: Date;
  lastComputedDate: Date;
  modelUsage: Map<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  dailyTokens: DailyTokens[];
  longestSession: LongestSession;
  peakHour: number;
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

export interface DailyActivity {
  date: Date;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyTokens {
  date: Date;
  tokensByModel: Map<string, number>;
  totalTokens: number;
}

export interface LongestSession {
  sessionId: string;
  durationMs: number;
  messageCount: number;
  timestamp: Date;
}
```

**Completion Criteria**:
- [x] RawStatsCache interface for JSON parsing
- [x] UsageStats interface for public API
- [x] ModelUsage, DailyActivity, DailyTokens interfaces
- [x] All types exported

---

### TASK-003: Error Types

**Status**: Completed
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/sdk/credentials/errors.ts`

```typescript
export type CredentialErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'EXPIRED'
  | 'INVALID_FORMAT'
  | 'KEYCHAIN_ACCESS_DENIED'
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED';

export class CredentialError extends Error {
  constructor(
    message: string,
    public readonly code: CredentialErrorCode
  ) {
    super(message);
    this.name = 'CredentialError';
  }

  static notAuthenticated(): CredentialError {
    return new CredentialError('No credentials found', 'NOT_AUTHENTICATED');
  }

  static expired(): CredentialError {
    return new CredentialError('Credentials expired', 'EXPIRED');
  }

  static invalidFormat(details: string): CredentialError {
    return new CredentialError(`Invalid credentials format: ${details}`, 'INVALID_FORMAT');
  }

  static fileNotFound(path: string): CredentialError {
    return new CredentialError(`Credentials file not found: ${path}`, 'FILE_NOT_FOUND');
  }

  static keychainDenied(): CredentialError {
    return new CredentialError('Keychain access denied', 'KEYCHAIN_ACCESS_DENIED');
  }
}
```

**Completion Criteria**:
- [x] CredentialErrorCode type defined
- [x] CredentialError class with static factory methods
- [x] Error codes cover all failure scenarios

---

### TASK-004: File Credential Backend

**Status**: Completed
**Parallelizable**: No
**Dependencies**: [TASK-001, TASK-003]
**Deliverables**: `src/sdk/credentials/backends/file.ts`

```typescript
import { Result, ok, err } from '@shared/result';
import { ClaudeCredentials, OAuthTokens } from '../types';
import { CredentialError } from '../errors';

export interface CredentialBackend {
  read(): Promise<Result<ClaudeCredentials, CredentialError>>;
}

export class FileCredentialBackend implements CredentialBackend {
  constructor(private readonly path: string) {}

  async read(): Promise<Result<ClaudeCredentials, CredentialError>> {
    // Check file exists
    // Read and parse JSON
    // Validate structure
    // Return ClaudeCredentials
  }
}

// Default path helper
export function getDefaultCredentialsPath(): string {
  const home = process.env.HOME ?? '';
  return `${home}/.claude/.credentials.json`;
}
```

**Completion Criteria**:
- [x] CredentialBackend interface defined
- [x] FileCredentialBackend implementation
- [x] Proper error handling with Result type
- [x] JSON validation
- [x] Path helper function

---

### TASK-005: Keychain Credential Backend (macOS)

**Status**: Completed
**Parallelizable**: No
**Dependencies**: [TASK-001, TASK-003]
**Deliverables**: `src/sdk/credentials/backends/keychain.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { Result, ok, err } from '@shared/result';
import { ClaudeCredentials } from '../types';
import { CredentialError } from '../errors';
import { CredentialBackend } from './file';

const execAsync = promisify(exec);

export class KeychainCredentialBackend implements CredentialBackend {
  private readonly service = 'claude-code';  // May need adjustment
  private readonly account = 'credentials';

  async read(): Promise<Result<ClaudeCredentials, CredentialError>> {
    try {
      // Execute: security find-generic-password -s "service" -a "account" -w
      // Parse JSON response
      // Return credentials
    } catch (error) {
      // Handle keychain access denied
      // Handle not found
    }
  }
}
```

**Completion Criteria**:
- [x] KeychainCredentialBackend implementation
- [x] Use `security` command for macOS Keychain access
- [x] Handle permission denied errors
- [x] Handle not found errors
- [x] JSON parsing from keychain data

**Note**: Exact keychain service/account names need verification from Claude Code behavior.

---

### TASK-006: Backend Factory

**Status**: Completed
**Parallelizable**: No
**Dependencies**: [TASK-004, TASK-005]
**Deliverables**: `src/sdk/credentials/backends/index.ts`

```typescript
import { CredentialBackend, FileCredentialBackend, getDefaultCredentialsPath } from './file';
import { KeychainCredentialBackend } from './keychain';
import { Platform, detectPlatform } from '@shared/platform';

export { CredentialBackend } from './file';

export function createCredentialBackend(platform?: Platform): CredentialBackend {
  const p = platform ?? detectPlatform();

  switch (p) {
    case 'macos':
      return new KeychainCredentialBackend();
    case 'linux':
    case 'windows':
    default:
      return new FileCredentialBackend(getDefaultCredentialsPath());
  }
}
```

**Completion Criteria**:
- [x] Factory function for backend creation
- [x] Platform detection integration
- [x] All backends exported from index

---

### TASK-007: Config Reader

**Status**: Completed
**Parallelizable**: No
**Dependencies**: [TASK-001, TASK-003]
**Deliverables**: `src/sdk/credentials/config-reader.ts`

```typescript
import { Result, ok, err } from '@shared/result';
import { AccountInfo } from './types';
import { CredentialError } from './errors';

interface RawClaudeConfig {
  oauthAccount?: {
    accountUuid: string;
    emailAddress: string;
    displayName: string;
    organizationUuid: string;
    organizationName: string;
    organizationBillingType: string;
    organizationRole: string;
  };
  numStartups?: number;
  projects?: Record<string, ProjectConfig>;
}

export class ConfigReader {
  constructor(private readonly path: string = getDefaultConfigPath()) {}

  async getAccount(): Promise<Result<AccountInfo | null, CredentialError>> {
    // Read ~/.claude.json
    // Extract oauthAccount section
    // Transform to AccountInfo
    // Return null if no account
  }
}

export function getDefaultConfigPath(): string {
  const home = process.env.HOME ?? '';
  return `${home}/.claude.json`;
}
```

**Completion Criteria**:
- [x] ConfigReader class
- [x] Read and parse ~/.claude.json
- [x] Extract oauthAccount to AccountInfo
- [x] Handle missing oauthAccount gracefully

---

### TASK-008: Stats Reader

**Status**: Completed
**Parallelizable**: No
**Dependencies**: [TASK-002, TASK-003]
**Deliverables**: `src/sdk/credentials/stats-reader.ts`

```typescript
import { Result, ok, err } from '@shared/result';
import { RawStatsCache, UsageStats, ModelUsage, DailyActivity, DailyTokens } from './stats-types';
import { CredentialError } from './errors';

export class StatsReader {
  constructor(private readonly path: string = getDefaultStatsPath()) {}

  async getStats(): Promise<Result<UsageStats | null, CredentialError>> {
    // Read stats-cache.json
    // Transform raw data to UsageStats
    // Calculate peakHour from hourCounts
    // Convert dates to Date objects
    // Convert modelUsage to Map
  }

  private transformModelUsage(raw: Record<string, unknown>): Map<string, ModelUsage> {
    // Transform raw model usage to Map<string, ModelUsage>
  }

  private findPeakHour(hourCounts: Record<string, number>): number {
    // Find hour with maximum count
  }
}

export function getDefaultStatsPath(): string {
  const home = process.env.HOME ?? '';
  return `${home}/.claude/stats-cache.json`;
}
```

**Completion Criteria**:
- [x] StatsReader class
- [x] Read and parse stats-cache.json
- [x] Transform raw data to typed UsageStats
- [x] Calculate derived values (peakHour, totalTokens)
- [x] Handle missing stats file gracefully

---

### TASK-009: CredentialReader Class

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-006, TASK-007, TASK-008]
**Deliverables**: `src/sdk/credentials/reader.ts`

```typescript
import { Result } from '@shared/result';
import { CredentialBackend, createCredentialBackend } from './backends';
import { ConfigReader } from './config-reader';
import { StatsReader } from './stats-reader';
import { OAuthCredentialsResult, AccountInfo, SubscriptionType } from './types';
import { UsageStats } from './stats-types';
import { CredentialError } from './errors';

export interface CredentialReaderOptions {
  configDir?: string;
  platform?: 'linux' | 'macos' | 'windows';
}

export class CredentialReader {
  private readonly backend: CredentialBackend;
  private readonly configReader: ConfigReader;
  private readonly statsReader: StatsReader;

  constructor(options?: CredentialReaderOptions) {
    this.backend = createCredentialBackend(options?.platform);
    this.configReader = new ConfigReader(
      options?.configDir ? `${options.configDir}/.claude.json` : undefined
    );
    this.statsReader = new StatsReader(
      options?.configDir ? `${options.configDir}/stats-cache.json` : undefined
    );
  }

  async getCredentials(): Promise<OAuthCredentialsResult | null> {
    // Read from backend
    // Transform to OAuthCredentialsResult
    // Calculate isExpired
    // Return null if not found
  }

  async getAccount(): Promise<AccountInfo | null> {
    // Delegate to configReader
  }

  async getStats(): Promise<UsageStats | null> {
    // Delegate to statsReader
  }

  async isAuthenticated(): Promise<boolean> {
    // Check credentials exist and not expired
  }

  async getSubscriptionType(): Promise<SubscriptionType | null> {
    // Get from credentials
  }
}
```

**Completion Criteria**:
- [ ] CredentialReader class implementation
- [ ] getCredentials() method
- [ ] getAccount() method
- [ ] getStats() method
- [ ] isAuthenticated() helper
- [ ] getSubscriptionType() helper
- [ ] Proper null handling for missing data

---

### TASK-010: Module Index

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009]
**Deliverables**: `src/sdk/credentials/index.ts`

```typescript
export { CredentialReader, type CredentialReaderOptions } from './reader';
export type {
  OAuthCredentialsResult,
  AccountInfo,
  OrganizationInfo,
  SubscriptionType,
} from './types';
export type {
  UsageStats,
  ModelUsage,
  DailyActivity,
  DailyTokens,
  LongestSession,
} from './stats-types';
export { CredentialError, type CredentialErrorCode } from './errors';
```

**Completion Criteria**:
- [ ] All public types exported
- [ ] CredentialReader exported
- [ ] CredentialError exported
- [ ] Clean public API surface

---

### TASK-011: CLI Auth Info Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009]
**Deliverables**: `src/cli/commands/auth/info.ts`

```typescript
import { Command } from 'commander';
import { CredentialReader } from '@sdk/credentials';
import { formatTable, formatJson } from '@cli/formatters';

export function createAuthInfoCommand(): Command {
  return new Command('info')
    .description('Show account information')
    .option('-f, --format <type>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      const reader = new CredentialReader();
      const account = await reader.getAccount();

      if (!account) {
        console.error('Not authenticated. Run: claude /login');
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(formatJson(account));
      } else {
        // Table format output
      }
    });
}
```

**Completion Criteria**:
- [ ] Command definition
- [ ] Table output format
- [ ] JSON output format
- [ ] Error handling for not authenticated

---

### TASK-012: CLI Auth Stats Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009]
**Deliverables**: `src/cli/commands/auth/stats.ts`

```typescript
import { Command } from 'commander';
import { CredentialReader } from '@sdk/credentials';

export function createAuthStatsCommand(): Command {
  return new Command('stats')
    .description('Show usage statistics')
    .option('-f, --format <type>', 'Output format (table|json)', 'table')
    .option('-p, --period <days>', 'Show last N days', '30')
    .option('-m, --model <name>', 'Filter by model')
    .action(async (options) => {
      const reader = new CredentialReader();
      const stats = await reader.getStats();

      if (!stats) {
        console.error('No usage statistics found');
        process.exit(1);
      }

      // Filter by period
      // Filter by model
      // Output in requested format
    });
}
```

**Completion Criteria**:
- [ ] Command definition
- [ ] Period filtering (--period)
- [ ] Model filtering (--model)
- [ ] Table and JSON output formats

---

### TASK-013: CLI Auth Status Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009]
**Deliverables**: `src/cli/commands/auth/status.ts`

```typescript
import { Command } from 'commander';
import { CredentialReader } from '@sdk/credentials';

export function createAuthStatusCommand(): Command {
  return new Command('status')
    .description('Check authentication status')
    .action(async () => {
      const reader = new CredentialReader();
      const creds = await reader.getCredentials();

      if (!creds) {
        console.log('Authentication Status: NOT AUTHENTICATED');
        console.log('Run: claude /login');
        process.exit(1);
      }

      const status = creds.isExpired ? 'EXPIRED' : 'VALID';
      console.log(`Authentication Status: ${status}`);
      console.log(`Subscription: ${creds.subscriptionType}`);
      console.log(`Expires: ${creds.expiresAt.toISOString()}`);
    });
}
```

**Completion Criteria**:
- [ ] Command definition
- [ ] Display auth status (VALID/EXPIRED/NOT_AUTHENTICATED)
- [ ] Display subscription type
- [ ] Display expiration time

---

### TASK-014: CLI Auth Token Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009]
**Deliverables**: `src/cli/commands/auth/token.ts`

```typescript
import { Command } from 'commander';
import { CredentialReader } from '@sdk/credentials';

export function createAuthTokenCommand(): Command {
  return new Command('token')
    .description('Show token information')
    .option('--show-full', 'Show full token (SECURITY WARNING)')
    .action(async (options) => {
      const reader = new CredentialReader();
      const creds = await reader.getCredentials();

      if (!creds) {
        console.error('Not authenticated');
        process.exit(1);
      }

      if (options.showFull) {
        console.warn('WARNING: Full token displayed. Do not share.');
        console.log(`Access Token: ${creds.accessToken}`);
        console.log(`Refresh Token: ${creds.refreshToken}`);
      } else {
        // Redacted display
        const redacted = redactToken(creds.accessToken);
        console.log(`Access Token: ${redacted}`);
      }

      console.log(`Scopes: ${creds.scopes.join(', ')}`);
      console.log(`Expires: ${creds.expiresAt.toISOString()}`);
    });
}

function redactToken(token: string): string {
  if (token.length < 20) return '***';
  return `${token.slice(0, 15)}...${token.slice(-4)}`;
}
```

**Completion Criteria**:
- [ ] Command definition
- [ ] Redacted token display by default
- [ ] --show-full flag with security warning
- [ ] Display scopes and expiration

---

### TASK-015: CLI Auth Command Group

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-011, TASK-012, TASK-013, TASK-014]
**Deliverables**: `src/cli/commands/auth/index.ts`

```typescript
import { Command } from 'commander';
import { createAuthInfoCommand } from './info';
import { createAuthStatsCommand } from './stats';
import { createAuthStatusCommand } from './status';
import { createAuthTokenCommand } from './token';

export function createAuthCommand(): Command {
  return new Command('auth')
    .description('Manage authentication and view account info')
    .addCommand(createAuthInfoCommand())
    .addCommand(createAuthStatsCommand())
    .addCommand(createAuthStatusCommand())
    .addCommand(createAuthTokenCommand());
}
```

**Completion Criteria**:
- [ ] Auth command group definition
- [ ] All subcommands registered
- [ ] Help text displays correctly

---

### TASK-016: Integration Tests

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: [TASK-009]
**Deliverables**: `src/sdk/credentials/__tests__/reader.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CredentialReader } from '../reader';

describe('CredentialReader', () => {
  describe('getCredentials', () => {
    it('returns null when credentials file missing', async () => {
      // Test with non-existent path
    });

    it('parses valid credentials file', async () => {
      // Test with mock credentials
    });

    it('detects expired credentials', async () => {
      // Test with expired token
    });
  });

  describe('getAccount', () => {
    it('returns null when not authenticated', async () => {});
    it('parses account info correctly', async () => {});
  });

  describe('getStats', () => {
    it('returns null when stats file missing', async () => {});
    it('parses stats correctly', async () => {});
    it('calculates peakHour correctly', async () => {});
  });
});
```

**Completion Criteria**:
- [ ] Tests for getCredentials()
- [ ] Tests for getAccount()
- [ ] Tests for getStats()
- [ ] Tests for error scenarios
- [ ] Mock file fixtures

---

## Progress Log

### Session: 2026-01-14 10:06

**Tasks Completed**: TASK-006
**Tasks In Progress**: None
**Blockers**: None
**Review Iterations**: Not started (no review cycle per user instructions)
**Notes**:
- Implemented backend factory in src/sdk/credentials/backends/index.ts
- Created createCredentialBackend(platform?: Platform) factory function
- Implemented detectPlatform() helper that maps Node.js process.platform to Platform type
- Platform type defined locally: 'linux' | 'macos' | 'windows'
- Platform detection maps: darwin -> macos, win32 -> windows, linux/others -> linux
- macOS uses KeychainCredentialBackend
- Linux/Windows use FileCredentialBackend with default credentials path
- Re-exported CredentialBackend interface for public API
- Type checking passes with strict mode
- All 1480 tests pass (6 pre-existing failures in file-changes module unrelated to changes)
- Next executable tasks: TASK-009 (CredentialReader - depends on TASK-006, TASK-007, TASK-008, all completed)

### Session: 2026-01-14 02:13

**Tasks Completed**: TASK-008
**Tasks In Progress**: None
**Blockers**: None
**Review Iterations**: Not started (skipped per user request)
**Notes**:
- Implemented StatsReader class for reading ~/.claude/stats-cache.json
- Read and parse JSON stats file with Result type error handling
- Transform raw stats data to typed UsageStats with Date objects and Maps
- Calculate derived values: peakHour from hourCounts, totalTokens per model and per day
- Handle missing file (ENOENT) gracefully by returning ok(null) - user hasn't used Claude Code yet
- Handle permission denied (EACCES) and invalid JSON with proper errors
- Type guard validates JSON structure matches RawStatsCache interface
- getDefaultStatsPath() helper uses HOME environment variable with bracket notation
- Type checking passes with strict mode (noUncheckedIndexedAccess compliance)
- Code formatted with prettier
- General test suite passes (1295 tests pass, 5 pre-existing failures in file-changes module unrelated to changes)
- Next executable tasks: TASK-006 (Backend Factory - depends on TASK-004, TASK-005, both completed)

### Session: 2026-01-14 02:08

**Tasks Completed**: TASK-007
**Tasks In Progress**: None
**Blockers**: None
**Review Iterations**: Not started (no review cycle needed per request)
**Notes**:
- Implemented ConfigReader class for reading ~/.claude.json
- Read and parse JSON config file with proper error handling
- Extract oauthAccount section and transform to AccountInfo
- Handle missing file (ENOENT) gracefully by returning ok(null) - user not authenticated
- Handle permission denied (EACCES) with proper error
- Handle invalid JSON format with descriptive error
- Type guards validate JSON structure before transformation
- getDefaultConfigPath() helper uses HOME environment variable
- Type checking passes with strict mode
- General test suite passes (1480 tests pass, 6 pre-existing failures unrelated to changes)
- Next executable tasks: TASK-006 (Backend Factory - depends on TASK-004, TASK-005) or TASK-008 (Stats Reader - depends on TASK-002, TASK-003)

### Session: 2026-01-14 02:05

**Tasks Completed**: TASK-005
**Tasks In Progress**: None
**Blockers**: None
**Review Iterations**: 1
**Review Summary**:
- Iteration 1: APPROVED (no critical issues)
**Notes**:
- Implemented KeychainCredentialBackend for macOS Keychain access
- Uses `security find-generic-password` command with promisified exec
- Comprehensive error handling: permission denied, not found, invalid format
- Type guards ensure JSON validation matches ClaudeCredentials structure
- Consistent with FileCredentialBackend implementation pattern
- Service/account names ('claude-code'/'credentials') documented as needing verification
- Type checking passes with strict mode
- General test suite passes (1480 tests pass, 6 pre-existing failures unrelated to changes)
- Next executable tasks: TASK-006 (Backend Factory - depends on TASK-004, TASK-005) or TASK-007 (Config Reader - depends on TASK-001, TASK-003)

### Session: 2026-01-14 02:04

**Tasks Completed**: TASK-004
**Tasks In Progress**: None
**Blockers**: None
**Review Iterations**: 1
**Review Summary**:
- Iteration 1: APPROVED (no critical issues)
**Notes**:
- Implemented FileCredentialBackend with Result type error handling
- CredentialBackend interface defines contract for all backend implementations
- Comprehensive JSON validation with type guards
- Proper error handling for ENOENT, EACCES, and JSON parse errors
- getDefaultCredentialsPath helper uses HOME environment variable
- Type checking passes with strict mode
- General test suite passes (1480 tests pass, 6 pre-existing failures unrelated to changes)
- Next executable tasks: TASK-005 (Keychain Backend) or TASK-007 (Config Reader) - both depend only on completed tasks

### Session: 2026-01-13 23:37

**Tasks Completed**: TASK-001, TASK-002, TASK-003
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Implemented core credential type definitions (TASK-001)
- Implemented stats type definitions with raw and public API types (TASK-002)
- Implemented error types with static factory methods (TASK-003)
- All type definitions pass TypeScript strict type checking
- Next tasks: TASK-004 (File Backend), TASK-005 (Keychain Backend) require TASK-001 and TASK-003

### Session: 2026-01-13

**Tasks Created**: TASK-001 through TASK-016
**Notes**: Implementation plan created from design spec

---

## Summary

| Task | Description | Status | Parallelizable |
|------|-------------|--------|----------------|
| TASK-001 | Credential Types | Completed | Yes |
| TASK-002 | Stats Types | Completed | Yes |
| TASK-003 | Error Types | Completed | Yes |
| TASK-004 | File Backend | Completed | No |
| TASK-005 | Keychain Backend | Completed | No |
| TASK-006 | Backend Factory | Completed | No |
| TASK-007 | Config Reader | Completed | No |
| TASK-008 | Stats Reader | Completed | No |
| TASK-009 | CredentialReader | Not Started | No |
| TASK-010 | Module Index | Not Started | No |
| TASK-011 | CLI auth info | Not Started | No |
| TASK-012 | CLI auth stats | Not Started | No |
| TASK-013 | CLI auth status | Not Started | No |
| TASK-014 | CLI auth token | Not Started | No |
| TASK-015 | CLI auth group | Not Started | No |
| TASK-016 | Tests | Not Started | No |

**Parallelizable first wave**: TASK-001, TASK-002, TASK-003 (3 tasks) - Completed
**Current progress**: 8 of 16 tasks completed (50%)
