# Markdown Parser Types Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#10-markdown-to-json-parsing
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Next**: `impl-plans/active/markdown-parser-core.md` (Core Parser, Exports)
- **Depends On**: None (standalone parser)

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 10: Markdown-to-JSON Parsing

### Summary

Define type definitions for the parsed markdown structure and implement utility functions for detecting markdown block types.

### Scope

**Included**:
- Parsed markdown data structures
- Content block types (paragraph, code, list, blockquote, table)
- Block type detection utilities

**Excluded**:
- Core parser implementation (markdown-parser-core.md)
- Module exports (markdown-parser-core.md)

---

## Modules

### 1. Type Definitions

#### src/sdk/markdown-parser/types.ts

**Status**: COMPLETED

All types defined in `src/sdk/markdown-parser/types.ts` with:
- Discriminated union ContentBlock using literal types
- Readonly properties for immutability
- Complete JSDoc comments
- All types exported
- Type checking passes

**Checklist**:
- [x] ParsedMarkdown interface defined
- [x] MarkdownSection interface defined
- [x] All ContentBlock types defined (Paragraph, Code, List, Blockquote, Table)
- [x] ListItem interface with depth and checked properties
- [x] HeadingInfo interface defined
- [x] MarkdownMetadata interface defined
- [x] ParseOptions interface defined
- [x] Type checking passes
- [x] All types exported

---

### 2. Block Detectors

#### src/sdk/markdown-parser/detectors.ts

**Status**: COMPLETED

```typescript
function isHeading(line: string): boolean;

function isCodeFence(line: string): {
  isFence: boolean;
  language?: string;
  isOpening?: boolean;
};

function isListItem(line: string): boolean;

function getListItemInfo(line: string): {
  text: string;
  depth: number;
  checked?: boolean;
  isOrdered: boolean;
};

function isBlockquote(line: string): boolean;

function isTableRow(line: string): boolean;

function isTableSeparator(line: string): boolean;

function getHeadingLevel(line: string): number;
```

**Checklist**:
- [x] isHeading() detects # through ######
- [x] isCodeFence() detects ``` with optional language
- [x] isListItem() detects -, *, +, and numbered items
- [x] getListItemInfo() extracts depth, text, checkbox state
- [x] isBlockquote() detects >
- [x] isTableRow() detects pipe-delimited content
- [x] isTableSeparator() detects header separator
- [x] Unit tests for all detectors
- [x] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Type definitions | `src/sdk/markdown-parser/types.ts` | COMPLETED | N/A (types only) |
| Block detectors | `src/sdk/markdown-parser/detectors.ts` | COMPLETED | ✓ 37 tests |

---

## Subtasks

### TASK-001: Type Definitions

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/markdown-parser/types.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] ParsedMarkdown interface defined
- [x] MarkdownSection interface defined
- [x] All ContentBlock types defined (Paragraph, Code, List, Blockquote, Table)
- [x] ListItem interface with depth and checked properties
- [x] HeadingInfo interface defined
- [x] MarkdownMetadata interface defined
- [x] ParseOptions interface defined
- [x] Type checking passes
- [x] All types exported

---

### TASK-002: Block Detectors

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**: `src/sdk/markdown-parser/detectors.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] isHeading() detects # through ######
- [x] isCodeFence() detects ``` with optional language
- [x] isListItem() detects -, *, +, and numbered items
- [x] getListItemInfo() extracts depth, text, checkbox state
- [x] isBlockquote() detects >
- [x] isTableRow() detects pipe-delimited content
- [x] isTableSeparator() detects header separator
- [x] Unit tests for all detectors
- [x] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Detectors)
    |                       |
    +-------+---------------+
            |
            v
   (markdown-parser-core.md)
```

Parallelizable: TASK-001, TASK-002

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Types | None | Ready |
| Detectors | None | Ready |

---

## Completion Criteria

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes

---

## Progress Log

### Session: 2026-01-06 14:00

**Tasks Completed**: TASK-001 (Type Definitions)

**Files Created**:
- `src/sdk/markdown-parser/types.ts` (260 lines)

**Implementation Notes**:
- All interfaces use readonly properties for immutability
- ContentBlock is a discriminated union with literal type discriminators
- Used readonly arrays for collections (e.g., `readonly MarkdownSection[]`)
- All types include comprehensive JSDoc comments
- HeadingInfo, ListItem with optional checked property for task lists
- ParseOptions with optional configuration flags
- Type checking passes without errors
- Code formatted with prettier

**Type Safety Features**:
- Discriminated unions for ContentBlock (type field is literal)
- Readonly arrays prevent mutation
- Optional properties use `?:` syntax (compatible with exactOptionalPropertyTypes)
- All types fully exported for external use

**Next Steps**:
- Both tasks completed
- Ready for markdown-parser-core implementation

---

## Progress Log

### Session: 2026-01-06 15:25

**Tasks Completed**: TASK-002 (Block Detectors)

**Implementation Details**:
- Created `src/sdk/markdown-parser/detectors.ts` with all detector functions
- Implemented comprehensive test suite in `detectors.test.ts` (37 tests, all passing)
- All functions handle edge cases with strict TypeScript type safety
- Fixed type safety issues with `noUncheckedIndexedAccess` (explicit undefined checks for regex match results)

**Files Created**:
- `src/sdk/markdown-parser/detectors.ts` (203 lines)
- `src/sdk/markdown-parser/detectors.test.ts` (238 lines)

**Test Results**: ✓ 37 tests passed

**Type Safety Enhancements**:
- Explicit undefined checks for all regex capture groups
- Proper handling of optional match array indices
- Type guards for null/undefined in all detector functions

**Notes**:
- All completion criteria met
- Code follows TypeScript coding standards from `.claude/skills/ts-coding-standards/`
- Ready for integration with markdown-parser-core
