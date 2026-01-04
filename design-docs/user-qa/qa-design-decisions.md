# Design Decision Q&A

This document collects open design questions requiring user decisions.

**Status**: Pending decisions
**Created**: 2026-01-04
**Priority**: High (blocks implementation)

---

## Q1: TUI Library Selection

### Question

Which TUI library should be used for the terminal interface?

### Options

| Option | Pros | Cons |
|--------|------|------|
| **Ink** (recommended) | React-like patterns, familiar DX, good TypeScript support | Larger bundle (~200KB), React dependency |
| **blessed** | Feature-rich, mature, battle-tested | Complex API, learning curve |
| **terminal-kit** | Lightweight, low-level control | Less abstraction, more boilerplate |
| **React-blessed** | React + blessed combination | Two dependencies |

### Recommendation

Ink is recommended for its React-like component model and modern TypeScript support.

### Decision

- [x] Ink
- [ ] blessed
- [ ] terminal-kit
- [ ] Other: _______________

**Decided**: 2026-01-04
**Rationale**: Mature ecosystem, extensive documentation, first-class TypeScript support

---

## Q2: JSON Query Backend

### Question

Which JSON query backend should be used for filtering session data?

### Options

| Option | Use Case | Trade-off |
|--------|----------|-----------|
| **Pure TypeScript** (recommended for MVP) | Simple filtering, no deps | Limited query power |
| **jq** (via child process) | CLI scripts, complex filters | External dependency |
| **DuckDB** (duckdb-async) | Complex SQL, analytics | Large binary (~50MB) |
| **Hybrid** | TypeScript default, optional jq/DuckDB | Configuration complexity |

### Recommendation

Start with Pure TypeScript for MVP, add jq/DuckDB as optional enhanced query backends.

### Decision

- [ ] Pure TypeScript only
- [ ] jq integration
- [ ] DuckDB integration
- [ ] Hybrid (TypeScript + optional backends)

---

## Q3: Default Viewer Mode

### Question

What should be the default viewer mode when no flags are specified?

### Options

| Option | Rationale |
|--------|-----------|
| **TUI** (recommended) | CLI tool should be terminal-first |
| **Browser** | Richer UI, easier exploration |
| **Auto-detect** | TUI if terminal, browser if not TTY |

### Recommendation

TUI as default, with `--browser` flag for browser mode.

### Decision

- [ ] TUI default
- [ ] Browser default
- [ ] Auto-detect

---

## Q4: Thinking Content Display

### Question

How should thinking content (reasoning traces) be handled by default?

### Options

| Option | Description |
|--------|-------------|
| **Hidden by default** (recommended) | Show only with `--show-thinking` flag |
| **Visible by default** | Always show, hide with `--hide-thinking` |
| **Collapsed** | Show as expandable section |
| **Separate view** | Accessible via dedicated thinking view |

### Recommendation

Hidden by default as thinking content is verbose and not always relevant.

### Decision

- [ ] Hidden by default
- [ ] Visible by default
- [ ] Collapsed sections
- [ ] Separate view

---

## Q5: Session File Discovery Strategy

### Question

How should sessions be discovered across multiple projects?

### Options

| Option | Description |
|--------|-------------|
| **Current project only** (recommended) | Only show sessions for current directory |
| **All projects** | Show all sessions from `~/.claude/projects/` |
| **Recent projects** | Show sessions from recently accessed projects |
| **Explicit list** | Require project path specification |

### Recommendation

Default to current project for focused experience, with `--all-projects` option.

### Decision

- [ ] Current project only
- [ ] All projects
- [ ] Recent projects
- [ ] Other: _______________

---

## Q6: Browser Viewer Technology

### Question

What technology stack should be used for the browser viewer frontend?

### Options

| Option | Pros | Cons |
|--------|------|------|
| **Vanilla JS** (recommended) | No build step, simple, fast | More boilerplate |
| **React** | Component reuse with Ink TUI | Build step, larger bundle |
| **Preact** | Smaller than React, similar API | Still needs build step |
| **htmx** | Server-rendered, simple | Less dynamic |

### Recommendation

Start with vanilla JS for simplicity, no build step required.

### Decision

- [ ] Vanilla JavaScript
- [ ] React
- [ ] Preact
- [ ] htmx
- [ ] Other: _______________

---

## Q7: Tool Name

### Question

What should the CLI tool be named?

### Options

| Option | Rationale |
|--------|-----------|
| `claude-peeper` | Descriptive, indicates "peeking" at sessions |
| `claude-viewer` | Generic, clear purpose |
| `claude-sessions` | Focus on sessions |
| `ccp` | Short, quick to type (claude-code-peeper) |
| `ccv` | Short, quick to type (claude-code-viewer) |

### Recommendation

`claude-peeper` for distinctiveness, with `ccp` as a short alias.

### Decision

- [ ] claude-peeper
- [ ] claude-viewer
- [ ] claude-sessions
- [ ] ccp
- [x] Other: claude-code-agent

**Decided**: 2026-01-04
**Rationale**: Aligns with repository name, broader scope than just "viewing"

---

## Q8: Real-time Update Strategy

### Question

How should real-time session updates be implemented?

### Options

| Option | Implementation | Trade-off |
|--------|----------------|-----------|
| **Polling** (recommended for MVP) | Check file mtime periodically | Simple, cross-platform |
| **inotify/FSEvents** | OS-level file watching | Platform-specific |
| **Hybrid** | Use OS events with polling fallback | More complex |

### Recommendation

Start with polling for simplicity and cross-platform support.

### Decision

- [ ] Polling only
- [ ] OS file watching only
- [ ] Hybrid approach

---

## Q9: Cost Display Format

### Question

How should costs be displayed?

### Options

| Option | Example | Rationale |
|--------|---------|-----------|
| **USD with cents** (recommended) | $0.05 | Standard currency format |
| **USD with precision** | $0.0523 | Full precision |
| **Tokens only** | 1,234 tokens | Avoid monetary display |
| **Both** | $0.05 (1,234 tokens) | Complete information |

### Recommendation

USD with cents for simplicity, with option to show tokens.

### Decision

- [ ] USD with cents
- [ ] USD with full precision
- [ ] Tokens only
- [ ] Both

---

## Q10: Export Format Priority

### Question

Which export formats should be prioritized for implementation?

### Options (select multiple)

| Format | Use Case |
|--------|----------|
| **JSON** | Programmatic access, backup |
| **Markdown** | Human-readable, documentation |
| **HTML** | Styled output, sharing |
| **CSV** | Spreadsheet analysis |
| **PDF** | Formal reports |

### Recommendation

JSON and Markdown for MVP, others as post-MVP.

### Decision (check all that apply)

MVP:
- [ ] JSON
- [ ] Markdown
- [ ] HTML

Post-MVP:
- [ ] CSV
- [ ] PDF

---

## Q11: Command Structure

### Question

What CLI command structure should be used?

### Options

| Option | Example | Rationale |
|--------|---------|-----------|
| **Single command** (recommended) | `claude-peeper --session <id>` | Simple, discoverable |
| **Subcommands** | `claude-peeper list`, `claude-peeper view <id>` | Git-like, organized |
| **Verb-first** | `claude-peeper show <id>`, `claude-peeper watch` | Action-oriented |

### Recommendation

Single command for MVP, subcommands if complexity grows.

### Decision

- [ ] Single command with flags
- [ ] Subcommand structure
- [ ] Verb-first structure

---

## Q12: Session Summarization

### Question

Should sessions be automatically summarized for the list view?

### Options

| Option | Implementation | Trade-off |
|--------|----------------|-----------|
| **No summary** (recommended for MVP) | Show first user message | Simple, fast |
| **Use existing summary** | Read from transcript `summary` type | Available if present |
| **Generate summary** | LLM-generated summary | Expensive, slow |
| **First N characters** | Truncate first message | Fast, predictable |

### Recommendation

Use existing summary from transcript if present, otherwise first user message.

### Decision

- [ ] First user message only
- [ ] Use existing transcript summary
- [ ] Generate summaries
- [ ] Truncated first message

---

## Summary of Decisions Needed

| Question | Current Recommendation | Status |
|----------|------------------------|--------|
| Q1: TUI Library | Ink | **Decided** |
| Q2: JSON Query Backend | Pure TypeScript | Pending |
| Q3: Default Mode | TUI | Pending |
| Q4: Thinking Display | Hidden by default | Pending |
| Q5: Session Discovery | Current project | Pending |
| Q6: Browser Tech | Vanilla JS | Pending |
| Q7: Tool Name | claude-code-agent | **Decided** |
| Q8: Real-time Updates | Polling | Pending |
| Q9: Cost Display | USD with cents | Pending |
| Q10: Export Formats | JSON + Markdown (MVP) | Pending |
| Q11: Command Structure | Single command | Pending |
| Q12: Session Summary | Use existing + first message | Pending |

---

## How to Record Decisions

After making a decision, mark the checkbox and add a note:

```
### Decision

- [x] Ink
- [ ] blessed

**Decided**: 2026-01-04
**Rationale**: React-like patterns align with team experience
```
