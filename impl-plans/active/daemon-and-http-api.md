# Daemon and HTTP API Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#4-daemon-mode, #5-rest-api-endpoints, #6-authentication
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Sections 4-6: Daemon Mode, REST API Endpoints, Authentication

### Summary

Implement the HTTP daemon server that provides remote execution capabilities for claude-code-agent. The daemon exposes a REST API for session and group management, supports SSE for event streaming, and implements API key authentication with permission-based access control.

### Scope

**Included**:
- HTTP server with Elysia
- REST API endpoints for sessions, groups, queues, bookmarks
- SSE streaming for real-time events
- API key authentication (Bearer token)
- Token management (create, list, revoke, rotate)
- Permission system
- TLS support configuration

**Excluded**:
- Browser viewer (separate browser-viewer.md plan)
- OAuth integration (future enhancement)

---

## Implementation Overview

### Approach

Build the daemon in layers:
1. Core HTTP server setup with Elysia
2. Authentication middleware
3. REST API routes using SDK internally
4. SSE streaming endpoints
5. Token management
6. CLI commands for daemon control

### Key Decisions

- Use Elysia for type-safe HTTP server (Bun-optimized)
- Bearer token authentication with `cca_` prefix
- Store token hashes, not plaintext
- Permission-based access control per route
- SSE for event streaming (simpler than WebSocket for read-only)
- Daemon mode includes optional viewer server

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| SDK (sessions, groups, queues) | Required | Other plans |
| Foundation Layer | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |

---

## Deliverables

### Deliverable 1: src/daemon/server.ts

**Purpose**: Main HTTP server setup

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `DaemonServer` | class | HTTP server instance | CLI daemon start |
| `DaemonConfig` | interface | Server configuration | DaemonServer |

**Class Definition**:

```
DaemonServer
  Purpose: HTTP daemon server with REST API
  Constructor: (config: DaemonConfig, sdk: ClaudeCodeAgent)
  Public Methods:
    - start(): Promise<void>
    - stop(): Promise<void>
    - getStatus(): DaemonStatus
  Private Methods:
    - setupRoutes(): void
    - setupMiddleware(): void
    - loadTokens(): Promise<void>
  Private Properties:
    - app: Elysia
    - config: DaemonConfig
    - sdk: ClaudeCodeAgent
    - tokenManager: TokenManager
  Used by: CLI daemon start

DaemonConfig
  Purpose: Server configuration
  Properties:
    - host: string - Bind address (default: 0.0.0.0)
    - port: number - Port (default: 8443)
    - authTokenFile: string - Path to tokens.json
    - tlsCert?: string - TLS certificate path
    - tlsKey?: string - TLS private key path
    - withViewer: boolean - Include browser viewer
  Used by: DaemonServer
```

**Dependencies**: `elysia`, `src/sdk/index.ts`, `src/daemon/auth.ts`

**Dependents**: CLI daemon commands

---

### Deliverable 2: src/daemon/auth.ts

**Purpose**: Authentication middleware and token management

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `TokenManager` | class | Manage API tokens | DaemonServer |
| `authMiddleware` | function | Elysia auth middleware | DaemonServer |
| `ApiToken` | interface | Token data structure | TokenManager |
| `Permission` | type | Permission identifiers | ApiToken |

**Class Definition**:

```
TokenManager
  Purpose: Manage API tokens (create, validate, revoke)
  Constructor: (container: Container, tokenFilePath: string)
  Public Methods:
    - createToken(options: CreateTokenOptions): Promise<string>
    - validateToken(token: string): Promise<ApiToken | null>
    - listTokens(): Promise<ApiToken[]>
    - revokeToken(tokenId: string): Promise<void>
    - rotateToken(tokenId: string): Promise<string>
    - hasPermission(token: ApiToken, permission: Permission): boolean
  Private Methods:
    - hashToken(token: string): string
    - generateToken(): string
    - loadTokens(): Promise<void>
    - saveTokens(): Promise<void>
  Private Properties:
    - tokens: ApiToken[]
    - fileSystem: FileSystem
  Used by: DaemonServer, authMiddleware

ApiToken
  Purpose: Stored token data
  Properties:
    - id: string - Token ID (cca_xxx prefix portion)
    - name: string - Human-readable name
    - hash: string - SHA-256 hash of full token
    - permissions: Permission[]
    - createdAt: string - ISO timestamp
    - expiresAt?: string - ISO timestamp
    - lastUsedAt?: string - ISO timestamp
  Used by: TokenManager

Permission
  Purpose: Permission identifiers
  Values: 'session:create' | 'session:read' | 'session:cancel' |
          'group:create' | 'group:run' | 'queue:*' | 'bookmark:*'
  Used by: ApiToken, authMiddleware
```

**Function Signatures**:

```
authMiddleware(tokenManager: TokenManager): Elysia.Handler
  Purpose: Validate Bearer token and attach to request context
  Called by: DaemonServer route setup

TokenManager.createToken(options: CreateTokenOptions): Promise<string>
  Purpose: Create new API token, return full token string
  Called by: CLI token create

TokenManager.validateToken(token: string): Promise<ApiToken | null>
  Purpose: Validate token, return token data if valid
  Called by: authMiddleware

TokenManager.hasPermission(token: ApiToken, permission: Permission): boolean
  Purpose: Check if token has required permission
  Called by: Route handlers
```

**Dependencies**: `src/container.ts`

**Dependents**: DaemonServer, CLI token commands

---

### Deliverable 3: src/daemon/routes/sessions.ts

**Purpose**: Session REST API routes

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `sessionRoutes` | function | Register session routes | DaemonServer |

**Function Signatures**:

```
sessionRoutes(app: Elysia, sdk: ClaudeCodeAgent): void
  Purpose: Register all session-related routes
  Called by: DaemonServer.setupRoutes()

Routes:
  POST /api/sessions
    Purpose: Create and run session
    Permissions: session:create
    Body: { projectPath, prompt, template?, groupId? }
    Response: { sessionId, status }

  GET /api/sessions
    Purpose: List sessions
    Permissions: session:read
    Query: { projectPath?, status?, limit?, offset? }
    Response: Session[]

  GET /api/sessions/:id
    Purpose: Get session details
    Permissions: session:read
    Response: Session

  GET /api/sessions/:id/stream
    Purpose: SSE stream of session events
    Permissions: session:read
    Response: SSE stream

  GET /api/sessions/:id/messages
    Purpose: Get session messages
    Permissions: session:read
    Query: { parseMarkdown? }
    Response: Message[]

  POST /api/sessions/:id/cancel
    Purpose: Cancel running session
    Permissions: session:cancel
    Response: { success: boolean }

  POST /api/sessions/:id/pause
    Purpose: Pause session
    Permissions: session:cancel
    Response: { success: boolean }

  POST /api/sessions/:id/resume
    Purpose: Resume session
    Permissions: session:create
    Response: { success: boolean }
```

**Dependencies**: `elysia`, `src/sdk/index.ts`

**Dependents**: DaemonServer

---

### Deliverable 4: src/daemon/routes/groups.ts

**Purpose**: Session Group REST API routes

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `groupRoutes` | function | Register group routes | DaemonServer |

**Function Signatures**:

```
groupRoutes(app: Elysia, sdk: ClaudeCodeAgent): void
  Purpose: Register all group-related routes
  Called by: DaemonServer.setupRoutes()

Routes:
  POST /api/groups
    Purpose: Create session group
    Permissions: group:create
    Body: { name, description?, slug }
    Response: SessionGroup

  GET /api/groups
    Purpose: List groups
    Permissions: session:read
    Query: { status?, limit? }
    Response: SessionGroup[]

  GET /api/groups/:id
    Purpose: Get group details
    Permissions: session:read
    Response: SessionGroup

  POST /api/groups/:id/run
    Purpose: Run session group
    Permissions: group:run
    Body: { concurrent?, respectDependencies? }
    Response: { success: boolean }

  POST /api/groups/:id/pause
    Purpose: Pause group
    Permissions: group:run
    Response: { success: boolean }

  POST /api/groups/:id/resume
    Purpose: Resume group
    Permissions: group:run
    Response: { success: boolean }

  GET /api/groups/:id/stream
    Purpose: SSE stream of group events
    Permissions: session:read
    Response: SSE stream
```

**Dependencies**: `elysia`, `src/sdk/index.ts`

**Dependents**: DaemonServer

---

### Deliverable 5: src/daemon/routes/queues.ts

**Purpose**: Command Queue REST API routes

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `queueRoutes` | function | Register queue routes | DaemonServer |

**Function Signatures**:

```
queueRoutes(app: Elysia, sdk: ClaudeCodeAgent): void
  Purpose: Register all queue-related routes
  Called by: DaemonServer.setupRoutes()

Routes:
  POST /api/queues
    Purpose: Create command queue
    Permissions: queue:*
    Body: { name, projectPath, description? }
    Response: CommandQueue

  GET /api/queues
    Purpose: List queues
    Permissions: queue:*
    Query: { projectPath?, status? }
    Response: CommandQueue[]

  GET /api/queues/:id
    Purpose: Get queue details
    Permissions: queue:*
    Response: CommandQueue

  POST /api/queues/:id/commands
    Purpose: Add command to queue
    Permissions: queue:*
    Body: { prompt, sessionMode?, position? }
    Response: QueueCommand

  PUT /api/queues/:id/commands/:index
    Purpose: Update command
    Permissions: queue:*
    Body: { prompt?, sessionMode? }
    Response: QueueCommand

  DELETE /api/queues/:id/commands/:index
    Purpose: Remove command
    Permissions: queue:*
    Response: { success: boolean }

  POST /api/queues/:id/run
    Purpose: Run queue
    Permissions: queue:*
    Response: { success: boolean }

  POST /api/queues/:id/pause
    Purpose: Pause queue
    Permissions: queue:*
    Response: { success: boolean }

  POST /api/queues/:id/resume
    Purpose: Resume queue
    Permissions: queue:*
    Response: { success: boolean }
```

**Dependencies**: `elysia`, `src/sdk/index.ts`

**Dependents**: DaemonServer

---

### Deliverable 6: src/daemon/routes/bookmarks.ts

**Purpose**: Bookmark REST API routes

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `bookmarkRoutes` | function | Register bookmark routes | DaemonServer |

**Function Signatures**:

```
bookmarkRoutes(app: Elysia, sdk: ClaudeCodeAgent): void
  Purpose: Register all bookmark-related routes
  Called by: DaemonServer.setupRoutes()

Routes:
  POST /api/bookmarks
    Purpose: Create bookmark
    Permissions: bookmark:*
    Body: { sessionId, messageId?, name, tags? }
    Response: Bookmark

  GET /api/bookmarks
    Purpose: List bookmarks
    Permissions: bookmark:*
    Query: { tag?, sessionId? }
    Response: Bookmark[]

  GET /api/bookmarks/:id
    Purpose: Get bookmark
    Permissions: bookmark:*
    Response: Bookmark

  GET /api/bookmarks/:id/content
    Purpose: Get bookmark with message content
    Permissions: bookmark:*
    Response: { bookmark: Bookmark, content: Message[] }

  DELETE /api/bookmarks/:id
    Purpose: Delete bookmark
    Permissions: bookmark:*
    Response: { success: boolean }

  GET /api/bookmarks/search
    Purpose: Search bookmarks
    Permissions: bookmark:*
    Query: { q: string, metadataOnly? }
    Response: Bookmark[]
```

**Dependencies**: `elysia`, `src/sdk/index.ts`

**Dependents**: DaemonServer

---

### Deliverable 7: src/daemon/sse.ts

**Purpose**: Server-Sent Events streaming

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `createSSEStream` | function | Create SSE response stream | Route handlers |
| `SSEConnection` | class | Manage SSE connection | Route handlers |

**Function Signatures**:

```
createSSEStream(eventEmitter: EventEmitter, filter: EventFilter): Response
  Purpose: Create SSE response that streams filtered events
  Called by: /api/sessions/:id/stream, /api/groups/:id/stream

SSEConnection class:
  Constructor: (eventEmitter: EventEmitter, filter: EventFilter)
  Public Methods:
    - send(event: object): void
    - close(): void
  Private Properties:
    - controller: ReadableStreamDefaultController
    - subscription: EventSubscription
```

**Dependencies**: `src/sdk/events/emitter.ts`

**Dependents**: Route handlers

---

### Deliverable 8: src/daemon/types.ts

**Purpose**: Daemon-specific types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `DaemonStatus` | interface | Server status | DaemonServer |
| `CreateTokenOptions` | interface | Token creation options | TokenManager |
| `EventFilter` | interface | SSE event filter | createSSEStream |

**Interface Definitions**:

```
DaemonStatus
  Purpose: Current daemon state
  Properties:
    - running: boolean
    - host: string
    - port: number
    - uptime: number
    - connections: number
  Used by: DaemonServer.getStatus()

CreateTokenOptions
  Purpose: Options for creating API token
  Properties:
    - name: string
    - permissions: Permission[]
    - expiresIn?: string - Duration (e.g., '365d')
  Used by: TokenManager.createToken()

EventFilter
  Purpose: Filter for SSE events
  Properties:
    - sessionId?: string
    - groupId?: string
    - queueId?: string
    - eventTypes?: string[]
  Used by: createSSEStream()
```

**Dependencies**: None

**Dependents**: DaemonServer, TokenManager, SSE

---

## Subtasks

### TASK-001: Daemon Types

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/daemon/types.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for the daemon server.

**Completion Criteria**:
- [ ] DaemonConfig interface defined
- [ ] DaemonStatus interface defined
- [ ] CreateTokenOptions interface defined
- [ ] EventFilter interface defined
- [ ] Permission type defined
- [ ] ApiToken interface defined
- [ ] Type checking passes

---

### TASK-002: Token Manager

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/daemon/auth.ts`
**Estimated Effort**: Medium

**Description**:
Implement TokenManager for API key authentication.

**Completion Criteria**:
- [ ] Token generation with cca_ prefix
- [ ] SHA-256 hashing for storage
- [ ] createToken() returns full token
- [ ] validateToken() checks hash
- [ ] listTokens() returns metadata (no secrets)
- [ ] revokeToken() removes token
- [ ] rotateToken() creates new token, revokes old
- [ ] hasPermission() checks permission array
- [ ] Token expiration support
- [ ] lastUsedAt tracking
- [ ] File storage in JSON format
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-003: Auth Middleware

**Status**: Not Started
**Parallelizable**: No (depends on TASK-002)
**Deliverables**: `src/daemon/auth.ts` (middleware function)
**Estimated Effort**: Small

**Description**:
Implement Elysia auth middleware for Bearer token validation.

**Completion Criteria**:
- [ ] Extract Bearer token from Authorization header
- [ ] Validate token via TokenManager
- [ ] Attach token data to request context
- [ ] Return 401 for missing/invalid token
- [ ] Return 403 for insufficient permissions
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-004: SSE Streaming

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/daemon/sse.ts`
**Estimated Effort**: Medium

**Description**:
Implement Server-Sent Events for real-time event streaming.

**Completion Criteria**:
- [ ] createSSEStream() creates Response with SSE headers
- [ ] SSEConnection subscribes to EventEmitter
- [ ] Events filtered by sessionId/groupId/queueId
- [ ] Proper SSE format (data: JSON\n\n)
- [ ] Connection cleanup on close
- [ ] Unit tests
- [ ] Type checking passes

---

### TASK-005: Core Server

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002, TASK-003)
**Deliverables**: `src/daemon/server.ts`
**Estimated Effort**: Medium

**Description**:
Implement the main DaemonServer class.

**Completion Criteria**:
- [ ] Elysia server setup
- [ ] TLS configuration support
- [ ] Middleware registration (auth, CORS)
- [ ] Route registration
- [ ] start() and stop() lifecycle
- [ ] getStatus() returns current state
- [ ] Error handling
- [ ] Type checking passes

---

### TASK-006: Session Routes

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005)
**Deliverables**: `src/daemon/routes/sessions.ts`
**Estimated Effort**: Medium

**Description**:
Implement session REST API routes.

**Completion Criteria**:
- [ ] POST /api/sessions creates and runs session
- [ ] GET /api/sessions lists with filters
- [ ] GET /api/sessions/:id returns details
- [ ] GET /api/sessions/:id/stream returns SSE
- [ ] GET /api/sessions/:id/messages with parseMarkdown
- [ ] POST /api/sessions/:id/cancel
- [ ] POST /api/sessions/:id/pause
- [ ] POST /api/sessions/:id/resume
- [ ] Permission checks on all routes
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-007: Group Routes

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005)
**Deliverables**: `src/daemon/routes/groups.ts`
**Estimated Effort**: Medium

**Description**:
Implement session group REST API routes.

**Completion Criteria**:
- [ ] POST /api/groups creates group
- [ ] GET /api/groups lists with filters
- [ ] GET /api/groups/:id returns details
- [ ] POST /api/groups/:id/run starts execution
- [ ] POST /api/groups/:id/pause
- [ ] POST /api/groups/:id/resume
- [ ] GET /api/groups/:id/stream returns SSE
- [ ] Permission checks on all routes
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-008: Queue Routes

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005)
**Deliverables**: `src/daemon/routes/queues.ts`
**Estimated Effort**: Medium

**Description**:
Implement command queue REST API routes.

**Completion Criteria**:
- [ ] All queue CRUD routes
- [ ] All command management routes
- [ ] Queue execution routes (run, pause, resume)
- [ ] Permission checks on all routes
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-009: Bookmark Routes

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005)
**Deliverables**: `src/daemon/routes/bookmarks.ts`
**Estimated Effort**: Small

**Description**:
Implement bookmark REST API routes.

**Completion Criteria**:
- [ ] All bookmark CRUD routes
- [ ] Search endpoint
- [ ] Content retrieval endpoint
- [ ] Permission checks on all routes
- [ ] Integration tests
- [ ] Type checking passes

---

### TASK-010: Module Exports

**Status**: Not Started
**Parallelizable**: No (depends on TASK-005 through TASK-009)
**Deliverables**: `src/daemon/index.ts`
**Estimated Effort**: Small

**Description**:
Create module exports for daemon.

**Completion Criteria**:
- [ ] DaemonServer exported
- [ ] TokenManager exported
- [ ] All types exported
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Token Mgr)     TASK-004 (SSE)
    |                       |                      |
    +-------+---------------+                      |
            |                                      |
      TASK-003 (Auth MW)                           |
            |                                      |
            +---------------+----------------------+
                            |
                      TASK-005 (Server)
                            |
            +-------+-------+-------+-------+
            |       |       |       |       |
            v       v       v       v       v
        TASK-006  TASK-007  TASK-008  TASK-009
        (Sessions) (Groups) (Queues) (Bookmarks)
            |       |       |       |
            +-------+-------+-------+
                            |
                      TASK-010 (Exports)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002, TASK-004
- Group B: TASK-003 (after TASK-002)
- Group C: TASK-005 (after TASK-001, TASK-002, TASK-003)
- Group D: TASK-006, TASK-007, TASK-008, TASK-009 (after TASK-005)
- Group E: TASK-010 (after Group D)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Integration tests passing for all routes
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] TLS configuration works

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Start daemon and test API endpoints manually
4. Verify authentication works correctly
5. Test SSE streaming
6. Review implementation against spec-sdk-api.md

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider rate limiting
- Consider request logging

### Future Enhancements

- OAuth integration
- WebSocket support (in addition to SSE)
- API versioning
