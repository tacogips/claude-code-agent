# Phase 11: HTTP API (Daemon)

**Status**: NOT_STARTED

**Goal**: Implement REST API for remote execution.

## Spec Reference

- `design-docs/spec-sdk-api.md` - REST API, Authentication
- `design-docs/DECISIONS.md` Q22-Q25 - Daemon decisions

---

## Dependencies

- Phase 10: SDK Entry Point

---

## 1. Server Core

### 1.1 Server Setup

**File**: `src/daemon/server.ts`
**Status**: NOT_STARTED

**Features**:
- Elysia HTTP server
- Route registration
- Error middleware
- CORS configuration

**Checklist**:
- [ ] Implement createServer()
- [ ] Implement route registration
- [ ] Implement error handling middleware
- [ ] Write unit tests

### 1.2 Auth Middleware

**File**: `src/daemon/auth.ts`
**Status**: NOT_STARTED

**Features**:
- API key validation
- Token storage
- Token rotation

**Checklist**:
- [ ] Implement validateToken()
- [ ] Implement token storage
- [ ] Implement token generation
- [ ] Write unit tests

---

## 2. Route Handlers

### 2.1 Session Routes

**File**: `src/daemon/routes/sessions.ts`
**Status**: NOT_STARTED

**Endpoints**:
- GET /api/sessions - List sessions
- GET /api/sessions/:id - Get session
- GET /api/sessions/:id/messages - Get messages
- POST /api/sessions/:id/pause - Pause session
- POST /api/sessions/:id/resume - Resume session
- DELETE /api/sessions/:id - Cancel session

**Checklist**:
- [ ] Implement all endpoints
- [ ] Write integration tests

### 2.2 Group Routes

**File**: `src/daemon/routes/groups.ts`
**Status**: NOT_STARTED

**Endpoints**:
- GET /api/groups - List groups
- POST /api/groups - Create group
- GET /api/groups/:id - Get group
- POST /api/groups/:id/run - Run group
- POST /api/groups/:id/pause - Pause group
- DELETE /api/groups/:id - Delete group

**Checklist**:
- [ ] Implement all endpoints
- [ ] Write integration tests

### 2.3 Queue Routes

**File**: `src/daemon/routes/queues.ts`
**Status**: NOT_STARTED

**Endpoints**:
- GET /api/queues - List queues
- POST /api/queues - Create queue
- GET /api/queues/:id - Get queue
- POST /api/queues/:id/run - Run queue
- PUT /api/queues/:id/commands - Update commands

**Checklist**:
- [ ] Implement all endpoints
- [ ] Write integration tests

### 2.4 Bookmark Routes

**File**: `src/daemon/routes/bookmarks.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement CRUD endpoints
- [ ] Implement search endpoint
- [ ] Write integration tests

### 2.5 File Routes

**File**: `src/daemon/routes/files.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement file change endpoints
- [ ] Write integration tests

---

## 3. Real-Time

### 3.1 SSE Handler

**File**: `src/daemon/sse.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement SSE streaming
- [ ] Implement event filtering
- [ ] Write unit tests

### 3.2 WebSocket Handler

**File**: `src/daemon/websocket.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement connection management
- [ ] Implement subscribe/unsubscribe
- [ ] Write unit tests

---

## Implementation Order

1. Server core (setup, error handling)
2. Auth middleware
3. Session routes (most commonly used)
4. SSE for real-time
5. Other routes
6. WebSocket (optional)

---

## Notes

- Use Elysia for type-safe routing
- Authentication is required for daemon mode
- SSE is preferred over WebSocket for simplicity
