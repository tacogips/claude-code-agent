# Phase 4: Session Groups

**Status**: NOT_STARTED

**Goal**: Implement multi-project orchestration with dependency management.

## Spec Reference

- `design-docs/spec-session-groups.md` - Complete specification
- `design-docs/DECISIONS.md` Q11-Q14 - Group-related decisions

---

## Dependencies

- Phase 3: Core Services (SessionManager, Events)

---

## 1. Group Types

**File**: `src/sdk/group/types.ts`
**Status**: NOT_STARTED

**Types**:
- SessionGroup
- SessionGroupConfig
- SessionDefinition
- GroupStatus
- SessionDependency

**Checklist**:
- [ ] Define SessionGroup interface
- [ ] Define config types
- [ ] Define dependency types
- [ ] Write type tests

---

## 2. Group Manager

**File**: `src/sdk/group/manager.ts`
**Status**: NOT_STARTED

**Features**:
- Create/update/delete groups
- List groups with filtering
- Get group status

**Checklist**:
- [ ] Implement GroupManager class
- [ ] Implement CRUD operations
- [ ] Implement status aggregation
- [ ] Write unit tests

---

## 3. Dependency Graph

**File**: `src/sdk/group/dependency-graph.ts`
**Status**: NOT_STARTED

**Features**:
- Build DAG from session definitions
- Topological sort for execution order
- Cycle detection

**Checklist**:
- [ ] Implement DependencyGraph class
- [ ] Implement buildGraph()
- [ ] Implement getExecutionOrder()
- [ ] Implement cycle detection
- [ ] Write unit tests

---

## 4. Group Runner

**File**: `src/sdk/group/runner.ts`
**Status**: NOT_STARTED

**Features**:
- Execute sessions respecting dependencies
- Manage concurrent execution slots
- Handle pause/resume/stop
- Budget enforcement

**Checklist**:
- [ ] Implement GroupRunner class
- [ ] Implement run()
- [ ] Implement pause()/resume()
- [ ] Implement budget checking
- [ ] Write unit tests with MockProcessManager

---

## 5. Progress Aggregator

**File**: `src/sdk/group/progress-aggregator.ts`
**Status**: NOT_STARTED

**Features**:
- Aggregate stats from multiple sessions
- Real-time cost/token tracking
- Status summarization

**Checklist**:
- [ ] Implement ProgressAggregator class
- [ ] Implement getGroupStats()
- [ ] Write unit tests

---

## 6. Config Generator

**File**: `src/sdk/group/config-generator.ts`
**Status**: NOT_STARTED

**Features**:
- Generate CLAUDE.md per session
- Generate MCP configuration
- Template interpolation

**Checklist**:
- [ ] Implement ConfigGenerator class
- [ ] Implement generateClaudeMd()
- [ ] Implement generateMcpConfig()
- [ ] Write unit tests

---

## Implementation Order

1. Group types
2. Dependency graph (pure logic, easy to test)
3. Group manager (CRUD)
4. Progress aggregator
5. Config generator
6. Group runner (orchestration)

---

## Notes

- Group runner is the most complex component
- Start with simple single-session groups before dependencies
- Budget enforcement can be simplified initially
