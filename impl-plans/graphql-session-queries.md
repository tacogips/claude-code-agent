# GraphQL Session Queries Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-sdk-api.md#5-rest-api-endpoints
**Created**: 2026-04-09
**Last Updated**: 2026-04-09

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md`

### Summary

Add a typed GraphQL session query surface for CLI and daemon usage so callers can list Claude Code sessions, fetch transcript history, inspect a specific session, and run grep-style transcript search without relying on the generic command wrapper.

### Scope

**Included**: typed session GraphQL schema/resolvers, CLI GraphQL compatibility, focused tests, progress tracking
**Excluded**: session mutation runtime, daemon auth model changes, non-session schema redesign

---

## Modules

### 1. Session GraphQL Schema

#### `src/graphql/index.ts`

**Status**: COMPLETED

```typescript
interface SessionQueryArgs {
  readonly projectPath?: string | undefined;
  readonly status?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

interface SessionHistoryArgs {
  readonly offset?: number | undefined;
  readonly limit?: number | undefined;
}

interface SessionGrepArgs {
  readonly query: string;
  readonly caseSensitive?: boolean | undefined;
  readonly role?: "user" | "assistant" | "both" | undefined;
  readonly maxMatches?: number | undefined;
  readonly maxBytes?: number | undefined;
  readonly timeoutMs?: number | undefined;
}
```

**Checklist**:

- [x] Add typed `sessions` and `session` query fields
- [x] Add reusable `Session`, `SessionHistory`, and transcript search result types
- [x] Reuse `SessionReader` APIs for transcript history and grep-style search
- [x] Keep existing `command` field for backward compatibility

### 2. GraphQL Tests

#### `src/graphql/index.test.ts`

**Status**: COMPLETED

```typescript
type SessionGraphqlTestCase =
  | "list sessions"
  | "session history"
  | "session grep"
  | "cross-session grep";
```

**Checklist**:

- [x] Cover typed session list query
- [x] Cover typed session history query
- [x] Cover typed per-session grep query
- [x] Cover typed cross-session grep query

### 3. CLI GraphQL Tests

#### `src/cli/graphql.test.ts`

**Status**: COMPLETED

```typescript
interface GraphqlCliCoverage {
  readonly document: string;
  readonly resultPath: string;
}
```

**Checklist**:

- [x] Verify CLI can execute typed session GraphQL documents
- [x] Keep shorthand command coverage intact

---

## Module Status

| Module                 | File Path                   | Status    | Tests  |
| ---------------------- | --------------------------- | --------- | ------ |
| Session GraphQL schema | `src/graphql/index.ts`      | COMPLETED | Passed |
| GraphQL schema tests   | `src/graphql/index.test.ts` | COMPLETED | Passed |
| CLI GraphQL tests      | `src/cli/graphql.test.ts`   | COMPLETED | Passed |

## Dependencies

| Feature               | Depends On                    | Status    |
| --------------------- | ----------------------------- | --------- |
| Typed session queries | Existing `SessionReader` APIs | Completed |
| CLI GraphQL execution | Typed session queries         | Completed |
| Test coverage         | Typed session queries         | Completed |

## Completion Criteria

- [x] CLI can execute typed GraphQL session queries
- [x] Session list exposes reusable session objects
- [x] Transcript history is available for list and per-session queries
- [x] Session grep search works for one session and across sessions
- [x] Focused tests and typecheck pass or failures are documented

## Progress Log

### Session: 2026-04-09 00:00

**Tasks Completed**: Plan initialization
**Tasks In Progress**: Typed GraphQL session query implementation
**Blockers**: None
**Notes**: User requested a DRY GraphQL schema for Claude Code session listing, log history access, specific-session history, and grep-style search via the CLI `gql` entrypoint.

### Session: 2026-04-09 01:00

**Tasks Completed**: Typed session schema, CLI support verification, focused tests, typecheck
**Tasks In Progress**: None
**Blockers**: None
**Notes**: Added reusable `Session` and transcript search GraphQL types backed by existing `SessionReader` APIs, kept the command wrapper intact, and verified with focused Vitest coverage plus `tsc --noEmit`.

## Related Plans

- **Previous**: `impl-plans/graphql-client-boundary.md`
- **Next**: None
- **Depends On**: `impl-plans/graphql-client-boundary.md`
