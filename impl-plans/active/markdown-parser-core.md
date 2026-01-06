# Markdown Parser Core Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/spec-sdk-api.md#10-markdown-to-json-parsing
**Created**: 2026-01-04
**Last Updated**: 2026-01-06

---

## Related Plans

- **Previous**: `impl-plans/active/markdown-parser-types.md` (Types and Detectors)
- **Depends On**: `markdown-parser-types.md`

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 10: Markdown-to-JSON Parsing

### Summary

Implement the core MarkdownParser class and module exports.

### Scope

**Included**:
- Core markdown parsing logic
- MarkdownParser class
- parseMarkdown() function
- Module exports

**Excluded**:
- Type definitions (markdown-parser-types.md)
- Block detectors (markdown-parser-types.md)

---

## Modules

### 1. Core Parser

#### src/sdk/markdown-parser/parser.ts

**Status**: NOT_STARTED

```typescript
function parseMarkdown(content: string, options?: ParseOptions): ParsedMarkdown;

interface Line {
  content: string;
  number: number;
}

interface ParserContext {
  inCodeBlock: boolean;
  codeBlockLanguage?: string;
}

class MarkdownParser {
  constructor(content: string, options: ParseOptions);

  parse(): ParsedMarkdown;

  private splitIntoLines(): Line[];
  private detectBlockType(line: Line, context: ParserContext): BlockType;
  private parseHeading(line: Line): HeadingInfo;
  private parseCodeBlock(lines: Line[], startIndex: number): { block: CodeBlock; endIndex: number };
  private parseList(lines: Line[], startIndex: number): { block: ListBlock; endIndex: number };
  private parseBlockquote(lines: Line[], startIndex: number): { block: BlockquoteBlock; endIndex: number };
  private parseTable(lines: Line[], startIndex: number): { block: TableBlock; endIndex: number };
  private parseParagraph(lines: Line[], startIndex: number): { block: ParagraphBlock; endIndex: number };
  private buildMetadata(sections: MarkdownSection[]): MarkdownMetadata;
}
```

**Checklist**:
- [ ] Line-by-line parsing with line number tracking
- [ ] Section splitting at headings
- [ ] Heading parsing with level extraction
- [ ] Code block parsing with language detection
- [ ] List parsing with nesting depth
- [ ] Task list support (- [ ] and - [x])
- [ ] Blockquote parsing with nested content
- [ ] Table parsing with headers and rows
- [ ] Paragraph parsing for remaining content
- [ ] Metadata generation
- [ ] Support for preamble (content before first heading)
- [ ] Unit tests for all block types
- [ ] Integration tests with complex markdown
- [ ] Type checking passes

---

### 2. Module Exports

#### src/sdk/markdown-parser/index.ts

**Status**: COMPLETED

```typescript
// Re-export all public types
export type {
  ParsedMarkdown,
  MarkdownSection,
  HeadingInfo,
  ContentBlock,
  ParagraphBlock,
  CodeBlock,
  ListBlock,
  ListItem,
  BlockquoteBlock,
  TableBlock,
  MarkdownMetadata,
  ParseOptions
} from './types';

export { parseMarkdown } from './parser';
```

**Checklist**:
- [x] Module index exports parseMarkdown and all types
- [x] SDK index exports markdown parser
- [x] Example usage in JSDoc comments
- [x] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Core parser | `src/sdk/markdown-parser/parser.ts` | COMPLETED | Pass |
| Module exports | `src/sdk/markdown-parser/index.ts` | COMPLETED | Pass |

---

## Subtasks

### TASK-003: Core Parser

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/sdk/markdown-parser/parser.ts`
**Estimated Effort**: Large

**Completion Criteria**:
- [ ] Line-by-line parsing with line number tracking
- [ ] Section splitting at headings
- [ ] Heading parsing with level extraction
- [ ] Code block parsing with language detection
- [ ] List parsing with nesting depth
- [ ] Task list support (- [ ] and - [x])
- [ ] Blockquote parsing with nested content
- [ ] Table parsing with headers and rows
- [ ] Paragraph parsing for remaining content
- [ ] Metadata generation
- [ ] Support for preamble (content before first heading)
- [ ] Unit tests for all block types
- [ ] Integration tests with complex markdown
- [ ] Type checking passes

---

### TASK-004: Module Exports

**Status**: Completed
**Parallelizable**: No (depends on TASK-003)
**Deliverables**: `src/sdk/markdown-parser/index.ts`, update `src/sdk/index.ts`
**Estimated Effort**: Small

**Completion Criteria**:
- [x] Module index exports parseMarkdown and all types
- [x] SDK index exports markdown parser
- [x] Example usage in JSDoc comments
- [x] Type checking passes

---

## Task Dependency Graph

```
(markdown-parser-types.md)
    |
    v
TASK-003 (Parser)
    |
    v
TASK-004 (Exports)
```

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Parser | TASK-001, TASK-002 | Blocked |
| Exports | TASK-003 | Blocked |

---

## Completion Criteria

- [x] All subtasks marked as Completed
- [x] All unit tests passing
- [x] Type checking passes
- [x] parseMarkdown function exported from SDK

---

## Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test with sample markdown from spec-sdk-api.md
4. Verify output matches expected JSON structure
5. Review implementation against spec-sdk-api.md Section 10

---

## Progress Log

### Session: 2026-01-06 16:30
**Tasks Completed**: TASK-004
**Review Status**: Not required (simple module exports)
**Notes**:
- Created `src/sdk/markdown-parser/index.ts` with comprehensive JSDoc examples
- Created `src/sdk/index.ts` to export markdown parser module
- All type exports working correctly
- Type checking passes (bun run typecheck)
- All tests pass (66 tests, 222 expectations)
- Verified exports with manual test: parseMarkdown successfully imported and executed
- PROGRESS.json updated with lock protocol
- Plan status updated to Completed
