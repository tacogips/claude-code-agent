# Browser Viewer UI Implementation Plan

**Status**: In Progress
**Design Reference**: design-docs/spec-viewers.md#2-browser-viewer
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Previous**: `impl-plans/browser-viewer-server.md` (Server, API, WebSocket)
- **Depends On**: `browser-viewer-server.md`, `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 2: Browser Viewer (Primary UI)

### Summary

Implement the SvelteKit frontend for the browser viewer including session list, session detail, queue management, and build integration.

### Scope

**Included**:
- SvelteKit application setup
- Session list and detail pages
- Queue management pages
- Frontend API and WebSocket clients
- Build integration

**Excluded**:
- HTTP server (browser-viewer-server.md)
- REST API routes (browser-viewer-server.md)

---

## Modules

### 1. SvelteKit Setup

#### src/viewer/browser/static/

**Status**: NOT_STARTED

```
static/
+-- src/
|   +-- routes/
|   |   +-- +page.svelte              # Session list
|   |   +-- sessions/[id]/+page.svelte
|   |   +-- queues/+page.svelte
|   |   +-- queues/[id]/+page.svelte
|   |   +-- +layout.svelte
|   +-- lib/
|   |   +-- api.ts
|   |   +-- websocket.ts
|   |   +-- stores/
|   |   +-- components/
|   +-- app.css
+-- tailwind.config.js
+-- svelte.config.js
+-- vite.config.js
```

**Checklist**:
- [ ] SvelteKit project initialized
- [ ] Tailwind CSS configured
- [ ] Layout with navigation
- [ ] Theme toggle (dark/light)
- [ ] Responsive design
- [ ] Type checking passes

---

### 2. Session List Page

#### routes/+page.svelte, lib/components/SessionList.svelte

**Status**: NOT_STARTED

```typescript
// SessionList.svelte props
interface Props {
  sessions: Session[];
  currentProject: string;
  onSelect: (sessionId: string) => void;
}
// Features: Search, sort by date/cost, project filter
```

**Checklist**:
- [ ] Session list display
- [ ] Search functionality
- [ ] Project filter
- [ ] Sort by date/cost
- [ ] Click to navigate to detail
- [ ] Real-time updates via WebSocket
- [ ] Type checking passes

---

### 3. Session Detail Page

#### routes/sessions/[id]/+page.svelte, components

**Status**: NOT_STARTED

```typescript
// MessageTimeline.svelte
interface Props {
  messages: Message[];
  showThinking: boolean;
}

// CodeBlock.svelte
interface Props {
  code: string;
  language: string;
}

// CostDisplay.svelte
interface Props {
  tokens: { input: number; output: number };
  cost: number;
}
```

**Checklist**:
- [ ] Message timeline display
- [ ] User/assistant message styling
- [ ] Tool call display
- [ ] Code syntax highlighting with Shiki
- [ ] Token usage and cost display
- [ ] Export buttons (JSON, Markdown)
- [ ] Show/hide thinking toggle
- [ ] Real-time message updates
- [ ] Type checking passes

---

### 4. Queue Pages

#### routes/queues/, components

**Status**: NOT_STARTED

```typescript
// QueueList.svelte
interface Props {
  queues: CommandQueue[];
  onSelect: (queueId: string) => void;
}

// QueueDetail.svelte
interface Props {
  queue: CommandQueue;
  onCommandUpdate: (command: QueueCommand) => void;
}

// CommandEditor.svelte
interface Props {
  command: QueueCommand;
  onSave: (updates: UpdateCommandOptions) => void;
}
```

**Checklist**:
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

### 5. API and WebSocket Clients

#### lib/api.ts, lib/websocket.ts

**Status**: NOT_STARTED

```typescript
// api.ts
const api = {
  sessions: {
    list(filter?: SessionFilter): Promise<Session[]>;
    get(id: string): Promise<Session>;
    getMessages(id: string, options?: { parseMarkdown?: boolean }): Promise<Message[]>;
  },
  projects: {
    list(): Promise<Project[]>;
  },
  queues: {
    list(): Promise<CommandQueue[]>;
    get(id: string): Promise<CommandQueue>;
    updateCommand(queueId: string, index: number, updates: object): Promise<void>;
    reorderCommand(queueId: string, from: number, to: number): Promise<void>;
  }
};

// websocket.ts
class WebSocketClient {
  constructor(url: string);
  subscribe(sessionId: string): void;
  unsubscribe(sessionId: string): void;
  onMessage(handler: (msg: ServerMessage) => void): void;
  close(): void;
}
```

**Checklist**:
- [ ] API client with all endpoints
- [ ] WebSocket client with auto-reconnect
- [ ] Svelte stores for reactive data
- [ ] Type checking passes

---

### 6. Build Integration

**Status**: NOT_STARTED

**Checklist**:
- [ ] Build script produces static files
- [ ] Server serves built files
- [ ] Development mode with hot reload
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| SvelteKit setup | `src/viewer/browser/static/` | NOT_STARTED | - |
| Session list | `routes/+page.svelte` | NOT_STARTED | - |
| Session detail | `routes/sessions/[id]/` | NOT_STARTED | - |
| Queue pages | `routes/queues/` | NOT_STARTED | - |
| API client | `lib/api.ts` | NOT_STARTED | - |
| WebSocket client | `lib/websocket.ts` | NOT_STARTED | - |

---

## Subtasks

### TASK-004: SvelteKit Setup

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: SvelteKit project structure, configs
**Estimated Effort**: Medium

**Completion Criteria**:
- [x] SvelteKit project initialized (src/viewer/browser/static/)
- [x] Tailwind CSS configured (with dark mode)
- [x] Layout with navigation (+layout.svelte)
- [x] Theme toggle (dark/light)
- [x] Responsive design (mobile-first)
- [x] Type checking passes (svelte-check)

---

### TASK-005: Session List Page

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `routes/+page.svelte`, `lib/components/SessionList.svelte`
**Estimated Effort**: Medium

**Completion Criteria**:
- [ ] Session list display with search and filter
- [ ] Real-time updates via WebSocket
- [ ] Type checking passes

---

### TASK-006: Session Detail Page

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `routes/sessions/[id]/+page.svelte`, message components
**Estimated Effort**: Large

**Completion Criteria**:
- [ ] Message timeline with syntax highlighting
- [ ] Token/cost display and export buttons
- [ ] Type checking passes

---

### TASK-007: Queue Pages

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: Queue routes and components
**Estimated Effort**: Large

**Completion Criteria**:
- [ ] Queue list and detail pages
- [ ] Command editing and reordering
- [ ] Real-time updates
- [ ] Type checking passes

---

### TASK-008: API and WebSocket Clients

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `lib/api.ts`, `lib/websocket.ts`
**Estimated Effort**: Small

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

**Completion Criteria**:
- [ ] Build script produces static files
- [ ] Server serves built files
- [ ] Development mode with hot reload
- [ ] Type checking passes

---

## Task Dependency Graph

```
      TASK-004 (SvelteKit)
             |
+------------+------------+------------+
|            |            |            |
v            v            v            v
TASK-005   TASK-006    TASK-007    TASK-008
(List)     (Detail)    (Queues)    (Clients)
|            |            |            |
+------------+------------+------------+
             |
             v
       TASK-009 (Build)
```

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| SvelteKit | None | Ready |
| Pages | TASK-004 | Blocked |
| Build | All pages | Blocked |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All tests passing
- [ ] Viewer works in major browsers
- [ ] Type checking passes

---

## Progress Log

(To be filled during implementation)
