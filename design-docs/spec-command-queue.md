# Command Queue Specification

This document describes the Command Queue feature for sequential prompt execution within a single Claude Code session.

---

## 1. Overview

A **Command Queue** enables:
- Queuing multiple prompts for sequential execution
- Execution within a single continuing Claude Code session (using `--resume`)
- TUI-based management for editing, deleting, and reordering commands
- Pause/resume/stop controls

### 1.1 Relationship to Other Features

| Feature | Scope | Sessions | Execution |
|---------|-------|----------|-----------|
| **Session** | Single prompt | Single session | One-shot |
| **Session Group** | Multiple prompts | Multiple parallel sessions | Concurrent |
| **Command Queue** | Multiple prompts | Single continuing session | Sequential |

---

## 2. Data Model

### 2.1 Storage Location

```
~/.local/claude-code-agent/metadata/queues/{queue-id}.json
```

### 2.2 Queue Structure

```typescript
interface CommandQueue {
  id: string;                          // Format: YYYYMMDD-HHMMSS-{slug}
  name: string;
  description?: string;
  projectPath: string;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;

  // Execution state
  claudeSessionId?: string;            // Set after first execution
  currentCommandIndex: number;

  // Commands
  commands: QueueCommand[];

  // Configuration
  config: QueueConfig;

  // Statistics
  stats: QueueStats;
}

type QueueStatus =
  | 'idle'         // Created, no execution yet
  | 'running'      // Actively executing a command
  | 'paused'       // Paused by user (SIGTERM sent)
  | 'stopped'      // Stopped before completion
  | 'completed'    // All commands executed
  | 'failed';      // A command failed

interface QueueCommand {
  id: string;
  index: number;
  prompt: string;
  status: CommandStatus;
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  cost?: number;
  tokens?: { input: number; output: number };
  error?: string;
}

type CommandStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

interface QueueConfig {
  stopOnError: boolean;                // default: true
  model?: string;
}

interface QueueStats {
  totalCommands: number;
  completedCommands: number;
  failedCommands: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  totalDuration: number;
}
```

---

## 3. Lifecycle States

### 3.1 State Diagram

```
        +-------+
        | idle  |
        +---+---+
            |
       run()|
            v
       +---------+
  +--->| running |<----+
  |    +----+----+     |
  |         |          |
  |   pause |  command | resume()
  |         |  done    |
  |         v          |
  |    +--------+      |
  |    | paused |------+
  |    +---+----+
  |        |
  |  stop()|
  |        v
  |   +---------+
  +-->| stopped |
      +---------+
            |
            v (or from running)
      +-----------+
      | completed |
      +-----------+
```

### 3.2 State Transitions

| From | To | Trigger |
|------|------|---------|
| idle | running | `queue run` |
| running | running | Command completes, start next |
| running | paused | `queue pause` (SIGTERM) |
| running | stopped | `queue stop` |
| running | completed | Last command completes |
| running | failed | Command fails (stopOnError=true) |
| paused | running | `queue resume` |
| paused | stopped | `queue stop` |

---

## 4. Execution Flow

### 4.1 First Command

```bash
claude -p --output-format stream-json "{first_prompt}"
```

Starts new session, captures `sessionId` from output.

### 4.2 Subsequent Commands

```bash
claude -p --output-format stream-json --resume "{next_prompt}"
```

Continues existing session conversation.

### 4.3 Pause

```typescript
// SIGTERM to Claude Code process
process.kill(claudeProcessPid, 'SIGTERM');
queue.status = 'paused';
```

### 4.4 Resume

```typescript
// Resume with --resume flag
spawn('claude', ['-p', '--output-format', 'stream-json', '--resume', prompt]);
queue.status = 'running';
```

### 4.5 Stop

```typescript
// SIGTERM + mark remaining as skipped
process.kill(claudeProcessPid, 'SIGTERM');
queue.commands.forEach(cmd => {
  if (cmd.status === 'pending') cmd.status = 'skipped';
});
queue.status = 'stopped';
```

---

## 5. TUI Interface

### 5.1 Queue List View

```
+----------------------------------------------------------------+
| Command Queues                                                  |
+----------------------------------------------------------------+
| ID              | Name          | Status  | Progress           |
|-----------------|---------------|---------|-------------------|
| > 20260104-...  | Refactor Auth | running | 2/5 commands      |
|   20260103-...  | Add Tests     | paused  | 3/8 commands      |
|   20260102-...  | Bug Fixes     | done    | 5/5 commands      |
+----------------------------------------------------------------+
| [Enter] View  [n] New  [r] Run  [p] Pause  [s] Stop  [q] Quit  |
+----------------------------------------------------------------+
```

### 5.2 Queue Detail View

```
+----------------------------------------------------------------+
| Queue: Refactor Auth (20260104-143022)                         |
| Project: /g/gits/my-project                                    |
| Status: running | Cost: $0.15 | Duration: 5m 32s               |
+----------------------------------------------------------------+
| #  | Status | Command                                  | Cost  |
|----|--------|------------------------------------------|-------|
| 1  | [x]    | Analyze current auth implementation      | $0.05 |
| 2  | [*]    | Refactor auth module to use JWT          | $0.10 |
| 3  | [ ]    | Add unit tests for new auth module       | -     |
| 4  | [ ]    | Update API documentation                 | -     |
+----------------------------------------------------------------+
| [a] Add  [e] Edit  [d] Delete  [m] Move  [r] Run  [p] Pause    |
+----------------------------------------------------------------+
```

### 5.3 Keyboard Shortcuts

| Context | Key | Action |
|---------|-----|--------|
| List | `j/k` | Navigate |
| List | `Enter` | View queue |
| List | `n` | Create new queue |
| List | `r` | Run queue |
| List | `p` | Pause queue |
| List | `s` | Stop queue |
| Detail | `a` | Add command |
| Detail | `e` | Edit command |
| Detail | `d` | Delete command |
| Detail | `m` | Move command |
| All | `q` | Back/quit |

---

## 6. CLI Commands

### 6.1 Queue Management

```bash
# Create queue
claude-code-agent queue create <slug> \
  --project /path/to/project \
  --name "Human Readable Name"

# List queues
claude-code-agent queue list [--status idle|running|paused]

# Show queue details
claude-code-agent queue show <queue-id>

# Run queue
claude-code-agent queue run <queue-id>

# Pause/resume/stop
claude-code-agent queue pause <queue-id>
claude-code-agent queue resume <queue-id>
claude-code-agent queue stop <queue-id>

# Delete queue
claude-code-agent queue delete <queue-id> [--force]

# Open TUI
claude-code-agent queue tui [<queue-id>]
```

### 6.2 Command Management

```bash
# Add command
claude-code-agent queue command add <queue-id> \
  --prompt "The prompt text" \
  [--position <index>]

# Edit command
claude-code-agent queue command edit <queue-id> <index> \
  --prompt "Updated prompt"

# Remove command
claude-code-agent queue command remove <queue-id> <index>

# Move command
claude-code-agent queue command move <queue-id> <from> <to>
```

---

## 7. Events

```typescript
type QueueEvent =
  // Lifecycle
  | { type: 'queue_created'; queueId: string; name: string }
  | { type: 'queue_started'; queueId: string; totalCommands: number }
  | { type: 'queue_paused'; queueId: string; currentCommand: number }
  | { type: 'queue_resumed'; queueId: string; fromCommand: number }
  | { type: 'queue_stopped'; queueId: string; completedCommands: number }
  | { type: 'queue_completed'; queueId: string; stats: QueueStats }
  | { type: 'queue_failed'; queueId: string; error: string }

  // Commands
  | { type: 'command_started'; queueId: string; commandId: string; prompt: string }
  | { type: 'command_completed'; queueId: string; commandId: string; cost: number }
  | { type: 'command_failed'; queueId: string; commandId: string; error: string }
  | { type: 'command_added'; queueId: string; commandId: string }
  | { type: 'command_updated'; queueId: string; commandId: string }
  | { type: 'command_removed'; queueId: string; commandId: string }
  | { type: 'command_reordered'; queueId: string; from: number; to: number };
```

---

## 8. SDK API

```typescript
// Create queue
const queue = await agent.createQueue({
  name: 'Refactor Auth',
  projectPath: '/path/to/project',
  config: { stopOnError: true },
});

// Add commands
await queue.addCommand({ prompt: 'Analyze current implementation' });
await queue.addCommand({ prompt: 'Refactor the module' });

// Edit/remove (only when idle or paused)
await queue.updateCommand(1, { prompt: 'Updated prompt' });
await queue.removeCommand(2);
await queue.reorderCommand(0, 2);

// Execution control
await queue.run({
  onCommandStart: (cmd) => console.log(`Starting: ${cmd.prompt}`),
  onCommandComplete: (cmd) => console.log(`Done: ${cmd.prompt}`),
});

await queue.pause();
await queue.resume();
await queue.stop();

// Query
const queues = await agent.queues.list({ status: 'running' });
```

---

## 9. Error Handling

### 9.1 Command Failure

| Config | Behavior |
|--------|----------|
| `stopOnError: true` | Queue fails, remaining commands not executed |
| `stopOnError: false` | Skip failed command, continue with next |

### 9.2 Crash Recovery

1. On startup, scan for queues with `status: 'running'`
2. Check if Claude Code process is alive
3. If not, mark queue as `paused`
4. User can resume manually
