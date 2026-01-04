# Data Storage Specification

This document describes the data structures and storage locations used by Claude Code and claude-code-agent.

---

## 1. Claude Code Storage (~/.claude)

Claude Code stores its data in two primary locations:
- `~/.claude.json` - Main configuration and project-specific settings
- `~/.claude/` - Directory containing various data files and subdirectories

### 1.1 ~/.claude.json Structure

```json
{
  "numStartups": 1794,
  "installMethod": "unknown",
  "autoUpdates": true,
  "editorMode": "vim",
  "oauthAccount": { ... },
  "projects": { ... },
  "mcpServers": { ... }
}
```

#### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `numStartups` | number | Total Claude Code startups |
| `editorMode` | string | Editor mode (vim, emacs) |
| `oauthAccount` | object | OAuth authentication data |
| `projects` | object | Per-project settings keyed by path |
| `mcpServers` | object | Global MCP server configurations |

#### Project-Specific Configuration

```json
{
  "projects": {
    "/path/to/project": {
      "allowedTools": [],
      "mcpServers": { ... },
      "lastCost": 0.72,
      "lastSessionId": "uuid",
      "lastTotalInputTokens": 42501,
      "lastTotalOutputTokens": 9500
    }
  }
}
```

### 1.2 ~/.claude/ Directory Structure

```
~/.claude/
+-- CLAUDE.md              # User's global instructions
+-- settings.json          # Global settings
+-- settings.local.json    # Local settings (not synced)
+-- .credentials.json      # Authentication credentials
+-- history.jsonl          # Prompt/command history
+-- stats-cache.json       # Usage statistics cache
+-- commands/              # Custom slash commands
+-- plugins/               # Installed plugins
+-- projects/              # Per-project session data
+-- session-env/           # Session environment data
+-- file-history/          # File edit history
+-- todos/                 # Todo list data
+-- plans/                 # Plan mode data
```

---

## 2. Session Transcript Format

### 2.1 File Location

```
~/.claude/projects/<project-id>/<session-file>.jsonl
```

**Project ID Format**: Directory path with `/` replaced by `-`
- Example: `/g/gits/myproject` -> `-g-gits-myproject`

### 2.2 File Types

| Pattern | Description |
|---------|-------------|
| `<uuid>.jsonl` | Main session transcript |
| `agent-<short-id>.jsonl` | Subagent transcript |

### 2.3 Message Structure

Each line in the JSONL file is a JSON object:

```json
{
  "type": "user",
  "uuid": "message-uuid",
  "parentUuid": "previous-message-uuid",
  "sessionId": "session-uuid",
  "message": {
    "role": "user",
    "content": "user prompt text"
  },
  "timestamp": "2026-01-03T15:27:46.547Z",
  "cwd": "/path/to/project",
  "gitBranch": "main",
  "version": "2.0.76"
}
```

### 2.4 Message Types

| Type | Description |
|------|-------------|
| `summary` | Session summary (first line) |
| `user` | User input or tool result |
| `assistant` | Claude response |
| `system` | System events (hooks, etc.) |
| `file-history-snapshot` | File state for undo |
| `queue-operation` | Prompt queue operations |

### 2.5 Assistant Message Content

```json
{
  "message": {
    "model": "claude-opus-4-5-20251101",
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
  }
}
```

### 2.6 Session-Agent Relationship

Agents spawned from a session share the same `sessionId`:

```
Session: 8b1e69d9-783f-46c7-984b-cbfa646079bf.jsonl
    +-- Agent: agent-a01897f.jsonl (sessionId matches)
    +-- Agent: agent-a5e21ec.jsonl (sessionId matches)
```

```bash
# Find all agents for a session
grep -l '"sessionId":"8b1e69d9-..."' ~/.claude/projects/{project}/agent-*.jsonl
```

---

## 3. claude-code-agent Storage

### 3.1 Directory Structure (XDG Compliant)

**Config (immutable)**: `~/.config/claude-code-agent/`
**Data (mutable)**: `~/.local/claude-code-agent/`

```
~/.config/claude-code-agent/             # Immutable data
+-- config.json                          # Global agent config
+-- templates/                           # Reusable templates
    +-- prompts/
    +-- configs/
    +-- workflows/

~/.local/claude-code-agent/              # Mutable data
+-- metadata/                            # Agent's own data
|   +-- groups/                          # Session Group definitions
|   |   +-- {group-id}.json
|   +-- sessions/                        # Session metadata
|   |   +-- {session-id}.json
|   +-- bookmarks/                       # Bookmarks
|   |   +-- {bookmark-id}.json
|   +-- index.json
|
+-- workspaces/                          # Claude Code working directories
    +-- {session-id}/
        +-- claude-config/               # CLAUDE_CONFIG_DIR points here
            +-- .claude.json
            +-- CLAUDE.md
            +-- projects/                # Claude Code writes transcripts here
```

### 3.2 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_CODE_AGENT_CONFIG_DIR` | Config directory | `~/.config/claude-code-agent` |
| `CLAUDE_CODE_AGENT_DATA_DIR` | Data directory | `~/.local/claude-code-agent` |

### 3.3 Session Metadata

```json
{
  "id": "session-123",
  "groupId": null,           // null = standalone
  "projectPath": "/path/to/project",
  "status": "completed",
  "createdAt": "2026-01-04T12:00:00Z"
}
```

### 3.4 Data Ownership

| Data | Location | Managed By |
|------|----------|------------|
| Session Group definitions | `metadata/groups/` | claude-code-agent |
| Session metadata | `metadata/sessions/` | claude-code-agent |
| Bookmarks | `metadata/bookmarks/` | claude-code-agent |
| .claude.json, CLAUDE.md | `workspaces/{id}/claude-config/` | claude-code-agent (generates) |
| Transcripts (.jsonl) | `workspaces/{id}/.../projects/` | Claude Code (writes) |

---

## 4. Configuration Path Customization

### 4.1 MCP Configuration

```bash
# Load from custom JSON file
claude --mcp-config ./mcp.json

# Strict mode (ignore other MCP configs)
claude --strict-mcp-config --mcp-config ./mcp.json
```

### 4.2 Custom .claude Directory

```bash
# Set custom config directory
CLAUDE_CONFIG_DIR=/custom/path/to/config claude
```

Affected paths when `CLAUDE_CONFIG_DIR` is set:

| Default | With CLAUDE_CONFIG_DIR |
|---------|------------------------|
| `~/.claude/settings.json` | `$CLAUDE_CONFIG_DIR/settings.json` |
| `~/.claude/projects/` | `$CLAUDE_CONFIG_DIR/projects/` |
| `~/.claude.json` | `$CLAUDE_CONFIG_DIR/.claude.json` |

---

## 5. Query Interface

### 5.1 Repository Pattern (Read-Only)

```typescript
interface SessionRepository {
  getSession(id: string): Promise<Session | null>;
  findSessions(filter: SessionFilter): Promise<Session[]>;
  findByGroup(groupId: string): Promise<Session[]>;
  findByProject(projectPath: string): Promise<Session[]>;
  query(sql: string): Promise<QueryResult>;
  watchSession(id: string): AsyncIterableIterator<SessionEvent>;
}
```

### 5.2 DuckDB Integration

```sql
-- Query JSONL files directly
SELECT * FROM read_json_auto('~/.claude/projects/*/*.jsonl')
WHERE type = 'assistant';

-- Aggregation across sessions
SELECT
  sessionId,
  COUNT(*) as message_count,
  SUM(message.usage.output_tokens) as total_tokens
FROM read_json_auto('~/.claude/projects/**/*.jsonl')
GROUP BY sessionId;
```

---

## 6. Data Available (Not Shown by Claude Code UI)

Data that exists but is not displayed by any built-in command:

| Data | Source | Description |
|------|--------|-------------|
| Session-Agent hierarchy | `sessionId` in agent files | Which agents spawned from which session |
| Full thinking content | `thinking` content blocks | Full reasoning traces |
| Per-message token usage | `message.usage` | Tokens per API call |
| Tool call details | `tool_use` content | Input/output of each tool |
| Cache statistics | `cache_*_tokens` fields | Prompt caching efficiency |
| Per-project costs | `lastCost` in project config | Cost of last session |
