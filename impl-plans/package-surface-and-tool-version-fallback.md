# Package Surface and Tool Version Fallback Implementation Plan

**Status**: Completed
**Design Reference**: GitHub issues `#44` and `#45`
**Created**: 2026-03-30
**Last Updated**: 2026-03-30

---

## Design Document Reference

**Source**: GitHub issues `#44` and `#45`

### Summary
Preserve the documented published package surface for SDK consumers and make Claude CLI version detection resilient when direct subprocess probing returns exit code `0` with empty output.

### Scope
**Included**: package-surface regression coverage, public example correction, Claude version fallback probe, unit tests
**Excluded**: broader SDK API redesign, release publishing workflow changes

---

## Modules

### 1. Package Surface Regression Coverage

#### `src/package-metadata.test.ts`

**Status**: COMPLETED

```typescript
interface ExportTarget {
  readonly import: string;
  readonly types: string;
  readonly default: string;
}

interface PackageExports {
  readonly ".": ExportTarget;
  readonly "./sdk": ExportTarget;
  readonly "./container": ExportTarget;
}
```

**Checklist**:
- [x] Verify package exports include root, `./sdk`, and `./container`
- [x] Verify build script emits the documented runtime entrypoints
- [x] Verify tests protect the public package contract

### 2. Tool Version Detection Fallback

#### `src/sdk/tool-versions.ts`

**Status**: COMPLETED

```typescript
interface VersionCommand {
  readonly key: keyof AgentToolVersions;
  readonly command: string;
  readonly args: readonly string[];
}

interface CommandProbeResult {
  readonly stdoutText: string;
  readonly stderrText: string;
  readonly exitCode: number | null;
}
```

**Checklist**:
- [x] Detect empty successful output from direct subprocess probing
- [x] Retry Claude version detection through a shell-wrapped fallback
- [x] Preserve existing error handling for missing executables and malformed output
- [x] Add unit tests for fallback success and failure paths

### 3. Public Example Cleanup

#### Removed obsolete network examples

**Status**: COMPLETED

**Checklist**:
- [x] Remove obsolete network examples that depended on removed runtime surface
- [x] Keep remaining examples aligned with the published package surface

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Package surface regression coverage | `src/package-metadata.test.ts` | COMPLETED | Added |
| Tool version detection fallback | `src/sdk/tool-versions.ts` | COMPLETED | Added |
| Public example cleanup | `examples/README.md` | COMPLETED | Verified |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Package surface regression coverage | Existing package exports/build config | Available |
| Tool version fallback | Existing process manager abstraction | Available |
| Public example cleanup | Package surface verification | Available |

## Completion Criteria

- [x] Package export contract is protected by tests
- [x] Claude version detection succeeds when direct spawn returns empty output but shell fallback returns a version
- [x] Public examples use valid published imports
- [x] Relevant tests and typecheck pass

## Progress Log

### Session: 2026-03-30 15:00
**Tasks Completed**: Plan initialization, issue analysis
**Tasks In Progress**: Packaging regression coverage, tool version fallback implementation
**Blockers**: None
**Notes**: Verified that `#44` already works in a packed consumer install on the current checkout, so the remaining work is regression coverage plus the `#45` fallback fix and one stale example import.

### Session: 2026-03-30 15:55
**Tasks Completed**: TASK-001, TASK-002, TASK-003
**Tasks In Progress**: None
**Blockers**: None
**Notes**: Added package metadata regression tests, implemented Claude shell fallback when the direct version probe returns empty output, corrected stale public import examples, and verified with typecheck, focused tests, full tests, and a packed-consumer install/import check.

## Related Plans

- **Previous**: None
- **Next**: None
- **Depends On**: None
