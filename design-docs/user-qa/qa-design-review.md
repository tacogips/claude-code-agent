# Q&A: Design Review - Clarifications and New Decisions

This document addresses gaps and clarifications identified during the design review.

**Status**: All decisions completed
**Created**: 2026-01-04
**Priority**: High (blocks implementation)

---

## Summary of Issues Identified

| Issue | Type | Status |
|-------|------|--------|
| Naming inconsistency (peeper vs agent) | Inconsistency | **Fixed** |
| Directory structure path mismatch | Inconsistency | **Fixed** |
| Module structure outdated | Documentation | **Fixed** |
| Browser tech mismatch | Documentation | **Fixed** |
| Daemon vs Browser mode relationship | Design Gap | **Q29 - Decided** |
| Session pause/resume not defined | Design Gap | **Q30 - Decided** |
| Cost budget enforcement undefined | Design Gap | **Q31 - Decided** |
| Rate limiting not designed | Design Gap | **Q32 - Deferred** |
| Missing event types | Design Gap | **Q33 - Decided** |
| Standalone session storage | Design Gap | **Q34 - Decided** |
| Search scope for bookmarks | Design Gap | **Q35 - Decided** |
| New feature scope | Scope Decision | **Q36 - Decided** |

---

## Q29: Daemon Mode vs Browser Mode Relationship

### Background

Two server modes are designed:
1. **Browser Mode** (Q6): SvelteKit viewer for session visualization
2. **Daemon Mode** (Q26): HTTP API for remote execution

### Question

What is the relationship between these two modes?

### Options

| Option | Description | Trade-offs |
|--------|-------------|------------|
| **A: Unified Server** | Single server provides both viewer + API | Simpler deployment, single port |
| **B: Separate Modes** | `server start` for viewer, `daemon start` for API | Clear separation, different security |
| **C: Composable** | Viewer is subset of daemon; daemon includes viewer | Flexible, but more complexity |

### Recommendation

**Option C: Composable** - Daemon mode includes all API endpoints. Browser viewer is optional add-on:

```bash
# Viewer only (read-only, no auth required)
claude-code-agent server start --port 3000

# Daemon with API (auth required, includes viewer optionally)
claude-code-agent daemon start --port 8443 --with-viewer

# Daemon API only (no viewer UI)
claude-code-agent daemon start --port 8443
```

### Decision

- [ ] A: Unified Server (single mode)
- [ ] B: Separate Modes (mutually exclusive)
- [x] C: Composable (daemon can include viewer)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Composable architecture provides maximum flexibility. Viewer-only mode (`server start`) for local read-only usage without auth. Daemon mode (`daemon start`) for remote API with auth. `--with-viewer` flag adds viewer UI to daemon. This allows deployment flexibility: local dev uses viewer, production uses daemon with or without viewer.

---

## Q30: Session Group Pause/Resume

### Background

Q18 lifecycle includes "paused" state, but no commands or SDK methods defined.

### Question

How should pause/resume be implemented?

### Proposed Design

#### CLI Commands

```bash
# Pause running session group
claude-code-agent group pause <group-id>
# Pauses all running sessions, marks pending as "blocked"

# Resume paused group
claude-code-agent group resume <group-id>
# Restarts paused sessions from last checkpoint

# Pause single session
claude-code-agent session pause <session-id>

# Resume single session
claude-code-agent session resume <session-id>
```

#### SDK API

```typescript
await group.pause();   // Pauses all running sessions
await group.resume();  // Resumes from paused state

await session.pause(); // Pause single session
await session.resume();
```

#### Implementation Behavior

| Action | Effect |
|--------|--------|
| Pause Session | Send SIGTERM to Claude Code process, save state |
| Resume Session | Restart Claude Code with `--resume` flag |
| Pause Group | Pause all running, block pending |
| Resume Group | Resume paused sessions respecting concurrency limit |

### Decision

- [x] Approve proposed design
- [ ] Modifications needed: _______________
- [ ] Not needed for MVP (defer)

**Decided**: 2026-01-04
**Rationale**: Pause/resume is essential for long-running session groups. SIGTERM + `--resume` approach leverages Claude Code's built-in session resumption. Group-level pause provides coordinated control over multiple concurrent sessions.

---

## Q31: Cost Budget Enforcement

### Background

Session Group meta.json includes `maxBudgetUsd`, but behavior when exceeded is undefined.

### Question

What should happen when a session or group exceeds its budget?

### Options

| Option | Behavior |
|--------|----------|
| **A: Hard Stop** | Immediately terminate session when budget reached |
| **B: Soft Warning** | Emit warning event, continue execution |
| **C: Pause and Ask** | Pause session, emit event, wait for user action |
| **D: Configurable** | User chooses behavior per group |

### Recommendation

**Option D: Configurable** with "Pause and Ask" as default:

```typescript
interface BudgetConfig {
  maxBudgetUsd: number;
  onBudgetExceeded: 'stop' | 'warn' | 'pause';  // default: 'pause'
  warningThreshold: number;  // default: 0.8 (80% of budget)
}
```

Events:
```typescript
| { type: 'budget_warning'; sessionId: string; usage: number; limit: number }
| { type: 'budget_exceeded'; sessionId: string; action: 'stopped' | 'paused' | 'continued' }
```

### Decision

- [ ] A: Hard Stop
- [ ] B: Soft Warning
- [ ] C: Pause and Ask
- [x] D: Configurable (recommend)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Configurable behavior gives users control based on their use case. Default to 'pause' for safety (prevents unexpected costs). Warning threshold at 80% provides early notification. Events enable external systems to react appropriately.

---

## Q32: Rate Limiting for Daemon API

### Background

Q26/Q27 define daemon mode with API key auth but no rate limiting.

### Question

How should rate limiting be implemented for the daemon API?

### Proposed Design

#### Configuration

```json
// ~/.config/claude-code-agent/config.json
{
  "daemon": {
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 60,
      "requestsPerHour": 1000,
      "burstSize": 10,
      "perToken": true
    }
  }
}
```

#### Behavior

| Limit Type | Scope | Default |
|------------|-------|---------|
| Per-minute | Per API token | 60 |
| Per-hour | Per API token | 1000 |
| Burst | Per API token | 10 |
| Global | All tokens | 10000/hour |

#### Response

```
HTTP 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704326400
```

### Decision

- [ ] Approve proposed design
- [ ] Modifications needed: _______________
- [x] Not needed for MVP (defer)

**Decided**: 2026-01-04
**Rationale**: Rate limiting adds complexity and is primarily needed for multi-user or public-facing deployments. MVP targets single-user/team scenarios where API token auth is sufficient. Add rate limiting in post-MVP when multi-user support is implemented.

---

## Q33: Additional Event Types

### Background

Q23 defines SessionEvent types but several are missing.

### Question

Should these additional event types be added?

### Proposed Additional Events

```typescript
type SessionEvent =
  // Existing (from Q23)
  | { type: 'session_created'; ... }
  | { type: 'session_started'; ... }
  | { type: 'message_added'; ... }
  | { type: 'tool_executed'; ... }
  | { type: 'task_updated'; ... }
  | { type: 'session_completed'; ... }
  | { type: 'session_failed'; ... }
  | { type: 'subagent_spawned'; ... }

  // New: Lifecycle events
  | { type: 'session_paused'; sessionId: string; reason: string }
  | { type: 'session_resumed'; sessionId: string }

  // New: Group events
  | { type: 'group_created'; groupId: string; name: string }
  | { type: 'group_started'; groupId: string; sessionCount: number }
  | { type: 'group_completed'; groupId: string; stats: GroupStats }
  | { type: 'group_paused'; groupId: string }
  | { type: 'group_resumed'; groupId: string }

  // New: Budget events
  | { type: 'budget_warning'; sessionId: string; usage: number; limit: number }
  | { type: 'budget_exceeded'; sessionId: string; action: string }

  // New: Dependency events
  | { type: 'dependency_waiting'; sessionId: string; waitingFor: string[] }
  | { type: 'dependency_resolved'; sessionId: string; dependency: string }

  // New: Config events
  | { type: 'config_generated'; sessionId: string; configPath: string };
```

### Decision

- [x] Add all proposed events
- [ ] Add subset (specify): _______________
- [ ] Current events sufficient for MVP

**Decided**: 2026-01-04
**Rationale**: Comprehensive event coverage enables robust external integrations. Lifecycle events (pause/resume) needed for Q30. Group events needed for session group orchestration. Budget events needed for Q31. Dependency events needed for DAG execution visibility. Config events useful for debugging. All events are low-cost to implement once event infrastructure exists.

---

## Q34: Standalone Session Storage

### Background

Q25 decided to allow standalone sessions (without Session Group).
Storage location `~/.local/claude-code-agent/standalone-sessions/` was mentioned but not integrated into directory structure.

### Question

Confirm standalone session storage structure.

### Proposed Structure

```
~/.local/claude-code-agent/
├── metadata/
│   ├── groups/                    # Session Group definitions
│   │   └── {group-id}.json
│   ├── sessions/                  # Session metadata (both grouped and standalone)
│   │   └── {session-id}.json
│   ├── bookmarks/
│   │   └── {bookmark-id}.json
│   └── index.json
│
├── workspaces/                    # Claude Code working directories
│   └── {session-id}/              # Same structure for grouped and standalone
│       └── claude-config/
│           └── ...
│
└── standalone-sessions/           # Deprecated: use workspaces/ for all
```

**Simplification**: All sessions (grouped or standalone) use `workspaces/{session-id}/`. The `metadata/sessions/{id}.json` tracks whether session belongs to a group:

```json
{
  "id": "session-123",
  "groupId": null,           // null = standalone
  "projectPath": "/path/to/project",
  "status": "completed",
  "createdAt": "2026-01-04T12:00:00Z"
}
```

### Decision

- [x] Approve unified storage (no separate standalone-sessions/)
- [ ] Keep separate standalone-sessions/ directory
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Unified storage simplifies implementation and maintenance. All sessions use `workspaces/{session-id}/` regardless of group membership. The `groupId` field in metadata distinguishes standalone (null) from grouped sessions. This allows sessions to be attached to groups later without file relocation.

---

## Q35: Search Scope Extension to Bookmarks

### Background

Bookmarks (Q28) and Search (design-additional-components.md section 8) are designed separately.

### Question

Should search functionality include bookmarks?

### Proposed Design

Extend search query syntax:

```bash
# Search in bookmarks
claude-code-agent search "oauth token" --scope bookmarks

# Search in sessions
claude-code-agent search "oauth token" --scope sessions

# Search everywhere (default)
claude-code-agent search "oauth token" --scope all
```

Search query syntax extension:

```
# Bookmark-specific filters
bookmark:true              # Only bookmarked messages
bookmark:auth              # Messages with bookmark tagged "auth"
bookmark:range             # Only range bookmarks
```

### Decision

- [x] Approve search extension to bookmarks
- [ ] Keep search and bookmarks separate
- [ ] Defer to post-MVP

**Decided**: 2026-01-04
**Rationale**: Bookmarks are designed for knowledge retrieval (Q28). Search should include bookmarks for unified discovery experience. The `--scope` flag provides flexibility. Bookmark-specific filters (`bookmark:true`, `bookmark:tag`) enable targeted searches without breaking existing query syntax.

---

## Q36: New Feature Scope for MVP

### Background

Design review identified potential new features. Need to decide scope.

### Question

Which features should be included in MVP vs post-MVP?

### Feature List

| Feature | Description | Recommendation |
|---------|-------------|----------------|
| Session Replay Mode | Step-by-step playback | Post-MVP |
| Session Template Extraction | Create template from session | Post-MVP |
| Session Diff/Comparison | Compare two sessions | Post-MVP |
| Pipeline Mode (DAG) | Complex dependency graphs | Post-MVP |
| Webhook Integration | HTTP callbacks for events | MVP (simple) |
| Session Metrics Dashboard | Aggregate statistics | Post-MVP |
| Session Annotation | Add notes to sessions | MVP |
| Session Fork/Clone | Branch from existing session | Post-MVP |
| Multi-User Support | Team features | Post-MVP |
| Auto-Cleanup Policies | Retention management | Post-MVP |
| Batch Processing | Same prompt, multiple projects | MVP |

### Decision

MVP additions (check all that apply):

- [ ] Webhook Integration (simple: single URL, select events)
- [x] Session Annotation
- [ ] Batch Processing
- [ ] None (current scope is sufficient)
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Session Annotation is lightweight (simple metadata storage) and complements bookmarks. Webhook and Batch Processing add significant complexity and are better suited for post-MVP iteration. Current MVP scope is already substantial with SDK, daemon, bookmarks, and session groups.

---

## Summary of Decisions

| Question | Topic | Decision | Status |
|----------|-------|----------|--------|
| Q29 | Daemon vs Browser Mode | C: Composable | **Decided** |
| Q30 | Session Pause/Resume | Approved | **Decided** |
| Q31 | Cost Budget Enforcement | D: Configurable | **Decided** |
| Q32 | Rate Limiting | Deferred to post-MVP | **Deferred** |
| Q33 | Additional Event Types | Add all events | **Decided** |
| Q34 | Standalone Session Storage | Unified storage | **Decided** |
| Q35 | Search Scope Extension | Approved | **Decided** |
| Q36 | New Feature Scope | Session Annotation only | **Decided** |

**All 8 decisions completed**: 2026-01-04
