# Command Queue Types Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-command-queue.md
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Next**: `impl-plans/command-queue-core.md` (Manager, Runner, SDK)
- **Depends On**: `foundation-and-core` (completed)

---

## Design Document Reference

**Source**: `design-docs/spec-command-queue.md`

### Summary

Define Command Queue data model types and events. This plan covers the foundational types needed for command queue management.

### Scope

**Included**:
- Command Queue data model and types
- Queue and command status types
- Queue configuration and statistics
- Event types for queue operations

**Excluded**:
- Queue manager implementation (command-queue-core.md)
- Queue runner implementation (command-queue-core.md)
- CLI and SDK integration (command-queue-core.md)

---

## Modules

### 1. Queue Types

#### src/sdk/queue/types.ts

**Status**: COMPLETED

```typescript
interface CommandQueue {
  id: string;                      // Format: YYYYMMDD-HHMMSS-{slug}
  name: string;
  description?: string;
  projectPath: string;
  status: QueueStatus;
  claudeSessionId?: string;
  currentCommandIndex: number;
  commands: QueueCommand[];
  config: QueueConfig;
  stats: QueueStats;
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}

interface QueueCommand {
  id: string;
  index: number;
  prompt: string;
  sessionMode: SessionMode;
  status: CommandStatus;
  claudeSessionId?: string;
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  cost?: number;
  tokens?: { input: number; output: number };
  error?: string;
}

type QueueStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
type CommandStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
type SessionMode = 'continue' | 'new';

interface QueueConfig {
  stopOnError: boolean;
  model?: string;
}

interface QueueStats {
  totalCommands: number;
  completedCommands: number;
  failedCommands: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  totalDuration: number;
}
```

**Checklist**:
- [x] CommandQueue interface defined with all properties
- [x] QueueCommand interface defined with sessionMode
- [x] QueueStatus, CommandStatus, SessionMode types defined
- [x] QueueConfig and QueueStats interfaces defined
- [x] Type checking passes
- [x] All types exported from index.ts

---

### 2. Queue Events

#### src/sdk/queue/events.ts

**Status**: COMPLETED

```typescript
type QueueEvent =
  | QueueCreatedEvent
  | QueueStartedEvent
  | QueuePausedEvent
  | QueueResumedEvent
  | QueueStoppedEvent
  | QueueCompletedEvent
  | QueueFailedEvent
  | CommandStartedEvent
  | CommandCompletedEvent
  | CommandFailedEvent
  | CommandAddedEvent
  | CommandUpdatedEvent
  | CommandRemovedEvent
  | CommandReorderedEvent
  | CommandModeChangedEvent;

interface QueueCreatedEvent {
  type: 'queue_created';
  queueId: string;
  name: string;
  projectPath: string;
}

interface CommandStartedEvent {
  type: 'command_started';
  queueId: string;
  commandId: string;
  prompt: string;
  sessionMode: SessionMode;
  isNewSession: boolean;
}

interface CommandCompletedEvent {
  type: 'command_completed';
  queueId: string;
  commandId: string;
  cost: number;
  claudeSessionId: string;
}
```

**Checklist**:
- [x] QueueEvent union type defined
- [x] All queue lifecycle events defined
- [x] All command lifecycle events defined
- [x] Type checking passes
- [x] All events exported

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Queue types | `src/sdk/queue/types.ts` | COMPLETED | N/A (types only) |
| Queue events | `src/sdk/queue/events.ts` | COMPLETED | N/A (types only) |

---

## Subtasks

### TASK-001: Queue Types and Events

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/queue/types.ts`, `src/sdk/queue/events.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for Command Queue including the main data model and events.

**Completion Criteria**:
- [x] CommandQueue interface defined with all properties
- [x] QueueCommand interface defined with sessionMode
- [x] QueueStatus, CommandStatus, SessionMode types defined
- [x] QueueConfig and QueueStats interfaces defined
- [x] All event types defined (QueueEvent union type)
- [x] Type checking passes
- [x] All types exported from index.ts

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Queue Types | Foundation Layer | Completed |

---

## Completion Criteria

- [x] All subtasks marked as Completed
- [x] All types exported and usable
- [x] Type checking passes without errors

---

## Progress Log

### Session: 2026-01-06 15:30

**Tasks Completed**: TASK-001 (Queue Types and Events)

**Files Created**:
- `src/sdk/queue/types.ts` - All queue and command data model types
- `src/sdk/queue/events.ts` - All queue lifecycle and command events
- `src/sdk/queue/index.ts` - Module exports

**Files Modified**:
- `src/sdk/events/types.ts` - Updated to import and re-export queue events
- `src/sdk/events/index.ts` - Added queue event exports for convenience

**Implementation Details**:
- Defined all type definitions following TypeScript strict mode requirements
- All properties use `readonly` for immutability
- Optional properties explicitly typed with `| undefined` per `exactOptionalPropertyTypes`
- Event types follow discriminated union pattern with `type` field
- All event types extend `BaseQueueEvent` with timestamp
- Complete JSDoc documentation for all types
- No `any` types used, strict type safety maintained

**Type Checking**:
- No type errors in queue module files
- Prettier formatting passed
- All types properly exported through index files

**Notes**:
- Queue events are defined in separate module (`src/sdk/queue/events.ts`) but re-exported through main events module for backward compatibility
- Event types include full lifecycle: create, start, pause, resume, stop, complete, fail
- Command management events: add, update, remove, reorder, mode change
- Session mode type supports `continue` and `new` modes as per design spec
