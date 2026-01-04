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
- **NOT scoped to a single project** - can span multiple projects
- Each session within the group can target a different project
- Supports concurrent execution across projects
- Has its own isolated Claude Code configuration per session
- Original concept for claude-code-agent (not in Claude Code)

### Hierarchy (Multi-Project)

```
Session Group (e.g., "cross-project-refactor")
  ├── Session 1: project-a, "implement auth module"
  ├── Session 2: project-b, "update shared library"
  ├── Session 3: project-a, "integrate shared lib"      # concurrent with Session 2
  └── Session 4: project-c, "update documentation"
```

### Directory Structure

Session Groups are stored independently of projects:

```
~/.local/claude-code-agent/
└── session-groups/
    └── 20260104-143022-cross-project-refactor/   # Timestamp + Slug
        ├── meta.json
        ├── sessions/
        │   ├── 001-uuid-session1/
        │   │   ├── meta.json           # project: /path/to/project-a
        │   │   ├── claude-config/      # Generated config for this session
        │   │   └── transcript.jsonl    # Copied from Claude Code
        │   ├── 002-uuid-session2/
        │   │   ├── meta.json           # project: /path/to/project-b
        │   │   └── ...
        │   └── 003-uuid-session3/
        │       └── ...
        └── shared-config/              # Optional: shared across sessions
            └── CLAUDE.md
```

### Session Group Metadata (meta.json)

```json
{
  "id": "20260104-143022-cross-project-refactor",
  "name": "Cross-Project Auth Refactor",
  "description": "Refactor authentication across multiple services",
  "slug": "cross-project-refactor",
  "createdAt": "2026-01-04T14:30:22Z",
  "updatedAt": "2026-01-04T16:45:00Z",
  "status": "in_progress",
  "sessions": [
    {
      "id": "001-uuid-session1",
      "projectPath": "/g/gits/project-a",
      "description": "Implement auth module",
      "status": "completed"
    },
    {
      "id": "002-uuid-session2",
      "projectPath": "/g/gits/project-b",
      "description": "Update shared library",
      "status": "in_progress"
    },
    {
      "id": "003-uuid-session3",
      "projectPath": "/g/gits/project-a",
      "description": "Integrate shared lib",
      "status": "pending",
      "dependsOn": ["002-uuid-session2"]
    }
  ],
  "config": {
    "model": "opus",
    "maxBudgetUsd": 10.00,
    "maxConcurrentSessions": 3
  }
}
```

### Concurrent Execution Model

```
+--------------------------------------------------+
|              Session Group Manager               |
+--------------------------------------------------+
|                                                  |
|  +-------------+  +-------------+  +----------+  |
|  | Worker 1    |  | Worker 2    |  | Worker 3 |  |
|  | (Session 1) |  | (Session 2) |  | (Idle)   |  |
|  | project-a   |  | project-b   |  |          |  |
|  +-------------+  +-------------+  +----------+  |
|        |               |                         |
|        v               v                         |
|  +--------------------------------------------+  |
|  |         Progress Aggregator                |  |
|  | - Unified view of all session progress     |  |
|  | - Real-time updates via fs.watch           |  |
|  | - Cost/token aggregation                   |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

### CLI Usage

```bash
# Create session group (not tied to a project)
claude-code-agent group create cross-project-refactor \
  --name "Cross-Project Auth Refactor" \
  --description "Refactor auth across services"

# Add session with specific project
claude-code-agent session add \
  --group cross-project-refactor \
  --project /g/gits/project-a \
  --prompt "Implement auth module"

# Add another session (different project)
claude-code-agent session add \
  --group cross-project-refactor \
  --project /g/gits/project-b \
  --prompt "Update shared library"

# Run sessions concurrently
claude-code-agent group run cross-project-refactor --concurrent 2

# Watch unified progress
claude-code-agent group watch cross-project-refactor
```

### Session Group Identification

- [x] Timestamp + Slug (format: `YYYYMMDD-HHMMSS-{slug}`)

**Decided**: 2026-01-04
**Rationale**: Human readable, unique, sortable. User-provided name/description stored in meta.json. Session Groups are project-independent and support multi-project workflows.

---

## Q16: Generated Claude Code Configuration

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

### Per-Session Configuration Strategy

Since Session Groups span multiple projects with different needs:

```
Session Group Config (defaults)
    │
    ├── Session 1 (project-a): inherits defaults + TypeScript template
    ├── Session 2 (project-b): inherits defaults + custom CLAUDE.md
    └── Session 3 (project-c): full override with all files
```

### Implementation

```typescript
interface SessionConfig {
  // What to generate
  generateClaudeMd: boolean;       // default: true
  generateSettings: boolean;       // default: false
  generateCommands: boolean;       // default: false
  generateMcpConfig: boolean;      // default: false

  // Sources
  claudeMdTemplate?: string;       // template name or path
  settingsOverride?: object;       // partial settings.json
  inheritFromGroup: boolean;       // default: true
}
```

### Decision

Files to generate:
- [ ] CLAUDE.md only
- [ ] CLAUDE.md + settings.json
- [ ] CLAUDE.md + commands/
- [ ] Full set (CLAUDE.md, settings, commands, MCP)
- [x] Configurable per session (with group-level defaults)

**Decided**: 2026-01-04
**Rationale**: Multi-project Session Groups require flexibility. Each session may target different project types (TypeScript, Python, etc.) requiring different configurations.

---

## Q17: Template System

### Question

How should prompt/configuration templates be defined and used?

### Use Cases

1. **Prompt Templates**: Reusable prompts with variables
2. **Config Templates**: Pre-configured CLAUDE.md, commands
3. **Workflow Templates**: Multi-session task definitions

### Template Location

Templates are stored in the XDG-compliant config directory:

```
~/.config/claude-code-agent/
├── config.json                          # Global agent config
└── templates/
    ├── prompts/
    │   ├── code-review.md
    │   └── implement-feature.md
    ├── configs/
    │   ├── strict-typescript/
    │   │   ├── CLAUDE.md
    │   │   └── commands/
    │   └── documentation/
    └── workflows/
        └── feature-implementation.yaml
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

### Template Resolution

```typescript
// Template resolution priority
1. Inline definition in CLI command
2. Session-specific template reference
3. Session Group default template
4. Global template from ~/.config/claude-code-agent/templates/
```

### Variable Interpolation

Using double-brace syntax `{{variable}}`:

```markdown
---
name: cross-project-task
variables:
  - name: project_path
    required: true
  - name: task_type
    default: "implementation"
---

Working on project: {{project_path}}

Task type: {{task_type}}

Follow the project's CLAUDE.md conventions.
```

### Decision

- [x] Markdown + frontmatter (like Claude commands)
- [ ] Mustache/Handlebars
- [ ] TypeScript functions
- [ ] YAML with variables
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Consistent with Claude Code's existing command format. Simple `{{variable}}` interpolation sufficient for most use cases.

---

## Q18: Session Group Lifecycle

### Question

How should Session Groups be created, managed, and archived?

### Lifecycle States

```
created -> active -> completed
                  -> archived
                  -> failed
```

### Commands (Updated for Multi-Project)

```bash
# Create session group (not project-bound)
claude-code-agent group create "cross-project-refactor" \
  --name "Cross-Project Auth Refactor" \
  --description "Refactor auth across all services"

# List session groups
claude-code-agent group list [--status active|completed|archived]

# Show session group details (includes all sessions across projects)
claude-code-agent group show <group-id>

# Add session to group (specify project per session)
claude-code-agent session add <group-id> \
  --project /path/to/project-a \
  --prompt "Implement auth module" \
  --template typescript-strict

# Add dependent session
claude-code-agent session add <group-id> \
  --project /path/to/project-b \
  --prompt "Update shared library" \
  --depends-on <session-id>

# Run session group (concurrent execution)
claude-code-agent group run <group-id> \
  --concurrent 3 \
  --respect-dependencies

# Watch unified progress across all sessions
claude-code-agent group watch <group-id>

# Archive session group
claude-code-agent group archive <group-id>

# Delete session group
claude-code-agent group delete <group-id> [--force]
```

### Lifecycle States

```
created -> running -> completed
                   -> paused (user intervention)
                   -> failed (error threshold reached)
           -> archived
           -> deleted
```

### Decision

Confirm lifecycle commands:
- [x] Approve proposed commands (updated for multi-project)
- [ ] Modifications needed: _______________

**Decided**: 2026-01-04
**Rationale**: Commands updated to support multi-project Session Groups with dependency management and concurrent execution.

---

## Q19: Claude Code Invocation Strategy

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

### Per-Session Isolation

Each session within a group gets its own claude-config directory:

```
session-groups/{group-id}/
└── sessions/
    ├── 001-uuid-session1/
    │   └── claude-config/    <-- CLAUDE_CONFIG_DIR for session 1
    ├── 002-uuid-session2/
    │   └── claude-config/    <-- CLAUDE_CONFIG_DIR for session 2
    └── 003-uuid-session3/
        └── claude-config/    <-- CLAUDE_CONFIG_DIR for session 3
```

### Worker Process Model

```typescript
// Each session runs in isolation
async function runSession(session: Session): Promise<void> {
  const env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: session.claudeConfigPath,
  };

  const proc = Bun.spawn(
    ['claude', '-p', '--output-format', 'stream-json', session.prompt],
    {
      env,
      cwd: session.projectPath,  // Run from target project
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );

  // Stream stdout for real-time progress
  for await (const chunk of proc.stdout) {
    session.handleOutput(chunk);
  }
}
```

### Decision

- [x] CLAUDE_CONFIG_DIR (full isolation)
- [ ] --mcp-config + --append-system-prompt (partial)
- [ ] Hybrid (configurable per session group)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Full isolation via CLAUDE_CONFIG_DIR enables concurrent execution of multiple sessions across different projects without interference.

---

## Q20: Session Transcript Storage

### Question

Where should session transcripts be stored for a Session Group?

### Options

| Option | Description | Trade-off |
|--------|-------------|-----------|
| **Copy from ~/.claude** | Copy JSONL after session | Duplication, but isolated |
| **Symlink** | Link to original files | No duplication, depends on ~/.claude |
| **Custom session path** | Use --session-id to control | May not work with CLAUDE_CONFIG_DIR |
| **Read-only reference** | Just store session ID, read from ~/.claude | Minimal storage, coupled |

### Transcript Flow

With `CLAUDE_CONFIG_DIR` isolation, Claude Code writes transcripts to:
```
{CLAUDE_CONFIG_DIR}/projects/{project-hash}/{session-id}.jsonl
```

Agent copies transcripts to its own structure:
```
~/.local/claude-code-agent/session-groups/{group-id}/sessions/{session-id}/
├── meta.json              # Session metadata
├── claude-config/         # CLAUDE_CONFIG_DIR for this session
│   └── projects/          # Claude Code writes here
│       └── {hash}/
│           └── {id}.jsonl
└── transcript.jsonl       # Copied/symlinked for easy access
```

### Implementation

```typescript
class TranscriptManager {
  // Watch for new transcript data
  async watchSession(session: Session): Promise<void> {
    const transcriptPath = path.join(
      session.claudeConfigPath,
      'projects',
      session.projectHash,
      `${session.claudeSessionId}.jsonl`
    );

    // Copy new lines to our normalized location
    const watcher = fs.watch(transcriptPath);
    for await (const event of watcher) {
      if (event.eventType === 'change') {
        await this.copyNewLines(transcriptPath, session.transcriptPath);
      }
    }
  }
}
```

### Decision

- [x] Copy transcripts (via fs.watch sync)
- [ ] Symlink to ~/.claude
- [ ] Read-only reference (store ID only)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Copying ensures full isolation and allows Session Groups to be archived/moved independently. fs.watch provides real-time sync.

---

## Q21: Concurrent Session Management

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
- Dependency graph management (some sessions depend on others)

### Concurrent Execution Design

```typescript
interface ConcurrencyConfig {
  maxConcurrent: number;           // default: 3
  respectDependencies: boolean;    // default: true
  pauseOnError: boolean;           // default: true
  errorThreshold: number;          // default: 2 (pause after N failures)
}

class SessionGroupRunner {
  private runningWorkers = new Map<string, Worker>();
  private pendingQueue: Session[] = [];

  async run(group: SessionGroup, config: ConcurrencyConfig): Promise<void> {
    // Build dependency graph
    const graph = this.buildDependencyGraph(group.sessions);

    while (this.hasRunnableSessions(graph)) {
      // Get sessions with no pending dependencies
      const ready = this.getReadySessions(graph);

      // Fill worker slots up to maxConcurrent
      while (
        this.runningWorkers.size < config.maxConcurrent &&
        ready.length > 0
      ) {
        const session = ready.shift()!;
        this.startWorker(session);
      }

      // Wait for any worker to complete
      await this.waitForCompletion();
    }
  }
}
```

### Progress Aggregation

```typescript
interface GroupProgress {
  totalSessions: number;
  completed: number;
  running: number;
  pending: number;
  failed: number;

  // Per-session details
  sessions: SessionProgress[];

  // Aggregated metrics
  totalCost: number;
  totalTokens: { input: number; output: number };
  elapsedTime: number;
}
```

### Decision

- [ ] Sequential only
- [ ] Parallel allowed (unlimited)
- [x] Configurable limit (default: 3)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Default of 3 concurrent sessions balances throughput with rate limit safety. Dependency graph ensures correct execution order for dependent sessions.

---

## Summary of Decisions

| Question | Topic | Decision | Status |
|----------|-------|----------|--------|
| Q13 | Auth Token Override | CLI flag/env var (agent doesn't manage tokens) | **Decided** |
| Q14 | Agent Directory Structure | XDG compliant (~/.config, ~/.local) | **Decided** |
| Q15 | Session Group Identification | Timestamp + Slug, multi-project support | **Decided** |
| Q16 | Generated Config Files | Configurable per session | **Decided** |
| Q17 | Template System Format | Markdown + frontmatter | **Decided** |
| Q18 | Session Group Lifecycle | Approved with multi-project commands | **Decided** |
| Q19 | Claude Code Invocation Strategy | CLAUDE_CONFIG_DIR (full isolation) | **Decided** |
| Q20 | Session Transcript Storage | Copy transcripts via fs.watch | **Decided** |
| Q21 | Concurrent Session Management | Configurable limit (default: 3) | **Decided** |

**All 9 decisions completed**: 2026-01-04

---

## Architecture Diagram

```
+------------------------------------------------------------------+
|                      claude-code-agent                            |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +-------------------+  +----------------+ |
|  | Session Group     |  | Template          |  | Progress       | |
|  | Manager           |  | Engine            |  | Aggregator     | |
|  +-------------------+  +-------------------+  +----------------+ |
|          |                      |                     ^           |
|          v                      v                     |           |
|  +----------------------------------------------------+-------+   |
|  |              Config Generator (per session)                |   |
|  |  (.claude.json, CLAUDE.md, settings.json, MCP config)      |   |
|  +------------------------------------------------------------+   |
|                              |                                    |
|  +------------------------------------------------------------+   |
|  |           Session Group Runner (Concurrent)                |   |
|  |  +-------------+  +-------------+  +-------------+         |   |
|  |  | Worker 1    |  | Worker 2    |  | Worker 3    |         |   |
|  |  | project-a   |  | project-b   |  | project-a   |         |   |
|  |  +-------------+  +-------------+  +-------------+         |   |
|  +------------------------------------------------------------+   |
|                                                                   |
+-------------------------------------------------------------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+---------------+    +---------------+    +---------------+
| Session 1     |    | Session 2     |    | Session 3     |
| project-a     |    | project-b     |    | project-a     |
| claude-config |    | claude-config |    | claude-config |
+---------------+    +---------------+    +---------------+
        |                  |                      |
        v                  v                      v
+---------------+    +---------------+    +---------------+
| Claude Code   |    | Claude Code   |    | Claude Code   |
| (subprocess)  |    | (subprocess)  |    | (subprocess)  |
| cwd=project-a |    | cwd=project-b |    | cwd=project-a |
+---------------+    +---------------+    +---------------+
        |                  |                      |
        v                  v                      v
+---------------------------------------------------------------+
|            Transcript Watcher (fs.watch per session)          |
|            Copies to session-groups/.../sessions/             |
+---------------------------------------------------------------+
                               |
                               v
+---------------------------------------------------------------+
|                  Storage Structure                            |
+---------------------------------------------------------------+
|                                                               |
| ~/.config/claude-code-agent/  (immutable)                     |
| ├── config.json               # Global config                 |
| └── templates/                # Prompt/config templates       |
|                                                               |
| ~/.local/claude-code-agent/   (mutable)                       |
| └── session-groups/                                           |
|     └── 20260104-143022-cross-project-refactor/               |
|         ├── meta.json         # Group metadata + sessions     |
|         └── sessions/                                         |
|             ├── 001-uuid/                                     |
|             │   ├── meta.json     # project: /path/project-a  |
|             │   ├── claude-config/ # CLAUDE_CONFIG_DIR        |
|             │   └── transcript.jsonl                          |
|             ├── 002-uuid/                                     |
|             │   ├── meta.json     # project: /path/project-b  |
|             │   ├── claude-config/                            |
|             │   └── transcript.jsonl                          |
|             └── 003-uuid/                                     |
|                 ├── meta.json     # depends-on: 002-uuid      |
|                 ├── claude-config/                            |
|                 └── transcript.jsonl                          |
|                                                               |
+---------------------------------------------------------------+
```
