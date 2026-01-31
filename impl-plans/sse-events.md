# SSE Events Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-sdk-api.md#5-rest-api-endpoints (SSE sections)
**Created**: 2026-01-06
**Last Updated**: 2026-01-08

---

## Related Plans

This plan is part of a 3-part split from the original daemon-and-http-api.md:
- **daemon-core.md** - Core daemon functionality, process management
- **http-api.md** - HTTP routes and REST API endpoints
- **sse-events.md** (this file) - SSE event streaming

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 5: REST API Endpoints (SSE streaming)

### Summary

Implement Server-Sent Events (SSE) for real-time event streaming. SSE provides a simple, HTTP-based protocol for pushing events from server to client, used for monitoring session progress, group execution, and queue operations.

### Scope

**Included**:
- SSE stream creation with proper headers
- Event filtering by sessionId, groupId, queueId, eventTypes
- Connection lifecycle management
- Integration with EventEmitter
- SSE routes for sessions and groups

**Excluded**:
- WebSocket support (future enhancement)
- Daemon core (see daemon-core.md)
- REST API routes (see http-api.md)

---

## Implementation Overview

### Approach

Build SSE support in layers:
1. Create EventFilter type for stream filtering
2. Implement SSEConnection class for managing individual connections
3. Create createSSEStream function for route integration
4. Add SSE routes to session and group route modules

### Key Decisions

- Use SSE over WebSocket (simpler for read-only streaming)
- Filter events at stream level (not client-side)
- Proper cleanup on connection close
- Standard SSE format: `data: JSON\n\n`
- Support filtering by resource ID and event types

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Daemon Core | Required | daemon-core.md |
| Event system | Required | foundation-and-core.md |
| SDK Event Emitter | Required | Other plans |

---

## Deliverables

### Deliverable 1: src/daemon/sse-types.ts

**Purpose**: SSE-specific types

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `EventFilter` | interface | SSE event filter | createSSEStream |

**Interface Definitions**:

```
EventFilter
  Purpose: Filter for SSE events
  Properties:
    - sessionId?: string
    - groupId?: string
    - queueId?: string
    - eventTypes?: string[]
  Used by: createSSEStream(), SSEConnection
```

**Dependencies**: None

**Dependents**: SSE module, route handlers

---

### Deliverable 2: src/daemon/sse.ts

**Purpose**: Server-Sent Events streaming

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `createSSEStream` | function | Create SSE response stream | Route handlers |
| `SSEConnection` | class | Manage SSE connection | createSSEStream |

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
  Private Methods:
    - matchesFilter(event: object): boolean
    - formatSSE(data: object): string
  Private Properties:
    - controller: ReadableStreamDefaultController
    - subscription: EventSubscription
    - filter: EventFilter
    - closed: boolean
```

**Class Definition**:

```
SSEConnection
  Purpose: Manage individual SSE connection
  Constructor: (eventEmitter: EventEmitter, filter: EventFilter)
  Public Methods:
    - send(event: object): void - Send event to client
    - close(): void - Close connection and cleanup
  Private Methods:
    - matchesFilter(event: object): boolean
    - formatSSE(data: object): string
  Private Properties:
    - controller: ReadableStreamDefaultController
    - subscription: EventSubscription
    - filter: EventFilter
    - closed: boolean
  Used by: createSSEStream
```

**Dependencies**: `src/sdk/events/emitter.ts`

**Dependents**: Route handlers

---

### Deliverable 3: Session SSE Routes

**Purpose**: Add SSE endpoints to session routes

**Exports**: Part of existing `sessionRoutes` function

**Function Signatures**:

```
Additional route in sessionRoutes():
  GET /api/sessions/:id/stream
    Purpose: SSE stream of session events
    Permissions: session:read
    Response: SSE stream
    Filter: { sessionId: req.params.id }
```

**Dependencies**: `src/daemon/sse.ts`, `src/daemon/routes/sessions.ts`

**Dependents**: Session monitoring clients

---

### Deliverable 4: Group SSE Routes

**Purpose**: Add SSE endpoints to group routes

**Exports**: Part of existing `groupRoutes` function

**Function Signatures**:

```
Additional route in groupRoutes():
  GET /api/groups/:id/stream
    Purpose: SSE stream of group events
    Permissions: session:read
    Response: SSE stream
    Filter: { groupId: req.params.id }
```

**Dependencies**: `src/daemon/sse.ts`, `src/daemon/routes/groups.ts`

**Dependents**: Group monitoring clients

---

## Subtasks

### TASK-001: SSE Types

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/daemon/sse-types.ts`
**Estimated Effort**: Small

**Description**:
Define EventFilter type for SSE filtering.

**Completion Criteria**:
- [x] EventFilter interface defined
- [x] Type checking passes

---

### TASK-002: SSE Core Implementation

**Status**: Completed
**Parallelizable**: No (depends on TASK-001)
**Deliverables**: `src/daemon/sse.ts`
**Estimated Effort**: Medium

**Description**:
Implement Server-Sent Events core functionality.

**Completion Criteria**:
- [x] createSSEStream() creates Response with SSE headers
- [x] SSEConnection subscribes to EventEmitter
- [x] Events filtered by sessionId/groupId/queueId
- [x] Events filtered by eventTypes array
- [x] Proper SSE format (data: JSON\n\n)
- [x] Connection cleanup on close
- [x] Handle client disconnect gracefully
- [x] Unit tests for filtering logic
- [x] Unit tests for SSE formatting
- [x] Type checking passes

---

### TASK-003: Session SSE Routes

**Status**: Completed
**Parallelizable**: No (depends on TASK-002, http-api.md TASK-001)
**Deliverables**: Update `src/daemon/routes/sessions.ts`
**Estimated Effort**: Small

**Description**:
Add SSE streaming endpoint to session routes.

**Completion Criteria**:
- [x] GET /api/sessions/:id/stream implemented
- [x] Filters by sessionId
- [x] Permission check (session:read)
- [x] Integration test
- [x] Type checking passes

---

### TASK-004: Group SSE Routes

**Status**: Completed
**Parallelizable**: No (depends on TASK-002, http-api.md TASK-002)
**Deliverables**: Update `src/daemon/routes/groups.ts`
**Estimated Effort**: Small

**Description**:
Add SSE streaming endpoint to group routes.

**Completion Criteria**:
- [x] GET /api/groups/:id/stream implemented
- [x] Filters by groupId
- [x] Permission check (session:read)
- [x] Integration test
- [x] Type checking passes

---

## Task Dependency Graph

```
        TASK-001 (SSE Types)
                |
        TASK-002 (SSE Core)
                |
        +-------+-------+
        |               |
        v               v
    TASK-003        TASK-004
    (Session SSE)   (Group SSE)
```

Parallelizable groups:
- Group A: TASK-001
- Group B: TASK-002 (after TASK-001)
- Group C: TASK-003, TASK-004 (after TASK-002 and respective route implementations)

---

## Completion Criteria

### Required for Completion

- [x] All subtasks marked as Completed
- [x] All unit tests passing
- [x] Integration tests passing for SSE endpoints
- [x] Type checking passes without errors
- [x] Code follows project coding standards
- [x] SSE streams work with real event emitter
- [x] Client disconnect handled gracefully

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Start daemon and test SSE endpoints with curl
4. Verify events are filtered correctly
5. Test client disconnect handling
6. Test with multiple concurrent SSE connections
7. Review implementation against spec-sdk-api.md

---

## Progress Log

### Session: 2026-01-06 23:34
**Tasks Completed**: TASK-001
**Review Iterations**: 0 (self-review - simple type definitions)
**Review Summary**: APPROVED - Type-only file with no implementation logic
**Notes**:
- Defined EventFilter interface with sessionId, groupId, queueId, and eventTypes properties
- Used readonly modifiers and explicit undefined per project standards
- Properly imported EventType from sdk/events/types
- All properties are optional to support flexible filtering
- Type checking passes with no new errors introduced
- No tests needed for pure type definitions

---

### Session: 2026-01-07 01:26
**Tasks Completed**: TASK-002
**Review Iterations**: 1 (self-review)
**Review Summary**: APPROVED after fixing subscription management issue
**Notes**:
- Implemented SSEConnection class with proper event subscription and filtering
- Created createSSEStream() function that returns Response with SSE headers
- Events filtered by sessionId, groupId, queueId, and eventTypes
- Proper SSE format: data: JSON\n\n
- Fixed critical bug: multiple subscriptions were being created but only first was tracked
- Changed from single subscription to subscriptions array for proper cleanup
- Connection cleanup properly unsubscribes from all event handlers
- Client disconnect handled via stream cancel() callback
- Comprehensive unit tests: 16 tests covering filtering, formatting, and lifecycle
- All tests pass with 34 expect() assertions
- Type checking passes with no errors in SSE module
- Implementation follows project standards: readonly modifiers, explicit types, proper error handling

---

### Session: 2026-01-08 10:18
**Tasks Completed**: TASK-003
**Review Iterations**: 0 (direct implementation - simple route addition)
**Review Summary**: Implementation verified via integration tests
**Notes**:
- Added GET /api/sessions/:id/stream endpoint to sessions.ts
- Imported createSSEStream from src/daemon/sse.ts
- Route filters events by sessionId using EventFilter
- Proper permission check (session:read) implemented
- Comprehensive integration tests with 5 test cases:
  1. Authentication requirement
  2. Permission check
  3. SSE headers verification
  4. Event streaming with filtering
  5. Cross-session filtering validation
- All tests pass (5/5)
- Type checking passes with no errors
- Follows existing route patterns in sessions.ts
- Implementation aligns with design spec (spec-sdk-api.md Section 5.1)

---

### Session: 2026-01-08 10:24
**Tasks Completed**: TASK-004
**Review Iterations**: 0 (direct implementation - simple route addition)
**Review Summary**: Implementation verified via integration tests
**Notes**:
- Added GET /api/groups/:id/stream endpoint to groups.ts
- Imported createSSEStream from src/daemon/sse.ts
- Route filters events by groupId using EventFilter
- Proper permission check (session:read) implemented
- Created comprehensive integration test file (groups.test.ts) with 5 test cases:
  1. Authentication requirement
  2. Permission check
  3. SSE headers verification
  4. Event streaming with filtering by groupId
  5. Cross-group filtering validation
- Fixed GroupStartedEvent properties to match actual type (totalSessions, maxConcurrent)
- All tests pass (5/5 for groups, 10/10 for all daemon routes)
- Type checking passes with no errors
- Follows existing route patterns from sessions.ts
- Implementation aligns with design spec (spec-sdk-api.md Section 5.2)
- **Plan Status**: All tasks completed (TASK-001 through TASK-004)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

None at this time.

### Future Enhancements

- WebSocket support (in addition to SSE)
- Server-side event buffering for reconnection
- Event replay from specific timestamp
- Compression for SSE streams
