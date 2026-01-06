# Daemon Core Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#4-daemon-mode
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Related Plans

This plan is part of a 3-part split from the original daemon-and-http-api.md:
- **daemon-core.md** (this file) - Core daemon functionality, process management
- **http-api.md** - HTTP routes and REST API endpoints
- **sse-events.md** - SSE event streaming

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 4: Daemon Mode

### Summary

Implement the core HTTP daemon server infrastructure including server lifecycle, TLS configuration, middleware setup, and token-based authentication. The daemon provides the foundation for remote execution capabilities.

### Scope

**Included**:
- HTTP server setup with Elysia
- Server lifecycle (start, stop, status)
- TLS support configuration
- Authentication middleware
- Token management (create, list, revoke, rotate)
- Permission system
- Core daemon types

**Excluded**:
- REST API routes (see http-api.md)
- SSE streaming (see sse-events.md)
- Browser viewer (separate plan)

---

## Implementation Overview

### Approach

Build the daemon core in layers:
1. Define core types and interfaces
2. Implement token management with file-based storage
3. Create authentication middleware for Elysia
4. Build main server class with lifecycle management
5. Add TLS configuration support

### Key Decisions

- Use Elysia for type-safe HTTP server (Bun-optimized)
- Bearer token authentication with `cca_` prefix
- Store token hashes (SHA-256), not plaintext
- Permission-based access control per route
- File-based token storage in JSON format
- Support optional TLS configuration

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Foundation Layer | Required | foundation-and-core.md |
| Event system | Required | foundation-and-core.md |
| SDK (basic types) | Required | Other plans |

---

## Deliverables

### Deliverable 1: src/daemon/types.ts

**Purpose**: Daemon-specific types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `DaemonConfig` | interface | Server configuration | DaemonServer |
| `DaemonStatus` | interface | Server status | DaemonServer |
| `CreateTokenOptions` | interface | Token creation options | TokenManager |
| `ApiToken` | interface | Token data structure | TokenManager |
| `Permission` | type | Permission identifiers | ApiToken |

**Interface Definitions**:

```
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

**Dependencies**: None

**Dependents**: DaemonServer, TokenManager, auth middleware

---

### Deliverable 2: src/daemon/auth.ts

**Purpose**: Authentication middleware and token management

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `TokenManager` | class | Manage API tokens | DaemonServer |
| `authMiddleware` | function | Elysia auth middleware | DaemonServer |

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

### Deliverable 3: src/daemon/server.ts

**Purpose**: Main HTTP server setup

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `DaemonServer` | class | HTTP server instance | CLI daemon start |

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
```

**Dependencies**: `elysia`, `src/sdk/index.ts`, `src/daemon/auth.ts`, `src/daemon/types.ts`

**Dependents**: CLI daemon commands

---

### Deliverable 4: src/daemon/index.ts

**Purpose**: Module exports for daemon

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `DaemonServer` | class | Re-export | CLI |
| `TokenManager` | class | Re-export | CLI |
| All types | type/interface | Re-export | External consumers |

**Dependencies**: All daemon modules

**Dependents**: CLI, external integrations

---

## Subtasks

### TASK-001: Daemon Types

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/daemon/types.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for the daemon server.

**Completion Criteria**:
- [x] DaemonConfig interface defined
- [x] DaemonStatus interface defined
- [x] CreateTokenOptions interface defined
- [x] ApiToken interface defined
- [x] Permission type defined
- [x] Type checking passes

---

### TASK-002: Token Manager

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/daemon/auth.ts`
**Estimated Effort**: Medium

**Description**:
Implement TokenManager for API key authentication.

**Completion Criteria**:
- [x] Token generation with cca_ prefix
- [x] SHA-256 hashing for storage
- [x] createToken() returns full token
- [x] validateToken() checks hash
- [x] listTokens() returns metadata (no secrets)
- [x] revokeToken() removes token
- [x] rotateToken() creates new token, revokes old
- [x] hasPermission() checks permission array
- [x] Token expiration support
- [x] lastUsedAt tracking
- [x] File storage in JSON format
- [x] Unit tests
- [x] Type checking passes

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

### TASK-004: Core Server

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
- [ ] Route registration framework
- [ ] start() and stop() lifecycle
- [ ] getStatus() returns current state
- [ ] Error handling
- [ ] Type checking passes

---

### TASK-005: Module Exports

**Status**: Not Started
**Parallelizable**: No (depends on TASK-004)
**Deliverables**: `src/daemon/index.ts`
**Estimated Effort**: Small

**Description**:
Create module exports for daemon core.

**Completion Criteria**:
- [ ] DaemonServer exported
- [ ] TokenManager exported
- [ ] All types exported
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Token Mgr)
    |                       |
    +-------+---------------+
            |
      TASK-003 (Auth MW)
            |
      TASK-004 (Server)
            |
      TASK-005 (Exports)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-003 (after TASK-002)
- Group C: TASK-004 (after TASK-001, TASK-003)
- Group D: TASK-005 (after TASK-004)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] TLS configuration works
- [ ] Token authentication works correctly

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Start daemon and verify it listens on configured port
4. Verify authentication works with valid/invalid tokens
5. Test TLS configuration
6. Review implementation against spec-sdk-api.md Section 4

---

## Progress Log

### Session: 2026-01-06 16:30
**Tasks Completed**: TASK-001
**Review Iterations**: 1
**Review Summary**:
- Iteration 1: APPROVED (no critical issues)
**Notes**:
- Implemented all daemon core types: DaemonConfig, DaemonStatus, CreateTokenOptions, ApiToken, Permission
- Used readonly modifiers throughout for immutability
- Permission type uses union of literal strings for type safety
- Comprehensive JSDoc documentation added
- Type checking passes successfully
- No breaking changes to existing code
- Minor improvement suggestions noted but non-blocking (style/documentation enhancements)

### Session: 2026-01-06 23:50
**Tasks Completed**: TASK-002
**Tasks In Progress**: None
**Blockers**: None
**Notes**:
- Implemented TokenManager class with full token lifecycle management
- Token generation uses crypto.getRandomValues for secure random tokens (32 bytes, base64url encoded)
- SHA-256 hashing via Web Crypto API for secure token storage
- Comprehensive test suite with 27 passing tests covering all scenarios
- Supports token expiration with flexible duration parsing (d, w, y, h, m units)
- Permission checking supports wildcard patterns (e.g., queue:*)
- Token ID extracted as first 8 chars of base64 portion (not full token for security)
- lastUsedAt tracking implemented and updated on each validation
- File-based JSON storage with proper error handling and initialization
- All completion criteria met and verified
- Type checking passes with strict TypeScript configuration

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider rate limiting
- Consider request logging

### Future Enhancements

- OAuth integration
- API versioning
