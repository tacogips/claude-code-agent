# Design Decisions

This document consolidates current design decisions for claude-code-agent.

---

## Summary Table

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Tool Name | claude-code-agent | Matches repository scope: local monitoring and orchestration |
| Runtime | Bun | Fast TypeScript execution and package management |
| Language | TypeScript strict mode | Strong API contracts and maintainability |
| Query Interface | Local GraphQL executor plus SDK methods | Structured local queries without a server process |
| Command Structure | Noun-oriented subcommands | Scalable CLI organization |
| SDK Mode | CLI and embeddable SDK | Supports shell usage and TypeScript integration |
| Claude Code Invocation | Subprocess transport with generated config | Maintains compatibility with Claude Code |
| Transcript Monitoring | File-system watcher plus parser | Non-invasive observation of Claude Code output |
| Session Groups | Timestamp plus slug IDs | Human-readable, sortable identifiers |
| Command Queue | Per-command `continue` or `new` session mode | Flexible workflows for related and independent tasks |
| Storage | File repositories plus in-memory test repositories | Simple local persistence and deterministic tests |
| Token Metadata | Local token manager | Supports token creation/list/revoke/rotate without server middleware |
| Bookmarks | Session, message, and range metadata | Lightweight retrieval of important transcript content |
| Testing | Vitest with dependency-injected interfaces | Fast tests without external side effects |

---

## Current Non-Goals

- No network listener.
- No hosted UI runtime.
- No remote execution endpoint.

---

## Notes

Current implementation and active design model claude-code-agent as a local CLI/SDK package.
