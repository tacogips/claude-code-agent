# Design Decisions

This document consolidates all design decisions (Q1-Q37) made during the design phase.

---

## Summary Table

| Q# | Topic | Decision | Rationale |
|----|-------|----------|-----------|
| Q1 | TUI Library | Ink (Future) | Mature ecosystem, TypeScript support (Low Priority) |
| Q2 | JSON Query Backend | DuckDB (bundled) | SQL on JSONL, Clean Architecture |
| Q3 | Default Viewer Mode | Web UI | Browser-based viewer is primary interactive UI |
| Q4 | Thinking Content | Hidden by default | Verbose, use flag when needed |
| Q5 | Session Discovery | Combined (default + flags) | Flexible for all use cases |
| Q6 | Browser Tech | SvelteKit | Full-stack SSR, small bundle |
| Q7 | Tool Name | claude-code-agent | Broader scope than viewing |
| Q8 | Real-time Updates | fs.watch | Efficient, event-driven |
| Q9 | Cost Display | USD with cents | Standard currency format |
| Q10 | Export Formats | JSON + Markdown (MVP) | Programmatic + human-readable |
| Q11 | Command Structure | Subcommands (Noun-oriented) | Organized, scalable |
| Q12 | Session Summary | Use existing + fallback | Leverage Claude Code summaries |
| Q13 | Auth Token Override | CLI flag/env var | Agent doesn't manage tokens |
| Q14 | Directory Structure | XDG compliant | ~/.config, ~/.local split |
| Q15 | Session Group ID | Timestamp + Slug | Human readable, sortable |
| Q16 | Config Generation | Configurable per session | Multi-project flexibility |
| Q17 | Template Format | Markdown + frontmatter | Consistent with Claude commands |
| Q18 | Group Lifecycle | Approved | Multi-project support |
| Q19 | Claude Code Invocation | CLAUDE_CONFIG_DIR | Full isolation |
| Q20 | Transcript Storage | Copy via fs.watch | Full isolation, portable |
| Q21 | Concurrent Sessions | Configurable limit (3) | Balance throughput/rate limits |
| Q22 | Query Interface | Repository pattern | Read-only abstraction |
| Q23 | Event System | Emitter + stdout stream | SDK + CLI integration |
| Q24 | SDK Mode | Both CLI + SDK | Maximum flexibility |
| Q25 | Standalone Sessions | Allowed | Workflow engine integration |
| Q26 | Remote Execution | Daemon mode (HTTP) | Web interface trigger |
| Q27 | Authentication | API Key (Bearer) | Simple, sufficient |
| Q28 | Bookmarks | Session, message, range | Knowledge retrieval |
| Q29 | Daemon vs Browser | Composable | Flexible deployment |
| Q30 | Pause/Resume | SIGTERM + --resume | Leverage Claude Code |
| Q31 | Budget Enforcement | Configurable | User control |
| Q32 | Rate Limiting | Deferred to post-MVP | Added complexity |
| Q33 | Event Types | Add all proposed | Comprehensive coverage |
| Q34 | Standalone Storage | Unified workspaces/ | Simplified structure |
| Q35 | Search Scope | Include bookmarks | Unified discovery |
| Q36 | MVP Features | Session Annotation | Lightweight addition |
| Q37 | Command Session Mode | Per-command choice | Flexible workflow support |

---

## Core Design Decisions (Q1-Q12)

### Q1: TUI Library Selection
**Decision**: Ink (Future/Low Priority)
**Rationale**: Mature ecosystem, extensive documentation, first-class TypeScript support, React-like patterns familiar to developers. TUI implementation is deferred; Web UI is the primary interactive interface.

### Q2: JSON Query Backend
**Decision**: DuckDB (bundled via `duckdb-async` npm package)
**Rationale**: Powerful SQL queries on JSONL files. Bundled via npm (no user installation). Enables Athena-like query experience. Clean Architecture with repository interface allows future implementation swapping.

### Q3: Default Viewer Mode
**Decision**: Web UI default
**Rationale**: Browser-based viewer is the primary interactive UI. Use `server start` command to launch the web viewer. TUI is deferred to future implementation as a low-priority feature.

### Q4: Thinking Content Display
**Decision**: Hidden by default
**Rationale**: Thinking content is verbose. Use `--show-thinking` flag when needed.

### Q5: Session File Discovery Strategy
**Decision**: Combined (current project default + `--all` + `--project <path>`)
**Rationale**: All three modes are useful and not mutually exclusive. Default to current project for focused experience.

### Q6: Browser Viewer Technology
**Decision**: SvelteKit
**Rationale**: Full-stack framework with SSR, file-based routing, excellent developer experience. Small bundle size after compilation.

### Q7: Tool Name
**Decision**: claude-code-agent
**Rationale**: Aligns with repository name, broader scope than just "viewing".

### Q8: Real-time Update Strategy
**Decision**: fs.watch (with partial line handling)
**Rationale**: Efficient and event-driven. Must handle edge cases (partial lines, parse errors, file rotation).

### Q9: Cost Display Format
**Decision**: USD with cents ($0.05)
**Rationale**: Standard currency format. Token details available in detail view.

### Q10: Export Format Priority
**Decision**: JSON + Markdown for MVP
**Rationale**: JSON for programmatic access, Markdown for human-readable export. Other formats as needed later.

### Q11: Command Structure
**Decision**: Subcommands (Noun-oriented)
**Rationale**: Entity-first structure (e.g., `session list`, `group show`) provides clear organization and scalability.

### Q12: Session Summarization
**Decision**: Use existing transcript summary (fallback to first message)
**Rationale**: Claude Code already generates session summaries in transcript. Use those when available.

---

## Agent Architecture Decisions (Q13-Q21)

### Q13: Auth Token Override
**Decision**: CLI flag/env var (agent does not manage tokens)
**Rationale**: Agent provides override capability only. Does not store or manage auth tokens.

### Q14: Agent Directory Structure
**Decision**: XDG compliant (config in `~/.config/`, data in `~/.local/`)
**Rationale**: Follows XDG Base Directory Specification. Templates are immutable like config.

### Q15: Session Group Identification
**Decision**: Timestamp + Slug format (`YYYYMMDD-HHMMSS-{slug}`)
**Rationale**: Human readable, unique, sortable. Session Groups are project-independent and support multi-project workflows.

### Q16: Generated Config Files
**Decision**: Configurable per session (with group-level defaults)
**Rationale**: Multi-project Session Groups require flexibility. Each session may target different project types.

### Q17: Template System Format
**Decision**: Markdown + frontmatter (like Claude commands)
**Rationale**: Consistent with Claude Code's existing command format. Simple `{{variable}}` interpolation.

### Q18: Session Group Lifecycle
**Decision**: Approved with multi-project commands
**Rationale**: Commands updated to support multi-project Session Groups with dependency management and concurrent execution.

### Q19: Claude Code Invocation Strategy
**Decision**: CLAUDE_CONFIG_DIR (full isolation)
**Rationale**: Full isolation enables concurrent execution of multiple sessions across different projects without interference.

### Q20: Session Transcript Storage
**Decision**: Copy transcripts (via fs.watch sync)
**Rationale**: Copying ensures full isolation and allows Session Groups to be archived/moved independently.

### Q21: Concurrent Session Management
**Decision**: Configurable limit (default: 3)
**Rationale**: Default of 3 concurrent sessions balances throughput with rate limit safety. Dependency graph ensures correct execution order.

---

## Use Case Gap Decisions (Q22-Q28)

### Q22: Session Query Interface
**Decision**: Repository pattern (read-only, for query abstraction)
**Rationale**: DuckDB as default implementation for SQL queries on JSONL. External persistence is out of scope.

### Q23: Event System for External Consumers
**Decision**: Both event emitter + stdout stream
**Rationale**: Event emitter for SDK/library usage, stdout JSON stream for CLI piping.

### Q24: SDK and Library Mode
**Decision**: Both CLI + SDK
**Rationale**: CLI for direct usage and shell scripting, SDK for embedding in TypeScript/JavaScript applications. CLI is thin wrapper around SDK.

### Q25: Single Session Mode
**Decision**: Allow standalone sessions
**Rationale**: Essential for workflow engine integration where orchestration is handled externally. Sessions can be attached to groups later.

### Q26: Remote Execution Architecture
**Decision**: Agent as daemon (authenticated HTTP API)
**Rationale**: Daemon mode enables remote web interfaces to trigger Claude Code execution. Distributed execution out of scope but architecture allows future extension.

### Q27: Authentication for Remote Access
**Decision**: API Key (Bearer token)
**Rationale**: Simple and sufficient for most use cases. mTLS can be added as optional enhancement for high-security environments.

### Q28: Bookmark Feature
**Decision**: Implement with session, message, and range types
**Rationale**: Bookmarks enable quick access to important sessions and messages. Essential for knowledge management and retrieval.

---

## Design Review Decisions (Q29-Q36)

### Q29: Daemon Mode vs Browser Mode
**Decision**: Composable (daemon can include viewer)
**Rationale**: Maximum flexibility. Viewer-only mode for local read-only usage. Daemon mode for remote API. `--with-viewer` flag adds viewer UI to daemon.

### Q30: Session Group Pause/Resume
**Decision**: Approved (SIGTERM + --resume approach)
**Rationale**: Essential for long-running session groups. Leverages Claude Code's built-in session resumption.

### Q31: Cost Budget Enforcement
**Decision**: Configurable (default: 'pause')
**Rationale**: Configurable behavior gives users control. Default to 'pause' for safety. Warning threshold at 80%.

### Q32: Rate Limiting for Daemon API
**Decision**: Deferred to post-MVP
**Rationale**: Rate limiting adds complexity. MVP targets single-user/team scenarios where API token auth is sufficient.

### Q33: Additional Event Types
**Decision**: Add all proposed events
**Rationale**: Comprehensive event coverage enables robust external integrations. All events are low-cost to implement once event infrastructure exists.

### Q34: Standalone Session Storage
**Decision**: Unified storage (all sessions in workspaces/)
**Rationale**: Simplifies implementation. `groupId` field distinguishes standalone (null) from grouped sessions. Allows attaching sessions to groups later.

### Q35: Search Scope Extension
**Decision**: Include bookmarks in search
**Rationale**: Unified discovery experience. `--scope` flag provides flexibility.

### Q36: New Feature Scope for MVP
**Decision**: Session Annotation only
**Rationale**: Lightweight (simple metadata storage) and complements bookmarks. Other features add complexity and are better suited for post-MVP.

### Q37: Command Queue Session Mode
**Decision**: Per-command session mode choice (`continue` or `new`)
**Rationale**: Different commands may require different contexts. Related tasks benefit from shared session context (using `--resume`), while independent tasks are better executed in fresh sessions. The default `continue` mode maintains backward compatibility while enabling flexible workflows like:
- Sequential related tasks in same session (continue context)
- Independent tasks that need a clean slate (new session)
- Mixed workflows where some commands share context and others start fresh

---

## Archived Q&A Documents

Historical Q&A files with full decision rationale are preserved in `archive/`:

- `archive/qa-design-decisions.md` - Q1-Q12
- `archive/qa-agent-architecture.md` - Q13-Q21
- `archive/qa-use-case-gaps.md` - Q22-Q28
- `archive/qa-design-review.md` - Q29-Q36
