# User Q&A

This directory contains items requiring user confirmation or decision.

## Purpose

Store questions, pending decisions, and items awaiting user approval.

## File Naming Convention

| Prefix | Use Case |
|--------|----------|
| `qa-` | Questions/confirmation items |
| `pending-` | Pending decisions |

## Current Items

| Document | Status | Questions |
|----------|--------|-----------|
| [qa-design-decisions.md](./qa-design-decisions.md) | **COMPLETED** | Q1-Q12: Core design decisions |
| [qa-agent-architecture.md](./qa-agent-architecture.md) | **COMPLETED** | Q13-Q21: Agent architecture |
| [qa-use-case-gaps.md](./qa-use-case-gaps.md) | **COMPLETED** | Q22-Q28: Use case integration |
| [qa-design-review.md](./qa-design-review.md) | **COMPLETED** | Q29-Q36: Design review clarifications |
| [qa-example.md](./qa-example.md) | Template | Example format |
| [pending-example.md](./pending-example.md) | Template | Example format |

## Decision Summary

| Range | Topic | Status |
|-------|-------|--------|
| Q1-Q12 | Core Design (TUI, Query, Viewer, etc.) | All decided |
| Q13-Q21 | Agent Architecture (directories, templates, isolation) | All decided |
| Q22-Q28 | Use Cases (SDK, daemon, bookmarks) | All decided |
| Q29-Q36 | Design Review (clarifications, new features) | All decided |

## Adding New Items

1. Create a new file with appropriate prefix (`qa-` or `pending-`)
2. Include clear description of the question or decision needed
3. List available options if applicable
4. Update this README.md with a reference to the new item
