# Phase 5: Command Queue

**Status**: NOT_STARTED

**Goal**: Implement sequential prompt execution system.

## Spec Reference

- `design-docs/spec-command-queue.md` - Complete specification
- `design-docs/DECISIONS.md` Q15-Q18 - Queue-related decisions

---

## Dependencies

- Phase 3: Core Services (SessionManager, Events)

---

## 1. Queue Types

**File**: `src/sdk/queue/types.ts`
**Status**: NOT_STARTED

**Types**:
- CommandQueue
- QueueCommand
- QueueStatus
- CommandStatus
- SessionMode (continue | new)

**Checklist**:
- [ ] Define CommandQueue interface
- [ ] Define QueueCommand interface
- [ ] Define status types
- [ ] Define session mode types
- [ ] Write type tests

---

## 2. Queue Manager

**File**: `src/sdk/queue/manager.ts`
**Status**: NOT_STARTED

**Features**:
- Create/update/delete queues
- Add/edit/remove commands
- Reorder commands
- List queues

**Checklist**:
- [ ] Implement QueueManager class
- [ ] Implement queue CRUD
- [ ] Implement command management
- [ ] Implement reorder()
- [ ] Write unit tests

---

## 3. Queue Storage

**File**: `src/sdk/queue/storage.ts`
**Status**: NOT_STARTED

**Features**:
- Persist queues to JSON
- Load queues from storage
- Metadata management

**Checklist**:
- [ ] Implement QueueStorage class
- [ ] Implement save/load
- [ ] Write unit tests with MockFileSystem

---

## 4. Queue Runner

**File**: `src/sdk/queue/runner.ts`
**Status**: NOT_STARTED

**Features**:
- Execute commands sequentially
- Handle session mode (continue vs new)
- Pause/resume support
- Error handling

**Checklist**:
- [ ] Implement QueueRunner class
- [ ] Implement run()
- [ ] Implement pause()/resume()
- [ ] Implement --resume flag handling
- [ ] Write unit tests with MockProcessManager

---

## 5. Queue Index

**File**: `src/sdk/queue/index.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Export public API
- [ ] Document usage

---

## Implementation Order

1. Queue types
2. Queue storage
3. Queue manager
4. Queue runner

---

## Notes

- Session mode handling is critical (--resume flag)
- Queue UI is deferred to Phase 14 (Browser Viewer)
- Focus on SDK API first, CLI integration later
