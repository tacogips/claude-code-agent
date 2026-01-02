# Design Considerations

This document outlines technical design considerations for the Claude Code Peeper project.

For user questions that need answers, see [Pending Questions](../../qa/pending.md).
For project overview and goals, see [Architecture Overview](../overview.md).

## Architecture Overview

The tool will consist of:

1. **Core Library** - TypeScript modules for parsing and accessing Claude Code data
2. **CLI Application** (Bun) - Command-line interface for reading Claude Code files
3. **Web UI** (SvelteKit) - Web interface for browsing and searching data
4. **Auth Manager** - Claude Code authentication token management
5. **API Client** - Interaction with Claude Code API

## Technical Design Considerations

### 1. Data Loading Strategy

Session files and history.jsonl can be very large (several MB). The library must support:

1. **Streaming**: Parse JSONL files line by line without loading entire file
2. **Pagination**: Support offset/limit for large result sets
3. **Lazy loading**: Load data on demand for UI performance

Recommended approach:
- Use async iterators for streaming
- Build lightweight index for fast lookups
- Cache parsed data with configurable TTL

### 2. Library API Design

The library should expose clean APIs for external integration:

```typescript
// Reader API - for accessing Claude Code data
const reader = new ClaudePeeperReader();
const projects = await reader.listProjects();
const sessions = await reader.getProjectSessions(projectId);
const entries = reader.streamSessionEntries(sessionId);

// Normalized export for DB storage
const exporter = new DataExporter(reader);
const messages = await exporter.normalizeSession(sessionId);
// => Array<NormalizedMessage> ready for Vector/FTS DB

// Auth Manager
const auth = new AuthManager();
const tokens = await auth.listTokens();
await auth.setActiveToken(tokenId);

// API Client
const client = new ClaudeCodeClient(auth);
await client.sendMessage(sessionId, "Hello");
```

### 3. Web UI Architecture

SvelteKit with SSR and API routes:

```
src/
├── lib/                    # Shared library code
│   ├── server/             # Server-only code (file access)
│   └── components/         # Svelte components
├── routes/
│   ├── +page.svelte        # Home/dashboard
│   ├── projects/
│   │   ├── +page.svelte    # Project list
│   │   └── [id]/
│   │       └── +page.svelte # Project detail
│   ├── sessions/
│   │   └── [id]/
│   │       └── +page.svelte # Session viewer
│   ├── search/
│   │   └── +page.svelte    # Search interface
│   ├── auth/
│   │   └── +page.svelte    # Token management
│   └── api/                # API endpoints
│       ├── projects/
│       ├── sessions/
│       ├── search/
│       └── claude/         # Claude Code proxy
```

### 4. Auth Token Management

Token management considerations:

1. **Read existing tokens**: Parse `~/.claude/.credentials.json`
2. **Secure storage**: For managed tokens, use encrypted storage
3. **Token validation**: Check token validity before API calls
4. **Multi-account**: Support switching between accounts

```typescript
interface AuthToken {
  id: string;
  name: string;           // User-friendly name
  source: "claude-code" | "managed";
  token: string;          // Encrypted or reference
  createdAt: Date;
  lastUsedAt?: Date;
  isValid?: boolean;
}
```

### 5. Claude Code API Integration

For posting to Claude Code:

1. **Session context**: Need to understand Claude Code's API
2. **Authentication**: Use managed or existing tokens
3. **Message format**: Match Claude Code's expected format
4. **Response handling**: Parse and return structured response

Note: Claude Code's internal API is not publicly documented. May need to reverse-engineer or use CLI wrapper approach.

### 6. Search Architecture

For searchable UI:

1. **Built-in search**: SQLite FTS5 or MiniSearch for local use
2. **External integration**: Export normalized data for Vector/FTS DBs
3. **Search scope**: Messages, tool outputs, thinking content, todos

```typescript
interface SearchResult {
  sessionId: string;
  projectId: string;
  entryId: string;
  type: "user" | "assistant" | "tool" | "thinking";
  content: string;
  snippet: string;        // Highlighted match
  score: number;
  timestamp: Date;
}
```

### 7. Data Normalization for External DBs

For Vector DB / Full-text search integration:

```typescript
interface NormalizedMessage {
  id: string;                    // Unique message ID
  sessionId: string;
  projectId: string;
  projectPath: string;           // Original project path

  // Message content
  role: "user" | "assistant";
  content: string;               // Plain text content
  contentBlocks: ContentBlock[]; // Structured content

  // Tool usage
  toolCalls: ToolCall[];
  toolResults: ToolResult[];

  // Thinking (if available)
  thinking?: string;

  // Metadata
  timestamp: Date;
  gitBranch?: string;
  tokens: TokenUsage;

  // Embedding (if generated)
  embedding?: number[];
}
```

### 8. Error Handling and Compatibility

Since Claude Code updates frequently:

1. **Lenient parsing**: Use Zod with `.passthrough()` for unknown fields
2. **Version detection**: Read `version` field from session entries
3. **Graceful degradation**: Handle missing fields with defaults
4. **Logging**: Warn about unknown fields for debugging

---

## Technical Stack

### Core Dependencies

```json
{
  "dependencies": {
    "zod": "^3.x",           // Schema validation
    "better-sqlite3": "^9.x" // Local search index (optional)
  }
}
```

### CLI Dependencies

```json
{
  "dependencies": {
    "commander": "^12.x",    // CLI framework
    "picocolors": "^1.x",    // Terminal colors
    "ora": "^8.x"            // Spinners
  }
}
```

### Web UI Dependencies

```json
{
  "dependencies": {
    "@sveltejs/kit": "^2.x",
    "tailwindcss": "^3.x"
  }
}
```

---

## Security Considerations

1. **Credential protection**: Never expose raw tokens in UI or logs
2. **File permissions**: Respect Claude Code's file permissions
3. **Input validation**: Validate all user input
4. **API security**: Secure API endpoints in web UI
5. **Export filtering**: Allow excluding sensitive content from exports

---

## Performance Targets

- **Startup time**: < 100ms for CLI
- **Project list**: < 500ms for 100+ projects
- **Session load**: < 1s for 10,000 entry session
- **Search**: < 500ms for full-text search
- **Web UI**: < 2s initial load

---

## Next Steps

1. Answer questions in [Pending Questions](../../qa/pending.md)
2. Create detailed implementation plan
3. Set up monorepo structure
4. Implement core library
5. Build CLI
6. Build Web UI
7. Add tests and documentation
