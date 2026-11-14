# Markdown Parser Unit Tests

**Status**: Ready
**Implementation Reference**: impl-plans/markdown-parser-types.md, impl-plans/markdown-parser-core.md
**Source Files**: src/sdk/markdown-parser/
**Test Type**: Unit
**Created**: 2026-01-09
**Last Updated**: 2026-01-09

## Implementation Reference

Markdown-to-JSON parser for Claude Code transcripts. Converts markdown-formatted messages into structured JSON.

**Scope**: Unit tests for block detection, parsing logic, and JSON conversion.

## Test Environment

**Runtime**: Bun test (vitest)
**Mocks Required**: None
**Fixtures**: Sample markdown transcripts
**Setup/Teardown**: None

## Test Cases

### TEST-001: Block Type Detection

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: None

**Target**: `src/sdk/markdown-parser/detectors.ts`

**Description**:
Verify detection of different markdown block types.

**Scenarios**:
1. User message blocks
2. Assistant message blocks
3. Tool use blocks
4. Tool result blocks
5. Code blocks
6. Thinking blocks

**Assertions**:
- [x] All block types detected
- [x] Block boundaries correct
- [x] Nested blocks handled

**Test Code Location**: `src/sdk/markdown-parser/detectors.test.ts`

---

### TEST-002: Message Parsing

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/markdown-parser/parser.ts:parseMessage`

**Description**:
Verify message parsing to JSON.

**Scenarios**:
1. Simple text message
2. Message with code blocks
3. Message with tool calls
4. Multi-paragraph messages

**Assertions**:
- [x] Messages parsed correctly
- [x] Content structure valid
- [x] Metadata preserved

**Test Code Location**: `src/sdk/markdown-parser/parser.test.ts`

---

### TEST-003: Tool Call Parsing

**Status**: Passing
**Priority**: Critical
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/markdown-parser/parser.ts:parseToolCall`

**Description**:
Verify tool call parsing.

**Scenarios**:
1. Simple tool call
2. Tool call with complex parameters
3. Multiple tool calls
4. Nested JSON parameters

**Assertions**:
- [x] Tool calls parsed correctly
- [x] Parameters extracted
- [x] Tool IDs correct

**Test Code Location**: `src/sdk/markdown-parser/parser.test.ts`

---

### TEST-004: Code Block Extraction

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-001

**Target**: `src/sdk/markdown-parser/parser.ts`

**Description**:
Verify code block extraction and formatting.

**Scenarios**:
1. Fenced code blocks with language
2. Inline code
3. Nested code blocks
4. Code in tool results

**Assertions**:
- [x] Code blocks extracted
- [x] Language tags preserved
- [x] Formatting maintained

**Test Code Location**: `src/sdk/markdown-parser/parser.test.ts`

---

### TEST-005: Edge Cases

**Status**: Passing
**Priority**: High
**Parallelizable**: Yes
**Dependencies**: TEST-002, TEST-003

**Target**: `src/sdk/markdown-parser/parser.ts`

**Description**:
Verify handling of edge cases.

**Scenarios**:
1. Empty messages
2. Malformed markdown
3. Unclosed blocks
4. Special characters
5. Very long messages

**Assertions**:
- [x] Edge cases handled
- [x] Errors caught gracefully
- [x] Partial parsing works

**Test Code Location**: `src/sdk/markdown-parser/parser.test.ts`

## Test Status

| Test ID | Name | Status | Priority | Dependencies |
|---------|------|--------|----------|--------------|
| TEST-001 | Block Detection | Passing | Critical | None |
| TEST-002 | Message Parsing | Passing | Critical | TEST-001 |
| TEST-003 | Tool Call Parsing | Passing | Critical | TEST-001 |
| TEST-004 | Code Block Extraction | Passing | High | TEST-001 |
| TEST-005 | Edge Cases | Passing | High | TEST-002, TEST-003 |

## Coverage Targets

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| src/sdk/markdown-parser/detectors.ts | ~95% | 90% | Met |
| src/sdk/markdown-parser/parser.ts | ~90% | 90% | Met |

## Completion Criteria

- [x] All test cases implemented
- [x] All tests passing
- [x] Coverage targets met
- [x] No flaky tests
- [x] Documentation updated

## Progress Log

### Session: 2026-01-09 16:45
**Tests Completed**: All 5 tests documented
**Status**: All tests passing
**Notes**: Markdown parser has comprehensive test coverage including edge cases.
