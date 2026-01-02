# Design Questions

This document contains questions that require user input before implementation.

---

## Q1. Library API Design

### Q1.1 Library Distribution Format

How should the library be distributed?

- [ ] A. NPM package only (for Node.js/Bun projects)
- [ ] B. NPM package + ES modules (for browser/bundler use)
- [ ] C. NPM package + standalone bundle (UMD/IIFE)
- [ ] D. Monorepo with separate packages (core, cli, web)

### Q1.2 Data Export Format

What format should the library expose for external storage?

```typescript
// Option A: Raw parsed data
interface SessionData {
  entries: SessionEntry[];
  metadata: SessionMetadata;
}

// Option B: Normalized/flattened for DB storage
interface NormalizedMessage {
  id: string;
  sessionId: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;           // Flattened text content
  toolCalls: ToolCall[];     // Extracted tool calls
  timestamp: Date;
  tokens: TokenUsage;
}

// Option C: Both (raw + normalized)
```

### Q1.3 Streaming API

Should the library provide streaming APIs for large files?

- [ ] A. Yes, async iterators for all data
- [ ] B. Yes, but only for session/history files
- [ ] C. No, load everything into memory
- [ ] D. Optional - provide both sync and streaming

---

## Q2. Search Functionality

### Q2.1 Built-in Search

Should the app include built-in search or rely on external DBs?

- [ ] A. Built-in full-text search (SQLite FTS, MiniSearch)
- [ ] B. External DB only (user provides connection)
- [ ] C. Both - simple built-in + external integration
- [ ] D. No search - just data export

### Q2.2 Search Scope

What should be searchable?

- [ ] User messages
- [ ] Assistant responses
- [ ] Tool inputs/outputs
- [ ] Thinking content
- [ ] File contents (from file history)
- [ ] Todo items
- [ ] All of the above

### Q2.3 Search Index Location

Where should search indexes be stored?

- [ ] A. In memory (fast, no persistence)
- [ ] B. `~/.claude-peeper/` directory
- [ ] C. Same directory as source data (`~/.claude/`)
- [ ] D. User-configurable

---

## Q3. Claude Code API Interaction

### Q3.1 API Scope

What Claude Code interactions should be supported?

- [ ] A. Read-only (just read tokens, no API calls)
- [ ] B. Send messages to existing sessions
- [ ] C. Create new sessions
- [ ] D. Full Claude Code CLI wrapper
- [ ] E. B + C (send messages, create sessions)

### Q3.2 Authentication Method

How should authentication work?

- [ ] A. Read existing tokens from `~/.claude/.credentials.json`
- [ ] B. Manage separate tokens (independent of Claude Code)
- [ ] C. Both - read existing + manage additional
- [ ] D. OAuth flow for new authentication

### Q3.3 Multi-account Support

Should multi-account be supported?

- [ ] A. Single account only (current user)
- [ ] B. Multiple accounts with switching
- [ ] C. Multiple accounts with simultaneous access

---

## Q4. Web UI Design

### Q4.1 UI Framework/Styling

What styling approach for the web UI?

- [ ] A. TailwindCSS
- [ ] B. Plain CSS / CSS Modules
- [ ] C. Component library (shadcn-svelte, skeleton)
- [ ] D. Minimal/unstyled (user can customize)

### Q4.2 Session Viewer Features

What features for viewing sessions?

- [ ] A. Plain text transcript
- [ ] B. Formatted markdown rendering
- [ ] C. Collapsible tool calls
- [ ] D. Syntax highlighting for code
- [ ] E. Thinking block toggle
- [ ] F. Token usage display
- [ ] G. All of the above

### Q4.3 Real-time Updates

Should the web UI update in real-time?

- [ ] A. No - static snapshot, manual refresh
- [ ] B. Yes - file watching with auto-refresh
- [ ] C. Optional - user can enable/disable

### Q4.4 Server Mode

How should the web server work?

- [ ] A. Development server only (for local use)
- [ ] B. Production server (can deploy)
- [ ] C. Static export (pre-build HTML)
- [ ] D. A + B (local dev + deployable)

---

## Q5. CLI Design

### Q5.1 CLI Framework

What CLI framework to use?

- [ ] A. commander.js
- [ ] B. yargs
- [ ] C. citty (unjs)
- [ ] D. Custom with Bun.argv

### Q5.2 CLI Output Format

What output formats should CLI support?

- [ ] A. Human-readable text only
- [ ] B. JSON output option
- [ ] C. Table format option
- [ ] D. All of the above

### Q5.3 Interactive Mode

Should CLI have interactive mode?

- [ ] A. No - command-based only
- [ ] B. Yes - simple REPL
- [ ] C. Yes - TUI with navigation (ink, blessed)

---

## Q6. Data Privacy and Security

### Q6.1 Credential Handling

How to handle `.credentials.json`?

- [ ] A. Read but never display/export token values
- [ ] B. Allow token export with explicit flag
- [ ] C. Skip credentials entirely
- [ ] D. Encrypted storage for managed tokens

### Q6.2 Sensitive Content Detection

Should the app detect potentially sensitive content?

- [ ] A. No detection
- [ ] B. Warn on common patterns (API keys, passwords)
- [ ] C. Redact detected sensitive content
- [ ] D. User-configurable rules

### Q6.3 Export Filtering

Should exports allow filtering sensitive data?

- [ ] A. Export everything
- [ ] B. Exclude tool outputs by default
- [ ] C. Exclude thinking content by default
- [ ] D. User-configurable exclusions

---

## Q7. External Integration

### Q7.1 Vector DB Support

Which vector DBs should be supported (if any)?

- [ ] A. None (user implements)
- [ ] B. Generic interface (user provides adapter)
- [ ] C. Built-in support for specific DBs:
  - [ ] Pinecone
  - [ ] Qdrant
  - [ ] Weaviate
  - [ ] ChromaDB
  - [ ] pgvector

### Q7.2 Full-text Search DB Support

Which search DBs should be supported (if any)?

- [ ] A. None (user implements)
- [ ] B. Generic interface (user provides adapter)
- [ ] C. Built-in support for specific DBs:
  - [ ] Elasticsearch
  - [ ] Meilisearch
  - [ ] Typesense
  - [ ] SQLite FTS

### Q7.3 Embedding Generation

Should the library generate embeddings?

- [ ] A. No - external service responsibility
- [ ] B. Yes - using OpenAI API
- [ ] C. Yes - using local model (transformers.js)
- [ ] D. Yes - using Claude API
- [ ] E. Pluggable - user provides embedding function

---

## Q8. Performance and Scalability

### Q8.1 Large File Handling

How to handle very large files (>100MB history)?

- [ ] A. Stream everything (slower random access)
- [ ] B. Build index on first read
- [ ] C. Limit to recent data by default
- [ ] D. User-configurable limits

### Q8.2 Caching Strategy

Should parsed data be cached?

- [ ] A. No caching
- [ ] B. Memory cache only (session lifetime)
- [ ] C. Disk cache with invalidation
- [ ] D. SQLite-based cache

### Q8.3 Concurrent Access

Should multiple instances be supported?

- [ ] A. Single instance only
- [ ] B. Multiple readers allowed
- [ ] C. Lock file for write operations

---

## Q9. Project Structure

### Q9.1 Monorepo Structure

How should the project be structured?

- [ ] A. Single package (everything together)
- [ ] B. Monorepo with workspaces:
  - `packages/core` - Core library
  - `packages/cli` - CLI application
  - `packages/web` - Web UI
  - `packages/types` - Shared types
- [ ] C. Separate repositories

### Q9.2 Build Tool

What build tool for the library?

- [ ] A. Bun only (Bun.build)
- [ ] B. tsup (for npm compatibility)
- [ ] C. unbuild (unjs)
- [ ] D. esbuild directly

---

## Q10. Documentation

### Q10.1 Documentation Format

How should documentation be provided?

- [ ] A. README only
- [ ] B. README + JSDoc comments
- [ ] C. Dedicated docs site (VitePress, Starlight)
- [ ] D. TypeDoc generated API docs

### Q10.2 Examples

What examples should be included?

- [ ] Basic usage examples
- [ ] Vector DB integration example
- [ ] Full-text search integration example
- [ ] Claude Code API interaction example
- [ ] Web UI customization example

---

## Summary: Priority Questions

Please answer these questions in order of importance:

### Must Answer Before Starting

1. **Q9.1**: Monorepo structure - affects initial setup
2. **Q1.2**: Data export format - affects core API design
3. **Q3.1**: API scope - determines auth module requirements
4. **Q2.1**: Built-in search - affects architecture

### Can Decide During Implementation

5. **Q4.1**: UI framework
6. **Q5.1**: CLI framework
7. **Q7**: External integration scope
8. **Q8**: Performance strategies

### Can Decide Later

9. **Q10**: Documentation format
10. **Q4.4**: Server deployment mode
