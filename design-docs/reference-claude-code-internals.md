# Claude Code Internals Reference

This document provides a comprehensive reference of Claude Code's internal architecture, including tools, subagents, MCP integration, hooks, skills, and background task implementation.

**Source**: Official Claude Code documentation and GitHub repository (https://github.com/anthropics/claude-code)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Internal Tools](#internal-tools)
   - [TodoWrite Tool Details](#todowrite-tool-details)
3. [Subagents (Task Tool)](#subagents-task-tool)
4. [MCP (Model Context Protocol)](#mcp-model-context-protocol)
5. [Hooks System](#hooks-system)
6. [Skills](#skills)
7. [Background Tasks & Programmatic Usage](#background-tasks--programmatic-usage)
8. [Plugin System](#plugin-system)
9. [Memory System](#memory-system)

---

## Architecture Overview

Claude Code is an agentic coding tool that operates from the terminal. Key architectural characteristics:

- **Terminal-first**: Integrates into existing developer workflows
- **Agentic**: Takes direct actions (edits files, runs commands, creates commits)
- **Unix philosophy**: Composable and scriptable
- **Enterprise-ready**: Supports Claude API, AWS, GCP deployments

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │  Tools  │  │Subagents│  │  MCP    │  │ Hooks & Skills  │ │
│  │ (Built-in)│ │ (Task)  │  │Servers  │  │  (Extensions)   │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Session Management                        │
│              (Transcripts, Context, State)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Internal Tools

Claude Code provides a set of built-in tools for file operations, code execution, and system interaction.

### Tool List

| Tool | Category | Description | Implementation |
|------|----------|-------------|----------------|
| **Read** | File I/O | Read file contents with line numbers | Reads files with offset/limit support, supports images and PDFs |
| **Edit** | File I/O | Perform exact string replacements in files | Pattern matching with `old_string` → `new_string` |
| **Write** | File I/O | Create or overwrite files | Full file content replacement |
| **MultiEdit** | File I/O | Multiple edits in a single operation | Batch editing capability |
| **Glob** | Search | Fast file pattern matching | Supports patterns like `**/*.ts` |
| **Grep** | Search | Content search using regex | Built on ripgrep, supports context lines |
| **Bash** | Execution | Execute shell commands | Persistent shell session, timeout support |
| **BashOutput** | Execution | Read output from background bash | For long-running processes |
| **KillShell** | Execution | Terminate background shell | Kill running background tasks |
| **LS** | Filesystem | List directory contents | Directory exploration |
| **NotebookRead** | File I/O | Read Jupyter notebooks | Returns cells with outputs |
| **NotebookEdit** | File I/O | Edit Jupyter notebook cells | Modify specific cells |
| **WebFetch** | Network | Fetch and process web content | HTML to markdown conversion |
| **WebSearch** | Network | Search the web | Up-to-date information retrieval |
| **TodoWrite** | Task Mgmt | Manage task lists | Track progress, planning (see [TodoWrite Details](#todowrite-tool-details)) |
| **Task** | Subagents | Launch specialized subagents | Delegate to subagents |
| **TaskOutput** | Subagents | Retrieve output from tasks | Get results from background agents |
| **LSP** | Code Intel | Language Server Protocol operations | Go to definition, find references, hover |
| **AskUserQuestion** | Interaction | Ask user questions | Clarification, decisions |
| **Skill** | Extension | Execute a skill | Invoke registered skills |
| **EnterPlanMode** | Workflow | Enter planning mode | Design before implementation |
| **ExitPlanMode** | Workflow | Exit planning mode | Signal plan completion |

### Tool Configuration via CLI

```bash
# Specify available tools
claude --tools "Bash,Edit,Read"

# Auto-approve specific tools (no permission prompts)
claude --allowedTools "Bash(git log:*),Read,Grep"

# Disable all tools
claude --tools ""

# Use default tools
claude --tools "default"
```

### Tool Patterns for Bash

Bash tool supports pattern-based permissions:

```bash
# Allow specific git commands
--allowedTools "Bash(git diff:*),Bash(git commit:*)"

# Allow npm commands
--allowedTools "Bash(npm:*)"
```

### TodoWrite Tool Details

The TodoWrite tool provides task management capabilities for tracking progress during complex operations. Introduced in Claude Code v0.2.93.

#### Tool Schema

```typescript
interface TodoItem {
  content: string;      // Task description (imperative form, e.g., "Run tests")
  status: "pending" | "in_progress" | "completed";
  activeForm: string;   // Present continuous form (e.g., "Running tests")
}

interface TodoWriteParams {
  todos: TodoItem[];    // Complete updated todo list
}
```

#### How TodoWrite Functions

1. **State Management**: TodoWrite maintains a list of todo items in the current session
2. **Full Replacement**: Each call replaces the entire todo list (not incremental updates)
3. **Status Tracking**: Items have three states - `pending`, `in_progress`, `completed`
4. **Visual Display**: The `activeForm` is shown in the status line during execution
5. **Context Compaction**: Todo list is preserved during context compaction (improved in v1.0.16)

#### Usage Pattern

```javascript
// Initial task planning
TodoWrite({
  todos: [
    { content: "Analyze codebase", status: "in_progress", activeForm: "Analyzing codebase" },
    { content: "Design architecture", status: "pending", activeForm: "Designing architecture" },
    { content: "Implement feature", status: "pending", activeForm: "Implementing feature" },
    { content: "Run tests", status: "pending", activeForm: "Running tests" }
  ]
});

// After completing first task
TodoWrite({
  todos: [
    { content: "Analyze codebase", status: "completed", activeForm: "Analyzing codebase" },
    { content: "Design architecture", status: "in_progress", activeForm: "Designing architecture" },
    { content: "Implement feature", status: "pending", activeForm: "Implementing feature" },
    { content: "Run tests", status: "pending", activeForm: "Running tests" }
  ]
});
```

#### Best Practices

- **One in_progress at a time**: Keep exactly one task as `in_progress`
- **Mark complete immediately**: Don't batch completions
- **Descriptive content**: Use imperative form for content, continuous for activeForm
- **Break down complex tasks**: Create granular sub-tasks for better tracking
- **Use for multi-step operations**: Helps Claude stay organized on complex tasks

#### Related Commands

- **`/todos`**: List current todo items (added in v1.0.94)

#### Plugin Usage Examples

Plugins like `feature-dev` and `plugin-dev` use TodoWrite extensively:

```markdown
# From feature-dev command
- **Use TodoWrite**: Track all progress throughout
1. Create todo list with all phases
...
6. Update todos as you progress
...
1. Mark all todos complete
```

---

## Subagents (Task Tool)

Subagents are specialized AI assistants that Claude Code delegates tasks to. They operate with:

- **Dedicated purpose and expertise area**
- **Separate context window** (prevents main conversation pollution)
- **Custom configuration** (system prompts, tools, model selection)
- **Independent execution** with results returned to main thread

### Built-in Subagents

| Subagent | Model | Tools | Purpose |
|----------|-------|-------|---------|
| **general-purpose** | Sonnet | All | Complex multi-step tasks requiring exploration and modification |
| **Plan** | Sonnet | Read, Glob, Grep, Bash | Research and gather context during plan mode |
| **Explore** | Haiku | Glob, Grep, Read, Bash (read-only) | Fast codebase searching and analysis |

### Subagent Configuration Format

Subagents are defined as markdown files with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality.
tools: Read, Grep, Glob, Bash
model: sonnet  # sonnet, opus, haiku, or 'inherit'
permissionMode: default
skills: skill1, skill2
color: green
---

You are a senior code reviewer ensuring high standards.

[System prompt instructions...]
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase letters and hyphens, 3-50 chars |
| `description` | Yes | Natural language purpose (triggers auto-delegation) |
| `tools` | No | Comma-separated list; inherits all if omitted |
| `model` | No | `sonnet`, `opus`, `haiku`, or `'inherit'` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `skills` | No | Comma-separated skill names |
| `color` | No | Terminal color for status display |

### Subagent Locations & Priority

| Type | Location | Scope | Priority |
|------|----------|-------|----------|
| Project | `.claude/agents/` | Current project | Highest |
| User | `~/.claude/agents/` | All projects | Lower |
| Plugin | Plugin `agents/` directory | Via plugins | Via plugins |

### CLI-Based Subagent Configuration

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist for errors and test failures.",
    "prompt": "You are an expert debugger..."
  }
}'
```

### Subagent Invocation

**Automatic delegation**: Claude proactively invokes based on task description matching the subagent's `description` field.

**Explicit invocation**:
```
> Use the code-reviewer subagent to check my recent changes
> Have the debugger subagent investigate this error
```

### Resumable Subagents

```bash
# Resume previous agent with full context
> Resume agent abc123 and now analyze authorization logic
```

Transcripts stored in `agent-{agentId}.jsonl` files.

---

## MCP (Model Context Protocol)

MCP is an open-source standard for AI-tool integrations that allows Claude Code to connect to external tools and data sources.

### MCP Server Types

| Transport | Description | Use Case |
|-----------|-------------|----------|
| **HTTP** | Remote HTTP server (recommended) | Cloud-based services |
| **SSE** | Server-Sent Events (deprecated) | Legacy real-time connections |
| **Stdio** | Local process | Direct system access |

### Installation Commands

```bash
# HTTP server (recommended)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# HTTP with authentication
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"

# Stdio server (local process)
claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=YOUR_KEY \
  -- npx -y airtable-mcp-server

# List all configured servers
claude mcp list

# Remove a server
claude mcp remove github
```

### MCP Scopes

| Scope | Location | Description |
|-------|----------|-------------|
| **Local** (default) | `~/.claude.json` under project | Private, current project only |
| **Project** | `.mcp.json` at project root | Shared with team via VCS |
| **User** | `~/.claude.json` | Available across all projects |

**Priority**: Local > Project > User

### MCP Configuration File (.mcp.json)

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    },
    "local-db": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "postgresql://..."],
      "env": {
        "CACHE_DIR": "/tmp"
      }
    }
  }
}
```

### MCP Tool Pattern Matching

Target MCP tools in hooks:

```json
{
  "matcher": "mcp__memory__.*",
  "matcher": "mcp__.*__write.*"
}
```

### Enterprise MCP Configuration

**Managed MCP** (admin-controlled):
- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

**Allowlist/Denylist**:
```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" }
  ]
}
```

---

## Hooks System

Hooks are automated scripts that execute at specific events during the Claude Code workflow.

### Hook Types

| Type | Description |
|------|-------------|
| **Command** (`type: "command"`) | Execute bash commands |
| **Prompt** (`type: "prompt"`) | Use LLM for context-aware decisions |

### Hook Events

| Event | Purpose | Common Use Cases |
|-------|---------|------------------|
| **PreToolUse** | Before tool execution | Validate/approve tool calls, modify inputs |
| **PermissionRequest** | Permission dialog handling | Auto-allow/deny permissions |
| **PostToolUse** | After tool completion | Validation, feedback to Claude |
| **Notification** | System notifications | Custom alerts, logging |
| **UserPromptSubmit** | User prompt submission | Input validation, context injection |
| **Stop** | When Claude finishes working | Intelligent continuation decisions |
| **SubagentStop** | When subagent completes | Task validation |
| **PreCompact** | Before context compaction | Custom logic |
| **SessionStart** | Session initialization | Load context, setup environment |
| **SessionEnd** | Session cleanup | Logging, state persistence |

### Hook Configuration Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/validator.sh",
            "timeout": 60
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if task is complete. $ARGUMENTS",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Hook Input (stdin JSON)

```json
{
  "session_id": "string",
  "transcript_path": "path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

### Hook Exit Codes

| Code | Meaning |
|------|---------|
| **0** | Success (stdout shown in verbose mode) |
| **2** | Blocking error (stderr used) |
| **Other** | Non-blocking error |

### Hook Output (JSON on exit 0)

```json
{
  "continue": true,
  "stopReason": "Message to user",
  "suppressOutput": false,
  "systemMessage": "Warning message",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "updatedInput": { "field": "modified_value" }
  }
}
```

### Environment Variables in Hooks

- `$CLAUDE_PROJECT_DIR`: Project root directory
- `$CLAUDE_CODE_REMOTE`: "true" in web environment
- `$CLAUDE_ENV_FILE`: (SessionStart only) Path to persist environment variables

---

## Skills

Skills are markdown files that teach Claude how to do something specific. They are automatically invoked when requests match their purpose.

### Skill Structure

```
my-skill/
├── SKILL.md           # Required: Overview and instructions
├── reference.md       # Optional: Detailed docs (loaded on-demand)
├── examples.md        # Optional: Usage examples
└── scripts/
    └── helper.py      # Optional: Utility scripts
```

### SKILL.md Format

```yaml
---
name: pdf-processing
description: Extract text, fill forms, merge PDFs. Use when working with PDF files.
allowed-tools: Read, Bash(python:*)
model: claude-sonnet-4-20250514
---

# PDF Processing

## Quick start
[Instructions here...]

## Additional resources
- For complete API details, see [reference.md](reference.md)
```

### Skill Metadata Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase, alphanumeric + hyphens, max 64 chars |
| `description` | Yes | What it does & when to use (max 1024 chars) |
| `allowed-tools` | No | Tools Claude can use without permission |
| `model` | No | Override conversation model |

### Skill Locations & Priority

| Location | Path | Scope |
|----------|------|-------|
| Enterprise | Managed settings | All organization users |
| Personal | `~/.claude/skills/` | You, across all projects |
| Project | `.claude/skills/` | Anyone in repository |
| Plugin | Bundled with plugins | Plugin installers |

**Priority**: Enterprise > Personal > Project > Plugin

### Skills vs Other Options

| Feature | When to Use | Invocation |
|---------|-------------|------------|
| **Skills** | Give Claude specialized knowledge | Auto (Claude chooses) |
| **Slash commands** | Reusable prompts | Manual (`/command`) |
| **CLAUDE.md** | Project-wide instructions | Always active |
| **Subagents** | Delegate with isolated context | Auto or manual |
| **Hooks** | Run scripts on events | On tool events |
| **MCP servers** | External tools/data | Claude calls as needed |

---

## Background Tasks & Programmatic Usage

### CLI Non-Interactive Mode (`-p` flag)

```bash
# Basic usage
claude -p "Your prompt here"

# With output format
claude -p "Summarize project" --output-format json

# Streaming JSON
claude -p "Analyze code" --output-format stream-json

# With structured output schema
claude -p "Extract function names" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array"}}}'
```

### Output Formats

| Format | Description |
|--------|-------------|
| **text** | Plain text (default) |
| **json** | Structured JSON with result, session_id, usage |
| **stream-json** | Newline-delimited JSON for real-time streaming |

### Multi-turn Conversations

```bash
# Continue most recent session
claude -p "Follow-up question" --continue

# Resume specific session
session_id=$(claude -p "Start review" --output-format json | jq -r '.session_id')
claude -p "Continue" --resume "$session_id"
```

### Background Shell Execution

```bash
# Run command in background (via Bash tool)
claude -p "Run long-running tests"

# The Bash tool supports:
# - run_in_background parameter
# - TaskOutput to read output later
# - KillShell to terminate
```

### Agent SDK (Python/TypeScript)

For advanced programmatic control:

```python
# Python SDK example (conceptual)
from claude_code import ClaudeCode

client = ClaudeCode()
result = client.run(
    prompt="Review this code",
    tools=["Read", "Grep"],
    callbacks={
        "on_tool_use": lambda tool, input: approve_or_deny(tool)
    }
)
```

### Ralph Loop Pattern (Background Iteration)

The Ralph Wiggum plugin demonstrates a background task pattern using hooks:

```bash
# Start iterative loop
/ralph-loop "Build API" --completion-promise "DONE" --max-iterations 50

# Implementation:
# 1. Stop hook intercepts exit attempts
# 2. Same prompt fed back to Claude
# 3. Claude sees previous work in files
# 4. Continues until completion promise or max iterations
```

---

## Plugin System

Plugins extend Claude Code with custom commands, agents, hooks, and MCP servers.

### Plugin Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json       # Plugin metadata
├── commands/             # Slash commands
│   └── my-command.md
├── agents/               # Specialized agents
│   └── my-agent.md
├── skills/               # Agent skills
│   └── my-skill/
│       └── SKILL.md
├── hooks/                # Event handlers
│   └── my-hook.sh
├── hooks-handlers/       # Hook handler scripts
├── .mcp.json             # MCP server config (optional)
└── README.md
```

### Example Plugins from Claude Code Repository

| Plugin | Description | Key Features |
|--------|-------------|--------------|
| **code-review** | Automated PR review | 4 parallel agents, confidence scoring |
| **feature-dev** | 7-phase feature development | code-explorer, code-architect, code-reviewer agents |
| **hookify** | Create hooks from patterns | No-code hook generation |
| **pr-review-toolkit** | Comprehensive PR review | 6 specialized review agents |
| **ralph-wiggum** | Iterative development loops | Stop hook for self-referential loops |
| **commit-commands** | Git workflow automation | `/commit`, `/commit-push-pr` commands |

### Agent Example: code-explorer

```markdown
---
name: code-explorer
description: Deeply analyzes existing codebase features by tracing execution paths
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput
model: sonnet
color: yellow
---

You are an expert code analyst specializing in tracing and understanding feature implementations.

## Core Mission
Provide a complete understanding of how a specific feature works...

## Analysis Approach
1. Feature Discovery
2. Code Flow Tracing
3. Architecture Analysis
4. Implementation Details
```

### Agent Example: code-architect

```markdown
---
name: code-architect
description: Designs feature architectures by analyzing existing codebase patterns
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput
model: sonnet
color: green
---

You are a senior software architect who delivers comprehensive, actionable architecture blueprints.

## Core Process
1. Codebase Pattern Analysis
2. Architecture Design
3. Complete Implementation Blueprint
```

---

## Implementation Patterns

### Parallel Agent Execution

The code-review plugin demonstrates parallel agent execution:

```markdown
1. Launch 4 parallel agents:
   - Agent #1 & #2: CLAUDE.md compliance
   - Agent #3: Bug detection
   - Agent #4: Git history analysis
2. Each agent independently reviews
3. Confidence scoring (0-100) filters results
4. Only issues >= 80 confidence reported
```

### Self-Referential Loops (Ralph Pattern)

```
┌─────────────────────────────────────┐
│         User starts loop            │
│    /ralph-loop "task" --max 50      │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│       Claude works on task          │
│    (reads files, makes changes)     │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│      Claude tries to exit           │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│     Stop hook intercepts exit       │
│  - Checks completion promise        │
│  - Checks iteration count           │
│  - Blocks exit if not complete      │
└─────────────────┬───────────────────┘
                  │
          ┌───────┴───────┐
          │               │
     [Not done]      [Complete]
          │               │
          v               v
   Feed same prompt    Allow exit
   back to Claude
          │
          └──────> Loop continues
```

### Progressive Disclosure in Skills

Keep main SKILL.md under 500 lines, reference additional files:

```markdown
## Overview
[Essential instructions - ~200 lines]

## Additional resources
- For complete API: see [reference.md](reference.md)
- For examples: see [examples.md](examples.md)
```

Files loaded on-demand when Claude needs them.

---

## Memory System

Claude Code provides a hierarchical memory system to maintain context and preferences across sessions.

### Memory Type Hierarchy

| Memory Type | Location | Purpose | Shared With |
|---|---|---|---|
| **Enterprise policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS)<br>`/etc/claude-code/CLAUDE.md` (Linux)<br>`C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | Organization-wide instructions | All users in organization |
| **Project memory** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared instructions | Team members via source control |
| **Project rules** | `./.claude/rules/*.md` | Modular, topic-specific instructions | Team members via source control |
| **User memory** | `~/.claude/CLAUDE.md` | Personal preferences for all projects | Just you (all projects) |
| **Project memory (local)** | `./CLAUDE.local.md` | Personal project-specific preferences | Just you (current project) |

**Priority**: Files higher in hierarchy take precedence and are loaded first.

### Memory Lookup Process

1. **Starting point**: Current working directory (cwd)
2. **Traversal**: Recurses up to (but not including) the root directory `/`
3. **Discovery**: Reads any `CLAUDE.md` or `CLAUDE.local.md` files found
4. **Subtrees**: Also discovers `CLAUDE.md` files nested in subtrees (included only when Claude reads files in those subtrees)

### File Imports

Files can import additional context using `@path/to/import` syntax:

```markdown
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

Features:
- Supports both relative and absolute paths
- Can import from home directory: `@~/.claude/my-project-instructions.md`
- Recursive imports allowed (max 5 levels deep)

### Modular Rules with `.claude/rules/`

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # Main project instructions
│   └── rules/
│       ├── code-style.md   # Code style guidelines
│       ├── testing.md      # Testing conventions
│       └── security.md     # Security requirements
```

Path-specific rules using YAML frontmatter:

```markdown
---
paths: src/api/**/*.ts
---

# API Development Rules
- All API endpoints must include input validation
```

### Memory Commands

- **`/memory`**: Open memory files in system editor, view all loaded memory files
- **`/init`**: Bootstrap a `CLAUDE.md` for your codebase

---

## Key Takeaways for claude-code-agent

1. **Tools are the primary interface** - All Claude Code actions go through tools with defined schemas
2. **Subagents provide isolation** - Separate context prevents main conversation bloat
3. **Hooks enable customization** - Event-driven extensibility at key points
4. **MCP provides external integration** - Standardized protocol for tools/data sources
5. **Skills add domain knowledge** - Auto-invoked based on context matching
6. **Background execution via CLI** - `-p` flag with streaming JSON for programmatic use
7. **Transcripts are the source of truth** - JSONL files store complete session history
8. **Plugin system is file-based** - Markdown files with YAML frontmatter define extensions
9. **TodoWrite enables task tracking** - Session-scoped todo list with status tracking, preserved during compaction
10. **Memory system is hierarchical** - CLAUDE.md files at multiple levels with priority-based loading

---

## References

- Claude Code GitHub: https://github.com/anthropics/claude-code
- Documentation: https://code.claude.com/docs/
- MCP Protocol: https://modelcontextprotocol.io/
- Agent SDK: https://platform.claude.com/docs/en/agent-sdk/
