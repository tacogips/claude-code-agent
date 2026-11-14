# Claude-Mem Reference Documentation

This document provides a comprehensive analysis of [claude-mem](https://github.com/thedotmack/claude-mem), a persistent memory compression system for Claude Code sessions.

## Overview

**Repository**: https://github.com/thedotmack/claude-mem
**Author**: Alex Newman (@thedotmack)
**License**: AGPL-3.0 (core), PolyForm Noncommercial 1.0.0 (ragtime module)
**Current Version**: 6.5.0

Claude-mem enables Claude Code to maintain context continuity across sessions by:
1. Automatically capturing tool usage observations during sessions
2. Generating semantic summaries using Claude Agent SDK
3. Storing observations and summaries in SQLite with FTS5 full-text search
4. Injecting relevant context into future sessions via Claude Code hooks

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code Session                          │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ SessionStart│───▶│UserPromptSub │───▶│ PostToolUse  │──┐   │
│  └─────────────┘    └──────────────┘    └──────────────┘  │   │
│                                                            │   │
│  ┌──────────────┐   ┌──────────────┐                     │   │
│  │  SessionEnd  │◀──│    Stop      │◀────────────────────┘   │
│  └──────────────┘   └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Worker Service (HTTP API)                    │
│                     localhost:37777                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Hook Handlers  │  Context Generator  │  Search API      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SQLite Database                        │  │
│  │   sdk_sessions │ observations │ summaries │ FTS5 index   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Chroma Vector Database (Optional)            │  │
│  │                Semantic Embeddings                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Lifecycle Hooks System

Claude-mem integrates with Claude Code using 5 lifecycle hooks defined in `plugin/hooks/hooks.json`:

| Hook | Trigger | Purpose |
|------|---------|---------|
| `SessionStart` | New session starts | Initialize worker, generate context, inject memory |
| `UserPromptSubmit` | User submits prompt | Initialize session tracking |
| `PostToolUse` | After each tool use | Capture observations from tool execution |
| `Stop` | Session pausing/ending | Generate progress summary |
| `SessionEnd` | Session fully ends | Finalize session data |

**Hook Execution Flow**:
```json
{
  "SessionStart": [
    { "command": "smart-install.js" },      // Check dependencies
    { "command": "worker-service.cjs start" },   // Start worker
    { "command": "worker-service.cjs hook claude-code context" },  // Generate context
    { "command": "worker-service.cjs hook claude-code user-message" }
  ],
  "PostToolUse": [
    { "command": "worker-service.cjs start" },
    { "command": "worker-service.cjs hook claude-code observation" }
  ],
  "Stop": [
    { "command": "worker-service.cjs start" },
    { "command": "worker-service.cjs hook claude-code summarize" }
  ]
}
```

### 2. Worker Service

The worker service is a Bun-managed HTTP API running on port 37777:

**Responsibilities**:
- Process AI observation/summary generation asynchronously
- Manage SQLite database connections
- Serve web viewer UI
- Handle search API requests
- Coordinate with Chroma vector database

**Key Endpoints** (inferred from architecture):
- `/api/hook/...` - Hook event handlers
- `/api/search` - Observation search
- `/api/timeline` - Chronological context
- `/api/observation/:id` - Individual observation lookup

### 3. Database Schema

SQLite database at `~/.claude-mem/claude-mem.db`:

**Core Tables**:

```
sdk_sessions
├── id (INTEGER PRIMARY KEY)
├── content_session_id (TEXT)  -- Claude Code session ID
├── memory_session_id (TEXT)   -- SDK agent session ID (nullable)
├── project (TEXT)
├── started_at (TEXT)
└── ended_at (TEXT)

observations
├── id (INTEGER PRIMARY KEY)
├── memory_session_id (TEXT)   -- FK to sdk_sessions
├── project (TEXT)
├── type (TEXT)                -- bugfix|feature|refactor|change|discovery|decision
├── title (TEXT)
├── subtitle (TEXT)
├── facts (TEXT)               -- JSON array
├── narrative (TEXT)
├── concepts (TEXT)            -- JSON array
├── files (TEXT)               -- JSON array of file paths
├── prompt_number (INTEGER)
├── created_at (TEXT)
└── created_at_epoch (INTEGER)

summaries (session_summaries)
├── id (INTEGER PRIMARY KEY)
├── memory_session_id (TEXT)
├── request (TEXT)
├── investigated (TEXT)
├── learned (TEXT)
├── completed (TEXT)
├── next_steps (TEXT)
├── notes (TEXT)
└── created_at (TEXT)

user_prompts
├── id (INTEGER PRIMARY KEY)
├── memory_session_id (TEXT)
├── prompt_number (INTEGER)
├── prompt_text (TEXT)
└── created_at (TEXT)

schema_versions
├── id (INTEGER PRIMARY KEY)
├── version (INTEGER)
└── applied_at (TEXT)
```

**Full-Text Search (FTS5)**:
- Observations and summaries indexed for full-text search
- Supports natural language queries

### 4. Session ID Architecture

Claude-mem uses **dual session IDs**:

| ID Type | Source | Purpose |
|---------|--------|---------|
| `contentSessionId` | Claude Code | User's conversation session, used for observation storage |
| `memorySessionId` | Claude Agent SDK | Agent's internal session for resume functionality |

**Key Invariant**: Observations are stored using `contentSessionId`, not `memorySessionId`.

**Session Lifecycle**:
```
1. Hook creates session → memory_session_id = NULL
2. SDK agent starts → checks if memory_session_id is NULL (no resume)
3. First SDK message → captures real memory_session_id
4. Subsequent prompts → uses resume with captured memory_session_id
```

### 5. Observation System

**Observation Types** (from `plugin/modes/code.json`):
| Type | Description |
|------|-------------|
| `bugfix` | Something was broken, now fixed |
| `feature` | New capability or functionality added |
| `refactor` | Code restructured, behavior unchanged |
| `change` | Generic modification (docs, config, misc) |
| `discovery` | Learning about existing system |
| `decision` | Architectural/design choice with rationale |

**Observation Concepts** (knowledge categories):
- `how-it-works` - Understanding mechanisms
- `why-it-exists` - Purpose or rationale
- `what-changed` - Modifications made
- `problem-solution` - Issues and their fixes
- `gotcha` - Traps or edge cases
- `pattern` - Reusable approach
- `trade-off` - Pros/cons of a decision

**Observation Structure**:
```typescript
interface ObservationInput {
  type: string;          // One of the 6 observation types
  title: string | null;
  subtitle: string | null;
  facts: string[];       // Self-contained statements
  narrative: string | null;
  concepts: string[];    // 2-5 knowledge categories
  files: string[];       // All files touched
}
```

### 6. Context Generation

The context system uses progressive disclosure to optimize token usage:

**Context Module Structure** (`src/services/context/`):
```
context/
├── ContextBuilder.ts       -- Main orchestrator
├── ContextConfigLoader.ts  -- Configuration loading
├── TokenCalculator.ts      -- Token economics
├── ObservationCompiler.ts  -- Data retrieval
├── types.ts                -- Type definitions
├── formatters/
│   ├── MarkdownFormatter.ts
│   └── ColorFormatter.ts
└── sections/
    ├── HeaderRenderer.ts
    ├── TimelineRenderer.ts
    ├── SummaryRenderer.ts
    └── FooterRenderer.ts
```

**Context Input**:
```typescript
interface ContextInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  source?: "startup" | "resume" | "clear" | "compact";
  projects?: string[];  // For worktree support
}
```

### 7. Search System

**3-Layer Workflow Pattern** (token-efficient):
1. **`search`** - Get compact index with IDs (~50-100 tokens/result)
2. **`timeline`** - Get chronological context around results
3. **`get_observations`** - Fetch full details ONLY for filtered IDs (~500-1000 tokens/result)

**Result**: ~10x token savings by filtering before fetching details

**MCP Tools**:
- `search` - Search memory index with full-text queries, filters
- `timeline` - Chronological context around observations
- `get_observations` - Fetch full observation details by IDs
- `__IMPORTANT` - Workflow documentation (always visible)

### 8. Privacy Controls

Users can exclude sensitive content using privacy tags:

```xml
<private>sensitive content here</private>
```

**Implementation**: Tag stripping happens at the hook layer (edge processing) before data reaches the worker/database. Utilities in `src/utils/tag-stripping.ts`.

## Key Design Patterns

### 1. Separation of Observer and Observed

Claude-mem uses a dedicated "memory agent" (via Claude Agent SDK) that observes the primary Claude Code session. The memory agent:
- Does NOT perform any work
- Only observes and records tool usage
- Generates observations in XML format
- Creates progress summaries at checkpoints

### 2. XML-Based Observation Format

Observations are generated in XML format for structured parsing:

```xml
<observation>
  <type>feature</type>
  <title>Added authentication middleware</title>
  <subtitle>Implements JWT validation for API endpoints</subtitle>
  <facts>
    <fact>JWT tokens are validated using RS256 algorithm</fact>
    <fact>Token expiration is set to 24 hours</fact>
  </facts>
  <narrative>Full context about implementation...</narrative>
  <concepts>
    <concept>how-it-works</concept>
    <concept>pattern</concept>
  </concepts>
  <files>
    <file>src/middleware/auth.ts</file>
  </files>
</observation>
```

### 3. Mode-Based Configuration

Claude-mem supports different "modes" for different workflows:

```
plugin/modes/
├── code.json           -- Default software development mode
├── code--ja.json       -- Japanese language variant
├── code--chill.json    -- Relaxed observation mode
└── email-investigation.json  -- Specialized investigation mode
```

Each mode defines:
- Observation types and concepts
- System prompts for the memory agent
- Field guidance and format examples

### 4. Hybrid Search Architecture

Combines SQLite FTS5 with Chroma vector database:
- **SQLite FTS5**: Fast full-text keyword search
- **Chroma**: Semantic similarity search via embeddings

## Unique Features

### 1. Automatic Operation
No manual intervention required - hooks automatically capture and process tool usage.

### 2. Progressive Disclosure
Layered memory retrieval with token cost visibility - optimizes context window usage.

### 3. Skill-Based Search
Natural language queries through the mem-search skill.

### 4. Web Viewer UI
Real-time memory stream at http://localhost:37777.

### 5. Citations
Reference past observations by ID with direct API access.

### 6. Beta Features (Endless Mode)
Biomimetic memory architecture for extended sessions.

## Technology Stack

- **Runtime**: Bun (JavaScript/TypeScript)
- **Build**: esbuild, TypeScript
- **Database**: SQLite3 with FTS5
- **Vector DB**: Chroma (Python, via uv)
- **AI SDK**: Claude Agent SDK
- **Hook System**: Claude Code plugin hooks

## File Locations

| Purpose | Path |
|---------|------|
| Source code | `<project-root>/src/` |
| Built plugin | `<project-root>/plugin/` |
| Installed plugin | `~/.claude/plugins/marketplaces/thedotmack/` |
| Database | `~/.claude-mem/claude-mem.db` |
| Settings | `~/.claude-mem/settings.json` |
| Vector DB | `~/.claude-mem/chroma/` |

## Relevance to claude-code-agent

Claude-mem provides valuable patterns for session persistence in claude-code-agent:

1. **Hook Integration**: Uses Claude Code's lifecycle hooks for observation capture
2. **Dual Session ID Pattern**: Separates content session from agent session
3. **Progressive Context Injection**: Optimizes token usage with layered retrieval
4. **Observation Taxonomy**: Structured categorization of session activities
5. **FTS5 + Vector Search**: Hybrid search for both keyword and semantic queries
6. **Worker Service Pattern**: Background processing with HTTP API

## References

- Repository: https://github.com/thedotmack/claude-mem
- Documentation: https://docs.claude-mem.ai
- Discord: https://discord.com/invite/J4wttp9vDu
