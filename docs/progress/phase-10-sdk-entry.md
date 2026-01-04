# Phase 10: SDK Entry Point

**Status**: NOT_STARTED

**Goal**: Create main SDK class that orchestrates all services.

## Spec Reference

- `design-docs/spec-sdk-api.md` - SDK specification
- `design-docs/DESIGN.md` - SDK Layer section

---

## Dependencies

- Phase 3: Core Services
- Phase 4: Session Groups
- Phase 5: Command Queue
- Phase 6: Markdown Parser
- Phase 7: Real-Time Monitoring
- Phase 8: Bookmark System
- Phase 9: File Change Service

---

## 1. ClaudeCodeAgent Class

**File**: `src/sdk/agent.ts`
**Status**: NOT_STARTED

**Features**:
- Main entry point for SDK
- Orchestrates all managers
- Configuration initialization
- Dependency injection

**API**:
```typescript
class ClaudeCodeAgent {
  constructor(options?: AgentOptions);

  // Session operations
  sessions: SessionManager;

  // Group operations
  groups: GroupManager;

  // Queue operations
  queues: QueueManager;

  // Bookmark operations
  bookmarks: BookmarkService;

  // File change operations
  fileChanges: FileChangeService;

  // Event handling
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;

  // Lifecycle
  close(): Promise<void>;
}
```

**Checklist**:
- [ ] Implement ClaudeCodeAgent class
- [ ] Implement lazy initialization of managers
- [ ] Implement event delegation
- [ ] Implement close() cleanup
- [ ] Write unit tests

---

## 2. SDK Public Exports

**File**: `src/sdk/index.ts`
**Status**: NOT_STARTED

**Exports**:
- ClaudeCodeAgent (main class)
- All type definitions
- Utility functions
- Error types

**Checklist**:
- [ ] Export main class
- [ ] Export all types
- [ ] Export utilities
- [ ] Document public API

---

## 3. Package Entry Point

**File**: `src/index.ts`
**Status**: NOT_STARTED

**Checklist**:
- [ ] Re-export SDK
- [ ] Configure package.json exports

---

## Implementation Notes

- ClaudeCodeAgent is the primary interface for external applications
- All managers are accessible as properties
- Event system provides unified event handling
- close() cleans up watchers and connections

---

## Usage Example

```typescript
import { ClaudeCodeAgent } from 'claude-code-agent';

const agent = new ClaudeCodeAgent({
  configPath: '~/.config/claude-code-agent',
});

// List sessions
const sessions = await agent.sessions.list({
  projectPath: '/my/project',
});

// Watch for events
agent.on('message', (msg) => {
  console.log('New message:', msg);
});

// Start a session group
await agent.groups.run('my-group');

// Cleanup
await agent.close();
```
