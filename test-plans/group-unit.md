# Session Groups Unit Tests

**Status**: Ready
**Implementation Reference**: impl-plans/session-groups-types.md, impl-plans/session-groups-runner.md
**Source Files**: src/sdk/group/
**Test Type**: Unit
**Created**: 2026-01-09
**Last Updated**: 2026-01-09

## Implementation Reference

Session Groups enable orchestration of multiple Claude Code sessions with dependency management and parallel execution.

**Key Features**:
- Group definition with dependencies
- Dependency graph validation
- Parallel session execution
- Progress tracking
- Config generation for sessions

**Scope**: Unit tests for group creation, dependency resolution, and execution orchestration.

## Test Environment

**Runtime**: Bun test (vitest)
**Mocks Required**: MockProcessManager, MockFilesystem
**Fixtures**: Group definitions, session configs
**Setup/Teardown**: Clean up temp group files

## Test Cases

### TEST-001: Group Types and Validation

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/sdk/group/types.ts`

**Description**:
Verify group type definitions and validation.

**Scenarios**:
1. Valid group definition
2. Invalid group (missing fields)
3. Invalid session definition
4. Dependency validation

**Assertions**:
- [x] Type guards work correctly
- [x] Validation catches errors
- [x] Error messages clear

**Test Code Location**: `src/sdk/group/types.test.ts`

---

### TEST-002: Dependency Graph Construction

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/group/dependency-graph.ts:buildGraph`

**Description**:
Verify dependency graph construction from group definition.

**Scenarios**:
1. Simple linear dependencies
2. Parallel independent sessions
3. Diamond dependency pattern
4. Multiple roots
5. Complex DAG

**Assertions**:
- [x] Graph built correctly
- [x] All nodes present
- [x] All edges correct
- [x] Roots identified

**Test Code Location**: `src/sdk/group/dependency-graph.test.ts`

---

### TEST-003: Circular Dependency Detection

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-002

**Target**: `src/sdk/group/dependency-graph.ts:detectCycles`

**Description**:
Verify circular dependency detection.

**Scenarios**:
1. Simple A -> B -> A cycle
2. Multi-node cycle
3. Self-dependency
4. No cycles (valid DAG)

**Assertions**:
- [x] Cycles detected correctly
- [x] Error includes cycle path
- [x] Valid graphs pass

**Test Code Location**: `src/sdk/group/dependency-graph.test.ts`

---

### TEST-004: Topological Sort

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-002, TEST-003

**Target**: `src/sdk/group/dependency-graph.ts:topologicalSort`

**Description**:
Verify topological sorting for execution order.

**Scenarios**:
1. Linear dependency chain
2. Parallel sessions (multiple valid orders)
3. Complex dependency graph
4. Validate execution levels

**Assertions**:
- [x] Dependencies satisfied in sort
- [x] Valid topological order
- [x] Parallel opportunities identified

**Test Code Location**: `src/sdk/group/dependency-graph.test.ts`

---

### TEST-005: Config Generator

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/group/config-generator.ts`

**Description**:
Verify Claude Code config generation for sessions.

**Scenarios**:
1. Generate config for session
2. Override base config
3. Inject environment variables
4. Handle custom CLAUDE_CONFIG_DIR

**Assertions**:
- [x] Configs generated correctly
- [x] Overrides applied
- [x] Variables expanded
- [x] Valid config format

**Test Code Location**: `src/sdk/group/config-generator.test.ts`

---

### TEST-006: Group Progress Tracking

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/group/progress.ts`

**Description**:
Verify group execution progress tracking.

**Scenarios**:
1. Initialize progress state
2. Update session status
3. Calculate completion percentage
4. Track failures
5. Identify blocked sessions

**Assertions**:
- [x] Progress state maintained
- [x] Status updates correct
- [x] Calculations accurate
- [x] Events emitted

**Test Code Location**: `src/sdk/group/progress.test.ts`

---

### TEST-007: Group Events

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/sdk/group/events.ts`

**Description**:
Verify group event types and emission.

**Scenarios**:
1. GroupCreated event
2. SessionStarted event
3. SessionCompleted event
4. SessionFailed event
5. GroupCompleted event
6. GroupFailed event

**Assertions**:
- [x] All event types defined
- [x] Events contain correct data
- [x] Event timing correct

**Test Code Location**: `src/sdk/group/events.test.ts`

---

### TEST-008: Group Manager - Create/Delete

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/group/manager.ts:createGroup, deleteGroup`

**Description**:
Verify group lifecycle management.

**Scenarios**:
1. Create valid group
2. Create group with invalid definition
3. Delete existing group
4. Delete non-existent group

**Assertions**:
- [x] Groups created correctly
- [x] Validation enforced
- [x] Deletion works
- [x] Errors handled

**Test Code Location**: `src/sdk/group/manager.test.ts`

---

### TEST-009: Group Manager - Get/List

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-008

**Target**: `src/sdk/group/manager.ts:getGroup, listGroups`

**Description**:
Verify group retrieval operations.

**Scenarios**:
1. Get group by ID
2. Get non-existent group
3. List all groups
4. Filter groups by status

**Assertions**:
- [x] Retrieval works correctly
- [x] Errors handled
- [x] Listing accurate
- [x] Filters work

**Test Code Location**: `src/sdk/group/manager.test.ts`

---

### TEST-010: Group Runner - Start Execution

**Status**: Passing
**Priority**: Critical
**Parallelizable**: No
**Dependencies**: TEST-002, TEST-004

**Target**: `src/sdk/group/runner.ts:start`

**Description**:
Verify group execution start logic.

**Scenarios**:
1. Start group with single session
2. Start group with parallel sessions
3. Start group with dependencies
4. Handle already running group

**Assertions**:
- [x] Execution starts correctly
- [x] Sessions launched in order
- [x] Parallel sessions run concurrently
- [x] State transitions correct

**Test Code Location**: `src/sdk/group/runner.test.ts`

---

### TEST-011: Group Runner - Dependency Resolution

**Status**: Passing
**Priority**: Critical
**Parallelizable**: No
**Dependencies**: TEST-010

**Target**: `src/sdk/group/runner.ts` - Dependency handling

**Description**:
Verify runtime dependency resolution.

**Scenarios**:
1. Wait for dependencies before start
2. Start when dependencies complete
3. Handle dependency failure
4. Propagate failures

**Assertions**:
- [x] Dependencies respected
- [x] Sessions wait correctly
- [x] Failures propagate
- [x] Blocked sessions identified

**Test Code Location**: `src/sdk/group/runner.test.ts`

---

### TEST-012: Group Runner - Stop/Cancel

**Status**: Passing
**Priority**: High
**Parallelizable**: No
**Dependencies**: TEST-010

**Target**: `src/sdk/group/runner.ts:stop, cancel`

**Description**:
Verify group execution cancellation.

**Scenarios**:
1. Stop running group
2. Cancel all sessions
3. Clean up resources
4. Handle partial completion

**Assertions**:
- [x] Stop works correctly
- [x] Sessions cancelled
- [x] Cleanup complete
- [x] State saved

**Test Code Location**: `src/sdk/group/runner.test.ts`

## Test Status

| Test ID | Name | Status | Priority | Dependencies |
|---------|------|--------|----------|--------------|
| TEST-001 | Group Types | Passing | Critical | None |
| TEST-002 | Dependency Graph | Passing | Critical | TEST-001 |
| TEST-003 | Cycle Detection | Passing | Critical | TEST-002 |
| TEST-004 | Topological Sort | Passing | Critical | TEST-002, TEST-003 |
| TEST-005 | Config Generator | Passing | High | TEST-001 |
| TEST-006 | Progress Tracking | Passing | High | TEST-001 |
| TEST-007 | Group Events | Passing | High | None |
| TEST-008 | Create/Delete | Passing | Critical | TEST-001 |
| TEST-009 | Get/List | Passing | High | TEST-008 |
| TEST-010 | Start Execution | Passing | Critical | TEST-002, TEST-004 |
| TEST-011 | Dependency Resolution | Passing | Critical | TEST-010 |
| TEST-012 | Stop/Cancel | Passing | High | TEST-010 |

## Coverage Targets

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| src/sdk/group/types.ts | ~95% | 90% | Met |
| src/sdk/group/dependency-graph.ts | ~95% | 90% | Met |
| src/sdk/group/config-generator.ts | ~90% | 85% | Met |
| src/sdk/group/progress.ts | ~90% | 85% | Met |
| src/sdk/group/events.ts | ~95% | 90% | Met |
| src/sdk/group/manager.ts | ~85% | 85% | Met |
| src/sdk/group/runner.ts | ~85% | 85% | Met |

## Completion Criteria

- [x] All test cases implemented
- [x] All tests passing
- [x] Coverage targets met
- [x] No flaky tests
- [x] Documentation updated

## Progress Log

### Session: 2026-01-09 16:40
**Tests Completed**: All 12 tests documented
**Status**: All tests passing
**Notes**: Session Groups has excellent test coverage including complex dependency resolution and parallel execution scenarios.
