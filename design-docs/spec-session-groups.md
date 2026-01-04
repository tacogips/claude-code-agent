# Session Groups Specification

This document describes the Session Group concept, architecture, and lifecycle.

---

## 1. Session Group Concept

A **Session Group** is:
- A collection of related sessions working toward a single goal
- **NOT scoped to a single project** - can span multiple projects
- Each session within the group can target a different project
- Supports concurrent execution across projects
- Has its own isolated Claude Code configuration per session

### 1.1 Multi-Project Example

```
Session Group (e.g., "cross-project-refactor")
  +-- Session 1: project-a, "implement auth module"
  +-- Session 2: project-b, "update shared library"
  +-- Session 3: project-a, "integrate shared lib"      # concurrent with Session 2
  +-- Session 4: project-c, "update documentation"
```

### 1.2 Identification

Format: `YYYYMMDD-HHMMSS-{slug}`
- Example: `20260104-143022-cross-project-refactor`
- Human readable, unique, sortable
- User-provided name/description stored in meta.json

---

## 2. Directory Structure

```
~/.local/claude-code-agent/
+-- session-groups/
    +-- 20260104-143022-cross-project-refactor/
        +-- meta.json
        +-- sessions/
        |   +-- 001-uuid-session1/
        |   |   +-- meta.json           # project: /path/to/project-a
        |   |   +-- claude-config/      # CLAUDE_CONFIG_DIR for this session
        |   |   +-- transcript.jsonl
        |   +-- 002-uuid-session2/
        |   |   +-- meta.json           # project: /path/to/project-b
        |   |   +-- claude-config/
        |   |   +-- transcript.jsonl
        |   +-- 003-uuid-session3/
        |       +-- meta.json           # depends-on: 002-uuid-session2
        |       +-- claude-config/
        |       +-- transcript.jsonl
        +-- shared-config/              # Optional: shared across sessions
            +-- CLAUDE.md
```

---

## 3. Session Group Metadata

### 3.1 Group meta.json

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

### 3.2 Session meta.json

```json
{
  "id": "001-uuid-session1",
  "projectPath": "/g/gits/project-a",
  "prompt": "Implement auth module",
  "template": "typescript-strict",
  "status": "completed",
  "claudeSessionId": "uuid-from-claude-code",
  "createdAt": "2026-01-04T14:31:00Z",
  "completedAt": "2026-01-04T14:45:00Z",
  "cost": 0.25,
  "tokens": { "input": 10000, "output": 2500 }
}
```

---

## 4. Lifecycle States

```
created -> running -> completed
                   -> paused (user intervention)
                   -> failed (error threshold reached)
           -> archived
           -> deleted
```

### 4.1 State Transitions

| From | To | Trigger |
|------|------|---------|
| created | running | `group run` command |
| running | completed | All sessions complete successfully |
| running | paused | `group pause` command or budget exceeded |
| running | failed | Error threshold reached |
| paused | running | `group resume` command |
| completed | archived | `group archive` command |
| * | deleted | `group delete` command |

---

## 5. Concurrent Execution

### 5.1 Worker Model

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

### 5.2 Concurrency Configuration

```typescript
interface ConcurrencyConfig {
  maxConcurrent: number;           // default: 3
  respectDependencies: boolean;    // default: true
  pauseOnError: boolean;           // default: true
  errorThreshold: number;          // default: 2 (pause after N failures)
}
```

### 5.3 Dependency Graph Execution

```typescript
class SessionGroupRunner {
  async run(group: SessionGroup, config: ConcurrencyConfig): Promise<void> {
    const graph = this.buildDependencyGraph(group.sessions);

    while (this.hasRunnableSessions(graph)) {
      // Get sessions with no pending dependencies
      const ready = this.getReadySessions(graph);

      // Fill worker slots up to maxConcurrent
      while (this.runningWorkers.size < config.maxConcurrent && ready.length > 0) {
        const session = ready.shift()!;
        this.startWorker(session);
      }

      await this.waitForCompletion();
    }
  }
}
```

---

## 6. Pause and Resume

### 6.1 CLI Commands

```bash
# Pause running session group
claude-code-agent group pause <group-id>

# Resume paused group
claude-code-agent group resume <group-id>

# Pause single session
claude-code-agent session pause <session-id>

# Resume single session
claude-code-agent session resume <session-id>
```

### 6.2 Implementation Behavior

| Action | Effect |
|--------|--------|
| Pause Session | Send SIGTERM to Claude Code process, save state |
| Resume Session | Restart Claude Code with `--resume` flag |
| Pause Group | Pause all running, block pending |
| Resume Group | Resume paused sessions respecting concurrency limit |

---

## 7. Budget Enforcement

### 7.1 Configuration

```typescript
interface BudgetConfig {
  maxBudgetUsd: number;
  onBudgetExceeded: 'stop' | 'warn' | 'pause';  // default: 'pause'
  warningThreshold: number;  // default: 0.8 (80% of budget)
}
```

### 7.2 Events

```typescript
| { type: 'budget_warning'; sessionId: string; usage: number; limit: number }
| { type: 'budget_exceeded'; sessionId: string; action: 'stopped' | 'paused' | 'continued' }
```

---

## 8. Configuration Generation

### 8.1 Generated Files

| File | Purpose | Generate? |
|------|---------|-----------|
| `CLAUDE.md` | Session-specific instructions | Yes |
| `settings.json` | Permission settings | Optional |
| `commands/*.md` | Custom slash commands | Optional |
| `.mcp.json` | MCP server configuration | Optional |

### 8.2 Per-Session Strategy

```typescript
interface SessionConfig {
  generateClaudeMd: boolean;       // default: true
  generateSettings: boolean;       // default: false
  generateCommands: boolean;       // default: false
  generateMcpConfig: boolean;      // default: false
  claudeMdTemplate?: string;       // template name or path
  settingsOverride?: object;       // partial settings.json
  inheritFromGroup: boolean;       // default: true
}
```

### 8.3 Invocation via CLAUDE_CONFIG_DIR

```typescript
async function runSession(session: Session): Promise<void> {
  const env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: session.claudeConfigPath,
  };

  const proc = Bun.spawn(
    ['claude', '-p', '--output-format', 'stream-json', session.prompt],
    {
      env,
      cwd: session.projectPath,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );

  for await (const chunk of proc.stdout) {
    session.handleOutput(chunk);
  }
}
```

---

## 9. Templates

### 9.1 Template Location

```
~/.config/claude-code-agent/templates/
+-- prompts/
|   +-- code-review.md
|   +-- implement-feature.md
+-- configs/
|   +-- strict-typescript/
|   |   +-- CLAUDE.md
|   |   +-- commands/
|   +-- documentation/
+-- workflows/
    +-- feature-implementation.yaml
```

### 9.2 Template Format (Markdown + Frontmatter)

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

### 9.3 Template Resolution Priority

1. Inline definition in CLI command
2. Session-specific template reference
3. Session Group default template
4. Global template from `~/.config/claude-code-agent/templates/`

---

## 10. CLI Commands

### 10.1 Group Commands

```bash
# Create session group
claude-code-agent group create "cross-project-refactor" \
  --name "Cross-Project Auth Refactor" \
  --description "Refactor auth across services"

# List session groups
claude-code-agent group list [--status active|completed|archived]

# Show session group details
claude-code-agent group show <group-id>

# Run session group
claude-code-agent group run <group-id> \
  --concurrent 3 \
  --respect-dependencies

# Watch unified progress
claude-code-agent group watch <group-id>

# Archive/delete
claude-code-agent group archive <group-id>
claude-code-agent group delete <group-id> [--force]
```

### 10.2 Session Commands

```bash
# Add session to group
claude-code-agent session add <group-id> \
  --project /path/to/project-a \
  --prompt "Implement auth module" \
  --template typescript-strict

# Add dependent session
claude-code-agent session add <group-id> \
  --project /path/to/project-b \
  --prompt "Update shared library" \
  --depends-on <session-id>
```

---

## 11. Progress Aggregation

```typescript
interface GroupProgress {
  totalSessions: number;
  completed: number;
  running: number;
  pending: number;
  failed: number;

  sessions: SessionProgress[];

  totalCost: number;
  totalTokens: { input: number; output: number };
  elapsedTime: number;
}

interface SessionProgress {
  id: string;
  projectPath: string;
  status: string;
  currentTool?: string;
  cost: number;
  tokens: { input: number; output: number };
}
```
