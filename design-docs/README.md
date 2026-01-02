# Claude Code Peeper - Design Documentation

## Project Status

| Phase | Status |
|-------|--------|
| Requirements | In Progress |
| Architecture | In Progress |
| Features | Pending |
| Review | Pending |

**Current Iteration**: 1

## Quick Links

- [Architecture Overview](./architecture/overview.md)
- [Pending Questions](./qa/pending.md) - **Answer these**
- [Your Responses](./qa/responses.md) - **Write answers here**

## How to Participate

### Async Communication Workflow

1. **Check pending questions**: Read `design-docs/qa/pending.md`
2. **Write your answers**: Edit `design-docs/qa/responses.md`
3. **Run iteration**: Claude processes responses and updates docs
4. **Review updates**: Check updated design documents
5. **Repeat**: New questions may appear after processing

### Response Format

In `design-docs/qa/responses.md`, you can:
- Check option boxes: `[x] A. Option`
- Write free-form text under questions
- Ask clarifying questions
- Write "skip" or "defer" to postpone

## Document Structure

```
design-docs/
├── README.md                    # This file - status overview
├── qa/
│   ├── pending.md               # Questions awaiting user response
│   ├── responses.md             # User responses (user writes here)
│   └── history/                 # Archived Q&A sessions
│       └── initial-questions.md
├── research/
│   ├── claude-code-file-structure.md  # Claude Code data format analysis
│   └── references/              # External references
├── architecture/
│   ├── overview.md              # System architecture and project goals
│   ├── modules/
│   │   └── data-models.md       # TypeScript type definitions
│   └── decisions/
│       └── technical-design.md  # Technical design considerations
├── features/                    # Feature specifications
└── iterations/                  # Iteration summaries
```

## Design Process

```
┌─────────────────────────────────────────────────────┐
│                 Design Iteration                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │  Check   │───>│ Process  │───>│ Generate │     │
│   │ Responses│    │ Answers  │    │ Questions│     │
│   └──────────┘    └──────────┘    └──────────┘     │
│        │                               │            │
│        └───────────────────────────────┘            │
│                    Repeat                           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/design-status` | Show current design status |
| `/design-interview` | Generate new interview questions |
| `/design-process-responses` | Process user responses |
| `/design-iterate` | Run one complete iteration |
| `/design-summary` | Generate design summary |

## Current Focus

**Iteration 1**: Initial requirements gathering and architecture decisions.

### Pending Decisions
1. Monorepo structure
2. Library API design
3. Search implementation
4. Claude Code API scope
5. Auth token management

### Next Steps
1. Answer questions in `qa/pending.md`
2. Claude will process and update design docs
3. Review and provide feedback

## Document Index

### Research
- [Claude Code File Structure](./research/claude-code-file-structure.md) - Analysis of Claude Code data formats

### Architecture
- [Overview](./architecture/overview.md) - Project goals, architecture diagram, use cases
- [Data Models](./architecture/modules/data-models.md) - TypeScript type definitions
- [Technical Design](./architecture/decisions/technical-design.md) - Design considerations and technical stack

### Q&A History
- [Initial Questions](./qa/history/initial-questions.md) - Original design questions
