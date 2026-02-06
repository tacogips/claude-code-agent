# Design References

This directory contains reference materials for system design and implementation.

## External References

| Name | URL | Description |
|------|-----|-------------|
| TypeScript Documentation | https://www.typescriptlang.org/docs/ | Official TypeScript documentation |
| Bun Documentation | https://bun.sh/docs | Official Bun runtime documentation |
| Claude Code Repository | https://github.com/anthropics/claude-code | Official CLI for Claude - reference implementation for agent-based development tools |
| Claude Code CLI Reference | https://code.claude.com/docs/en/cli-reference.md | CLI flags and options documentation |
| Claude Code MCP Docs | https://code.claude.com/docs/en/mcp.md | MCP server configuration documentation |
| Claude Code Settings | https://code.claude.com/docs/en/settings.md | Settings and environment variables documentation |

## Reference Documents

Reference documents should be organized by topic:

```
references/
├── README.md              # This index file
├── claude-code/           # Claude Code related references
├── claude-mem/            # Claude-mem persistent memory system
├── typescript/            # TypeScript patterns and practices
└── <topic>/               # Other topic-specific references
```

### Claude-mem Persistent Memory System

| Document | Description |
|----------|-------------|
| [claude-mem/README.md](claude-mem/README.md) | Comprehensive analysis of claude-mem's memory specification, architecture, and implementation patterns for session persistence |

**Key Topics Covered**:
- Lifecycle hooks system (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd)
- Worker service architecture (HTTP API on port 37777)
- Database schema (SQLite with FTS5 full-text search)
- Session ID architecture (dual ID pattern: contentSessionId vs memorySessionId)
- Observation taxonomy (6 types, 7 concepts)
- Context generation and progressive disclosure
- Search system (3-layer workflow pattern)
- Privacy controls and tag stripping

## Adding References

When adding new reference materials:

1. Create a topic directory if it does not exist
2. Add reference documents with clear naming
3. Update this README.md with the reference entry
