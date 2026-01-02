# Pending Design Questions

**Status**: AWAITING RESPONSE
**Iteration**: 1

Please answer these questions by editing `design-docs/qa/responses.md`.

---

## Q1: Monorepo Structure

**Context**: Project structure affects build setup, dependency management, and code organization. Need to decide before implementation starts.

**Question**: How should the project be structured?

**Options**:
- [ ] A. Single package (all code in one package)
- [ ] B. Monorepo with workspaces:
  - `packages/core` - Core library (reader, parser)
  - `packages/cli` - CLI application
  - `packages/web` - SvelteKit Web UI
  - `packages/types` - Shared TypeScript types
- [ ] C. Separate repositories for each component

**Recommendation**: B (Monorepo) - Allows shared code while maintaining separation of concerns.

**Impact**: Build configuration, dependency management, release process.

---

## Q2: Library Export Format

**Context**: The library will be used externally for integrating with Vector DB and Full-text search DBs. The export format affects how external systems consume the data.

**Question**: What data format should the library expose?

**Options**:
- [ ] A. Raw parsed data only (direct mapping of Claude Code files)
- [ ] B. Normalized/flattened format (optimized for DB storage)
- [ ] C. Both raw and normalized (maximum flexibility)

**Example Normalized Format**:
```typescript
interface NormalizedMessage {
  id: string;
  sessionId: string;
  projectPath: string;
  role: "user" | "assistant";
  content: string;        // Flattened text
  toolCalls: ToolCall[];  // Extracted separately
  tokens: TokenUsage;
  timestamp: Date;
}
```

**Recommendation**: C (Both) - Raw for inspection, normalized for integration.

**Impact**: API surface, external integration complexity.

---

## Q3: Claude Code API Scope

**Context**: You mentioned wanting to POST to Claude Code. Need to understand the scope of API interaction.

**Question**: What Claude Code interactions should be supported?

**Options**:
- [ ] A. Read-only (just read tokens and files, no API calls)
- [ ] B. Send messages to existing sessions
- [ ] C. Create new sessions programmatically
- [ ] D. Full CLI wrapper (spawn Claude Code process)
- [ ] E. B + C (send messages and create sessions)

**Note**: Claude Code's internal API is not publicly documented. May need to use CLI wrapper or reverse-engineer protocol.

**Impact**: Auth module complexity, implementation difficulty.

---

## Q4: Search Implementation

**Context**: You mentioned searchable UI. Need to decide if search is built-in or relies on external systems.

**Question**: How should search be implemented?

**Options**:
- [ ] A. Built-in only (SQLite FTS5 or MiniSearch)
- [ ] B. External DB only (user provides connection to ES/Meilisearch)
- [ ] C. Both (simple built-in + external integration)
- [ ] D. No built-in search (export-only for external DBs)

**Recommendation**: C - Built-in for quick local use, external for production.

**Impact**: Dependencies, complexity, deployment options.

---

## Q5: Auth Token Management Scope

**Context**: You mentioned auth token management. Need to clarify scope.

**Question**: What auth token features are needed?

**Options**:
- [ ] A. Read-only (read existing ~/.claude/.credentials.json)
- [ ] B. Read + validate (check if tokens are valid)
- [ ] C. Full management (add, remove, switch tokens)
- [ ] D. Multi-account (manage multiple Claude accounts)

**Impact**: Security considerations, storage requirements.

---

## Q6: Web UI Styling

**Context**: SvelteKit Web UI needs styling approach.

**Question**: What styling approach for the Web UI?

**Options**:
- [ ] A. TailwindCSS
- [ ] B. Plain CSS / CSS Modules
- [ ] C. Component library (shadcn-svelte)
- [ ] D. Minimal/unstyled (user customizes)

**Recommendation**: A (TailwindCSS) - Fast to develop, widely understood.

**Impact**: Development speed, customization options.

---

## Q7: CLI Framework

**Context**: CLI needs a command parsing framework.

**Question**: What CLI framework to use?

**Options**:
- [ ] A. commander.js (popular, well-documented)
- [ ] B. yargs (feature-rich)
- [ ] C. citty (lightweight, from unjs)
- [ ] D. Custom with Bun.argv (minimal dependencies)

**Recommendation**: A (commander.js) - Good balance of features and simplicity.

**Impact**: CLI development experience, dependency size.

---

## Q8: Embedding Generation

**Context**: For Vector DB integration, embeddings are needed.

**Question**: Should the library generate embeddings?

**Options**:
- [ ] A. No (external responsibility)
- [ ] B. Yes, using OpenAI API
- [ ] C. Yes, using Claude API
- [ ] D. Yes, using local model (transformers.js)
- [ ] E. Pluggable (user provides embedding function)

**Recommendation**: E (Pluggable) - Maximum flexibility without forcing dependencies.

**Impact**: Dependencies, API costs, offline capability.

---

## Q9: Real-time Updates

**Context**: During active Claude Code sessions, files change frequently.

**Question**: Should the viewer update in real-time?

**Options**:
- [ ] A. No (static snapshot, manual refresh)
- [ ] B. Yes (file watching with auto-refresh)
- [ ] C. Optional (user can enable/disable)

**Recommendation**: C (Optional) - Good UX without forced complexity.

**Impact**: Implementation complexity, resource usage.

---

## Q10: Priority Features

**Context**: Need to understand MVP scope vs future features.

**Question**: Which features are MVP (must-have for first release)?

Check all that apply:
- [ ] Project/session browser
- [ ] Session transcript viewer
- [ ] Full-text search
- [ ] Token usage statistics
- [ ] Cost tracking
- [ ] Auth token management
- [ ] Claude Code API interaction (POST)
- [ ] Vector DB export
- [ ] CLI tool
- [ ] Web UI

---

## Instructions

1. Edit `design-docs/qa/responses.md` directly
2. Mark your choices with `[x]`
3. Add any comments or clarifications
4. Save the file
5. Claude will process on next iteration
