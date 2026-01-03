# Design Documentation Skill

This skill provides guidelines for creating and organizing design documents in this project.

## When to Apply

Apply this skill when:
- Creating new design documents
- Documenting research or investigation results
- Recording architectural decisions

## Output Location

**IMPORTANT**: All design documents MUST be stored under `design-docs/` subdirectories (NOT directly under `design-docs/`).

```
design-docs/
├── specs/             # Design specifications (keep file count minimal)
│   ├── client.md      # Client-side design
│   ├── architecture.md # System architecture design
│   ├── notes.md       # Other notable design items
│   └── design-*.md    # Detailed supporting documents (if needed)
├── references/        # External reference materials
│   └── README.md      # Index of all references
└── user-qa/           # Items requiring user confirmation
    └── README.md      # Index of pending questions
```

## Directory Rules

| Directory | Purpose |
|-----------|---------|
| `design-docs/specs/` | Design specifications (3 main files + supporting docs) |
| `design-docs/references/` | External reference materials and links |
| `design-docs/user-qa/` | Questions and items requiring user confirmation |

**DO NOT** create markdown files directly under `design-docs/`.

## Specs Directory Structure

Keep file count minimal. Use 3 main category files:

| File | Purpose |
|------|---------|
| `client.md` | Client-side design, UI/UX decisions, client patterns |
| `architecture.md` | System architecture, infrastructure, technical decisions |
| `notes.md` | Other notable items, research findings, miscellaneous design notes |

### Adding Content

1. Determine the appropriate category (client, architecture, or notes)
2. Add a new section to the corresponding file
3. For detailed/lengthy content, create a supporting `design-*.md` file and reference it

### Supporting Documents

When content is too detailed for the main category files:
1. Create `design-docs/specs/design-<topic>.md`
2. Add a reference in the appropriate category file

## User Q&A Directory

Items requiring user confirmation MUST be stored in `design-docs/user-qa/`.

### When to Use

- Questions requiring user decision
- Ambiguous requirements needing clarification
- Design choices awaiting approval
- Implementation alternatives for user selection

### File Naming

| Prefix | Use Case |
|--------|----------|
| `qa-` | Questions/confirmation items |
| `pending-` | Pending decisions |

## References Directory

All external references MUST be stored in `design-docs/references/`.

### Adding References

1. Add the reference entry to `design-docs/references/README.md`
2. For detailed reference materials, create a topic subdirectory (e.g., `references/claude-code/`)
3. Link to `design-docs/references/` in design documents

## Document Template

For supporting documents (`design-*.md`):

```markdown
# Document Title

Brief description of what this document covers.

## Overview

High-level summary of the topic.

## Technical Details

Detailed technical information.

## Usage Examples

Practical examples:

\`\`\`bash
# Example commands or code
\`\`\`

## References

See `design-docs/references/README.md` for external references.
```

## Quick Reference

### Main Category Files

| File | Content |
|------|---------|
| `client.md` | Client design, UI patterns, client-side architecture |
| `architecture.md` | System design, infrastructure, APIs, data flow |
| `notes.md` | Research results, investigations, miscellaneous notes |

### When to Create Supporting Files

Create `design-*.md` only when:
- Content exceeds reasonable section length
- Topic requires detailed technical documentation
- Document needs frequent independent reference
