# Browser Viewer Server Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-viewers.md#2-browser-viewer
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Next**: `impl-plans/browser-viewer-ui.md` (SvelteKit UI)
- **Depends On**: `foundation-and-core` (completed), `realtime-monitoring`

---

## Design Document Reference

**Source**: `design-docs/spec-viewers.md` Section 2: Browser Viewer (Primary UI)

### Summary

Implement the server-side components for the browser viewer: HTTP server with Elysia, REST API routes, and WebSocket handler for real-time updates.

### Scope

**Included**:
- HTTP server with Elysia (ViewerServer)
- REST API routes for sessions, projects, queues
- WebSocket handler for real-time updates

**Excluded**:
- SvelteKit frontend (browser-viewer-ui.md)
- Frontend components and pages (browser-viewer-ui.md)

---

## Modules

### 1. HTTP Server

#### src/viewer/browser/server.ts

**Status**: NOT_STARTED

```typescript
interface ViewerConfig {
  port: number;           // Default: 3000
  host: string;           // Default: 127.0.0.1
  openBrowser: boolean;   // Auto-open browser
}

class ViewerServer {
  constructor(config: ViewerConfig, sdk: ClaudeCodeAgent);

  start(): Promise<void>;
  stop(): Promise<void>;
  getUrl(): string;

  private setupStaticRoutes(): void;
  private setupApiRoutes(): void;
  private setupWebSocket(): void;
}
```

**Checklist**:
- [ ] ViewerServer class implemented
- [ ] start() and stop() lifecycle
- [ ] Static file serving configuration
- [ ] Auto-open browser functionality
- [ ] Unit tests
- [ ] Type checking passes

---

### 2. REST API Routes

#### src/viewer/browser/routes/api.ts

**Status**: NOT_STARTED

```typescript
function setupApiRoutes(app: Elysia, sdk: ClaudeCodeAgent): void;

// Routes:
// GET /api/sessions - List sessions
// GET /api/sessions/:id - Get session detail
// GET /api/sessions/:id/messages - Get session messages
// GET /api/tasks - Get active tasks
// GET /api/projects - List projects
// GET /api/queues - List queues
// GET /api/queues/:id - Get queue detail
```

**Checklist**:
- [ ] Sessions list and detail endpoints
- [ ] Messages endpoint with parseMarkdown
- [ ] Tasks endpoint
- [ ] Projects endpoint
- [ ] Queues list and detail endpoints
- [ ] Integration tests
- [ ] Type checking passes

---

### 3. WebSocket Handler

#### src/viewer/browser/routes/ws.ts

**Status**: NOT_STARTED

```typescript
function setupWebSocket(app: Elysia, eventEmitter: EventEmitter): void;

// Protocol:
// Client -> Server:
//   { type: 'subscribe', sessionId: string }
//   { type: 'unsubscribe', sessionId: string }
//
// Server -> Client:
//   { type: 'session_update', sessionId: string, payload: SessionUpdate }
//   { type: 'new_message', sessionId: string, payload: Message }
//   { type: 'session_end', sessionId: string }
//   { type: 'queue_update', queueId: string, payload: QueueUpdate }
```

**Checklist**:
- [ ] Subscribe/unsubscribe protocol
- [ ] Session update broadcasting
- [ ] Queue update broadcasting
- [ ] Connection management
- [ ] Integration tests
- [ ] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Viewer server | `src/viewer/browser/server.ts` | NOT_STARTED | - |
| API routes | `src/viewer/browser/routes/api.ts` | NOT_STARTED | - |
| WebSocket handler | `src/viewer/browser/routes/ws.ts` | NOT_STARTED | - |

---

## Subtasks

### TASK-001: Server Setup

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/viewer/browser/server.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] ViewerServer class implemented
- [x] start() and stop() lifecycle
- [x] Static file serving configuration
- [x] Auto-open browser functionality
- [x] Unit tests (19 tests in src/viewer/browser/server.test.ts)
- [x] Type checking passes

---

### TASK-002: API Routes

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/viewer/browser/routes/api.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [x] Sessions list and detail endpoints
- [x] Messages endpoint with parseMarkdown
- [x] Tasks endpoint
- [x] Projects endpoint
- [x] Queues list and detail endpoints
- [x] Integration tests (20 tests in src/viewer/browser/routes/api.test.ts)
- [x] Type checking passes

---

### TASK-003: WebSocket Handler

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/viewer/browser/routes/ws.ts`
**Estimated Effort**: Medium

**Completion Criteria**:
- [x] Subscribe/unsubscribe protocol
- [x] Session update broadcasting
- [x] Queue update broadcasting
- [x] Connection management
- [x] Unit tests (9 tests in src/viewer/browser/routes/ws.test.ts)
- [x] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Server)    TASK-002 (API)    TASK-003 (WS)
    |                     |                |
    +---------------------+----------------+
                          |
                          v
              (browser-viewer-ui.md)
```

Parallelizable: TASK-001, TASK-002, TASK-003

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Server | SDK, Foundation | Available |
| API Routes | SDK, Session Reader | Available |
| WebSocket | Event Emitter | Available |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors

---

## Progress Log

(To be filled during implementation)
