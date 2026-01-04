# Q&A: Agent Architecture and File Management

This document covers design decisions for claude-code-agent's file management, session groups, and isolation from default Claude Code configuration.

**Status**: Pending decisions
**Created**: 2026-01-04
**Priority**: Critical (core architecture)

---

## Core Concept: Isolation from ~/.claude

claude-code-agent does NOT modify `~/.claude` directly. Instead:

1. Creates its own configuration files in a separate directory
2. Passes these to Claude Code via CLI flags (`--mcp-config`, `CLAUDE_CONFIG_DIR`, etc.)
3. Default Claude Code configuration remains untouched

---

## Q13: Auth Token Override

### Question

How should claude-code-agent override Claude Code's auth for cross-machine usage?

### Background

- `~/.claude.json` contains `oauthAccount` with auth token
- Want to use Claude Code Max plan token from another machine
- **claude-code-agent does NOT manage auth tokens**
- Only provides capability to **override** Claude Code's auth when invoking

### Approach

**Agent does not store tokens.** Instead:

1. User provides auth override source (file path, env var, or inline)
2. Agent copies/generates `.claude.json` with overridden auth into session group's config
3. Claude Code is invoked with `CLAUDE_CONFIG_DIR` pointing to that config

### Override Methods

| Method | Usage | Use Case |
|--------|-------|----------|
| **--auth-file** | `--auth-file /path/to/.claude.json` | Copy from another machine |
| **--auth-json** | `--auth-json '{"oauthAccount":...}'` | Inline override |
| **Env var** | `CLAUDE_CODE_AGENT_AUTH_FILE=/path` | CI/CD, automation |
| **No override** | (default) | Use Claude Code's default auth |

### Example Usage

```bash
# Use auth from another machine
claude-code-agent group create "my-task" \
  --auth-file /mnt/shared/.claude.json

# Or via environment
CLAUDE_CODE_AGENT_AUTH_FILE=/path/to/.claude.json \
  claude-code-agent session run "prompt"
```

### Implementation

```typescript
// When generating session group config
if (options.authFile) {
  // Copy auth from specified file
  const sourceAuth = JSON.parse(await readFile(options.authFile));
  generatedClaudeJson.oauthAccount = sourceAuth.oauthAccount;
} else {
  // Use default Claude Code auth (copy from ~/.claude.json)
  const defaultAuth = JSON.parse(await readFile('~/.claude.json'));
  generatedClaudeJson.oauthAccount = defaultAuth.oauthAccount;
}
```

### Decision

- [x] Override via CLI flag / env var (agent does not manage tokens)

**Decided**: 2026-01-04
**Rationale**: Agent provides override capability only. Does not store or manage auth tokens.

---

## Q14: Agent Directory Structure

### Question

Where should claude-code-agent store its data?

### Decided Structure (XDG Compliant)

**Immutable (config, templates)**: `~/.config/claude-code-agent/`
**Mutable (session groups)**: `~/.local/claude-code-agent/`

```
~/.config/claude-code-agent/             # Immutable data
├── config.json                          # Global agent config
└── templates/                           # Reusable templates
    ├── prompts/
    │   ├── code-review.md
    │   └── implement-feature.md
    ├── configs/                         # CLAUDE.md templates
    │   ├── strict-typescript/
    │   └── documentation/
    └── workflows/
        └── feature-implementation.yaml

~/.local/claude-code-agent/              # Mutable data
└── session-groups/
    └── {project-id}/
        └── {session-group-id}/
            ├── meta.json                # Group metadata
            ├── claude-config/           # Generated Claude Code config
            │   ├── .claude.json         # Copied auth + config
            │   ├── CLAUDE.md
            │   ├── commands/
            │   └── settings.json
            └── sessions/                # Session transcripts
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_CODE_AGENT_CONFIG_DIR` | Config directory | `~/.config/claude-code-agent` |
| `CLAUDE_CODE_AGENT_DATA_DIR` | Data directory | `~/.local/claude-code-agent` |

### Decision

- [x] XDG compliant (config in `~/.config/`, data in `~/.local/`)

**Decided**: 2026-01-04
**Rationale**: Follows XDG Base Directory Specification. Templates are immutable like config.

---

## Q15: Session Group Concept

### Question

How should Session Groups be structured and identified?

### Concept

A **Session Group** is:
- A collection of related sessions working toward a single goal
- Scoped to a project
- Has its own isolated Claude Code configuration
- Original concept for claude-code-agent (not in Claude Code)

### Hierarchy

```
Project Path (e.g., /g/gits/my-project)
  └── Session Group (e.g., "feature-user-auth")
        ├── Generated Config (CLAUDE.md, commands, etc.)
        ├── Session 1: "research-existing-auth"
        ├── Session 2: "design-auth-module"
        └── Session 3: "implement-auth-handlers"
```

### Session Group Identification

| Option | Example | Trade-off |
|--------|---------|-----------|
| **UUID** | `a3bd4eea-e189-4c18-9768` | Unique, not readable |
| **Slug** | `feature-user-auth` | Readable, may collide |
| **Timestamp + Slug** | `20260104-feature-user-auth` | Readable, unique |
| **UUID + Slug** | `a3bd4eea-feature-user-auth` | Both benefits |

### Session Group Metadata (meta.json)

```json
{
  "id": "a3bd4eea-e189-4c18-9768",
  "slug": "feature-user-auth",
  "projectPath": "/g/gits/my-project",
  "createdAt": "2026-01-04T10:00:00Z",
  "updatedAt": "2026-01-04T12:30:00Z",
  "goal": "Implement user authentication with JWT",
  "status": "in_progress",
  "sessions": [
    { "id": "uuid-1", "description": "Research existing auth" },
    { "id": "uuid-2", "description": "Design auth module" }
  ],
  "config": {
    "model": "opus",
    "maxBudgetUsd": 5.00
  }
}
```

### Decision

- [ ] UUID only
- [ ] Slug only
- [ ] Timestamp + Slug
- [ ] UUID + Slug
- [ ] Other: _______________

---

## Q15: Generated Claude Code Configuration

### Question

What configuration files should claude-code-agent generate for each Session Group?

### Files to Generate

| File | Purpose | Generate? |
|------|---------|-----------|
| `CLAUDE.md` | Session-specific instructions | Yes |
| `settings.json` | Permission settings | Optional |
| `commands/*.md` | Custom slash commands | Optional |
| `.mcp.json` | MCP server configuration | Optional |

### How Claude Code Uses Generated Config

```bash
# Option 1: CLAUDE_CONFIG_DIR (replaces ~/.claude)
CLAUDE_CONFIG_DIR=/path/to/session-group/claude-config claude -p "prompt"

# Option 2: Specific flags
claude -p \
  --mcp-config /path/to/session-group/.mcp.json \
  --system-prompt "$(cat /path/to/session-group/CLAUDE.md)" \
  "prompt"
```

### Decision

Files to generate:
- [ ] CLAUDE.md only
- [ ] CLAUDE.md + settings.json
- [ ] CLAUDE.md + commands/
- [ ] Full set (CLAUDE.md, settings, commands, MCP)
- [ ] Configurable per session group

---

## Q16: Template System

### Question

How should prompt/configuration templates be defined and used?

### Use Cases

1. **Prompt Templates**: Reusable prompts with variables
2. **Config Templates**: Pre-configured CLAUDE.md, commands
3. **Workflow Templates**: Multi-session task definitions

### Template Location

```
~/.claude-code-agent/
├── templates/
│   ├── prompts/
│   │   ├── code-review.md
│   │   └── implement-feature.md
│   ├── configs/
│   │   ├── strict-typescript/
│   │   │   ├── CLAUDE.md
│   │   │   └── commands/
│   │   └── documentation/
│   └── workflows/
│       └── feature-implementation.yaml
```

### Template Format Options

| Format | Pros | Cons |
|--------|------|------|
| **Markdown + frontmatter** | Simple, familiar | Limited variables |
| **Mustache/Handlebars** | Standard templating | Extra dependency |
| **TypeScript** | Type-safe, powerful | Compilation needed |
| **YAML with $ref** | Structured, composable | Verbose |

### Example Prompt Template (Markdown + frontmatter)

```markdown
---
name: code-review
description: Review code for quality and issues
variables:
  - name: file_path
    required: true
  - name: focus_areas
    default: "security, performance, readability"
---

Review the code in {{file_path}}.

Focus on: {{focus_areas}}

Provide specific, actionable feedback.
```

### Decision

- [ ] Markdown + frontmatter (like Claude commands)
- [ ] Mustache/Handlebars
- [ ] TypeScript functions
- [ ] YAML with variables
- [ ] Other: _______________

---

## Q17: Session Group Lifecycle

### Question

How should Session Groups be created, managed, and archived?

### Lifecycle States

```
created -> active -> completed
                  -> archived
                  -> failed
```

### Commands

```bash
# Create new session group
claude-code-agent group create "feature-user-auth" --project /path/to/project

# List session groups
claude-code-agent group list [--project <path>] [--status active]

# Show session group details
claude-code-agent group show <group-id>

# Add session to group
claude-code-agent group add-session <group-id> --prompt "Research auth patterns"

# Archive session group
claude-code-agent group archive <group-id>

# Delete session group
claude-code-agent group delete <group-id>
```

### Decision

Confirm lifecycle commands:
- [ ] Approve proposed commands
- [ ] Modifications needed: _______________

---

## Q18: Claude Code Invocation Strategy

### Question

How should claude-code-agent invoke Claude Code for a session?

### Invocation Flow

```
1. Create/select Session Group
2. Generate config files (CLAUDE.md, etc.)
3. Build Claude Code command with flags
4. Spawn Claude Code process
5. Stream stdout (JSON messages)
6. Monitor transcript files
7. Store results in Session Group
```

### Configuration Injection Methods

| Method | How | Trade-off |
|--------|-----|-----------|
| **CLAUDE_CONFIG_DIR** | Replace entire ~/.claude | Full isolation, may miss user settings |
| **--mcp-config** | Override MCP only | Partial isolation |
| **--system-prompt** | Inject via flag | No file needed, limited |
| **--append-system-prompt** | Add to existing | Combines with user config |
| **Symlink ~/.claude** | Temporary replacement | Risky, race conditions |

### Recommendation

Use `CLAUDE_CONFIG_DIR` for full isolation:

```typescript
const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: sessionGroup.configPath,
};

spawn('claude', ['-p', '--output-format', 'stream-json', prompt], { env });
```

### Decision

- [ ] CLAUDE_CONFIG_DIR (full isolation)
- [ ] --mcp-config + --append-system-prompt (partial)
- [ ] Hybrid (configurable per session group)
- [ ] Other: _______________

---

## Q19: Session Transcript Storage

### Question

Where should session transcripts be stored for a Session Group?

### Options

| Option | Description | Trade-off |
|--------|-------------|-----------|
| **Copy from ~/.claude** | Copy JSONL after session | Duplication, but isolated |
| **Symlink** | Link to original files | No duplication, depends on ~/.claude |
| **Custom session path** | Use --session-id to control | May not work with CLAUDE_CONFIG_DIR |
| **Read-only reference** | Just store session ID, read from ~/.claude | Minimal storage, coupled |

### Recommendation

Copy transcripts to Session Group directory for full isolation:

```
session-groups/{project-id}/{group-id}/
├── sessions/
│   ├── {session-1-uuid}.jsonl
│   ├── {session-2-uuid}.jsonl
│   └── agent-{id}.jsonl
```

### Decision

- [ ] Copy transcripts
- [ ] Symlink to ~/.claude
- [ ] Read-only reference (store ID only)
- [ ] Other: _______________

---

## Q20: Concurrent Session Management

### Question

How should concurrent sessions within a Session Group be managed?

### Options

| Option | Description |
|--------|-------------|
| **Sequential only** | One session at a time |
| **Parallel allowed** | Multiple concurrent sessions |
| **Configurable limit** | Max N concurrent sessions |

### Considerations

- Claude Code may have rate limits
- Concurrent file watching complexity
- Cost tracking per session

### Decision

- [ ] Sequential only
- [ ] Parallel allowed (unlimited)
- [ ] Configurable limit (default: __)
- [ ] Other: _______________

---

## Summary of Decisions

| Question | Topic | Status |
|----------|-------|--------|
| Q13 | Auth Token Override | **Decided** |
| Q14 | Agent Directory Structure | **Decided** |
| Q15 | Session Group Identification | Pending |
| Q16 | Generated Config Files | Pending |
| Q17 | Template System Format | Pending |
| Q18 | Session Group Lifecycle | Pending |
| Q19 | Claude Code Invocation Strategy | Pending |
| Q20 | Session Transcript Storage | Pending |
| Q21 | Concurrent Session Management | Pending |

---

## Architecture Diagram

```
+------------------------------------------+
|          claude-code-agent               |
+------------------------------------------+
|                                          |
|  +----------------+  +----------------+  |
|  | Session Group  |  | Template       |  |
|  | Manager        |  | Engine         |  |
|  +----------------+  +----------------+  |
|          |                   |           |
|          v                   v           |
|  +------------------------------------+  |
|  |        Config Generator            |  |
|  | (.claude.json, CLAUDE.md, etc.)    |  |
|  +------------------------------------+  |
|                    |                     |
+--------------------+---------------------+
                     |
                     v
+------------------------------------------------+
| ~/.config/claude-code-agent/  (immutable)      |
|   ├── config.json                              |
|   └── templates/                               |
+------------------------------------------------+
                     |
                     v
+------------------------------------------------+
| ~/.local/claude-code-agent/   (mutable)        |
|   └── session-groups/{project}/{group}/        |
|         ├── meta.json                          |
|         ├── claude-config/  <-- CLAUDE_CONFIG_DIR
|         │     ├── .claude.json (with auth)     |
|         │     ├── CLAUDE.md                    |
|         │     └── settings.json                |
|         └── sessions/                          |
+------------------------------------------------+
                     |
                     v
     +-------------------------------+
     |    Claude Code (subprocess)   |
     |    CLAUDE_CONFIG_DIR=         |
     |    ~/.local/claude-code-agent |
     |    /session-groups/.../       |
     |    claude-config              |
     +-------------------------------+
                     |
                     v
     +-------------------------------+
     |  ~/.claude/projects/...       |
     |  (Claude Code's output)       |
     +-------------------------------+
                     |
                     v (copy/watch)
     +-------------------------------+
     |  ~/.local/claude-code-agent/  |
     |  session-groups/.../sessions  |
     +-------------------------------+
```
