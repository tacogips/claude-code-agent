# Claude Code Data Structures and Storage

This document describes the data structures and file formats used by Claude Code to store user configuration, session data, project settings, and usage statistics.

## Overview

Claude Code stores its data in two primary locations:
- `~/.claude.json` - Main configuration and project-specific settings
- `~/.claude/` - Directory containing various data files and subdirectories

---

## 1. ~/.claude.json - Main Configuration File

### File Structure

```json
{
  "numStartups": 1794,
  "installMethod": "unknown",
  "autoUpdates": true,
  "editorMode": "vim",
  "customApiKeyResponses": { ... },
  "tipsHistory": { ... },
  "cachedStatsigGates": { ... },
  "cachedDynamicConfigs": { ... },
  "cachedGrowthBookFeatures": { ... },
  "projects": { ... }
}
```

### Top-Level Fields

#### Core Settings

| Field | Type | Description |
|-------|------|-------------|
| `numStartups` | number | Total number of times Claude Code has been started |
| `installMethod` | string | Installation method identifier |
| `autoUpdates` | boolean | Whether auto-updates are enabled |
| `editorMode` | string | Editor mode (`"vim"`, `"emacs"`, etc.) |
| `promptQueueUseCount` | number | Number of times prompt queue has been used |
| `showExpandedTodos` | boolean | UI preference for todo list display |
| `fallbackAvailableWarningThreshold` | number | Threshold for fallback warnings (0.0-1.0) |
| `userID` | string | User identifier |

#### Account & Subscription

| Field | Type | Description |
|-------|------|-------------|
| `oauthAccount` | object | OAuth account information |
| `hasAvailableSubscription` | boolean | Whether user has active subscription |
| `hasOpusPlanDefault` | boolean | Whether Opus plan is default |
| `isQualifiedForDataSharing` | boolean | Data sharing qualification status |
| `passesEligibilityCache` | object | Guest passes eligibility cache |
| `passesUpsellSeenCount` | number | Upsell dialog view count |
| `s1mAccessCache` | object | S1M access cache |
| `subscriptionNoticeCount` | number | Subscription notice view count |

#### Onboarding & Migration

| Field | Type | Description |
|-------|------|-------------|
| `hasCompletedOnboarding` | boolean | Onboarding completion status |
| `lastOnboardingVersion` | string | Last onboarding version seen |
| `bypassPermissionsModeAccepted` | boolean | Bypass permissions mode accepted |
| `hasUsedBackslashReturn` | boolean | Has used backslash return feature |
| `opus45MigrationComplete` | boolean | Opus 4.5 migration status |
| `sonnet45MigrationComplete` | boolean | Sonnet 4.5 migration status |
| `thinkingMigrationComplete` | boolean | Thinking mode migration status |
| `hasShownOpus45Notice` | boolean | Opus 4.5 notice shown |
| `claudeCodeFirstTokenDate` | string | First token usage date |
| `firstStartTime` | number | First startup timestamp |

#### UI State

| Field | Type | Description |
|-------|------|-------------|
| `lastReleaseNotesSeen` | string | Last seen release notes version |
| `cachedChangelog` | object | Cached changelog data |
| `changelogLastFetched` | number | Changelog fetch timestamp |
| `feedbackSurveyState` | object | Feedback survey state |
| `lspRecommendationIgnoredCount` | number | LSP recommendation ignore count |

#### Plugin & Marketplace

| Field | Type | Description |
|-------|------|-------------|
| `officialMarketplaceAutoInstallAttempted` | boolean | Auto-install attempted |
| `officialMarketplaceAutoInstalled` | boolean | Auto-install completed |

#### Global MCP Servers

| Field | Type | Description |
|-------|------|-------------|
| `mcpServers` | object | Global MCP server configurations |
| `githubRepoPaths` | array | Known GitHub repository paths |

### customApiKeyResponses

Tracks user responses to API key approval dialogs:

```json
{
  "customApiKeyResponses": {
    "approved": ["session-id-1", "session-id-2"],
    "rejected": ["session-id-3"]
  }
}
```

### tipsHistory

Tracks which tips have been shown and how many times:

```json
{
  "tipsHistory": {
    "memory-command": 1793,
    "theme-command": 1790,
    "todo-list": 1787,
    "permissions": 1793,
    "custom-commands": 1779,
    ...
  }
}
```

Key values represent the startup count when that tip was last shown/considered.

### cachedStatsigGates

Feature flags cached from Statsig:

```json
{
  "cachedStatsigGates": {
    "tengu_disable_bypass_permissions_mode": false,
    "tengu_use_file_checkpoints": true,
    "tengu_tool_pear": false,
    "tengu_web_tasks": true,
    "tengu_prompt_suggestion": true
  }
}
```

### cachedGrowthBookFeatures

Feature flags from GrowthBook experimentation platform:

```json
{
  "cachedGrowthBookFeatures": {
    "tengu_mcp_tool_search": false,
    "tengu_thinkback": false,
    "tengu_react_vulnerability_warning": true
  }
}
```

### projects - Project-Specific Configuration

The `projects` object contains per-project settings, keyed by absolute project path:

```json
{
  "projects": {
    "/path/to/project": {
      "allowedTools": [],
      "mcpContextUris": [],
      "mcpServers": { ... },
      "enabledMcpjsonServers": [],
      "disabledMcpjsonServers": [],
      "hasTrustDialogAccepted": false,
      "projectOnboardingSeenCount": 0,
      "hasClaudeMdExternalIncludesApproved": false,
      "hasClaudeMdExternalIncludesWarningShown": false,
      "exampleFiles": ["file1.rs", "file2.ts"],
      "exampleFilesGeneratedAt": 1751593326065,
      "hasCompletedProjectOnboarding": true,
      "lastCost": 0.72100475,
      "lastAPIDuration": 336856,
      "lastDuration": 2360361,
      "lastLinesAdded": 28,
      "lastLinesRemoved": 4,
      "lastTotalInputTokens": 42501,
      "lastTotalOutputTokens": 9500,
      "lastTotalCacheCreationInputTokens": 54217,
      "lastTotalCacheReadInputTokens": 1188084,
      "lastSessionId": "uuid-here"
    }
  }
}
```

#### Project Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `allowedTools` | string[] | List of tools allowed for this project |
| `mcpContextUris` | string[] | MCP context URIs for the project |
| `mcpServers` | object | Project-specific MCP server configurations |
| `enabledMcpjsonServers` | string[] | Enabled MCP servers from .mcp.json |
| `disabledMcpjsonServers` | string[] | Disabled MCP servers from .mcp.json |
| `hasTrustDialogAccepted` | boolean | Whether trust dialog was accepted |
| `projectOnboardingSeenCount` | number | Onboarding dialog view count |
| `hasClaudeMdExternalIncludesApproved` | boolean | CLAUDE.md external includes approved |
| `exampleFiles` | string[] | Example files for project context |
| `exampleFilesGeneratedAt` | number | Timestamp of example file generation |
| `hasCompletedProjectOnboarding` | boolean | Project onboarding completion status |

#### Session Statistics Fields

| Field | Type | Description |
|-------|------|-------------|
| `lastCost` | number | Cost of last session (USD) |
| `lastAPIDuration` | number | API call duration (ms) |
| `lastAPIDurationWithoutRetries` | number | API duration excluding retries (ms) |
| `lastToolDuration` | number | Tool execution duration (ms) |
| `lastDuration` | number | Total session duration (ms) |
| `lastLinesAdded` | number | Lines added in last session |
| `lastLinesRemoved` | number | Lines removed in last session |
| `lastTotalInputTokens` | number | Input tokens in last session |
| `lastTotalOutputTokens` | number | Output tokens in last session |
| `lastTotalCacheCreationInputTokens` | number | Cache creation tokens |
| `lastTotalCacheReadInputTokens` | number | Cache read tokens |
| `lastTotalWebSearchRequests` | number | Web search requests in last session |
| `lastSessionId` | string | UUID of last session |
| `lastModelUsage` | object | Per-model token usage breakdown |

#### Last Model Usage Structure

```json
{
  "lastModelUsage": {
    "claude-opus-4-5-20251101": {
      "inputTokens": 1278,
      "outputTokens": 32,
      "cacheReadInputTokens": 0,
      "cacheCreationInputTokens": 0,
      "webSearchRequests": 0,
      "costUSD": 0.00719
    }
  }
}
```

#### Security & Vulnerability Cache

| Field | Type | Description |
|-------|------|-------------|
| `reactVulnerabilityCache` | object | React vulnerability detection cache |

```json
{
  "reactVulnerabilityCache": {
    "detected": false,
    "package": null,
    "packageName": null,
    "version": null,
    "packageManager": null
  }
}
```

#### MCP Server Configuration

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "command-name",
      "args": ["arg1", "arg2"],
      "env": {}
    }
  }
}
```

---

## 2. ~/.claude/ Directory Structure

```
~/.claude/
├── CLAUDE.md              # User's global instructions
├── settings.json          # Global settings
├── settings.local.json    # Local settings (not synced)
├── .credentials.json      # Authentication credentials (private)
├── history.jsonl          # Prompt/command history
├── stats-cache.json       # Usage statistics cache
├── commands/              # Custom slash commands
├── plugins/               # Installed plugins
├── projects/              # Per-project session data
├── session-env/           # Session environment data
├── file-history/          # File edit history for checkpoints
├── todos/                 # Todo list data per session/agent
├── plans/                 # Plan mode data
├── shell-snapshots/       # Shell state snapshots
├── debug/                 # Debug logs
├── telemetry/             # Telemetry data
└── statsig/               # Statsig feature flag cache
```

---

## 3. ~/.claude/settings.json

Global user settings:

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(rm -rf /*)"
    ]
  },
  "enabledPlugins": {
    "go-lsp@local": false
  },
  "alwaysThinkingEnabled": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `permissions.deny` | string[] | Tool calls that are always denied |
| `enabledPlugins` | object | Plugin enable/disable states |
| `alwaysThinkingEnabled` | boolean | Whether thinking mode is always on |

---

## 4. ~/.claude/settings.local.json

Local settings not synced across machines:

```json
{
  "enableAllProjectMcpServers": false
}
```

---

## 5. ~/.claude/CLAUDE.md

User's global instructions file. Content is automatically prepended to every conversation as system context.

Example structure:
```markdown
- always think and output in english

# first-response-rule
- Rule description

# session-behavior
- Behavior instructions
```

---

## 6. ~/.claude/commands/ - Custom Slash Commands

Contains markdown files that define custom slash commands. Each file represents one command.

### File Format (YAML frontmatter + Markdown)

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
argument-hint: [optional-args]
---

## Context

- Current git status: !`git status`
- Current git diff: !`git diff HEAD`

## Your task

Instructions for the command...
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `allowed-tools` | string | Tools permitted for this command |
| `description` | string | Command description shown in help |
| `argument-hint` | string | Hint for command arguments |

### Dynamic Context

Use `!`backtick`command`` syntax to include dynamic command output in the prompt.

---

## 7. ~/.claude/plugins/

### Directory Structure

```
plugins/
├── config.json              # Plugin configuration
├── installed_plugins.json   # List of installed plugins
├── known_marketplaces.json  # Known plugin marketplaces
├── cache/                   # Plugin binary/asset cache
│   ├── claude-plugins-official/
│   └── local/
├── marketplaces/            # Marketplace data
└── repos/                   # Plugin repository data
```

### installed_plugins.json

```json
{
  "version": 2,
  "plugins": {
    "plugin-name@marketplace": [
      {
        "scope": "project",
        "projectPath": "/path/to/project",
        "installPath": "/home/user/.claude/plugins/cache/marketplace/plugin/version",
        "version": "1.0.0",
        "installedAt": "2025-12-23T14:37:24.778Z",
        "lastUpdated": "2025-12-23T14:37:24.778Z",
        "isLocal": true
      }
    ]
  }
}
```

---

## 8. ~/.claude/history.jsonl

Prompt history stored as newline-delimited JSON (JSONL format):

```json
{"display": "user prompt text", "pastedContents": {}, "timestamp": 1759457279899, "project": "/path/to/project"}
{"display": "another prompt", "pastedContents": {}, "timestamp": 1759457396690, "project": "/path/to/project"}
```

| Field | Type | Description |
|-------|------|-------------|
| `display` | string | The prompt text shown to user |
| `pastedContents` | object | Any pasted content with the prompt |
| `timestamp` | number | Unix timestamp (milliseconds) |
| `project` | string | Project path where prompt was entered |

---

## 9. ~/.claude/stats-cache.json

Usage statistics cache:

```json
{
  "version": 1,
  "lastComputedDate": "2026-01-02",
  "dailyActivity": [
    {
      "date": "2025-11-26",
      "messageCount": 1368,
      "sessionCount": 15,
      "toolCallCount": 435
    }
  ],
  "dailyModelTokens": [
    {
      "date": "2025-11-26",
      "tokensByModel": {
        "claude-sonnet-4-5-20250929": 82418
      }
    }
  ],
  "modelUsage": {
    "claude-sonnet-4-5-20250929": {
      "inputTokens": 737574,
      "outputTokens": 2024590,
      "cacheReadInputTokens": 978458728,
      "cacheCreationInputTokens": 77983124,
      "webSearchRequests": 0,
      "costUSD": 0
    }
  },
  "totalSessions": 655,
  "totalMessages": 64704,
  "longestSession": {
    "sessionId": "uuid",
    "duration": 93744594,
    "messageCount": 552,
    "timestamp": "2025-11-27T01:46:28.619Z"
  },
  "firstSessionDate": "2025-11-26T01:50:16.838Z",
  "hourCounts": {
    "0": 19,
    "10": 40,
    "11": 62,
    ...
  }
}
```

---

## 10. ~/.claude/projects/ - Per-Project Session Data

Each project has a subdirectory named by converting the path (slashes to dashes):

```
projects/
├── -g-gits-tacogips-project-name/
│   ├── uuid-session-1.jsonl       # Main session transcripts
│   ├── uuid-session-2.jsonl
│   ├── agent-a01897f.jsonl        # Agent/subagent transcripts
│   └── agent-a116b41.jsonl
```

### Session JSONL Message Structure

Each line in session/agent JSONL files is a message with these fields:

```json
{
  "parentUuid": "previous-message-uuid",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/path/to/project",
  "sessionId": "8b1e69d9-783f-46c7-984b-cbfa646079bf",
  "version": "2.0.76",
  "gitBranch": "main",
  "type": "user",
  "message": {
    "role": "user",
    "content": "user prompt text"
  },
  "uuid": "message-uuid",
  "timestamp": "2026-01-03T15:27:46.547Z",
  "todos": []
}
```

#### Common Message Fields

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string | Unique message identifier |
| `parentUuid` | string/null | Previous message UUID (null for first message) |
| `sessionId` | string | Session UUID (same for all messages in session) |
| `type` | string | `"user"` or `"assistant"` |
| `message` | object | Message content with `role` and `content` |
| `timestamp` | string | ISO 8601 timestamp |
| `cwd` | string | Current working directory |
| `gitBranch` | string | Git branch at time of message |
| `version` | string | Claude Code version |
| `isSidechain` | boolean | `true` for agent conversations |
| `todos` | array | Todo items at time of message |

#### Agent-Specific Fields

Agent files include additional fields:

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | string | Short agent identifier (e.g., `"a5e21ec"`) |
| `slug` | string | Human-readable agent name (e.g., `"delegated-greeting-pebble"`) |

#### Assistant Message Fields

Assistant messages include model response details:

```json
{
  "message": {
    "model": "claude-opus-4-5-20251101",
    "id": "msg_xxx",
    "type": "message",
    "role": "assistant",
    "content": [
      {"type": "thinking", "thinking": "..."},
      {"type": "text", "text": "..."},
      {"type": "tool_use", "id": "toolu_xxx", "name": "Read", "input": {...}}
    ],
    "usage": {
      "input_tokens": 100,
      "output_tokens": 50,
      "cache_creation_input_tokens": 1000,
      "cache_read_input_tokens": 5000
    }
  },
  "requestId": "req_xxx"
}
```

#### Tool Result Messages

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "toolu_xxx",
        "type": "tool_result",
        "content": "tool output here"
      }
    ]
  },
  "toolUseResult": {
    "type": "text",
    "file": {...}
  }
}
```

### Special Message Types

Session JSONL files contain several special message types beyond user/assistant:

#### file-history-snapshot

Records file state for undo/checkpoint functionality:

```json
{
  "type": "file-history-snapshot",
  "messageId": "uuid",
  "snapshot": {
    "messageId": "uuid",
    "trackedFileBackups": {},
    "timestamp": "2026-01-03T15:27:46.556Z"
  },
  "isSnapshotUpdate": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageId` | string | Associated message UUID |
| `snapshot.trackedFileBackups` | object | Map of file paths to backup info |
| `snapshot.timestamp` | string | Snapshot creation time |
| `isSnapshotUpdate` | boolean | Whether this updates existing snapshot |

#### queue-operation

Records prompt queue operations:

```json
{
  "type": "queue-operation",
  "operation": "enqueue",
  "timestamp": "2026-01-03T15:29:07.750Z",
  "sessionId": "uuid",
  "content": "queued prompt text"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `operation` | string | `"enqueue"` or `"dequeue"` |
| `content` | string | Queued prompt content |

#### system

Records system events like hook execution:

```json
{
  "type": "system",
  "subtype": "stop_hook_summary",
  "hookCount": 1,
  "hookInfos": [
    {"command": "bunx prettier --write \"src/**/*.ts\""}
  ],
  "hookErrors": [],
  "preventedContinuation": false,
  "stopReason": "",
  "hasOutput": true,
  "level": "suggestion",
  "toolUseID": "uuid"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `subtype` | string | System event type (e.g., `"stop_hook_summary"`) |
| `hookCount` | number | Number of hooks executed |
| `hookInfos` | array | Hook command details |
| `hookErrors` | array | Any hook execution errors |
| `preventedContinuation` | boolean | Whether hook blocked continuation |
| `stopReason` | string | Reason for stopping |
| `hasOutput` | boolean | Whether hook produced output |
| `level` | string | Message level (`"suggestion"`, `"error"`, etc.) |
| `toolUseID` | string | Associated tool use UUID |

### Additional Message Fields

#### thinkingMetadata

Present on user messages, controls thinking behavior:

```json
{
  "thinkingMetadata": {
    "level": "high",
    "disabled": false,
    "triggers": []
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | Thinking level (`"high"`, `"medium"`, `"low"`) |
| `disabled` | boolean | Whether thinking is disabled |
| `triggers` | array | Thinking triggers |

---

## 11. Session-Agent Relationship (Retrieving Tasks for a Session)

Sessions and their spawned agents/tasks are linked through the `sessionId` field.

### Relationship Structure

```
Session: 8b1e69d9-783f-46c7-984b-cbfa646079bf.jsonl
    |
    +-- Agent: agent-a01897f.jsonl (sessionId: 8b1e69d9-...)
    +-- Agent: agent-a5e21ec.jsonl (sessionId: 8b1e69d9-...)
    +-- Agent: agent-a90cd01.jsonl (sessionId: 8b1e69d9-...)
```

### How to Retrieve Tasks for a Session

**Method**: Search agent files for matching `sessionId`

```bash
# Find all agents spawned from a specific session
grep -l '"sessionId":"8b1e69d9-783f-46c7-984b-cbfa646079bf"' \
  ~/.claude/projects/{project-name}/agent-*.jsonl
```

**Result**:
```
agent-a01897f.jsonl
agent-a5e21ec.jsonl
agent-a90cd01.jsonl
```

### Key Identifiers

| Identifier | Location | Description |
|------------|----------|-------------|
| Session ID | Filename + `sessionId` field | Full UUID of the session |
| Agent ID | Filename (`agent-{id}.jsonl`) + `agentId` field | Short 7-char identifier |
| Agent Slug | `slug` field in agent messages | Human-readable name |

### Implementation Approach

```typescript
interface AgentInfo {
  agentId: string;
  slug: string;
  filePath: string;
}

async function getAgentsForSession(
  projectDir: string,
  sessionId: string
): Promise<AgentInfo[]> {
  const agentFiles = await glob(`${projectDir}/agent-*.jsonl`);
  const agents: AgentInfo[] = [];

  for (const file of agentFiles) {
    const firstLine = await readFirstLine(file);
    const msg = JSON.parse(firstLine);

    if (msg.sessionId === sessionId) {
      agents.push({
        agentId: msg.agentId,
        slug: msg.slug,
        filePath: file
      });
    }
  }
  return agents;
}
```

### Data Retrieval Summary

| Query | Method |
|-------|--------|
| List all sessions for a project | List `{project-dir}/*.jsonl` (exclude `agent-*.jsonl`) |
| List all agents for a session | Search `agent-*.jsonl` files for matching `sessionId` |
| Get agent details | Read first line of agent file for `agentId`, `slug` |
| Get session transcript | Parse all lines in session JSONL file |
| Get agent transcript | Parse all lines in agent JSONL file |

---

## 12. ~/.claude/session-env/

Session environment data, one UUID directory per session:

```
session-env/
├── uuid-1/
├── uuid-2/
└── ...
```

---

## 13. ~/.claude/file-history/

File edit history for checkpoint/undo functionality:

```
file-history/
├── session-uuid-1/
│   ├── file-hash@v1    # Version 1 of file
│   ├── file-hash@v2    # Version 2 of file
│   └── file-hash@v3    # Version 3 of file
├── session-uuid-2/
└── ...
```

File versions are stored with format `{file-hash}@v{version-number}`.

---

## 14. ~/.claude/todos/

Todo list data per session/agent:

```
todos/
├── session-uuid-agent-uuid.json
└── ...
```

File naming: `{session-id}-agent-{agent-id}.json`

Content: JSON array of todo items (may be empty `[]`).

---

## 15. ~/.claude/plans/

Plan mode data storage. Currently empty directory structure, populated during plan mode sessions.

---

## Summary

| Location | Purpose | Format |
|----------|---------|--------|
| `~/.claude.json` | Main config + project settings | JSON |
| `~/.claude/settings.json` | Global user settings | JSON |
| `~/.claude/CLAUDE.md` | Global instructions | Markdown |
| `~/.claude/commands/*.md` | Custom slash commands | YAML frontmatter + Markdown |
| `~/.claude/plugins/` | Plugin system data | JSON + binaries |
| `~/.claude/history.jsonl` | Prompt history | JSONL |
| `~/.claude/stats-cache.json` | Usage statistics | JSON |
| `~/.claude/projects/*.jsonl` | Session transcripts | JSONL |
| `~/.claude/projects/agent-*.jsonl` | Agent/Task transcripts | JSONL |
| `~/.claude/file-history/` | File edit checkpoints | Raw files |
| `~/.claude/todos/` | Todo list data | JSON |

### Queryable Relationships

| Query | Data Source | Key Field |
|-------|-------------|-----------|
| Sessions per project | `projects/{project}/*.jsonl` (non-agent) | filename = session UUID |
| Agents per session | `projects/{project}/agent-*.jsonl` | `sessionId` field |
| Messages per session/agent | Lines in JSONL file | `parentUuid` chain |

---

## 16. Claude Code Built-in Display vs Available Data

This section compares what Claude Code's built-in commands display versus all available data.

### /resume Command - Session Picker Display

The `/resume` command shows:

| Displayed | Source |
|-----------|--------|
| Session name/initial prompt | First user message in JSONL |
| Time since last activity | `timestamp` of last message |
| Message count | Line count in JSONL |
| Git branch | `gitBranch` field |
| Forked session grouping | Session relationships |

**NOT displayed by /resume:**
- Spawned agents/tasks list
- Token usage per session
- Cost per session
- Tool calls made
- Files modified
- Thinking content

### /stats Command Display

The `/stats` command shows (from `stats-cache.json`):

| Displayed | Source Field |
|-----------|--------------|
| Daily usage chart | `dailyActivity[].messageCount` |
| Session count per day | `dailyActivity[].sessionCount` |
| Tool calls per day | `dailyActivity[].toolCallCount` |
| Total sessions | `totalSessions` |
| Total messages | `totalMessages` |
| First session date | `firstSessionDate` |
| Longest session | `longestSession` |
| Model usage breakdown | `modelUsage` |
| Hourly distribution | `hourCounts` |

**NOT displayed by /stats:**
- Per-session cost breakdown
- Per-session token details
- Agent/task statistics
- Individual session drill-down
- Tool usage by type

### Additional Data Available (Not Shown by Claude Code)

Data that exists but is not displayed by any built-in command:

| Data | Source | Description |
|------|--------|-------------|
| Session-Agent hierarchy | `sessionId` in agent files | Which agents were spawned from which session |
| Full conversation transcript | JSONL message content | Complete conversation with thinking |
| Per-message token usage | `message.usage` in JSONL | Tokens per API call |
| Tool call details | `tool_use` content blocks | Input/output of each tool |
| File edit history | `file-history/` | All file versions for undo |
| Hook execution logs | `system` type messages | Hook results and errors |
| Thinking content | `thinking` content blocks | Full reasoning traces |
| Cache statistics | `cache_creation_input_tokens`, `cache_read_input_tokens` | Prompt caching efficiency |
| Per-project costs | `lastCost` in project config | Cost of last session per project |

---

## References

See `design-docs/references/README.md` for external references.

Related documents:
- `design-claude-code-config-paths.md` - Configuration path customization
