# Activity Status Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-activity-status.md
**Created**: 2026-01-31
**Last Updated**: 2026-01-31

---

## Overview

Implement activity status tracking for Claude Code sessions via hooks. Enables external applications to query whether a session is working, waiting for user response, or idle.

### Scope

- Activity status types and storage
- Hook input parsing and status determination
- Transcript analysis for AskUserQuestion detection
- CLI commands for activity management
- REST API endpoints for querying activity

### Out of Scope

- Full session lifecycle management
- Session persistence/history
- Replacing existing SessionStatus type

---

## Tasks

### TASK-001: Activity Types

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/types/activity.ts`

```typescript
/**
 * Real-time activity status of a Claude Code session.
 */
export type ActivityStatus = "working" | "waiting_user_response" | "idle";

/**
 * Activity entry stored for a session.
 */
export interface ActivityEntry {
  readonly sessionId: string;
  readonly status: ActivityStatus;
  readonly projectPath: string;
  readonly lastUpdated: string; // ISO timestamp
}

/**
 * Activity store format.
 */
export interface ActivityStore {
  readonly version: "1.0";
  readonly sessions: Record<string, Omit<ActivityEntry, "sessionId">>;
}

/**
 * Check if status indicates active work.
 */
export function isActiveStatus(status: ActivityStatus): boolean;

/**
 * Check if status indicates waiting for user.
 */
export function isWaitingStatus(status: ActivityStatus): boolean;
```

**Completion Criteria**:
- [ ] ActivityStatus type defined
- [ ] ActivityEntry interface defined
- [ ] ActivityStore interface defined
- [ ] Helper functions implemented
- [ ] Exported from types/index.ts
- [ ] Unit tests pass

---

### TASK-002: Hook Input Types

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: None
**Deliverables**: `src/sdk/activity/hook-types.ts`

```typescript
/**
 * Common fields for all hook inputs.
 */
export interface HookInputBase {
  readonly session_id: string;
  readonly transcript_path: string;
  readonly cwd: string;
  readonly permission_mode: string;
  readonly hook_event_name: string;
}

/**
 * UserPromptSubmit hook input.
 */
export interface UserPromptSubmitInput extends HookInputBase {
  readonly hook_event_name: "UserPromptSubmit";
  readonly prompt?: string;
}

/**
 * PermissionRequest hook input.
 */
export interface PermissionRequestInput extends HookInputBase {
  readonly hook_event_name: "PermissionRequest";
  readonly tool_name: string;
  readonly tool_input: Record<string, unknown>;
}

/**
 * Stop hook input.
 */
export interface StopInput extends HookInputBase {
  readonly hook_event_name: "Stop";
}

/**
 * Union of all hook inputs.
 */
export type HookInput = UserPromptSubmitInput | PermissionRequestInput | StopInput;

/**
 * Parse and validate hook input from stdin JSON.
 */
export function parseHookInput(json: string): Result<HookInput, Error>;

/**
 * Type guard for UserPromptSubmit.
 */
export function isUserPromptSubmit(input: HookInput): input is UserPromptSubmitInput;

/**
 * Type guard for PermissionRequest.
 */
export function isPermissionRequest(input: HookInput): input is PermissionRequestInput;

/**
 * Type guard for Stop.
 */
export function isStop(input: HookInput): input is StopInput;
```

**Completion Criteria**:
- [ ] All hook input interfaces defined
- [ ] parseHookInput function with validation
- [ ] Type guards implemented
- [ ] Unit tests pass

---

### TASK-003: Transcript Analyzer

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-002
**Deliverables**: `src/sdk/activity/transcript-analyzer.ts`

```typescript
export interface TranscriptAnalyzer {
  /**
   * Check if the last assistant turn used AskUserQuestion.
   * Reads only the tail of the transcript for efficiency.
   */
  hasAskUserQuestion(transcriptPath: string): Promise<boolean>;
}

export interface TranscriptAnalyzerOptions {
  /** Maximum bytes to read from end of file. Default: 10240 (10KB) */
  readonly maxReadBytes?: number;
}

/**
 * Create a transcript analyzer.
 */
export function createTranscriptAnalyzer(
  options?: TranscriptAnalyzerOptions
): TranscriptAnalyzer;
```

**Completion Criteria**:
- [ ] TranscriptAnalyzer interface defined
- [ ] createTranscriptAnalyzer factory function
- [ ] Reads last N bytes efficiently (not entire file)
- [ ] Parses JSONL entries from tail
- [ ] Detects AskUserQuestion tool use
- [ ] Handles missing/empty transcript gracefully
- [ ] Unit tests with mock transcript files

---

### TASK-004: Activity Store

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-001
**Deliverables**: `src/sdk/activity/store.ts`

```typescript
export interface ActivityStoreOptions {
  /** Data directory. Default: ~/.local/share/claude-code-agent */
  readonly dataDir?: string;
  /** Stale entry threshold in hours. Default: 24 */
  readonly cleanupHours?: number;
}

export interface ActivityStoreService {
  /**
   * Get activity for a session.
   */
  get(sessionId: string): Promise<ActivityEntry | null>;

  /**
   * Set activity for a session.
   */
  set(entry: ActivityEntry): Promise<void>;

  /**
   * List all activity entries.
   */
  list(filter?: { status?: ActivityStatus }): Promise<ActivityEntry[]>;

  /**
   * Remove activity for a session.
   */
  remove(sessionId: string): Promise<void>;

  /**
   * Remove stale entries older than threshold.
   */
  cleanup(): Promise<number>;

  /**
   * Get storage file path.
   */
  getStoragePath(): string;
}

/**
 * Create file-based activity store with locking.
 */
export function createActivityStore(
  options?: ActivityStoreOptions
): ActivityStoreService;
```

**Completion Criteria**:
- [ ] ActivityStoreService interface defined
- [ ] File-based implementation with JSON storage
- [ ] File locking for concurrent access (use existing FileLockService)
- [ ] Cleanup removes entries older than threshold
- [ ] Respects XDG_DATA_HOME environment variable
- [ ] Creates directory if missing
- [ ] Unit tests pass

---

### TASK-005: ActivityManager Class

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-001, TASK-002, TASK-003, TASK-004
**Deliverables**: `src/sdk/activity/manager.ts`

```typescript
export interface ActivityManagerOptions {
  readonly dataDir?: string;
  readonly cleanupHours?: number;
  readonly transcriptReadBytes?: number;
}

export class ActivityManager {
  constructor(options?: ActivityManagerOptions);

  /**
   * Update activity from hook input (reads stdin).
   */
  async updateFromHook(): Promise<void>;

  /**
   * Update activity from parsed hook input.
   */
  async update(input: HookInput): Promise<void>;

  /**
   * Get activity status for a session.
   */
  async getStatus(sessionId: string): Promise<ActivityEntry | null>;

  /**
   * List all tracked sessions.
   */
  async list(filter?: { status?: ActivityStatus }): Promise<ActivityEntry[]>;

  /**
   * Check if session is currently working.
   */
  async isWorking(sessionId: string): Promise<boolean>;

  /**
   * Check if session is waiting for user response.
   */
  async isWaitingForUser(sessionId: string): Promise<boolean>;

  /**
   * Remove stale entries.
   */
  async cleanup(): Promise<number>;
}
```

**Completion Criteria**:
- [ ] Constructor creates store and analyzer
- [ ] updateFromHook() reads stdin and parses JSON
- [ ] update() determines status from hook event type
- [ ] update() uses transcript analyzer for Stop events
- [ ] getStatus() delegates to store
- [ ] list() delegates to store with filter
- [ ] isWorking()/isWaitingForUser() convenience methods
- [ ] cleanup() delegates to store
- [ ] Errors logged but don't throw (silent failure for hooks)
- [ ] Unit tests pass

---

### TASK-006: CLI Activity Update Command

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-005
**Deliverables**: `src/cli/commands/activity/update.ts`

```typescript
export function createActivityUpdateCommand(): Command {
  return new Command('update')
    .description('Update activity status from hook input (reads stdin)')
    .action(async () => {
      // Read stdin
      // Parse hook input
      // Update activity
      // Exit silently (0 on success or error - don't block Claude)
    });
}
```

**Completion Criteria**:
- [ ] Reads JSON from stdin
- [ ] Calls ActivityManager.updateFromHook()
- [ ] Exits 0 on success
- [ ] Exits 0 on error (silent failure, logs to stderr)
- [ ] No stdout output (silent)

---

### TASK-007: CLI Activity Status Command

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: TASK-005
**Deliverables**: `src/cli/commands/activity/status.ts`

```typescript
export function createActivityStatusCommand(): Command {
  return new Command('status')
    .description('Get activity status for a session')
    .argument('<session-id>', 'Session ID to query')
    .option('--json', 'Output as JSON')
    .action(async (sessionId, options) => {
      // Query status
      // Format output
    });
}
```

**Completion Criteria**:
- [ ] Accepts session-id argument
- [ ] Outputs status text by default (working/waiting_user_response/idle)
- [ ] --json outputs full ActivityEntry
- [ ] Exit 0 on found
- [ ] Exit 2 on not found
- [ ] Displays "unknown" for not found sessions (text mode)

---

### TASK-008: CLI Activity List Command

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: TASK-005
**Deliverables**: `src/cli/commands/activity/list.ts`

```typescript
export function createActivityListCommand(): Command {
  return new Command('list')
    .description('List all tracked session activities')
    .option('--status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      // Query list
      // Format output as table or JSON
    });
}
```

**Completion Criteria**:
- [ ] Lists all activity entries
- [ ] --status filters by activity status
- [ ] Text output as formatted table
- [ ] --json outputs array of ActivityEntry
- [ ] Shows message when no entries found

---

### TASK-009: CLI Activity Cleanup Command

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: TASK-005
**Deliverables**: `src/cli/commands/activity/cleanup.ts`

```typescript
export function createActivityCleanupCommand(): Command {
  return new Command('cleanup')
    .description('Remove stale activity entries')
    .option('--older-than <hours>', 'Hours threshold', '24')
    .action(async (options) => {
      // Run cleanup
      // Display count removed
    });
}
```

**Completion Criteria**:
- [ ] Calls ActivityManager.cleanup()
- [ ] --older-than configures threshold
- [ ] Displays count of removed entries
- [ ] Displays message when no entries removed

---

### TASK-010: CLI Activity Setup Command

**Status**: Not Started
**Parallelizable**: Yes
**Dependencies**: TASK-005
**Deliverables**: `src/cli/commands/activity/setup.ts`

```typescript
export function createActivitySetupCommand(): Command {
  return new Command('setup')
    .description('Configure Claude Code hooks for activity tracking')
    .option('--global', 'Configure in ~/.claude/settings.json')
    .option('--project', 'Configure in .claude/settings.json (default)')
    .option('--dry-run', 'Show changes without applying')
    .action(async (options) => {
      // Read existing settings
      // Merge activity hooks
      // Write settings (or show dry-run)
    });
}
```

**Completion Criteria**:
- [ ] --project writes to .claude/settings.json (default)
- [ ] --global writes to ~/.claude/settings.json
- [ ] Merges with existing hooks (doesn't overwrite)
- [ ] --dry-run shows diff without writing
- [ ] Creates settings.json if missing
- [ ] Displays success message with hook summary

---

### TASK-011: CLI Activity Command Group

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-006, TASK-007, TASK-008, TASK-009, TASK-010
**Deliverables**: `src/cli/commands/activity/index.ts`

```typescript
export function createActivityCommand(): Command {
  return new Command('activity')
    .description('Manage session activity tracking')
    .addCommand(createActivityUpdateCommand())
    .addCommand(createActivityStatusCommand())
    .addCommand(createActivityListCommand())
    .addCommand(createActivityCleanupCommand())
    .addCommand(createActivitySetupCommand());
}
```

**Completion Criteria**:
- [ ] All subcommands registered
- [ ] Help text displays all commands
- [ ] Registered in main CLI

---

### TASK-012: REST API Endpoints

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-005
**Deliverables**: `src/daemon/routes/activity.ts`

```typescript
export function createActivityRoutes(manager: ActivityManager): Router {
  const router = new Router();

  // GET /api/activity - List all activity
  router.get('/activity', async (ctx) => {
    const status = ctx.query.status as ActivityStatus | undefined;
    const entries = await manager.list(status ? { status } : undefined);
    ctx.body = { entries };
  });

  // GET /api/activity/:sessionId - Get activity for session
  router.get('/activity/:sessionId', async (ctx) => {
    const entry = await manager.getStatus(ctx.params.sessionId);
    if (!entry) {
      ctx.status = 404;
      ctx.body = { error: 'not_found', message: 'Session not found' };
      return;
    }
    ctx.body = entry;
  });

  return router;
}
```

**Completion Criteria**:
- [ ] GET /api/activity returns list with optional status filter
- [ ] GET /api/activity/:sessionId returns entry or 404
- [ ] Routes registered in daemon server
- [ ] Response format matches spec

---

### TASK-013: Unit Tests

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-005
**Deliverables**: `src/sdk/activity/__tests__/*.test.ts`

```typescript
// hook-types.test.ts
describe('parseHookInput', () => {
  test('parses UserPromptSubmit');
  test('parses PermissionRequest');
  test('parses Stop');
  test('rejects invalid JSON');
  test('rejects unknown hook event');
});

// transcript-analyzer.test.ts
describe('TranscriptAnalyzer', () => {
  test('detects AskUserQuestion in transcript');
  test('returns false when no AskUserQuestion');
  test('handles empty transcript');
  test('handles missing file');
});

// store.test.ts
describe('ActivityStore', () => {
  test('set and get entry');
  test('list all entries');
  test('list with status filter');
  test('remove entry');
  test('cleanup removes stale entries');
});

// manager.test.ts
describe('ActivityManager', () => {
  test('update sets working on UserPromptSubmit');
  test('update sets waiting_user_response on PermissionRequest');
  test('update sets idle on Stop without AskUserQuestion');
  test('update sets waiting_user_response on Stop with AskUserQuestion');
});
```

**Completion Criteria**:
- [ ] Hook input parsing tests
- [ ] Transcript analyzer tests with fixtures
- [ ] Activity store tests
- [ ] ActivityManager tests
- [ ] All tests pass

---

### TASK-014: Integration Tests

**Status**: Not Started
**Parallelizable**: No
**Dependencies**: TASK-011, TASK-012, TASK-013
**Deliverables**: `src/sdk/activity/__tests__/integration.test.ts`

```typescript
describe('Activity Integration', () => {
  test('CLI update command processes hook input');
  test('CLI status command returns correct status');
  test('CLI list command filters by status');
  test('REST API /activity returns entries');
  test('REST API /activity/:id returns 404 for unknown');
  test('Full flow: hook update -> query status');
});
```

**Completion Criteria**:
- [ ] CLI command integration tests
- [ ] REST API integration tests
- [ ] End-to-end flow test
- [ ] All tests pass

---

## Dependencies

| Task | Depends On | Description |
|------|------------|-------------|
| TASK-003 | TASK-002 | Analyzer uses hook types |
| TASK-004 | TASK-001 | Store uses activity types |
| TASK-005 | TASK-001, TASK-002, TASK-003, TASK-004 | Manager uses all |
| TASK-006 | TASK-005 | CLI uses manager |
| TASK-007 | TASK-005 | CLI uses manager |
| TASK-008 | TASK-005 | CLI uses manager |
| TASK-009 | TASK-005 | CLI uses manager |
| TASK-010 | TASK-005 | CLI uses manager |
| TASK-011 | TASK-006, TASK-007, TASK-008, TASK-009, TASK-010 | Command group |
| TASK-012 | TASK-005 | REST uses manager |
| TASK-013 | TASK-005 | Tests all components |
| TASK-014 | TASK-011, TASK-012, TASK-013 | Integration tests |

---

## Progress Log

### Session: 2026-01-31

**Tasks Created**: TASK-001 through TASK-014
**Notes**: Implementation plan created from design spec

---

## Summary

| Task | Description | Status | Parallelizable |
|------|-------------|--------|----------------|
| TASK-001 | Activity Types | Not Started | Yes |
| TASK-002 | Hook Input Types | Not Started | Yes |
| TASK-003 | Transcript Analyzer | Not Started | No |
| TASK-004 | Activity Store | Not Started | No |
| TASK-005 | ActivityManager Class | Not Started | No |
| TASK-006 | CLI Activity Update | Not Started | No |
| TASK-007 | CLI Activity Status | Not Started | Yes |
| TASK-008 | CLI Activity List | Not Started | Yes |
| TASK-009 | CLI Activity Cleanup | Not Started | Yes |
| TASK-010 | CLI Activity Setup | Not Started | Yes |
| TASK-011 | CLI Activity Command Group | Not Started | No |
| TASK-012 | REST API Endpoints | Not Started | No |
| TASK-013 | Unit Tests | Not Started | No |
| TASK-014 | Integration Tests | Not Started | No |

**Parallelizable first wave**: TASK-001, TASK-002 (2 tasks)
**Second wave (after TASK-005)**: TASK-007, TASK-008, TASK-009, TASK-010 (4 tasks)
**Current progress**: 0 of 14 tasks completed (0%)
