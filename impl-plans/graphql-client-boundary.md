# GraphQL Client Boundary Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-sdk-api.md#5-rest-api-endpoints
**Created**: 2026-03-16
**Last Updated**: 2026-03-16

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md`

### Summary
Replace the user-facing browser viewer path with a GraphQL-based client boundary for daemon access, using `graphql-yoga` and a command-style schema similar to the reference `codex-agent` repository.

### Scope
**Included**: GraphQL schema/executor, Yoga daemon endpoint, GraphQL CLI entrypoint, viewer removal, package/test updates
**Excluded**: Reworking internal SDK/session transport, redesigning queue/group runtime behavior

---

## Modules

### 1. GraphQL Boundary

#### `src/graphql/index.ts`

**Status**: COMPLETED

```typescript
interface GraphqlRequest {
  readonly document: string;
  readonly variables?: Readonly<Record<string, unknown>> | undefined;
  readonly context?: GraphqlContext | undefined;
}

interface GraphqlContext {
  readonly sdk: SdkManager;
  readonly tokenManager?: TokenManager | undefined;
  readonly token?: ApiToken | undefined;
}
```

**Checklist**:
- [x] Define command-style GraphQL schema
- [x] Map user-facing daemon operations to command handlers
- [x] Enforce token permission checks in command execution
- [x] Add unit tests

### 2. Daemon GraphQL Endpoint

#### `src/daemon/server.ts`

**Status**: COMPLETED

```typescript
interface GraphqlYogaHandlerDeps {
  readonly sdk: SdkManager;
  readonly tokenManager: TokenManager;
}
```

**Checklist**:
- [x] Mount `/graphql` with `graphql-yoga`
- [x] Keep health/status endpoints unchanged
- [x] Remove browser viewer wiring
- [x] Add runtime tests

### 3. CLI GraphQL Entry

#### `src/cli/graphql.ts`

**Status**: COMPLETED

```typescript
interface GraphqlCliArgs {
  readonly document: string;
  readonly variables?: Readonly<Record<string, unknown>> | undefined;
}
```

**Checklist**:
- [x] Parse shorthand command input into GraphQL documents
- [x] Execute documents against local schema
- [x] Register `gql` command in CLI
- [x] Add CLI tests

### 4. UI Removal

#### `src/viewer/`

**Status**: COMPLETED

```typescript
type RemovedUiSurface = "viewer-module" | "viewer-tests" | "viewer-e2e";
```

**Checklist**:
- [x] Delete browser viewer source tree
- [x] Delete viewer-specific tests/e2e assets
- [x] Remove CLI/package/task references to viewer artifacts
- [x] Update relevant docs/config types

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| GraphQL executor | `src/graphql/index.ts` | COMPLETED | Added |
| Daemon GraphQL endpoint | `src/daemon/server.ts` | COMPLETED | Added |
| CLI GraphQL command | `src/cli/graphql.ts` | COMPLETED | Added |
| UI removal | `src/viewer/` | COMPLETED | Verified |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| GraphQL executor | Existing SDK managers | Completed |
| Daemon GraphQL endpoint | GraphQL executor | Completed |
| CLI GraphQL command | GraphQL executor | Completed |
| UI removal | CLI/package updates | Completed |

## Completion Criteria

- [x] GraphQL command schema implemented
- [x] Daemon serves authenticated GraphQL requests via Yoga
- [x] CLI exposes local GraphQL execution
- [x] Browser viewer code removed
- [x] Tests and typecheck pass or failures are documented

## Progress Log

### Session: 2026-03-16 00:00
**Tasks Completed**: Plan initialization
**Tasks In Progress**: GraphQL boundary implementation
**Blockers**: None
**Notes**: User requested GraphQL-only client boundary and explicit UI removal, with `codex-agent` as reference.

### Session: 2026-03-16 01:00
**Tasks Completed**: TASK-001, TASK-002, TASK-003, TASK-004
**Tasks In Progress**: None
**Blockers**: None
**Notes**: Added command-style GraphQL execution, mounted Yoga on daemon `/graphql`, registered CLI `gql`, removed browser viewer sources/tests, and verified with focused tests plus typecheck.

## Related Plans

- **Previous**: None
- **Next**: None
- **Depends On**: `impl-plans/http-api.md`, `impl-plans/browser-viewer-ui.md`, `impl-plans/browser-viewer-server.md`
