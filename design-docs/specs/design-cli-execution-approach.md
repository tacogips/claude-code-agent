# Design: CLI Execution Approach for Claude Code Integration

## Overview

This document describes the design approach for integrating with Claude Code by executing the CLI directly rather than using the SDK. This approach allows MCP servers and tool executions to be handled by the claude-code process itself.

## Background

### SDK vs CLI Execution

| Approach | Pros | Cons |
|----------|------|------|
| **SDK (`@anthropic-ai/claude-agent-sdk`)** | Type-safe, programmatic control, hooks | MCP/tools handled in your process |
| **CLI Execution** | MCP handled by claude-code, simpler integration | Parse stdout, read history files |

### Why CLI Execution?

- MCP server lifecycle managed by claude-code
- Tool permissions handled by claude-code's permission system
- Session persistence automatic
- Leverages claude-code's existing infrastructure

## CLI Options for Non-Interactive Execution

### Basic Usage

```bash
# Basic print mode (text output)
claude -p "Your prompt here"

# JSON output (single result object)
claude -p --output-format json "Your prompt"

# Streaming JSON (realtime messages, requires --verbose)
claude -p --output-format stream-json --verbose "Your prompt"
```

### Session Management

```bash
# Specify session ID (creates new or continues existing)
claude -p --session-id <uuid> "Your prompt"

# Resume existing session by ID
claude -p --resume <session-id> "Follow up question"

# Continue most recent session
claude -p --continue "Continue from where we left off"

# Fork session (create new ID from existing conversation)
claude -p --resume <session-id> --fork-session "Branch from here"

# Disable session persistence (ephemeral)
claude -p --no-session-persistence "One-off query"
```

### Model and Tool Configuration

```bash
# Model selection
claude -p --model sonnet "Prompt"
claude -p --model opus "Prompt"
claude -p --model haiku "Prompt"

# Custom MCP servers
claude -p --mcp-config ./mcp-servers.json "Prompt"

# Strict MCP config (ignore other MCP configurations)
claude -p --strict-mcp-config --mcp-config ./mcp.json "Prompt"

# Tool allowlist/denylist
claude -p --allowed-tools "Bash,Read,Edit" "Prompt"
claude -p --disallowed-tools "WebSearch,WebFetch" "Prompt"

# Bypass permissions (for sandboxed environments)
claude -p --permission-mode bypassPermissions --dangerously-skip-permissions "Prompt"
```

### Budget and Limits

```bash
# Maximum budget in USD
claude -p --max-budget-usd 1.00 "Prompt"
```

### System Prompt

```bash
# Custom system prompt
claude -p --system-prompt "You are a code reviewer" "Review this code"

# Append to default system prompt
claude -p --append-system-prompt "Always respond in Japanese" "Prompt"
```

## Output Format

### Stream JSON Format (`--output-format stream-json --verbose`)

Each line is a JSON object. Message types:

```typescript
// System init message (first message)
{
  type: "system",
  subtype: "init",
  session_id: string,
  cwd: string,
  tools: string[],
  mcp_servers: { name: string, status: string }[],
  model: string,
  permissionMode: string,
  slash_commands: string[],
  agents: string[],
  plugins: { name: string, path: string }[],
  uuid: string
}

// Assistant message
{
  type: "assistant",
  message: {
    model: string,
    id: string,
    role: "assistant",
    content: Array<{ type: "text", text: string } | { type: "tool_use", ... }>,
    usage: { input_tokens: number, output_tokens: number, ... }
  },
  parent_tool_use_id: string | null,
  session_id: string,
  uuid: string
}

// Result message (final)
{
  type: "result",
  subtype: "success" | "error_max_turns" | "error_max_budget_usd" | "error_during_execution",
  is_error: boolean,
  duration_ms: number,
  duration_api_ms: number,
  num_turns: number,
  result: string,
  session_id: string,
  total_cost_usd: number,
  usage: { ... },
  modelUsage: { [model: string]: { inputTokens, outputTokens, costUSD, ... } },
  permission_denials: Array<{ tool_name, tool_use_id, tool_input }>,
  uuid: string
}
```

### JSON Format (`--output-format json`)

Returns only the final result object (same as `type: "result"` above).

## History File Structure

### Location

```
~/.claude/
  projects/
    {encoded-project-path}/           # e.g., -g-gits-tacogips-claude-code-agent
      {session-uuid}.jsonl            # Main session transcript
      agent-{short-id}.jsonl          # Subagent transcripts
```

Project path encoding: `/` replaced with `-`, leading `-` added.

### Session File Format (JSONL)

Each line is a JSON object with varying `type`:

#### User Message
```json
{
  "type": "user",
  "uuid": "26c9565e-ce2a-48f6-b7d7-69b4266668a8",
  "parentUuid": null,
  "sessionId": "a3bd4eea-e189-4c18-9768-4f0179de16aa",
  "message": {
    "role": "user",
    "content": "Say just 'hello'"
  },
  "cwd": "/g/gits/tacogips/claude-code-agent",
  "gitBranch": "design",
  "version": "2.0.76",
  "timestamp": "2026-01-02T14:32:06.459Z",
  "isSidechain": false,
  "userType": "external"
}
```

#### Assistant Message
```json
{
  "type": "assistant",
  "uuid": "2062bde6-e56f-49f3-ad48-fb556e18f4b2",
  "parentUuid": "26c9565e-ce2a-48f6-b7d7-69b4266668a8",
  "sessionId": "a3bd4eea-e189-4c18-9768-4f0179de16aa",
  "message": {
    "model": "claude-sonnet-4-5-20250929",
    "id": "msg_01KMFd15PBxgK27gUXPvvVsY",
    "type": "message",
    "role": "assistant",
    "content": [
      { "type": "text", "text": "hello" }
    ],
    "usage": { ... }
  },
  "requestId": "req_011CWiiNMsX39fNnJTULjxS5",
  "timestamp": "2026-01-02T14:32:10.334Z"
}
```

#### Message Types in History

| type | Description |
|------|-------------|
| `user` | User message with `message.content` |
| `assistant` | Assistant response with `message.content[]` |
| `thinking` | Extended thinking content |
| `summary` | Session summary |
| `system` | System events |
| `file-history-snapshot` | File state snapshots |
| `queue-operation` | Internal queue operations |

## Architecture

```
+------------------+
|    Your App      |
+------------------+
        |
        | (1) Spawn process with args
        v
+------------------------------------------+
|  claude -p --output-format stream-json   |
|         --verbose                        |
|         --session-id <uuid>              |
|         --mcp-config ./mcp.json          |
|         "prompt"                         |
+------------------------------------------+
        |
        | (2) stdout: JSON stream
        v
+------------------+
|  Parse Messages  |
|  - system/init   |
|  - assistant     |
|  - result        |
+------------------+
        |
        | (3) Read history (optional)
        v
+------------------------------------------+
|  ~/.claude/projects/{path}/{session}.jsonl |
+------------------------------------------+
```

## Implementation Considerations

### Process Spawning

```typescript
import { spawn } from 'child_process';

function executeClaudeCode(prompt: string, options: {
  sessionId?: string;
  mcpConfig?: string;
  model?: string;
}): AsyncGenerator<SDKMessage> {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
  ];

  if (options.sessionId) {
    args.push('--session-id', options.sessionId);
  }
  if (options.mcpConfig) {
    args.push('--mcp-config', options.mcpConfig);
  }
  if (options.model) {
    args.push('--model', options.model);
  }

  args.push(prompt);

  const proc = spawn('claude', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Parse stdout line by line as JSON
  // ...
}
```

### Reading History Files

```typescript
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

function encodeProjectPath(projectPath: string): string {
  return '-' + projectPath.replace(/\//g, '-');
}

async function readSessionHistory(projectPath: string, sessionId: string) {
  const encodedPath = encodeProjectPath(projectPath);
  const historyPath = join(
    homedir(),
    '.claude',
    'projects',
    encodedPath,
    `${sessionId}.jsonl`
  );

  const content = await readFile(historyPath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}
```

### Type Definitions

Types can be imported from `@anthropic-ai/claude-agent-sdk` for type safety:

```typescript
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKSystemMessage,
} from "@anthropic-ai/claude-agent-sdk";
```

Or copy the type definitions from:
- `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts`
- `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts`

## Key Benefits

1. **MCP Handled by claude-code**: MCP servers are spawned and managed by the CLI process
2. **Session Persistence**: Sessions automatically saved to `~/.claude/projects/`
3. **Resume Capability**: Use `--resume <session-id>` to continue conversations
4. **Structured Output**: `--output-format stream-json --verbose` provides typed JSON messages
5. **Permission System**: Leverages claude-code's built-in permission handling
6. **Tool Execution**: All built-in tools (Bash, Read, Edit, etc.) handled by claude-code

## References

- Claude Agent SDK: `@anthropic-ai/claude-agent-sdk`
- CLI Help: `claude --help`
- Session Files: `~/.claude/projects/{encoded-path}/{session-id}.jsonl`
