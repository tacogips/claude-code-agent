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
| (none yet) | - | - | - | - |

## Module to Plan Mapping

| Source Module | Unit Tests | Integration | E2E |
|---------------|------------|-------------|-----|
| src/sdk/queue/ | queue-unit.md | queue-integration.md | - |
| src/sdk/group/ | group-unit.md | group-integration.md | group-e2e.md |
| src/sdk/bookmarks/ | bookmarks-unit.md | - | - |
| src/daemon/ | daemon-unit.md | daemon-integration.md | - |
| src/cli/ | cli-unit.md | - | cli-e2e.md |
| src/repository/ | repository-unit.md | repository-integration.md | - |

## Coverage Targets

| Module Category | Target | Current |
|-----------------|--------|---------|
| Core SDK | 85% | TBD |
| Repository | 80% | TBD |
| Daemon/API | 75% | TBD |
| CLI | 70% | TBD |

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
