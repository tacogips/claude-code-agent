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
├── PROGRESS.json          # Task status index (single source of truth)
├── <feature>.md           # Implementation plan files
├── <feature>-types.md     # Split plans use consistent naming
└── templates/             # Plan templates
    └── plan-template.md   # Standard plan template
```

**Note**: Plan status is tracked in PROGRESS.json, not by file location. All plans remain in `impl-plans/` regardless of completion status.

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

## Plans by Feature

### Foundation (Completed)
| Plan | Status | Scope |
|------|--------|-------|
| [foundation-interfaces.md](foundation-interfaces.md) | Completed | Core interfaces |
| [foundation-types.md](foundation-types.md) | Completed | Type definitions |
| [foundation-mocks.md](foundation-mocks.md) | Completed | Mock implementations |
| [foundation-services.md](foundation-services.md) | Completed | Core services |

### Session Groups
| Plan | Status | Scope |
|------|--------|-------|
| [session-groups-types.md](session-groups-types.md) | Ready | Types, interfaces |
| [session-groups-runner.md](session-groups-runner.md) | Completed | Manager, runner, SDK |

### Command Queue
| Plan | Status | Scope |
|------|--------|-------|
| [command-queue-types.md](command-queue-types.md) | Ready | Types, events |
| [command-queue-core.md](command-queue-core.md) | Ready | Manager, runner, repository, SDK |

### Markdown Parser
| Plan | Status | Scope |
|------|--------|-------|
| [markdown-parser-types.md](markdown-parser-types.md) | Ready | Types, detectors |
| [markdown-parser-core.md](markdown-parser-core.md) | Ready | Core parser, exports |

### Real-time Monitoring
| Plan | Status | Scope |
|------|--------|-------|
| [realtime-watcher.md](realtime-watcher.md) | Ready | File watcher, JSONL parser |
| [realtime-events.md](realtime-events.md) | Ready | Event emission, state management |

### Bookmarks
| Plan | Status | Scope |
|------|--------|-------|
| [bookmarks-types.md](bookmarks-types.md) | Completed | Types, repository |
| [bookmarks-manager.md](bookmarks-manager.md) | Ready | Search, manager, exports |

### File Changes
| Plan | Status | Scope |
|------|--------|-------|
| [file-changes-types.md](file-changes-types.md) | Ready | Types, extractor |
| [file-changes-service.md](file-changes-service.md) | Ready | Index, service, exports |

### Daemon and HTTP API
| Plan | Status | Scope |
|------|--------|-------|
| [daemon-core.md](daemon-core.md) | Ready | Core daemon, authentication |
| [http-api.md](http-api.md) | Ready | REST API endpoints |
| [sse-events.md](sse-events.md) | Ready | SSE event streaming |

### Browser Viewer
| Plan | Status | Scope |
|------|--------|-------|
| [browser-viewer-server.md](browser-viewer-server.md) | Ready | Server, API routes, WebSocket |
| [browser-viewer-ui.md](browser-viewer-ui.md) | Ready | SvelteKit UI, pages, clients |

### CLI
| Plan | Status | Scope |
|------|--------|-------|
| [cli-core.md](cli-core.md) | Ready | Core CLI framework |
| [cli-session-commands.md](cli-session-commands.md) | Ready | Session commands |
| [cli-group-queue.md](cli-group-queue.md) | Ready | Group and queue commands |
| [cli-other.md](cli-other.md) | Ready | Server, file, bookmark commands |

### Bugfixes / Enhancements (Phase 5)
| Plan | Status | Scope |
|------|--------|-------|
| [session-reader-fix.md](session-reader-fix.md) | Completed | Fix session file discovery, message extraction, task extraction |

### Infrastructure - Exclusive Control (Phase 6)
| Plan | Status | Scope |
|------|--------|-------|
| [exclusive-control.md](exclusive-control.md) | Ready | File locking, atomic writes, race condition prevention |

## Phase Dependencies (for impl-exec-auto)

**IMPORTANT**: This section is used by impl-exec-auto to determine which plans to load.
Only plans from eligible phases should be read to minimize context loading.

### Phase Status

| Phase | Status | Depends On |
|-------|--------|------------|
| 1 | COMPLETED | - |
| 2 | COMPLETED | Phase 1 |
| 3 | COMPLETED | Phase 2 |
| 4 | COMPLETED | Phase 3 |
| 5 | COMPLETED | Phase 4 |
| 6 | READY | Phase 5 |

### Phase to Plans Mapping

```
PHASE_TO_PLANS = {
  1: [  # COMPLETED
    "foundation-interfaces.md",
    "foundation-types.md",
    "foundation-mocks.md",
    "foundation-services.md"
  ],
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
  ],
  5: [
    "session-reader-fix.md"
  ],
  6: [
    "exclusive-control.md"
  ]
}
```

## Implementation Order

### Phase 1: Foundation - COMPLETED
- foundation-interfaces.md, foundation-types.md, foundation-mocks.md, foundation-services.md

### Phase 2: Core Features (Current - READY)
Can be implemented in parallel:
- session-groups-*.md, command-queue-*.md, markdown-parser-*.md
- realtime-*.md, bookmarks-*.md, file-changes-*.md

### Phase 3: API Layer (BLOCKED - waiting on Phase 2)
- daemon-core.md, http-api.md, sse-events.md

### Phase 4: User Interface (COMPLETED)
- browser-viewer-*.md, cli-*.md

### Phase 5: Bugfixes / Enhancements (COMPLETED)
- session-reader-fix.md (fix session file reading)

### Phase 6: Infrastructure - Exclusive Control (Current - READY)
- exclusive-control.md (file locking, atomic writes, race condition prevention)

## Workflow

### Creating a New Plan

1. Use the `/impl-plan` command with a design document reference
2. Or manually create a plan using `templates/plan-template.md`
3. Save to `impl-plans/<feature-name>.md`
4. Update PROGRESS.json with new plan and tasks
5. Update this README with the new plan entry
6. **IMPORTANT**: If plan exceeds 400 lines, split into multiple files

### Working on a Plan

1. Read the plan file
2. Select a subtask to work on (consider parallelization)
3. Implement following the deliverable specifications
4. Update task status in PROGRESS.json
5. Update task status in plan file progress log
6. Mark completion criteria as done

### Completing a Plan

1. Verify all completion criteria are met
2. Update plan status to "Completed" in PROGRESS.json
3. Update plan file header status to "Completed"
4. Update this README if needed

**Note**: No file move is required. PROGRESS.json is the single source of truth for plan status.

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
| Session Reader Fix | spec-session-reader-fix.md | session-reader-fix |
| Exclusive Control | N/A (Infrastructure audit) | exclusive-control |
