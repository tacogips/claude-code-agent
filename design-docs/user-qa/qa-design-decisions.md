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
| **Pure TypeScript** | Simple filtering, no deps | Limited query power |
| **jq** (via child process) | CLI scripts, complex filters | External dependency |
| **DuckDB** (duckdb-async) | Complex SQL, analytics | Large binary (~50MB) |
| **Hybrid** | TypeScript default, optional jq/DuckDB | Configuration complexity |

### Recommendation

DuckDB bundled via npm package for powerful SQL queries on JSONL files.

### Decision

- [ ] Pure TypeScript only
- [ ] jq integration
- [x] DuckDB integration (bundled via `duckdb-async` npm package)
- [ ] Hybrid (TypeScript + optional backends)

**Decided**: 2026-01-04
**Rationale**: DuckDB provides powerful SQL queries on JSONL files. Bundled via npm package (no user installation required). Enables Athena-like query experience.

**Architecture Note**: Follow Clean Architecture - abstract query layer behind repository interface to allow swapping database implementation.

```typescript
// Domain layer - interface
interface SessionRepository {
  findAll(filter?: SessionFilter): Promise<Session[]>;
  findById(id: string): Promise<Session | null>;
  findByProject(projectPath: string): Promise<Session[]>;
}

// Infrastructure layer - DuckDB implementation
class DuckDBSessionRepository implements SessionRepository {
  // DuckDB-specific implementation
}

// Future: alternative implementations
class SQLiteSessionRepository implements SessionRepository { }
class InMemorySessionRepository implements SessionRepository { }
```

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

All options supported simultaneously with priority:
1. `--project <path>` - explicit project
2. `--all` - all projects
3. (default) - current working directory

### Decision

- [x] Combined: Current project default + `--all` + `--project <path>` flags

**Decided**: 2026-01-04
**Rationale**: All three modes are useful and not mutually exclusive. Default to current project for focused experience.

---

## Q6: Browser Viewer Technology

### Question

What technology stack should be used for the browser viewer frontend?

### Options

| Option | Pros | Cons |
|--------|------|------|
| **Vanilla JS** | No build step, simple, fast | More boilerplate |
| **React** | Component reuse with Ink TUI | Build step, larger bundle |
| **Preact** | Smaller than React, similar API | Still needs build step |
| **htmx** | Server-rendered, simple | Less dynamic |
| **SvelteKit** | Full-stack, SSR, small bundle | Build step |

### Recommendation

SvelteKit for full-stack framework with SSR and excellent DX.

### Decision

- [ ] Vanilla JavaScript
- [ ] React
- [ ] Preact
- [ ] htmx
- [x] Other: SvelteKit

**Decided**: 2026-01-04
**Rationale**: SvelteKit provides full-stack framework with SSR, file-based routing, and excellent developer experience. Small bundle size after compilation.

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
| **Polling** | Check file mtime periodically | Simple, cross-platform |
| **fs.watch** | OS-level file watching | Efficient, event-driven |
| **Hybrid** | Use OS events with polling fallback | More complex |

### Recommendation

fs.watch with robust partial line handling.

### Decision

- [ ] Polling only
- [x] OS file watching (fs.watch)
- [ ] Hybrid approach

**Decided**: 2026-01-04
**Rationale**: fs.watch is efficient and event-driven. Must handle edge cases properly.

**Edge Cases to Handle**:

```typescript
// Partial line handling for JSONL streaming
class JsonlTailer {
  private buffer = '';
  private offset = 0;

  async *tail(filePath: string): AsyncGenerator<object> {
    const watcher = fs.watch(filePath);

    for await (const event of watcher) {
      if (event.eventType === 'change') {
        const content = await this.readNewContent(filePath);
        this.buffer += content;

        // Split by newline, keep incomplete last line in buffer
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              yield JSON.parse(line);
            } catch (e) {
              // Log parse error, skip malformed line
              console.warn('Malformed JSON line:', line.substring(0, 50));
            }
          }
        }
      }
    }
  }
}
```

**Considerations**:
- Buffer incomplete lines until newline received
- Handle JSON parse errors gracefully (skip malformed)
- Track file offset to read only new content
- Handle file truncation/rotation

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
| **Single command** | `claude-code-agent --session <id>` | Simple, discoverable |
| **Subcommands** | `claude-code-agent session list`, `claude-code-agent session show <id>` | Git-like, organized |
| **Verb-first** | `claude-code-agent show <id>`, `claude-code-agent watch` | Action-oriented |

### Recommendation

Subcommands for future extensibility and clear entity organization.

### Decision

- [ ] Single command with flags
- [x] Subcommand structure (Noun-oriented)
- [ ] Verb-first structure

**Decided**: 2026-01-04
**Rationale**: Entity-first structure (e.g., `session list`, `agent show`) provides clear organization and scalability for future features

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
| Q2: JSON Query Backend | DuckDB (bundled) | **Decided** |
| Q3: Default Mode | TUI | Pending |
| Q4: Thinking Display | Hidden by default | Pending |
| Q5: Session Discovery | Combined (default: current + flags) | **Decided** |
| Q6: Browser Tech | SvelteKit | **Decided** |
| Q7: Tool Name | claude-code-agent | **Decided** |
| Q8: Real-time Updates | fs.watch (with partial line handling) | **Decided** |
| Q9: Cost Display | USD with cents | Pending |
| Q10: Export Formats | JSON + Markdown (MVP) | Pending |
| Q11: Command Structure | Subcommands (Noun-oriented) | **Decided** |
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
