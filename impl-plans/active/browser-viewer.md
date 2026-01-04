# Browser Viewer Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-viewers.md#2-browser-viewer
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 2: Browser Viewer (Primary UI)

### Summary

Implement the browser-based viewer for claude-code-agent using SvelteKit. The browser viewer is the primary interactive interface, providing session list, message timeline, token usage visualization, and queue management UI.

### Scope

**Included**:
- SvelteKit application setup
- HTTP server with Elysia
- Session list with search/filter
- Session detail view with message timeline
- Syntax highlighting for code blocks
- Token usage and cost display
- Export functionality (JSON, Markdown)
- Dark/light theme toggle
- Queue management UI (list and detail views)
- Real-time updates via WebSocket

**Excluded**:
- TUI viewer (deferred, low priority)
- Authentication (viewer is local, read-only by default)

---

## Implementation Overview

### Approach

Build the viewer as a SvelteKit application served by an Elysia HTTP server. The server provides REST API endpoints for data access and WebSocket for real-time updates.

### Key Decisions

- SvelteKit for SSR and file-based routing
- Elysia for HTTP/WebSocket server
- Tailwind CSS for styling
- Shiki for syntax highlighting
- LocalStorage for user preferences (theme)

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| SDK | Required | Other plans |
| Session Reader | Required | foundation-and-core.md |
| Real-time Monitoring | Required | realtime-monitoring.md |

---

## Deliverables

### Deliverable 1: src/viewer/browser/server.ts

**Purpose**: HTTP server for browser viewer

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `ViewerServer` | class | HTTP server for viewer | CLI server start |
| `ViewerConfig` | interface | Server configuration | ViewerServer |

**Class Definition**:

```
ViewerServer
  Purpose: Serve browser viewer and API endpoints
  Constructor: (config: ViewerConfig, sdk: ClaudeCodeAgent)
  Public Methods:
    - start(): Promise<void>
    - stop(): Promise<void>
    - getUrl(): string
  Private Methods:
    - setupStaticRoutes(): void
    - setupApiRoutes(): void
    - setupWebSocket(): void
  Private Properties:
    - app: Elysia
    - config: ViewerConfig
    - sdk: ClaudeCodeAgent
  Used by: CLI server start

ViewerConfig
  Purpose: Server configuration
  Properties:
    - port: number - Server port (default: 3000)
    - host: string - Bind address (default: 127.0.0.1)
    - openBrowser: boolean - Auto-open browser
  Used by: ViewerServer
```

**Dependencies**: `elysia`, `src/sdk/index.ts`

**Dependents**: CLI server commands

---

### Deliverable 2: src/viewer/browser/routes/api.ts

**Purpose**: REST API routes for viewer

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `setupApiRoutes` | function | Register API routes | ViewerServer |

**Routes**:

```
GET /api/sessions
  Query: { projectPath?, limit?, offset? }
  Response: Session[]
  Purpose: List sessions for display

GET /api/sessions/:id
  Response: Session with messages
  Purpose: Get session detail

GET /api/sessions/:id/messages
  Query: { parseMarkdown? }
  Response: Message[]
  Purpose: Get session messages

GET /api/tasks
  Response: Task[]
  Purpose: Get current active tasks

GET /api/projects
  Response: Project[]
  Purpose: List available projects

GET /api/queues
  Response: CommandQueue[]
  Purpose: List command queues

GET /api/queues/:id
  Response: CommandQueue with commands
  Purpose: Get queue detail
```

**Dependencies**: `elysia`, `src/sdk/index.ts`

**Dependents**: ViewerServer

---

### Deliverable 3: src/viewer/browser/routes/ws.ts

**Purpose**: WebSocket for real-time updates

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `setupWebSocket` | function | Register WebSocket handler | ViewerServer |

**Protocol**:

```
Client -> Server:
  { type: 'subscribe', sessionId: string }
  { type: 'unsubscribe', sessionId: string }

Server -> Client:
  { type: 'session_update', sessionId: string, payload: SessionUpdate }
  { type: 'new_message', sessionId: string, payload: Message }
  { type: 'session_end', sessionId: string }
  { type: 'queue_update', queueId: string, payload: QueueUpdate }
```

**Dependencies**: `elysia`, `src/sdk/events/emitter.ts`

**Dependents**: ViewerServer, SvelteKit client

---

### Deliverable 4: src/viewer/browser/static/

**Purpose**: SvelteKit application

**Structure**:

```
static/
+-- src/
|   +-- routes/
|   |   +-- +page.svelte              # Session list
|   |   +-- sessions/
|   |   |   +-- [id]/+page.svelte     # Session detail
|   |   +-- queues/
|   |   |   +-- +page.svelte          # Queue list
|   |   |   +-- [id]/+page.svelte     # Queue detail
|   |   +-- +layout.svelte            # App layout
|   +-- lib/
|   |   +-- api.ts                    # API client
|   |   +-- websocket.ts              # WebSocket client
|   |   +-- stores/
|   |   |   +-- sessions.ts           # Session store
|   |   |   +-- theme.ts              # Theme store
|   |   +-- components/
|   |       +-- SessionList.svelte    # Session list component
|   |       +-- MessageTimeline.svelte # Message timeline
|   |       +-- CodeBlock.svelte      # Syntax highlighted code
|   |       +-- CostDisplay.svelte    # Token/cost display
|   |       +-- ThemeToggle.svelte    # Theme toggle
|   |       +-- QueueList.svelte      # Queue list
|   |       +-- QueueDetail.svelte    # Queue detail with commands
|   |       +-- CommandEditor.svelte  # Edit command modal
|   +-- app.css                       # Global styles (Tailwind)
+-- tailwind.config.js
+-- svelte.config.js
+-- vite.config.js
```

**Components**:

```
SessionList.svelte
  Purpose: Display filterable list of sessions
  Props:
    - sessions: Session[]
    - currentProject: string
    - onSelect: (sessionId: string) => void
  Features: Search, sort by date/cost, project filter

MessageTimeline.svelte
  Purpose: Display session messages as timeline
  Props:
    - messages: Message[]
    - showThinking: boolean
  Features: User/assistant differentiation, tool calls, timestamps

CodeBlock.svelte
  Purpose: Syntax highlighted code display
  Props:
    - code: string
    - language: string
  Features: Shiki highlighting, copy button

CostDisplay.svelte
  Purpose: Display token usage and cost
  Props:
    - tokens: { input: number; output: number }
    - cost: number
  Features: Formatted display, bar chart

QueueList.svelte
  Purpose: Display list of command queues
  Props:
    - queues: CommandQueue[]
    - onSelect: (queueId: string) => void
  Features: Status indicators, progress bars

QueueDetail.svelte
  Purpose: Display queue with command management
  Props:
    - queue: CommandQueue
    - onCommandUpdate: (command: QueueCommand) => void
  Features: Command list, inline editing, drag-and-drop reorder

CommandEditor.svelte
  Purpose: Modal for editing commands
  Props:
    - command: QueueCommand
    - onSave: (updates: UpdateCommandOptions) => void
  Features: Prompt editing, session mode toggle
```

**Dependencies**: SvelteKit, Tailwind CSS, Shiki

**Dependents**: ViewerServer serves this as static content

---

### Deliverable 5: src/viewer/browser/lib/api.ts

**Purpose**: API client for frontend

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `api` | object | API client instance | Svelte components |

**Functions**:

```
api.sessions.list(filter?: SessionFilter): Promise<Session[]>
api.sessions.get(id: string): Promise<Session>
api.sessions.getMessages(id: string, options?: { parseMarkdown?: boolean }): Promise<Message[]>
api.projects.list(): Promise<Project[]>
api.queues.list(): Promise<CommandQueue[]>
api.queues.get(id: string): Promise<CommandQueue>
api.queues.updateCommand(queueId: string, index: number, updates: object): Promise<void>
api.queues.reorderCommand(queueId: string, from: number, to: number): Promise<void>
```

**Dependencies**: fetch API

**Dependents**: Svelte components

---

### Deliverable 6: src/viewer/browser/lib/websocket.ts

**Purpose**: WebSocket client for real-time updates

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `createWebSocket` | function | Create WebSocket connection | Svelte stores |
| `WebSocketClient` | class | WebSocket client | Components |

**Class Definition**:

```
WebSocketClient
  Purpose: Manage WebSocket connection with auto-reconnect
  Constructor: (url: string)
  Public Methods:
    - subscribe(sessionId: string): void
    - unsubscribe(sessionId: string): void
    - onMessage(handler: (msg: ServerMessage) => void): void
    - close(): void
  Private Methods:
    - connect(): void
    - reconnect(): void
  Private Properties:
    - ws: WebSocket
    - handlers: Set<(msg: ServerMessage) => void>
    - subscriptions: Set<string>
```

**Dependencies**: WebSocket API

**Dependents**: Svelte stores

---

## Subtasks

### TASK-001: Server Setup

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/viewer/browser/server.ts`
**Estimated Effort**: Small

**Description**:
Set up the Elysia HTTP server for the browser viewer.

**Completion Criteria**:
- [ ] ViewerServer class implemented
- [ ] start() and stop() lifecycle
- [ ] Static file serving configuration
- [ ] Auto-open browser functionality
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-002: API Routes

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/viewer/browser/routes/api.ts`
**Estimated Effort**: Medium

**Description**:
Implement REST API routes for the viewer.

**Completion Criteria**:
- [ ] Sessions list and detail endpoints
- [ ] Messages endpoint with parseMarkdown
- [ ] Tasks endpoint
- [ ] Projects endpoint
- [ ] Queues list and detail endpoints
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-003: WebSocket Handler

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/viewer/browser/routes/ws.ts`
**Estimated Effort**: Medium

**Description**:
Implement WebSocket handler for real-time updates.

**Completion Criteria**:
- [ ] Subscribe/unsubscribe protocol
- [ ] Session update broadcasting
- [ ] Queue update broadcasting
- [ ] Connection management
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-004: SvelteKit Setup

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: SvelteKit project structure, configs
**Estimated Effort**: Medium

**Description**:
Set up SvelteKit project with Tailwind CSS.

**Completion Criteria**:
- [ ] SvelteKit project initialized
- [ ] Tailwind CSS configured
- [ ] Layout with navigation
- [ ] Theme toggle (dark/light)
- [ ] Responsive design
- [ ] Type checking passes

---

### TASK-005: Session List Page

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `routes/+page.svelte`, `lib/components/SessionList.svelte`
**Estimated Effort**: Medium

**Description**:
Implement the session list page.

**Completion Criteria**:
- [ ] Session list display
- [ ] Search functionality
- [ ] Project filter
- [ ] Sort by date/cost
- [ ] Click to navigate to detail
- [ ] Real-time updates via WebSocket
- [ ] Type checking passes

---

### TASK-006: Session Detail Page

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `routes/sessions/[id]/+page.svelte`, message components
**Estimated Effort**: Large

**Description**:
Implement the session detail page with message timeline.

**Completion Criteria**:
- [ ] Message timeline display
- [ ] User/assistant message styling
- [ ] Tool call display
- [ ] Code syntax highlighting with Shiki
- [ ] Token usage display
- [ ] Cost display
- [ ] Export buttons (JSON, Markdown)
- [ ] Show/hide thinking toggle
- [ ] Real-time message updates
- [ ] Type checking passes

---

### TASK-007: Queue Pages

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: Queue routes and components
**Estimated Effort**: Large

**Description**:
Implement queue list and detail pages with command management.

**Completion Criteria**:
- [ ] Queue list page
- [ ] Queue detail page
- [ ] Command list display
- [ ] Status indicators
- [ ] Inline command editing
- [ ] Drag-and-drop reordering
- [ ] Session mode toggle
- [ ] Add/remove commands
- [ ] Real-time updates via WebSocket
- [ ] Type checking passes

---

### TASK-008: API and WebSocket Clients

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `lib/api.ts`, `lib/websocket.ts`
**Estimated Effort**: Small

**Description**:
Implement frontend API and WebSocket clients.

**Completion Criteria**:
- [ ] API client with all endpoints
- [ ] WebSocket client with auto-reconnect
- [ ] Svelte stores for reactive data
- [ ] Type checking passes

---

### TASK-009: Build Integration

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005 through TASK-008)
**Deliverables**: Build scripts, integration
**Estimated Effort**: Small

**Description**:
Integrate SvelteKit build with server.

**Completion Criteria**:
- [ ] Build script produces static files
- [ ] Server serves built files
- [ ] Development mode with hot reload
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Server)    TASK-002 (API)    TASK-003 (WS)    TASK-004 (SvelteKit)
    |                     |                |                 |
    +---------------------+----------------+-----------------+
                                           |
                          +----------------+----------------+
                          |                |                |
                          v                v                v
                    TASK-005         TASK-006         TASK-007
                  (Session List)  (Session Detail)    (Queues)
                          |                |                |
                          +----------------+----------------+
                                           |
                                           v
                                     TASK-008 (Clients)
                                           |
                                           v
                                     TASK-009 (Build)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002, TASK-003, TASK-004
- Group B: TASK-005, TASK-006, TASK-007 (after TASK-004)
- Group C: TASK-008 (after Group B)
- Group D: TASK-009 (after all)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] Viewer works in major browsers (Chrome, Firefox, Safari)

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Start server and verify all pages load
4. Test real-time updates with active session
5. Test queue management features
6. Review implementation against spec-viewers.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding service worker for offline support
- Consider adding keyboard shortcuts

### Future Enhancements

- Session comparison view
- Bookmark management UI
- Cost analysis charts
- Export to PDF
