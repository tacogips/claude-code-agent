# Implementation Plans

This directory contains implementation plans that translate design documents into actionable implementation specifications.

## Purpose

Implementation plans bridge design documents (what to build) and actual code (how to build). They provide:
- Clear deliverables without code
- Interface and function specifications
- Dependency mapping for concurrent execution
- Progress tracking across sessions

## Directory Structure

```
impl-plans/
├── README.md              # This file
├── PROGRESS.json          # Task status index (CRITICAL for impl-exec-auto)
├── active/                # Currently active implementation plans
│   └── <feature>.md       # One file per feature being implemented
├── completed/             # Completed implementation plans (archive)
│   └── <feature>.md       # Completed plans for reference
└── templates/             # Plan templates
    └── plan-template.md   # Standard plan template
```

## PROGRESS.json (Task Status Index)

**CRITICAL**: `PROGRESS.json` is the central task status index used by `impl-exec-auto`.

Reading all plan files at once causes context overflow (>200K tokens). Instead:
1. `impl-exec-auto` reads only `PROGRESS.json` (~2K tokens)
2. Identifies executable tasks from this index
3. Reads specific plan files only when executing tasks
4. Updates BOTH the plan file AND `PROGRESS.json` after each task

### Structure

```json
{
  "lastUpdated": "2026-01-06T16:00:00Z",
  "phases": {
    "1": { "status": "COMPLETED" },
    "2": { "status": "READY" }
  },
  "plans": {
    "plan-name": {
      "phase": 2,
      "status": "Ready",
      "tasks": {
        "TASK-001": { "status": "Not Started", "parallelizable": true, "deps": [] },
        "TASK-002": { "status": "Completed", "parallelizable": true, "deps": [] }
      }
    }
  }
}
```

### Keeping PROGRESS.json in Sync

After ANY task status change:
1. Edit the task status in `PROGRESS.json`
2. Update `lastUpdated` timestamp
3. Edit the task status in the plan file

## File Size Limits

**IMPORTANT**: Implementation plan files must stay under 400 lines to prevent OOM errors.

| Metric | Limit |
|--------|-------|
| Line count | MAX 400 lines |
| Modules per plan | MAX 8 modules |
| Tasks per plan | MAX 10 tasks |

Large features are split into multiple related plans with cross-references.

## Active Plans

### Session Groups
| Plan | Status | Scope |
|------|--------|-------|
| [session-groups-types.md](active/session-groups-types.md) | Ready | Types, interfaces |
| [session-groups-runner.md](active/session-groups-runner.md) | Ready | Manager, runner, SDK |

### Command Queue
| Plan | Status | Scope |
|------|--------|-------|
| [command-queue-types.md](active/command-queue-types.md) | Ready | Types, events |
| [command-queue-core.md](active/command-queue-core.md) | Ready | Manager, runner, repository, SDK |

### Markdown Parser
| Plan | Status | Scope |
|------|--------|-------|
| [markdown-parser-types.md](active/markdown-parser-types.md) | Ready | Types, detectors |
| [markdown-parser-core.md](active/markdown-parser-core.md) | Ready | Core parser, exports |

### Real-time Monitoring
| Plan | Status | Scope |
|------|--------|-------|
| [realtime-watcher.md](active/realtime-watcher.md) | Ready | File watcher, JSONL parser |
| [realtime-events.md](active/realtime-events.md) | Ready | Event emission, state management |

### Bookmarks
| Plan | Status | Scope |
|------|--------|-------|
| [bookmarks-types.md](active/bookmarks-types.md) | Ready | Types, repository |
| [bookmarks-manager.md](active/bookmarks-manager.md) | Ready | Search, manager, exports |

### File Changes
| Plan | Status | Scope |
|------|--------|-------|
| [file-changes-types.md](active/file-changes-types.md) | Ready | Types, extractor |
| [file-changes-service.md](active/file-changes-service.md) | Ready | Index, service, exports |

### Daemon and HTTP API
| Plan | Status | Scope |
|------|--------|-------|
| [daemon-core.md](active/daemon-core.md) | Ready | Core daemon, authentication |
| [http-api.md](active/http-api.md) | Ready | REST API endpoints |
| [sse-events.md](active/sse-events.md) | Ready | SSE event streaming |

### Browser Viewer
| Plan | Status | Scope |
|------|--------|-------|
| [browser-viewer-server.md](active/browser-viewer-server.md) | Ready | Server, API routes, WebSocket |
| [browser-viewer-ui.md](active/browser-viewer-ui.md) | Ready | SvelteKit UI, pages, clients |

### CLI
| Plan | Status | Scope |
|------|--------|-------|
| [cli-core.md](active/cli-core.md) | Ready | Core CLI framework |
| [cli-session-commands.md](active/cli-session-commands.md) | Ready | Session commands |
| [cli-group-queue.md](active/cli-group-queue.md) | Ready | Group and queue commands |
| [cli-other.md](active/cli-other.md) | Ready | Server, file, bookmark commands |

## Phase Dependencies (for impl-exec-auto)

**IMPORTANT**: This section is used by impl-exec-auto to determine which plans to load.
Only plans from eligible phases should be read to minimize context loading.

### Phase Status

| Phase | Status | Depends On |
|-------|--------|------------|
| 1 | COMPLETED | - |
| 2 | READY | Phase 1 |
| 3 | BLOCKED | Phase 2 |
| 4 | BLOCKED | Phase 3 |

### Phase to Plans Mapping

```
PHASE_TO_PLANS = {
  1: [],  # COMPLETED - files in impl-plans/completed/
  2: [
    "session-groups-types.md",
    "session-groups-runner.md",
    "command-queue-types.md",
    "command-queue-core.md",
    "markdown-parser-types.md",
    "markdown-parser-core.md",
    "realtime-watcher.md",
    "realtime-events.md",
    "bookmarks-types.md",
    "bookmarks-manager.md",
    "file-changes-types.md",
    "file-changes-service.md"
  ],
  3: [
    "daemon-core.md",
    "http-api.md",
    "sse-events.md"
  ],
  4: [
    "browser-viewer-server.md",
    "browser-viewer-ui.md",
    "cli-core.md",
    "cli-session-commands.md",
    "cli-group-queue.md",
    "cli-other.md"
  ]
}
```

## Implementation Order

### Phase 1: Foundation - COMPLETED
Completed plans in `impl-plans/completed/`:
- foundation-interfaces.md, foundation-types.md, foundation-mocks.md, foundation-services.md

### Phase 2: Core Features (Current - READY)
Can be implemented in parallel:
- session-groups-*.md, command-queue-*.md, markdown-parser-*.md
- realtime-*.md, bookmarks-*.md, file-changes-*.md

### Phase 3: API Layer (BLOCKED - waiting on Phase 2)
- daemon-core.md, http-api.md, sse-events.md

### Phase 4: User Interface (BLOCKED - waiting on Phase 3)
- browser-viewer-*.md, cli-*.md

## Completed Plans

| Plan | Completed | Design Reference |
|------|-----------|------------------|
| [foundation-interfaces.md](completed/foundation-interfaces.md) | 2026-01-06 | DESIGN.md |
| [foundation-types.md](completed/foundation-types.md) | 2026-01-06 | DESIGN.md |
| [foundation-mocks.md](completed/foundation-mocks.md) | 2026-01-06 | DESIGN.md |
| [foundation-services.md](completed/foundation-services.md) | 2026-01-06 | DESIGN.md |

## Workflow

### Creating a New Plan

1. Use the `/impl-plan` command with a design document reference
2. Or manually create a plan using `templates/plan-template.md`
3. Save to `active/<feature-name>.md`
4. Update this README with the new plan entry
5. **IMPORTANT**: If plan exceeds 400 lines, split into multiple files

### Working on a Plan

1. Read the active plan
2. Select a subtask to work on (consider parallelization)
3. Implement following the deliverable specifications
4. Update task status and progress log
5. Mark completion criteria as done

### Completing a Plan

1. Verify all completion criteria are met
2. Update status to "Completed"
3. Move file from `active/` to `completed/`
4. Update this README

## Guidelines

- Plans contain NO implementation code
- Plans specify interfaces, functions, and file structures
- Subtasks should be as independent as possible for parallel execution
- Always update progress log after each session
- **Keep each plan file under 400 lines** - split if necessary

## Plan to Design Document Mapping

| Feature | Design Document(s) | Implementation Plans |
|---------|-------------------|---------------------|
| Foundation | DESIGN.md, spec-infrastructure.md | foundation-interfaces, foundation-types, foundation-mocks, foundation-services |
| Session Groups | spec-session-groups.md | session-groups-types, session-groups-runner |
| Command Queue | spec-command-queue.md | command-queue-types, command-queue-core |
| Markdown Parser | spec-sdk-api.md#10 | markdown-parser-types, markdown-parser-core |
| Real-time Monitoring | spec-viewers.md#3 | realtime-watcher, realtime-events |
| Bookmarks | spec-viewers.md#6, spec-sdk-api.md#5.3 | bookmarks-types, bookmarks-manager |
| File Changes | spec-changed-files.md | file-changes-types, file-changes-service |
| Daemon & HTTP API | spec-sdk-api.md#4-6 | daemon-core, http-api, sse-events |
| Browser Viewer | spec-viewers.md#2 | browser-viewer-server, browser-viewer-ui |
| CLI | spec-sdk-api.md#7 | cli-core, cli-session-commands, cli-group-queue, cli-other |
