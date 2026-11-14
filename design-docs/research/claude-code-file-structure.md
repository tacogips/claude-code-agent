# Claude Code File Structure Analysis

This document analyzes the file structure and data formats used by Claude Code for storing configuration, session data, and history.

## Overview

Claude Code stores its data in two main locations:

1. **`~/.claude.json`** - Global configuration file
2. **`~/.claude/`** - Directory containing session data, settings, and auxiliary files

## File Structure

```
~/.claude.json                    # Global configuration (JSON)
~/.claude/
├── CLAUDE.md                     # User-global memory/instructions (Markdown)
├── settings.json                 # User-global settings (JSON)
├── settings.local.json           # Local settings override (JSON, git-ignored)
├── .credentials.json             # Authentication credentials (JSON, sensitive)
├── history.jsonl                 # Global prompt history (JSONL)
├── stats-cache.json              # Statistics cache (JSON)
├── projects/                     # Per-project session data
│   └── {project-id}/             # Project ID = path with / replaced by -
│       ├── {session-uuid}.jsonl  # Main session transcripts
│       └── agent-{id}.jsonl      # Sub-agent session transcripts
├── todos/                        # Todo lists per session
│   └── {session-uuid}.json       # or {session-uuid}-agent-{agent-id}.json
├── plans/                        # Plan mode files (empty when not in plan mode)
├── file-history/                 # File change history per session
│   └── {session-uuid}/
│       └── {hash}@v{version}     # File backups
├── session-env/                  # Session environment snapshots
├── shell-snapshots/              # Shell state snapshots
├── commands/                     # Custom slash commands (deprecated)
├── plugins/                      # Plugin management
│   ├── config.json
│   ├── installed_plugins.json
│   ├── known_marketplaces.json
│   ├── install-counts-cache.json
│   ├── cache/                    # Plugin installation cache
│   ├── marketplaces/             # Marketplace data
│   └── repos/                    # Plugin repositories
├── debug/                        # Debug logs
├── statsig/                      # Feature flags (Statsig)
└── telemetry/                    # Telemetry data
```

## Project-Level Files

In each project directory (`.claude/`):

```
{project}/.claude/
├── settings.json                 # Team-shared project settings
├── settings.local.json           # Personal project settings (git-ignored)
├── agents/                       # Sub-agent definitions (Markdown with YAML frontmatter)
│   └── {agent-name}.md
└── skills/                       # Skill definitions
    └── {skill-name}/
        └── {skill-name}.md
```

## Data Format Details

### 1. ~/.claude.json (ClaudeConfig)

Global configuration containing:

| Field | Type | Description |
|-------|------|-------------|
| `numStartups` | number | Startup count |
| `installMethod` | string | Installation method (unknown, homebrew, etc.) |
| `autoUpdates` | boolean | Auto-update enabled |
| `editorMode` | string | Editor mode (vim, emacs, etc.) |
| `customApiKeyResponses` | object | Approved/rejected API keys |
| `tipsHistory` | object | Tip display counts |
| `promptQueueUseCount` | number | Prompt queue usage |
| `showExpandedTodos` | boolean | UI preference |
| `cachedStatsigGates` | object | Feature flags cache |
| `cachedDynamicConfigs` | object | Dynamic configuration cache |
| `cachedGrowthBookFeatures` | object | GrowthBook feature flags |
| `fallbackAvailableWarningThreshold` | number | Warning threshold |
| `projects` | object | Per-project configuration (keyed by project path) |
| `mcpServers` | object | Global MCP server configuration |
| `bypassPermissionsModeAccepted` | boolean | Permission mode flag |
| `userId` | string | User identifier |
| `hasCompletedOnboarding` | boolean | Onboarding status |
| `hasAvailableSubscription` | boolean | Subscription status |
| ... | ... | Additional fields |

### 2. Project Configuration (within `projects` object)

| Field | Type | Description |
|-------|------|-------------|
| `allowedTools` | string[] | Explicitly allowed tools |
| `mcpContextUris` | string[] | MCP context URIs |
| `mcpServers` | object | Project-specific MCP servers |
| `enabledMcpjsonServers` | string[] | Enabled MCP JSON servers |
| `disabledMcpjsonServers` | string[] | Disabled MCP JSON servers |
| `hasTrustDialogAccepted` | boolean | Trust dialog status |
| `hasCompletedProjectOnboarding` | boolean | Project onboarding status |
| `hasClaudeMdExternalIncludesApproved` | boolean | External includes approval |
| `exampleFiles` | string[] | Example files for context |
| `exampleFilesGeneratedAt` | number | Timestamp of example generation |
| `history` | HistoryEntry[] | Prompt history |
| `lastCost` | number | Last session cost |
| `lastAPIDuration` | number | Last API call duration |
| `lastDuration` | number | Last session duration |
| `lastLinesAdded` | number | Lines added in last session |
| `lastLinesRemoved` | number | Lines removed in last session |
| `lastSessionId` | string | Last session UUID |
| `lastTotalInputTokens` | number | Input tokens |
| `lastTotalOutputTokens` | number | Output tokens |
| `lastTotalCacheCreationInputTokens` | number | Cache creation tokens |
| `lastTotalCacheReadInputTokens` | number | Cache read tokens |
| `lastTotalWebSearchRequests` | number | Web search count |

### 3. Session Transcript (JSONL format)

Each line is a JSON object. Entry types include:

#### Meta Entries
| Field | Type | Description |
|-------|------|-------------|
| `type` | "summary" | Session summary |
| `summary` | string | Summary text |
| `leafUuid` | string | Last entry UUID |

#### File History Snapshot
| Field | Type | Description |
|-------|------|-------------|
| `type` | "file-history-snapshot" | File state snapshot |
| `messageId` | string | Associated message UUID |
| `snapshot` | object | File backup data |
| `isSnapshotUpdate` | boolean | Update flag |

#### User/Assistant Messages
| Field | Type | Description |
|-------|------|-------------|
| `parentUuid` | string? | Parent entry UUID (for threading) |
| `isSidechain` | boolean | Is sub-agent conversation |
| `userType` | string | User type (external) |
| `cwd` | string | Current working directory |
| `sessionId` | string | Session UUID |
| `version` | string | Claude Code version |
| `gitBranch` | string? | Git branch name |
| `type` | "user" \| "assistant" | Entry type |
| `message` | object | Message content |
| `uuid` | string | Entry UUID |
| `timestamp` | string | ISO timestamp |
| `requestId` | string? | API request ID (assistant only) |
| `toolUseResult` | object? | Tool execution result |
| `thinkingMetadata` | object? | Thinking mode metadata |
| `todos` | array? | Associated todos |

#### Agent-Specific Fields
| Field | Type | Description |
|-------|------|-------------|
| `agentId` | string | Sub-agent identifier |
| `slug` | string? | Agent slug name |

### 4. Settings (settings.json)

| Field | Type | Description |
|-------|------|-------------|
| `permissions` | object | Permission configuration |
| `permissions.allow` | string[] | Allowed tool patterns |
| `permissions.deny` | string[] | Denied tool patterns |
| `permissions.ask` | string[] | Tools requiring confirmation |
| `permissions.additionalDirectories` | string[] | Extra allowed directories |
| `permissions.defaultMode` | string | Default permission mode |
| `env` | object | Environment variables |
| `hooks` | object | Hook configurations |
| `model` | string | Model override |
| `apiKeyHelper` | string | API key helper script |
| `forceLoginMethod` | string | Login method (claudeai, console) |
| `outputStyle` | string | Output style preference |
| `cleanupPeriodDays` | number | Transcript cleanup period |
| `includeCoAuthoredBy` | boolean | Git commit attribution |
| `disableAllHooks` | boolean | Hook disable flag |
| `enableAllProjectMcpServers` | boolean | MCP server flag |
| `enabledPlugins` | object | Plugin enable/disable status |
| `alwaysThinkingEnabled` | boolean | Thinking mode default |

### 5. History (history.jsonl)

Global prompt history, one entry per line:

| Field | Type | Description |
|-------|------|-------------|
| `display` | string | Display text of prompt |
| `pastedContents` | object | Pasted content attachments |
| `timestamp` | number | Unix timestamp |
| `project` | string | Project path |

### 6. Todo List ({session}.json)

Array of todo items:

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Todo description |
| `status` | string | Status (pending, in_progress, completed) |
| `priority` | string | Priority level |
| `id` | string | Todo ID |

### 7. MCP Server Configuration

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Server type (stdio, http) |
| `command` | string | Command to execute |
| `args` | string[] | Command arguments |
| `env` | object | Environment variables |

### 8. Plugin Configuration (installed_plugins.json)

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Config version |
| `plugins` | object | Plugin installations keyed by name |

Plugin entry:

| Field | Type | Description |
|-------|------|-------------|
| `scope` | string | Scope (user, project) |
| `projectPath` | string? | Project path (if project scope) |
| `installPath` | string | Installation path |
| `version` | string | Plugin version |
| `installedAt` | string | Installation timestamp |
| `lastUpdated` | string | Last update timestamp |
| `isLocal` | boolean | Local installation flag |

## Project ID Convention

Project IDs are derived from the project path by replacing forward slashes with hyphens:

```
/home/user/my-project -> -home-user-my-project
/g/gits/tacogips/claude-code-peeper -> -g-gits-tacogips-claude-code-peeper
```

## Message Content Structure

The `message` field in session entries has varying structure:

### User Message
```json
{
  "role": "user",
  "content": "string or array of content blocks"
}
```

### Assistant Message
```json
{
  "model": "claude-opus-4-5-20251101",
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {"type": "text", "text": "..."},
    {"type": "thinking", "thinking": "...", "signature": "..."},
    {"type": "tool_use", "id": "toolu_xxx", "name": "Bash", "input": {...}}
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 123,
    "cache_creation_input_tokens": 456,
    "cache_read_input_tokens": 789,
    "output_tokens": 100
  }
}
```

## Notes on Version Compatibility

- The reference Rust types are from an older version of Claude Code
- Current version (2.0.76) has additional fields not in the reference
- Key additions observed:
  - `thinkingMetadata` in user messages
  - `cachedGrowthBookFeatures` in config
  - `lastToolDuration` in project config
  - Extended plugin system
  - Plan mode support
