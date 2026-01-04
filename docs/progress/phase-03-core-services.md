# Phase 3: Core Services

**Status**: NOT_STARTED

**Goal**: Implement core SDK services that orchestrate business logic.

## Spec Reference

- `design-docs/DESIGN.md` Core Services section
- `design-docs/spec-sdk-api.md` SDK specification

---

## Dependencies

- Phase 1: Foundation Layer
- Phase 2: Repository Layer

---

## 1. Session Reader

### 1.1 JSONL Parser

**File**: `src/sdk/jsonl-parser.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement line-by-line parsing
- [ ] Implement error recovery
- [ ] Implement streaming support
- [ ] Write unit tests

### 1.2 SessionReader

**File**: `src/sdk/session-reader.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement readSession()
- [ ] Implement readMessages()
- [ ] Implement findSessionFiles()
- [ ] Write unit tests with MockFileSystem

---

## 2. Session Manager

**File**: `src/sdk/session-manager.ts`
**Status**: NOT_STARTED

**Features**:
- List sessions with filtering
- Get session details
- Start/stop session monitoring
- Session metadata management

**Checklist**:
- [ ] Implement SessionManager class
- [ ] Implement listSessions()
- [ ] Implement getSession()
- [ ] Implement session discovery
- [ ] Write unit tests

---

## 3. Event System

### 3.1 Event Types

**File**: `src/sdk/events/types.ts`
**Status**: NOT_STARTED

**Events**:
- SessionStarted
- SessionEnded
- MessageReceived
- TaskStarted
- TaskCompleted
- ErrorOccurred

**Checklist**:
- [ ] Define all event types
- [ ] Define event payload interfaces

### 3.2 EventEmitter

**File**: `src/sdk/events/emitter.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement EventEmitter class
- [ ] Implement on/off/emit
- [ ] Implement once()
- [ ] Write unit tests

---

## 4. Config System

### 4.1 ConfigLoader

**File**: `src/sdk/config/loader.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement loadConfig()
- [ ] Implement mergeWithDefaults()
- [ ] Implement env variable override
- [ ] Write unit tests

### 4.2 ConfigValidator

**File**: `src/sdk/config/validator.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement validateConfig()
- [ ] Add schema validation
- [ ] Write unit tests

---

## 5. Logging System

### 5.1 Logger Interface

**File**: `src/logging/logger.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Define Logger interface
- [ ] Define LogLevel enum

### 5.2 ConsoleLogger

**File**: `src/logging/console-logger.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Implement ConsoleLogger
- [ ] Implement structured JSON output
- [ ] Write unit tests

---

## Implementation Order

1. JSONL Parser
2. SessionReader
3. Event System
4. SessionManager
5. Logging System
6. Config System

---

## Notes

- SessionReader is critical for all subsequent phases
- Event system enables real-time monitoring
- Config system can be simplified initially (hardcoded defaults)
