---
name: test-refactor
description: Use when refactoring tests for better maintainability. Provides guidelines for removing duplicates, DRYing fixtures/assertions, restructuring test organization, and renaming.
allowed-tools: Read, Glob, Grep
---

# Test Refactoring Skill

This skill provides guidelines for refactoring test code to improve maintainability, reduce duplication, and establish consistent patterns.

## When to Apply

Apply this skill when:
- Tests have grown organically and contain duplications
- Test fixtures are repeated across multiple files
- Assertion patterns are inconsistent or verbose
- Test file organization needs improvement
- Test naming is inconsistent

## Core Principles

1. **DRY Test Logic** - Extract shared fixtures, helpers, and assertions
2. **Clear Test Intent** - Each test should clearly communicate what it verifies
3. **Isolated Tests** - Tests should not depend on each other's state
4. **Fast Feedback** - Keep tests fast and focused
5. **Maintainable Structure** - Organize tests for easy navigation

## Refactoring Categories

### Category 1: Duplicate Test Detection

#### What to Look For

| Pattern | Description | Action |
|---------|-------------|--------|
| **Identical test bodies** | Same assertions in multiple tests | Merge or parameterize |
| **Copy-paste variations** | Tests differing only in input values | Convert to parameterized tests |
| **Redundant coverage** | Multiple tests verifying same behavior | Remove redundant tests |
| **Dead tests** | Skipped/disabled tests with no plan | Delete or revive |

#### Detection Strategies

```typescript
// Look for identical describe/it blocks
grep -r "describe\|it\|test" --include="*.test.ts"

// Find similar assertion patterns
grep -r "expect.*toEqual\|expect.*toBe" --include="*.test.ts"

// Identify skipped tests
grep -r "it.skip\|describe.skip\|test.skip\|xit\|xdescribe" --include="*.test.ts"
```

### Category 2: Fixture DRYing

#### Common Fixture Patterns to Extract

| Pattern | When to Extract | Target Location |
|---------|-----------------|-----------------|
| **Mock objects** | Used in 3+ tests | `src/test/mocks/` |
| **Test data factories** | Same shape used repeatedly | `src/test/fixtures/` |
| **Setup functions** | Identical beforeEach blocks | `src/test/helpers/` |
| **Custom matchers** | Same assertion logic repeated | `src/test/matchers/` |

#### Fixture Organization Structure

```
src/test/
├── fixtures/             # Test data factories
│   ├── index.ts          # Re-exports all fixtures
│   ├── session.ts        # Session-related fixtures
│   ├── queue.ts          # Queue-related fixtures
│   └── group.ts          # Group-related fixtures
├── mocks/                # Mock implementations
│   ├── index.ts          # Re-exports all mocks
│   ├── filesystem.ts     # File system mocks
│   ├── clock.ts          # Time/clock mocks
│   └── process.ts        # Process mocks
├── helpers/              # Test utilities
│   ├── index.ts          # Re-exports all helpers
│   ├── setup.ts          # Common setup functions
│   └── assertions.ts     # Custom assertion helpers
└── matchers/             # Custom matchers (if using)
    └── index.ts          # Custom vitest matchers
```

#### Fixture Factory Pattern

```typescript
// src/test/fixtures/session.ts
export function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test-session-id',
    name: 'Test Session',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    status: 'active',
    ...overrides,
  };
}

// Usage in tests
const session = createTestSession({ status: 'completed' });
```

### Category 3: Assertion DRYing

#### Common Assertion Patterns

| Anti-Pattern | Refactored Pattern |
|--------------|-------------------|
| Repeated `expect(x).toEqual({...long object...})` | Extract expected object to fixture |
| Multiple assertions checking same structure | Create custom matcher or helper |
| Error assertion boilerplate | Create `expectError` helper |
| Async assertion patterns | Create `expectAsync` helpers |

#### Example: Error Assertion Helper

```typescript
// Before (repeated in many tests)
expect(result.ok).toBe(false);
if (!result.ok) {
  expect(result.error.code).toBe('INVALID_INPUT');
  expect(result.error.message).toContain('expected');
}

// After (extracted helper)
// src/test/helpers/assertions.ts
export function expectResultError(
  result: Result<unknown, AppError>,
  expectedCode: string,
  messageContains?: string
): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(expectedCode);
    if (messageContains) {
      expect(result.error.message).toContain(messageContains);
    }
  }
}

// Usage
expectResultError(result, 'INVALID_INPUT', 'expected');
```

### Category 4: Test Structure Refactoring

#### File Organization Rules

| Rule | Description |
|------|-------------|
| **Colocation** | Test file adjacent to source: `foo.ts` -> `foo.test.ts` |
| **One subject per file** | Each test file tests one module/class |
| **Logical grouping** | Use `describe` blocks for method/function groups |
| **Consistent depth** | Max 2-3 levels of `describe` nesting |

#### Describe Block Structure

```typescript
describe('ModuleName', () => {
  // Shared setup for all tests
  beforeEach(() => { /* common setup */ });

  describe('functionName', () => {
    describe('when valid input', () => {
      it('should return expected result', () => { });
      it('should handle edge case', () => { });
    });

    describe('when invalid input', () => {
      it('should return error', () => { });
    });
  });

  describe('anotherFunction', () => {
    // ...
  });
});
```

### Category 5: Test Naming Conventions

#### Naming Patterns

| Component | Convention | Example |
|-----------|------------|---------|
| **Test file** | `<source-file>.test.ts` | `parser.test.ts` |
| **describe block** | Module/class/function name | `describe('Parser', ...)` |
| **it/test block** | `should <expected behavior>` | `it('should parse valid input', ...)` |
| **Fixture factory** | `create<Entity>` | `createTestSession()` |
| **Mock** | `Mock<Entity>` or `mock<Entity>` | `mockFileSystem` |
| **Helper** | Verb phrase | `setupTestEnvironment()` |

#### Test Description Guidelines

```typescript
// GOOD: Clear, specific descriptions
it('should return empty array when no sessions exist', () => { });
it('should throw ValidationError when name exceeds 100 chars', () => { });
it('should emit "completed" event after all tasks finish', () => { });

// BAD: Vague or implementation-focused
it('should work correctly', () => { });
it('should call the function', () => { });
it('test 1', () => { });
```

## Refactoring Workflow

### Step 1: Audit Phase

1. **Scan for duplicates**: Find identical or near-identical test blocks
2. **Identify fixture patterns**: List repeated mock objects and test data
3. **Map assertion patterns**: Document common assertion sequences
4. **Review structure**: Check file organization and naming

### Step 2: Analysis Phase

1. **Group findings by priority**: High (most repeated), Medium, Low
2. **Identify dependencies**: Which refactorings depend on others
3. **Estimate impact**: Number of files affected
4. **Plan extraction order**: Fixtures first, then assertions, then structure

### Step 3: Extraction Phase

1. **Create shared fixtures**: Extract to `src/test/fixtures/`
2. **Create helper functions**: Extract to `src/test/helpers/`
3. **Update imports**: Replace inline code with imports
4. **Run tests**: Verify no regressions

### Step 4: Cleanup Phase

1. **Remove duplicates**: Delete redundant tests
2. **Standardize naming**: Apply consistent conventions
3. **Reorganize files**: Move tests to correct locations
4. **Update coverage**: Ensure no coverage loss

## Quality Checklist

Before completing refactoring:

- [ ] All tests still pass
- [ ] No duplicate test logic remains
- [ ] Fixtures are properly typed
- [ ] Test intent is clear from descriptions
- [ ] Coverage has not decreased
- [ ] Test execution time has not significantly increased
- [ ] Imports are clean (no unused imports)

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Better Approach |
|--------------|--------------|-----------------|
| **Over-abstraction** | Tests become hard to understand | Keep some duplication if it aids clarity |
| **Shared mutable state** | Tests become interdependent | Fresh fixtures per test |
| **Complex setup chains** | Hard to trace test prerequisites | Explicit setup in each test |
| **Testing implementation** | Tests break on refactoring | Test behavior, not implementation |
| **Magic fixtures** | Unclear what's being tested | Explicit inline data for key values |

## Quick Reference

### Priority Order for Refactoring

1. **High Priority**: Fixtures used in 10+ tests
2. **Medium Priority**: Assertion patterns in 5+ tests
3. **Low Priority**: Structure/naming inconsistencies

### Common Extractions

| Extraction | Target Location | Import Pattern |
|------------|-----------------|----------------|
| Mock objects | `src/test/mocks/<domain>.ts` | `import { mockX } from '@/test/mocks'` |
| Test data | `src/test/fixtures/<domain>.ts` | `import { createX } from '@/test/fixtures'` |
| Setup helpers | `src/test/helpers/setup.ts` | `import { setupX } from '@/test/helpers'` |
| Assertions | `src/test/helpers/assertions.ts` | `import { expectX } from '@/test/helpers'` |

### Parameterized Test Pattern

```typescript
// Convert multiple similar tests to parameterized test
describe('validation', () => {
  const testCases = [
    { input: '', expected: false, description: 'empty string' },
    { input: 'valid', expected: true, description: 'valid input' },
    { input: ' ', expected: false, description: 'whitespace only' },
  ];

  it.each(testCases)(
    'should return $expected for $description',
    ({ input, expected }) => {
      expect(isValid(input)).toBe(expected);
    }
  );
});
```
