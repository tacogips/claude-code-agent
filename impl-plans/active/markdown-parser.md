# Markdown Parser Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/spec-sdk-api.md#10-markdown-to-json-parsing
**Created**: 2026-01-04
**Last Updated**: 2026-01-04

---

## Design Document Reference

**Source**: `design-docs/spec-sdk-api.md` Section 10: Markdown-to-JSON Parsing

### Summary

Implement a Markdown-to-JSON parser that converts Claude Code message content into structured JSON. The parser splits content by headings and paragraphs into a JSON array of sections, supporting code blocks, lists, blockquotes, and tables. This feature is opt-in via `--parse-markdown` flag or SDK option.

### Scope

**Included**:
- Core markdown parsing logic
- Section splitting by headings (##, ###, etc.)
- Content block extraction (paragraphs, code blocks, lists, blockquotes, tables)
- Line number tracking
- Metadata generation (section count, heading levels, etc.)
- SDK function: `parseMarkdown()`
- CLI flag: `--parse-markdown`
- REST API query parameter: `parseMarkdown=true`

**Excluded**:
- Full Markdown rendering (not needed)
- HTML output (JSON only)
- Custom markdown extensions

---

## Implementation Overview

### Approach

Build a streaming line-by-line parser that:
1. Detects section boundaries (headings)
2. Accumulates content blocks between headings
3. Classifies content blocks by type
4. Tracks line numbers for each element
5. Returns structured ParsedMarkdown object

### Key Decisions

- Use line-by-line parsing for efficiency and line number tracking
- Support heading levels 1-6 (# to ######)
- Code blocks delimited by triple backticks with optional language
- Lists detected by leading markers (-, *, +, 1.)
- Tables detected by pipe characters with header separator

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| None (standalone parser) | - | - |

---

## Deliverables

### Deliverable 1: src/sdk/markdown-parser/types.ts

**Purpose**: Define parsed markdown data structures

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `ParsedMarkdown` | interface | Top-level parse result | parseMarkdown() |
| `MarkdownSection` | interface | Section with heading and content | ParsedMarkdown |
| `ContentBlock` | type | Union of content types | MarkdownSection |
| `ParagraphBlock` | interface | Paragraph content | ContentBlock |
| `CodeBlock` | interface | Fenced code block | ContentBlock |
| `ListBlock` | interface | Ordered or unordered list | ContentBlock |
| `BlockquoteBlock` | interface | Blockquote content | ContentBlock |
| `TableBlock` | interface | Table with headers and rows | ContentBlock |
| `ListItem` | interface | List item with depth | ListBlock |
| `ParseOptions` | interface | Parser options | parseMarkdown() |
| `MarkdownMetadata` | interface | Parse metadata | ParsedMarkdown |

**Interface Definitions**:

```
ParsedMarkdown
  Purpose: Complete parsed markdown result
  Properties:
    - version: "1.0" - Schema version
    - rawContent: string - Original markdown
    - sections: MarkdownSection[] - Parsed sections
    - metadata: MarkdownMetadata - Parse statistics
  Used by: SDK consumers, CLI, REST API

MarkdownSection
  Purpose: A section of content under a heading
  Properties:
    - index: number - Section index (0-based)
    - heading: HeadingInfo | null - Heading info (null for preamble)
    - content: ContentBlock[] - Content blocks
  Used by: ParsedMarkdown

HeadingInfo
  Purpose: Heading metadata
  Properties:
    - level: number - 1-6 for h1-h6
    - text: string - Heading text without markers
    - lineNumber: number - Line number in source
  Used by: MarkdownSection

ContentBlock
  Purpose: Union of all content block types
  Values: ParagraphBlock | CodeBlock | ListBlock | BlockquoteBlock | TableBlock
  Used by: MarkdownSection

ParagraphBlock
  Purpose: Paragraph content
  Properties:
    - type: 'paragraph'
    - text: string - Paragraph text
    - lineStart: number
    - lineEnd: number
  Used by: ContentBlock

CodeBlock
  Purpose: Fenced code block
  Properties:
    - type: 'code'
    - code: string - Code content
    - language: string - Language identifier (empty if not specified)
    - lineStart: number
    - lineEnd: number
  Used by: ContentBlock

ListBlock
  Purpose: Ordered or unordered list
  Properties:
    - type: 'list'
    - listType: 'ordered' | 'unordered'
    - items: ListItem[]
    - lineStart: number
  Used by: ContentBlock

ListItem
  Purpose: Individual list item
  Properties:
    - text: string - Item text
    - depth: number - Nesting depth (0-based)
    - checked?: boolean - For task lists (- [ ] or - [x])
  Used by: ListBlock

BlockquoteBlock
  Purpose: Blockquote content
  Properties:
    - type: 'blockquote'
    - content: ContentBlock[] - Nested content
    - lineStart: number
  Used by: ContentBlock

TableBlock
  Purpose: Table with headers and rows
  Properties:
    - type: 'table'
    - headers: string[] - Header cells
    - rows: string[][] - Data rows
    - lineStart: number
  Used by: ContentBlock

MarkdownMetadata
  Purpose: Statistics about parsed content
  Properties:
    - sectionCount: number
    - headingLevels: number[] - Unique heading levels used
    - hasCodeBlocks: boolean
    - hasLists: boolean
  Used by: ParsedMarkdown

ParseOptions
  Purpose: Options for parsing
  Properties:
    - includeRawContent?: boolean - Include original markdown (default: true)
    - includeLineNumbers?: boolean - Include line numbers (default: true)
  Used by: parseMarkdown()
```

**Dependencies**: None

**Dependents**: Parser, SDK, CLI, REST API

---

### Deliverable 2: src/sdk/markdown-parser/parser.ts

**Purpose**: Core markdown parsing logic

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `parseMarkdown` | function | Parse markdown to structured JSON | SDK, CLI, REST API |
| `MarkdownParser` | class | Stateful parser (internal) | parseMarkdown() |

**Function Signatures**:

```
parseMarkdown(content: string, options?: ParseOptions): ParsedMarkdown
  Purpose: Parse markdown content into structured JSON
  Called by: SDK helper, CLI, REST API

MarkdownParser class:
  Constructor: (content: string, options: ParseOptions)
  Public Methods:
    - parse(): ParsedMarkdown
  Private Methods:
    - splitIntoLines(): Line[]
    - detectBlockType(line: Line, context: ParserContext): BlockType
    - parseHeading(line: Line): HeadingInfo
    - parseCodeBlock(lines: Line[], startIndex: number): { block: CodeBlock; endIndex: number }
    - parseList(lines: Line[], startIndex: number): { block: ListBlock; endIndex: number }
    - parseBlockquote(lines: Line[], startIndex: number): { block: BlockquoteBlock; endIndex: number }
    - parseTable(lines: Line[], startIndex: number): { block: TableBlock; endIndex: number }
    - parseParagraph(lines: Line[], startIndex: number): { block: ParagraphBlock; endIndex: number }
    - buildMetadata(sections: MarkdownSection[]): MarkdownMetadata
```

**Class Definition**:

```
MarkdownParser
  Purpose: Stateful line-by-line markdown parser
  Constructor: (content: string, options: ParseOptions)
  Private Properties:
    - content: string
    - options: ParseOptions
    - lines: Line[]
    - currentIndex: number
  Used by: parseMarkdown()
```

**Dependencies**: `src/sdk/markdown-parser/types.ts`

**Dependents**: SDK, CLI, REST API

---

### Deliverable 3: src/sdk/markdown-parser/detectors.ts

**Purpose**: Block type detection utilities

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `isHeading` | function | Check if line is heading | MarkdownParser |
| `isCodeFence` | function | Check if line is code fence | MarkdownParser |
| `isListItem` | function | Check if line is list item | MarkdownParser |
| `isBlockquote` | function | Check if line is blockquote | MarkdownParser |
| `isTableRow` | function | Check if line is table row | MarkdownParser |
| `isTableSeparator` | function | Check if line is table separator | MarkdownParser |
| `getHeadingLevel` | function | Extract heading level (1-6) | MarkdownParser |
| `getListItemInfo` | function | Extract list item details | MarkdownParser |

**Function Signatures**:

```
isHeading(line: string): boolean
  Purpose: Check if line starts with # and is a heading
  Called by: MarkdownParser.detectBlockType()

isCodeFence(line: string): { isFence: boolean; language?: string; isOpening?: boolean }
  Purpose: Check if line is ``` code fence, extract language
  Called by: MarkdownParser.parseCodeBlock()

isListItem(line: string): boolean
  Purpose: Check if line starts with -, *, +, or 1.
  Called by: MarkdownParser.detectBlockType()

getListItemInfo(line: string): { text: string; depth: number; checked?: boolean; isOrdered: boolean }
  Purpose: Extract list item text, nesting depth, and checkbox state
  Called by: MarkdownParser.parseList()

isTableRow(line: string): boolean
  Purpose: Check if line contains pipe characters indicating table
  Called by: MarkdownParser.detectBlockType()

isTableSeparator(line: string): boolean
  Purpose: Check if line is |---|---| table header separator
  Called by: MarkdownParser.parseTable()
```

**Dependencies**: None

**Dependents**: MarkdownParser

---

### Deliverable 4: src/sdk/markdown-parser/index.ts

**Purpose**: Public exports for markdown parser module

**Exports**:

| Name | Type | Purpose | Called By |
|------|------|---------|-----------|
| `parseMarkdown` | function | Main parse function | SDK consumers |
| All types from types.ts | types | Type definitions | SDK consumers |

**Dependencies**: `src/sdk/markdown-parser/parser.ts`, `src/sdk/markdown-parser/types.ts`

**Dependents**: `src/sdk/index.ts`, CLI, REST API

---

## Subtasks

### TASK-001: Type Definitions

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/markdown-parser/types.ts`
**Estimated Effort**: Small

**Description**:
Define all type definitions for the parsed markdown structure.

**Completion Criteria**:
- [ ] ParsedMarkdown interface defined
- [ ] MarkdownSection interface defined
- [ ] All ContentBlock types defined (Paragraph, Code, List, Blockquote, Table)
- [ ] ListItem interface with depth and checked properties
- [ ] HeadingInfo interface defined
- [ ] MarkdownMetadata interface defined
- [ ] ParseOptions interface defined
- [ ] Type checking passes
- [ ] All types exported

---

### TASK-002: Block Detectors

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/sdk/markdown-parser/detectors.ts`
**Estimated Effort**: Small

**Description**:
Implement utility functions for detecting markdown block types.

**Completion Criteria**:
- [ ] isHeading() detects # through ######
- [ ] isCodeFence() detects ``` with optional language
- [ ] isListItem() detects -, *, +, and numbered items
- [ ] getListItemInfo() extracts depth, text, checkbox state
- [ ] isBlockquote() detects >
- [ ] isTableRow() detects pipe-delimited content
- [ ] isTableSeparator() detects header separator
- [ ] Unit tests for all detectors
- [ ] Type checking passes

---

### TASK-003: Core Parser

**Status**: Not Started
**Parallelizable**: No (depends on TASK-001, TASK-002)
**Deliverables**: `src/sdk/markdown-parser/parser.ts`
**Estimated Effort**: Large

**Description**:
Implement the core MarkdownParser class and parseMarkdown function.

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

**Status**: Not Started
**Parallelizable**: No (depends on TASK-003)
**Deliverables**: `src/sdk/markdown-parser/index.ts`, update `src/sdk/index.ts`
**Estimated Effort**: Small

**Description**:
Create module index and add to SDK exports.

**Completion Criteria**:
- [ ] Module index exports parseMarkdown and all types
- [ ] SDK index exports markdown parser
- [ ] Example usage in JSDoc comments
- [ ] Type checking passes

---

## Task Dependency Graph

```
TASK-001 (Types)     TASK-002 (Detectors)
    |                       |
    +-------+---------------+
            |
            v
      TASK-003 (Parser)
            |
            v
      TASK-004 (Exports)
```

Parallelizable groups:
- Group A: TASK-001, TASK-002
- Group B: TASK-003 (after Group A)
- Group C: TASK-004 (after TASK-003)

---

## Completion Criteria

### Required for Completion

- [ ] All subtasks marked as Completed
- [ ] All unit tests passing
- [ ] Type checking passes without errors
- [ ] Code follows project coding standards
- [ ] parseMarkdown function exported from SDK

### Verification Steps

1. Run `bun run typecheck`
2. Run `bun test`
3. Test with sample markdown from spec-sdk-api.md
4. Verify output matches expected JSON structure
5. Review implementation against spec-sdk-api.md Section 10

---

## Progress Log

(To be filled during implementation)

---

## Notes

### Open Questions

None at this time.

### Technical Debt

- Consider adding streaming parser for large documents
- Consider caching parsed results

### Future Enhancements

- Custom block type extensions
- Markdown validation/linting
- Source map for bidirectional navigation
