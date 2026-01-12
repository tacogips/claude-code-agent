# Test Plans

This directory contains all test plans for the claude-code-agent project.

## Overview

Test plans translate implementation into verifiable test cases. Each plan focuses on a specific module or feature area and defines:
- Test scenarios and assertions
- Coverage targets
- Dependencies between tests
- Progress tracking

## Directory Structure

```
test-plans/
├── README.md              # This file
├── PROGRESS.json          # Test status tracking (single source of truth)
├── <feature>-unit.md      # Unit test plans
├── <feature>-integration.md # Integration test plans
└── <feature>-e2e.md       # End-to-end test plans
```

## Test Plan Status

Status is tracked in `PROGRESS.json`. Possible states:

| Plan Status | Meaning |
|-------------|---------|
| `Planning` | Plan being created |
| `Ready` | Plan ready for execution |
| `In Progress` | Tests being implemented |
| `Completed` | All tests passing |

| Test Status | Meaning |
|-------------|---------|
| `Not Started` | Test not yet implemented |
| `In Progress` | Test being written |
| `Passing` | Test implemented and passing |
| `Failing` | Test implemented but failing |
| `Skipped` | Test intentionally skipped |

## Commands

### Generate Test Plans

```bash
# Generate all missing test plans
/test-plan-all

# Preview what would be created
/test-plan-all --dry-run

# Generate only unit test plans
/test-plan-all --type=unit

# Regenerate all plans
/test-plan-all --force
```

### Execute Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/sdk/queue/manager.test.ts

# Run tests with coverage
bun test --coverage
```

## Active Plans

| Plan | Source | Type | Tests | Status |
|------|--------|------|-------|--------|
| foundation-unit.md | src/types/, src/errors.ts, src/result.ts, src/interfaces/ | Unit | 12 | Completed |
| queue-unit.md | src/sdk/queue/ | Unit | 12 | Completed |
| group-unit.md | src/sdk/group/ | Unit | 12 | Completed |
| markdown-parser-unit.md | src/sdk/markdown-parser/ | Unit | 5 | Completed |
| repository-unit.md | src/repository/ | Unit | 8 | Completed |
| polling-unit.md | src/polling/ | Unit | 7 | Completed |
| daemon-integration.md | src/daemon/ | Integration | 10 | Completed |
| cli-unit.md | src/cli/ | Unit | 10 | Completed |
| browser-viewer-unit.md | src/viewer/browser/ | Unit | 8 | Completed |
| bookmarks-unit.md | src/sdk/bookmarks/ | Unit | 5 | Completed |
| file-changes-unit.md | src/sdk/file-changes/ | Unit | 5 | Completed |

**Total**: 10 plans, 88 test cases, All tests passing

## Module to Plan Mapping

| Source Module | Unit Tests | Integration | E2E |
|---------------|------------|-------------|-----|
| src/types/, src/errors.ts, src/result.ts, src/interfaces/ | foundation-unit.md | - | - |
| src/sdk/queue/ | queue-unit.md | - | - |
| src/sdk/group/ | group-unit.md | - | - |
| src/sdk/markdown-parser/ | markdown-parser-unit.md | - | - |
| src/sdk/bookmarks/ | bookmarks-unit.md | - | - |
| src/sdk/file-changes/ | file-changes-unit.md | - | - |
| src/repository/ | repository-unit.md | - | - |
| src/polling/ | polling-unit.md | - | - |
| src/daemon/ | - | daemon-integration.md | - |
| src/cli/ | cli-unit.md | - | - |
| src/viewer/browser/ | browser-viewer-unit.md | - | - |

## Coverage Targets

| Module Category | Target | Current |
|-----------------|--------|---------|
| Foundation | 90% | ~90% |
| Core SDK | 85% | ~85-90% |
| Repository | 80% | ~85-90% |
| Polling/Realtime | 80% | ~85-90% |
| Daemon/API | 75% | ~80-85% |
| CLI | 70% | ~70-75% |
| Browser Viewer | 75% | ~80-85% |

## Test Execution Guidelines

### Parallelization

Tests marked as `Parallelizable: Yes` can run concurrently.
Tests with dependencies must run sequentially.

### Test Environment

- **Runtime**: Bun test
- **Mocks**: Located in `src/test/mocks/`
- **Fixtures**: Created as needed per test

### Adding New Tests

1. Check if test plan exists for the module
2. If not, generate with `/test-plan <module>`
3. Implement tests following the plan
4. Update PROGRESS.json status
5. Ensure all assertions pass

## Progress Tracking

Progress is tracked in `PROGRESS.json`:

```json
{
  "lastUpdated": "2026-01-09T16:00:00Z",
  "summary": {
    "totalPlans": 0,
    "totalTests": 0,
    "passing": 0,
    "failing": 0,
    "notStarted": 0
  },
  "plans": {}
}
```

Update this file as tests are implemented and verified.
