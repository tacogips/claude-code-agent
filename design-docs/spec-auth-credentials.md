# Auth and Credentials Reader Specification

This document describes how claude-code-agent reads and exposes authentication credentials, OAuth account information, and usage statistics from Claude Code's local storage.

---

## 1. Overview

### 1.1 Purpose

Enable claude-code-agent to:
- Read OAuth tokens for programmatic Claude Code execution
- Retrieve account information (email, organization, subscription)
- Access usage statistics (tokens, sessions, costs)
- Support different credential storage backends (file, keychain)

### 1.2 Data Sources

| Source | Location | Content |
|--------|----------|---------|
| Credentials | `~/.claude/.credentials.json` (Linux) or Keychain (macOS) | OAuth tokens |
| Config | `~/.claude.json` | Account info, project settings |
| Stats | `~/.claude/stats-cache.json` | Usage statistics |

### 1.3 Non-Goals

- **Token management**: claude-code-agent does NOT create, refresh, or revoke tokens
- **Auth flow**: claude-code-agent does NOT implement OAuth flows
- **Token storage**: claude-code-agent does NOT write to credentials files

---

## 2. Credential Storage Structure

### 2.1 Credentials File (~/.claude/.credentials.json)

**Platform**: Linux (and Windows unconfirmed)

```typescript
interface ClaudeCredentials {
  claudeAiOauth: {
    accessToken: string;      // Bearer token: "sk-ant-oat01-..."
    refreshToken: string;     // Refresh token: "sk-ant-ort01-..."
    expiresAt: number;        // Unix timestamp (ms): 1768332736724
    scopes: string[];         // ["user:inference", "user:profile", "user:sessions:claude_code"]
    subscriptionType: string; // "max" | "pro" | "free"
    rateLimitTier: string;    // "default_claude_max_20x"
  };
}
```

**Note**: On macOS, these are stored in the encrypted Keychain, not as a file.

### 2.2 OAuth Account Info (~/.claude.json)

```typescript
interface ClaudeConfig {
  oauthAccount: {
    accountUuid: string;             // "99a15026-74de-4ba4-bae3-c867d62b1961"
    emailAddress: string;            // "user@example.com"
    organizationUuid: string;        // "cf7f2fb8-1350-4867-bd26-308d69d1fc2f"
    displayName: string;             // "User Name"
    organizationBillingType: string; // "stripe_subscription"
    organizationRole: string;        // "admin" | "member"
    workspaceRole: string | null;
    organizationName: string;        // "User's Organization"
    hasExtraUsageEnabled: boolean;
  };
  numStartups: number;
  // ... other fields
}
```

### 2.3 Usage Statistics (~/.claude/stats-cache.json)

```typescript
interface StatsCache {
  version: number;
  lastComputedDate: string;  // "2026-01-12"

  dailyActivity: Array<{
    date: string;            // "2025-12-10"
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;

  dailyOutputTokens: Array<{
    date: string;
    tokensByModel: Record<string, number>;  // { "claude-opus-4-5-20251101": 895543 }
  }>;

  modelUsage: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    webSearchRequests: number;
    costUSD: number;
    contextWindow: number;
  }>;

  totalSessions: number;
  totalMessages: number;

  longestSession: {
    sessionId: string;
    duration: number;        // milliseconds
    messageCount: number;
    timestamp: string;
  };

  firstSessionDate: string;

  hourCounts: Record<string, number>;  // { "14": 83, "15": 83 }
}
```

---

## 3. SDK Interface

### 3.1 CredentialReader Class

```typescript
interface CredentialReaderOptions {
  configDir?: string;  // Default: ~/.claude
  platform?: 'linux' | 'macos' | 'windows';  // Auto-detected
}

class CredentialReader {
  constructor(options?: CredentialReaderOptions);

  /**
   * Get OAuth credentials.
   * Returns null if not authenticated or credentials expired.
   */
  getCredentials(): Promise<OAuthCredentials | null>;

  /**
   * Get account information.
   */
  getAccount(): Promise<AccountInfo | null>;

  /**
   * Get usage statistics.
   */
  getStats(): Promise<UsageStats | null>;

  /**
   * Check if credentials are valid (not expired).
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get subscription type.
   */
  getSubscriptionType(): Promise<SubscriptionType | null>;
}
```

### 3.2 Return Types

```typescript
interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  subscriptionType: SubscriptionType;
  rateLimitTier: string;
  isExpired: boolean;
}

type SubscriptionType = 'max' | 'pro' | 'free' | 'enterprise' | 'unknown';

interface AccountInfo {
  accountUuid: string;
  emailAddress: string;
  displayName: string;
  organization: {
    uuid: string;
    name: string;
    billingType: string;
    role: string;
  };
}

interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: Date;
  lastComputedDate: Date;

  modelUsage: Map<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  dailyTokens: DailyTokens[];

  longestSession: {
    sessionId: string;
    duration: number;
    messageCount: number;
    timestamp: Date;
  };

  peakHour: number;  // Hour with most activity (0-23)
}

interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

interface DailyActivity {
  date: Date;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

interface DailyTokens {
  date: Date;
  tokensByModel: Map<string, number>;
  totalTokens: number;
}
```

---

## 4. CLI Interface

### 4.1 Commands

```bash
# Show account info
claude-code-agent auth info
claude-code-agent auth info --format json

# Show usage statistics
claude-code-agent auth stats
claude-code-agent auth stats --format json
claude-code-agent auth stats --period 7d   # Last 7 days
claude-code-agent auth stats --model opus  # Filter by model

# Check authentication status
claude-code-agent auth status

# Show token info (redacted by default)
claude-code-agent auth token
claude-code-agent auth token --show-full  # Show full token (security warning)
```

### 4.2 Output Examples

**auth info (table)**:
```
ACCOUNT INFORMATION
-----------------------------------------------------------
Email:          user@example.com
Display Name:   User Name
Account ID:     99a15026-74de-4ba4-bae3-c867d62b1961
-----------------------------------------------------------
Organization:   User's Organization
Org ID:         cf7f2fb8-1350-4867-bd26-308d69d1fc2f
Billing:        stripe_subscription
Role:           admin
-----------------------------------------------------------
Subscription:   max
Rate Limit:     default_claude_max_20x
```

**auth stats (table)**:
```
USAGE STATISTICS (2025-11-26 to 2026-01-12)
-----------------------------------------------------------
Total Sessions:    827
Total Messages:    86,945
First Session:     2025-11-26

MODEL USAGE
-----------------------------------------------------------
Model                       Input      Output     Cache Read
claude-opus-4-5-20251101    3.3M       5.2M       3.1B
claude-sonnet-4-5-20250929  745K       2.0M       1.0B
claude-haiku-4-5-20251001   24         519        599K

Peak Usage Hour: 15:00 (83 sessions)
```

**auth status**:
```
Authentication Status: VALID
Subscription: max
Expires: 2026-01-14 12:32:16 (in 23 hours)
```

---

## 5. Platform Support

### 5.1 Credential Backend Strategy

```typescript
interface CredentialBackend {
  read(): Promise<ClaudeCredentials | null>;
}

class FileCredentialBackend implements CredentialBackend {
  constructor(private path: string) {}
  async read() {
    // Read from ~/.claude/.credentials.json
  }
}

class KeychainCredentialBackend implements CredentialBackend {
  async read() {
    // Read from macOS Keychain using security command
  }
}

function getCredentialBackend(platform: Platform): CredentialBackend {
  switch (platform) {
    case 'macos':
      return new KeychainCredentialBackend();
    case 'linux':
    case 'windows':
    default:
      return new FileCredentialBackend('~/.claude/.credentials.json');
  }
}
```

### 5.2 macOS Keychain Access

```bash
# Read from Keychain (conceptual)
security find-generic-password -s "claude-code" -a "credentials" -w
```

**Note**: Exact Keychain service/account names need to be discovered from Claude Code behavior.

---

## 6. Security Considerations

### 6.1 Token Handling

- **Never log full tokens** - Always redact in logs/output
- **Memory safety** - Clear token strings after use when possible
- **No persistence** - Do not cache tokens in claude-code-agent storage

### 6.2 CLI Security

- `auth token` redacts by default
- `--show-full` requires explicit flag and shows warning
- Credentials never written to command history

### 6.3 SDK Security

```typescript
class OAuthCredentials {
  private _accessToken: string;

  get accessToken(): string {
    return this._accessToken;
  }

  get redactedAccessToken(): string {
    return `${this._accessToken.slice(0, 15)}...${this._accessToken.slice(-4)}`;
  }

  toJSON(): object {
    // Never serialize full token
    return {
      accessToken: this.redactedAccessToken,
      // ... other fields
    };
  }
}
```

---

## 7. Error Handling

### 7.1 Error Types

```typescript
class CredentialError extends Error {
  constructor(
    message: string,
    public readonly code: CredentialErrorCode
  ) {
    super(message);
  }
}

type CredentialErrorCode =
  | 'NOT_AUTHENTICATED'      // No credentials found
  | 'EXPIRED'                // Token expired
  | 'INVALID_FORMAT'         // Corrupted credentials file
  | 'KEYCHAIN_ACCESS_DENIED' // macOS keychain permission denied
  | 'FILE_NOT_FOUND'         // Credentials file missing
  | 'PERMISSION_DENIED';     // File permission issue
```

### 7.2 Graceful Degradation

- Missing credentials file: Return null, don't throw
- Expired token: Return credentials with `isExpired: true`
- Partial data: Return what's available

---

## 8. Integration with Existing Features

### 8.1 Session Execution

```typescript
// Use credentials for session execution override
const reader = new CredentialReader();
const creds = await reader.getCredentials();

if (creds && !creds.isExpired) {
  await agent.runSession({
    projectPath: '/path/to/project',
    prompt: 'Task',
    // Override with user's credentials
    env: {
      CLAUDE_CODE_OAUTH_TOKEN: creds.accessToken,
    },
  });
}
```

### 8.2 CLI Enhancement

The existing `token` command can be extended or `auth` can be added as a new command group:

```
claude-code-agent auth info      # Account info
claude-code-agent auth stats     # Usage stats
claude-code-agent auth status    # Auth status
claude-code-agent auth token     # Token info (new)

# OR extend existing token command
claude-code-agent token info     # Token + account info
claude-code-agent token stats    # Usage stats
```

---

## 9. File Structure

```
src/
+-- sdk/
|   +-- credentials/
|   |   +-- index.ts              # Public exports
|   |   +-- reader.ts             # CredentialReader class
|   |   +-- backends/
|   |   |   +-- index.ts
|   |   |   +-- file.ts           # FileCredentialBackend
|   |   |   +-- keychain.ts       # KeychainCredentialBackend
|   |   +-- types.ts              # Type definitions
|   |   +-- errors.ts             # Error classes
|   +-- stats/
|       +-- index.ts
|       +-- reader.ts             # StatsReader class
|       +-- types.ts
+-- cli/
    +-- commands/
        +-- auth/
            +-- index.ts          # auth command group
            +-- info.ts           # auth info
            +-- stats.ts          # auth stats
            +-- status.ts         # auth status
            +-- token.ts          # auth token
```

---

## 10. Dependencies

- `os` - Platform detection
- `fs/promises` - File reading
- `child_process` - macOS Keychain access (via `security` command)

No external dependencies required for basic functionality.
