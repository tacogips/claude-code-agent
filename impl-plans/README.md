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
├── active/                # Currently active implementation plans
│   └── <feature>.md       # One file per feature being implemented
├── completed/             # Completed implementation plans (archive)
│   └── <feature>.md       # Completed plans for reference
└── templates/             # Plan templates
    └── plan-template.md   # Standard plan template
```

## Active Plans

| Plan | Status | Design Reference | Last Updated |
|------|--------|------------------|--------------|
| [foundation-and-core.md](active/foundation-and-core.md) | Ready | DESIGN.md, spec-infrastructure.md | 2026-01-04 |
| [session-groups.md](active/session-groups.md) | Ready | spec-session-groups.md | 2026-01-04 |
| [command-queue.md](active/command-queue.md) | Ready | spec-command-queue.md | 2026-01-04 |
| [markdown-parser.md](active/markdown-parser.md) | Ready | spec-sdk-api.md#10 | 2026-01-04 |
| [daemon-and-http-api.md](active/daemon-and-http-api.md) | Ready | spec-sdk-api.md#4-6 | 2026-01-04 |
| [cli.md](active/cli.md) | Ready | spec-sdk-api.md#7 | 2026-01-04 |
| [browser-viewer.md](active/browser-viewer.md) | Ready | spec-viewers.md#2 | 2026-01-04 |
| [realtime-monitoring.md](active/realtime-monitoring.md) | Ready | spec-viewers.md#3 | 2026-01-04 |
| [bookmarks.md](active/bookmarks.md) | Ready | spec-viewers.md#6, spec-sdk-api.md#5.3 | 2026-01-04 |
| [file-changes.md](active/file-changes.md) | Ready | spec-changed-files.md | 2026-01-04 |

## Implementation Order

The recommended implementation order based on dependencies:

### Phase 1: Foundation (No Dependencies)
1. **foundation-and-core.md** - Core interfaces, types, errors, mocks

### Phase 2: Core Features (Depends on Phase 1)
These can be implemented in parallel:
- **session-groups.md** - Session Group management
- **command-queue.md** - Command Queue for sequential execution
- **markdown-parser.md** - Markdown to JSON parsing
- **realtime-monitoring.md** - File watching and event parsing
- **bookmarks.md** - Bookmark system
- **file-changes.md** - File change extraction

### Phase 3: API Layer (Depends on Phase 2)
- **daemon-and-http-api.md** - HTTP API and authentication

### Phase 4: User Interface (Depends on Phase 2-3)
- **browser-viewer.md** - SvelteKit browser viewer
- **cli.md** - Command-line interface

## Completed Plans

| Plan | Completed | Design Reference |
|------|-----------|------------------|
| (No completed plans yet) | - | - |

## Workflow

### Creating a New Plan

1. Use the `/impl-plan` command with a design document reference
2. Or manually create a plan using `templates/plan-template.md`
3. Save to `active/<feature-name>.md`
4. Update this README with the new plan entry

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

## Plan to Design Document Mapping

| Implementation Plan | Design Document(s) | Scope |
|--------------------|-------------------|-------|
| foundation-and-core.md | DESIGN.md, spec-infrastructure.md | Core interfaces, types, mocks, containers |
| session-groups.md | spec-session-groups.md | Multi-project session orchestration |
| command-queue.md | spec-command-queue.md | Sequential prompt execution |
| markdown-parser.md | spec-sdk-api.md#10 | Markdown to JSON conversion |
| daemon-and-http-api.md | spec-sdk-api.md#4-6 | HTTP server, REST API, authentication |
| cli.md | spec-sdk-api.md#7 | Command-line interface |
| browser-viewer.md | spec-viewers.md#2 | SvelteKit browser UI |
| realtime-monitoring.md | spec-viewers.md#3 | File watching, event streaming |
| bookmarks.md | spec-viewers.md#6, spec-sdk-api.md#5.3 | Session/message bookmarks |
| file-changes.md | spec-changed-files.md | File change extraction, indexing |
