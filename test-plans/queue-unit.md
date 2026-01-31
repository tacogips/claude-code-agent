# Command Queue Unit Tests

**Status**: Ready
**Implementation Reference**: impl-plans/command-queue-types.md, impl-plans/command-queue-core.md
**Source Files**: src/sdk/queue/
**Test Type**: Unit
**Created**: 2026-01-09
**Last Updated**: 2026-01-09

## Implementation Reference

Command Queue system for sequential prompt execution in Claude Code sessions.

**Key Features**:
- Queue Manager (CRUD operations)
- Queue Runner (sequential execution)
- Recovery mechanisms
- Event emission for monitoring

**Scope**: Unit tests for queue operations, execution, and recovery.

## Test Environment

**Runtime**: Bun test (vitest)
**Mocks Required**: MockProcessManager, MockFilesystem
**Fixtures**: Queue state files, command fixtures
**Setup/Teardown**: Clean up temp queue files

## Test Cases

### TEST-001: Queue Manager - Create Queue

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/sdk/queue/manager.ts:createQueue`

**Description**:
Verify queue creation with valid parameters.

**Scenarios**:
1. Create queue with default config
2. Create queue with custom session path
3. Create queue with prompts
4. Validate queue ID generation

**Assertions**:
- [x] Queue created with unique ID
- [x] Initial state correct
- [x] Prompts loaded correctly
- [x] Events emitted

**Test Code Location**: `src/sdk/queue/manager.test.ts`

---

### TEST-002: Queue Manager - Add/Remove Commands

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/queue/manager.ts:addCommand, removeCommand`

**Description**:
Verify command addition and removal.

**Scenarios**:
1. Add single command
2. Add multiple commands
3. Remove command by ID
4. Handle invalid queue ID
5. Handle invalid command ID

**Assertions**:
- [x] Commands added correctly
- [x] Commands removed correctly
- [x] Errors handled properly
- [x] Events emitted

**Test Code Location**: `src/sdk/queue/manager.test.ts`

---

### TEST-003: Queue Runner - Sequential Execution

**Status**: Passing
**Priority**: Critical
**Parallelizable**: No
**Dependencies**: TEST-001

**Target**: `src/sdk/queue/runner.ts:execute`

**Description**:
Verify sequential command execution.

**Scenarios**:
1. Execute all commands in order
2. Stop on first failure
3. Continue on success
4. Track execution progress

**Assertions**:
- [x] Commands execute sequentially
- [x] Order preserved
- [x] Status updates correct
- [x] Events emitted per command

**Test Code Location**: `src/sdk/queue/runner.test.ts`

---

### TEST-004: Queue Runner - Pause/Resume

**Status**: Passing
**Priority**: High
**Parallelizable**: No
**Dependencies**: TEST-003

**Target**: `src/sdk/queue/runner.ts:pause, resume`

**Description**:
Verify queue pause and resume functionality.

**Scenarios**:
1. Pause running queue
2. Resume paused queue
3. Pause between commands
4. Handle already paused state

**Assertions**:
- [x] Queue pauses correctly
- [x] Queue resumes from correct position
- [x] State persisted
- [x] Events emitted

**Test Code Location**: `src/sdk/queue/runner.test.ts`

---

### TEST-005: Queue Recovery

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/queue/recovery.ts`

**Description**:
Verify queue recovery from crashes or interruptions.

**Scenarios**:
1. Recover interrupted queue
2. Restore execution position
3. Handle corrupted state
4. Validate recovered state

**Assertions**:
- [x] Queue state recovered
- [x] Position restored correctly
- [x] Corrupted data handled
- [x] Events emitted

**Test Code Location**: `src/sdk/queue/recovery.test.ts`

---

### TEST-006: Queue Events

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/sdk/queue/events.ts`

**Description**:
Verify queue event types and emission.

**Scenarios**:
1. QueueCreated event
2. CommandAdded event
3. CommandStarted event
4. CommandCompleted event
5. QueueCompleted event
6. QueueFailed event

**Assertions**:
- [x] All event types defined
- [x] Events contain correct data
- [x] Event timing correct
- [x] Event emitter works

**Test Code Location**: `src/sdk/queue/manager.test.ts`, `src/sdk/queue/runner.test.ts`

---

### TEST-007: Queue State Persistence

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/queue/manager.ts:saveState, loadState`

**Description**:
Verify queue state persistence to disk.

**Scenarios**:
1. Save queue state to file
2. Load queue state from file
3. Handle missing state file
4. Handle corrupted state file

**Assertions**:
- [x] State saved correctly
- [x] State loaded correctly
- [x] Error handling works
- [x] State format valid

**Test Code Location**: `src/sdk/queue/manager.test.ts`

---

### TEST-008: Queue Validation

**Status**: Passing
**Priority**: Medium
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/sdk/queue/types.ts` - Validation functions

**Description**:
Verify queue and command validation logic.

**Scenarios**:
1. Validate queue structure
2. Validate command structure
3. Reject invalid queue ID
4. Reject invalid prompts
5. Reject invalid status

**Assertions**:
- [x] Valid queues pass
- [x] Invalid queues rejected
- [x] Error messages clear
- [x] Type guards work

**Test Code Location**: `src/sdk/queue/manager.test.ts`

---

### TEST-009: Queue Status Transitions

**Status**: Passing
**Priority**: Medium
**Parallelizable**: Yes
**Dependencies**: TEST-001, TEST-003

**Target**: `src/sdk/queue/manager.ts:updateStatus`

**Description**:
Verify queue status state machine.

**Scenarios**:
1. pending -> running
2. running -> completed
3. running -> failed
4. running -> paused
5. paused -> running
6. Invalid transitions rejected

**Assertions**:
- [x] Valid transitions work
- [x] Invalid transitions rejected
- [x] Status updates persisted
- [x] Events emitted

**Test Code Location**: `src/sdk/queue/manager.test.ts`

---

### TEST-010: Queue Error Handling

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-003

**Target**: `src/sdk/queue/runner.ts` - Error scenarios

**Description**:
Verify error handling during queue execution.

**Scenarios**:
1. Command execution failure
2. Process crash during execution
3. File system errors
4. Network timeouts
5. Budget exceeded errors

**Assertions**:
- [x] Errors caught and logged
- [x] Queue state updated correctly
- [x] Error events emitted
- [x] Recovery possible

**Test Code Location**: `src/sdk/queue/runner.test.ts`

---

### TEST-011: Queue Concurrency Control

**Status**: Passing
**Priority**: Medium
**Parallelizable**: No
**Dependencies**: TEST-003

**Target**: `src/sdk/queue/runner.ts` - Concurrency management

**Description**:
Verify only one queue executes at a time per session.

**Scenarios**:
1. Start second queue while first running
2. Queue waiting behavior
3. Queue completion unblocks next
4. Handle queue cancellation

**Assertions**:
- [x] Only one queue runs at a time
- [x] Queues wait correctly
- [x] Queue order preserved
- [x] Cancellation works

**Test Code Location**: `src/sdk/queue/runner.test.ts`

---

### TEST-012: Queue Repository Integration

**Status**: Passing
**Priority**: Medium
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/queue/manager.ts` - Repository operations

**Description**:
Verify queue manager integrates with repository layer.

**Scenarios**:
1. Save queue to repository
2. Load queue from repository
3. Update queue in repository
4. Delete queue from repository
5. List all queues

**Assertions**:
- [x] CRUD operations work
- [x] Repository errors handled
- [x] Data consistency maintained
- [x] Events propagated

**Test Code Location**: `src/sdk/queue/manager.test.ts`

## Test Status

| Test ID | Name | Status | Priority | Dependencies |
|---------|------|--------|----------|--------------|
| TEST-001 | Create Queue | Passing | Critical | None |
| TEST-002 | Add/Remove Commands | Passing | Critical | TEST-001 |
| TEST-003 | Sequential Execution | Passing | Critical | TEST-001 |
| TEST-004 | Pause/Resume | Passing | High | TEST-003 |
| TEST-005 | Queue Recovery | Passing | High | TEST-001 |
| TEST-006 | Queue Events | Passing | High | None |
| TEST-007 | State Persistence | Passing | High | TEST-001 |
| TEST-008 | Queue Validation | Passing | Medium | None |
| TEST-009 | Status Transitions | Passing | Medium | TEST-001, TEST-003 |
| TEST-010 | Error Handling | Passing | High | TEST-003 |
| TEST-011 | Concurrency Control | Passing | Medium | TEST-003 |
| TEST-012 | Repository Integration | Passing | Medium | TEST-001 |

## Coverage Targets

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| src/sdk/queue/types.ts | ~90% | 85% | Met |
| src/sdk/queue/manager.ts | ~90% | 85% | Met |
| src/sdk/queue/runner.ts | ~90% | 85% | Met |
| src/sdk/queue/recovery.ts | ~85% | 80% | Met |
| src/sdk/queue/events.ts | ~95% | 90% | Met |

## Completion Criteria

- [x] All test cases implemented
- [x] All tests passing
- [x] Coverage targets met
- [x] No flaky tests
- [x] Documentation updated

## Progress Log

### Session: 2026-01-09 16:35
**Tests Completed**: All 12 tests documented
**Status**: All tests passing
**Notes**: Queue system has comprehensive test coverage including recovery, concurrency, and error handling.
