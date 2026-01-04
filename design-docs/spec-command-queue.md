# Command Queue Specification

This document describes the Command Queue feature for sequential prompt execution. Each command can optionally choose to continue in the current session or start a new session.

---

## 1. Overview

A **Command Queue** enables:
- Queuing multiple prompts for sequential execution
- **Flexible session mode**: Continue in same session (`--resume`) or start new session per command
- Web UI-based management for editing, deleting, and reordering commands
- Pause/resume/stop controls

> **UI Priority**: Web UI is the primary interactive interface for queue management. TUI is planned for future implementation.

### 1.1 Relationship to Other Features

| Feature | Scope | Sessions | Execution |
|---------|-------|----------|-----------|
| **Session** | Single prompt | Single session | One-shot |
| **Session Group** | Multiple prompts | Multiple parallel sessions | Concurrent |
| **Command Queue** | Multiple prompts | Same or new session per command | Sequential |

### 1.2 Session Mode

Each command in a queue can specify a **session mode**:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `continue` (default) | Continue in current session using `--resume` | Related tasks, maintain context |
| `new` | Start a fresh session (no `--resume`) | Independent tasks, clean slate |

**Example**: A queue with mixed session modes:
```
Command 1: "Analyze auth module"       [continue] -> Starts session A
Command 2: "Refactor based on analysis" [continue] -> Continues session A
Command 3: "Set up CI/CD pipeline"      [new]      -> Starts session B
Command 4: "Add deployment docs"        [continue] -> Continues session B
```

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
  sessionMode: SessionMode;             // 'continue' or 'new'
  status: CommandStatus;
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  cost?: number;
  tokens?: { input: number; output: number };
  error?: string;
  claudeSessionId?: string;             // Session ID used for this command
}

type SessionMode = 'continue' | 'new';

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

### 4.1 Session Mode Logic

The execution behavior depends on the command's `sessionMode`:

```typescript
function executeCommand(queue: CommandQueue, command: QueueCommand) {
  const isFirstCommand = command.index === 0;
  const shouldStartNewSession =
    isFirstCommand || command.sessionMode === 'new';

  if (shouldStartNewSession) {
    // Start new session
    spawn('claude', ['-p', '--output-format', 'stream-json', command.prompt]);
    // Capture new sessionId and update queue.claudeSessionId
  } else {
    // Continue existing session
    spawn('claude', ['-p', '--output-format', 'stream-json', '--resume', command.prompt]);
  }

  // Store sessionId on command for tracking
  command.claudeSessionId = queue.claudeSessionId;
}
```

### 4.2 First Command (or sessionMode='new')

```bash
claude -p --output-format stream-json "{prompt}"
```

Starts new session, captures `sessionId` from output, updates `queue.claudeSessionId`.

### 4.3 Subsequent Commands (sessionMode='continue')

```bash
claude -p --output-format stream-json --resume "{prompt}"
```

Continues existing session conversation.

### 4.4 Pause

```typescript
// SIGTERM to Claude Code process
process.kill(claudeProcessPid, 'SIGTERM');
queue.status = 'paused';
```

### 4.5 Resume

```typescript
// Resume with --resume flag (respects current command's sessionMode)
spawn('claude', ['-p', '--output-format', 'stream-json', '--resume', prompt]);
queue.status = 'running';
```

### 4.6 Stop

```typescript
// SIGTERM + mark remaining as skipped
process.kill(claudeProcessPid, 'SIGTERM');
queue.commands.forEach(cmd => {
  if (cmd.status === 'pending') cmd.status = 'skipped';
});
queue.status = 'stopped';
```

---

## 5. Queue Management Interface

### 5.1 Web UI (Primary)

The web-based queue management interface will be implemented in the Browser Viewer (SvelteKit). Features include:
- Queue list with status indicators
- Queue detail view with command list
- Inline editing of commands
- Drag-and-drop reordering
- Real-time status updates via WebSocket

### 5.2 TUI Interface (Future/Low Priority)

> **Note**: TUI features below are planned for future implementation. Use Web UI for queue management.

#### 5.2.1 Queue List View

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

#### 5.2.2 Queue Detail View

```
+------------------------------------------------------------------------+
| Queue: Refactor Auth (20260104-143022)                                 |
| Project: /g/gits/my-project                                            |
| Status: running | Cost: $0.15 | Duration: 5m 32s                       |
+------------------------------------------------------------------------+
| #  | Status | Mode | Command                                  | Cost  |
|----|--------|------|------------------------------------------|-------|
| 1  | [x]    | cont | Analyze current auth implementation      | $0.05 |
| 2  | [*]    | cont | Refactor auth module to use JWT          | $0.10 |
| 3  | [ ]    | new  | Set up CI/CD pipeline                    | -     |
| 4  | [ ]    | cont | Add deployment documentation             | -     |
+------------------------------------------------------------------------+
| [a] Add  [e] Edit  [d] Delete  [m] Move  [t] Toggle Mode  [r] Run      |
+------------------------------------------------------------------------+
```

**Mode column**: `cont` = continue (same session), `new` = new session

#### 5.2.3 Keyboard Shortcuts (TUI)

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
| Detail | `t` | Toggle session mode (continue/new) |
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

# Open Web UI (primary)
claude-code-agent queue ui [<queue-id>]

# Open TUI (future)
# claude-code-agent queue tui [<queue-id>]
```

### 6.2 Command Management

```bash
# Add command (default: --session-mode continue)
claude-code-agent queue command add <queue-id> \
  --prompt "The prompt text" \
  [--session-mode continue|new] \
  [--position <index>]

# Edit command
claude-code-agent queue command edit <queue-id> <index> \
  [--prompt "Updated prompt"] \
  [--session-mode continue|new]

# Toggle session mode
claude-code-agent queue command toggle-mode <queue-id> <index>

# Remove command
claude-code-agent queue command remove <queue-id> <index>

# Move command
claude-code-agent queue command move <queue-id> <from> <to>
```

**Session Mode Options**:
- `continue` (default): Continue in current session using `--resume`
- `new`: Start a fresh session

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
  | { type: 'command_started'; queueId: string; commandId: string; prompt: string; sessionMode: SessionMode; isNewSession: boolean }
  | { type: 'command_completed'; queueId: string; commandId: string; cost: number; claudeSessionId: string }
  | { type: 'command_failed'; queueId: string; commandId: string; error: string }
  | { type: 'command_added'; queueId: string; commandId: string; sessionMode: SessionMode }
  | { type: 'command_updated'; queueId: string; commandId: string }
  | { type: 'command_removed'; queueId: string; commandId: string }
  | { type: 'command_reordered'; queueId: string; from: number; to: number }
  | { type: 'command_mode_changed'; queueId: string; commandId: string; sessionMode: SessionMode };
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

// Add commands (default sessionMode: 'continue')
await queue.addCommand({ prompt: 'Analyze current implementation' });
await queue.addCommand({ prompt: 'Refactor the module' });
await queue.addCommand({ prompt: 'Set up CI/CD', sessionMode: 'new' });  // Start new session

// Edit/remove (only when idle or paused)
await queue.updateCommand(1, { prompt: 'Updated prompt' });
await queue.updateCommand(2, { sessionMode: 'new' });  // Change to new session
await queue.toggleSessionMode(2);  // Toggle between 'continue' and 'new'
await queue.removeCommand(3);
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
