/**
 * Type definitions for parsed markdown structure.
 *
 * These types represent the hierarchical structure of a parsed markdown document,
 * organized into sections with headings and content blocks.
 */

/**
 * ParsedMarkdown represents the complete parsed markdown document.
 *
 * @example Complete parsed document
 * ```json
 * {
 *   "version": "1.0",
 *   "rawContent": "## Overview\nThis is a description.\n\n## Implementation\n- Step 1: First task\n- Step 2: Second task\n\n```typescript\nconst x = 1;\n```",
 *   "sections": [
 *     {
 *       "index": 0,
 *       "heading": { "level": 2, "text": "Overview", "lineNumber": 1 },
 *       "content": [
 *         { "type": "paragraph", "text": "This is a description.", "lineStart": 2, "lineEnd": 2 }
 *       ]
 *     },
 *     {
 *       "index": 1,
 *       "heading": { "level": 2, "text": "Implementation", "lineNumber": 4 },
 *       "content": [
 *         {
 *           "type": "list",
 *           "listType": "unordered",
 *           "items": [
 *             { "text": "Step 1: First task", "depth": 0 },
 *             { "text": "Step 2: Second task", "depth": 0 }
 *           ],
 *           "lineStart": 5
 *         },
 *         {
 *           "type": "code",
 *           "language": "typescript",
 *           "code": "const x = 1;",
 *           "lineStart": 8,
 *           "lineEnd": 10
 *         }
 *       ]
 *     }
 *   ],
 *   "metadata": {
 *     "sectionCount": 2,
 *     "headingLevels": [2],
 *     "hasCodeBlocks": true,
 *     "hasLists": true
 *   }
 * }
 * ```
 */
export interface ParsedMarkdown {
  /**
   * Format version for compatibility tracking.
   */
  readonly version: "1.0";

  /**
   * Original raw markdown content.
   */
  readonly rawContent: string;

  /**
   * Sections organized by headings.
   */
  readonly sections: readonly MarkdownSection[];

  /**
   * Metadata about the document structure.
   */
  readonly metadata: MarkdownMetadata;
}

/**
 * MarkdownSection represents a section of the document,
 * optionally headed by a markdown heading.
 */
export interface MarkdownSection {
  /**
   * Zero-based index of this section in the document.
   */
  readonly index: number;

  /**
   * Heading information, or null if this is a preamble section before the first heading.
   */
  readonly heading: HeadingInfo | null;

  /**
   * Content blocks within this section.
   */
  readonly content: readonly ContentBlock[];
}

/**
 * HeadingInfo contains information about a markdown heading.
 */
export interface HeadingInfo {
  /**
   * Heading level (1-6 for h1-h6).
   */
  readonly level: number;

  /**
   * Heading text without the # prefix.
   */
  readonly text: string;

  /**
   * Line number where the heading appears (1-based).
   */
  readonly lineNumber: number;
}

/**
 * ContentBlock is a discriminated union of all supported markdown block types.
 */
export type ContentBlock =
  | ParagraphBlock
  | CodeBlock
  | ListBlock
  | BlockquoteBlock
  | TableBlock;

/**
 * ParagraphBlock represents a text paragraph.
 */
export interface ParagraphBlock {
  readonly type: "paragraph";

  /**
   * Paragraph text content.
   */
  readonly text: string;

  /**
   * Starting line number (1-based).
   */
  readonly lineStart: number;

  /**
   * Ending line number (1-based).
   */
  readonly lineEnd: number;
}

/**
 * CodeBlock represents a fenced code block.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "code",
 *   "code": "function greet(name: string): string {\n  return `Hello, ${name}!`;\n}",
 *   "language": "typescript",
 *   "lineStart": 15,
 *   "lineEnd": 19
 * }
 * ```
 */
export interface CodeBlock {
  readonly type: "code";

  /**
   * Code content without fence markers.
   */
  readonly code: string;

  /**
   * Language identifier (e.g., 'typescript', 'bash').
   * Empty string if no language specified.
   */
  readonly language: string;

  /**
   * Starting line number of the opening fence (1-based).
   */
  readonly lineStart: number;

  /**
   * Ending line number of the closing fence (1-based).
   */
  readonly lineEnd: number;
}

/**
 * ListBlock represents an ordered or unordered list.
 *
 * @example Unordered list
 * ```json
 * {
 *   "type": "list",
 *   "listType": "unordered",
 *   "items": [
 *     { "text": "First item", "depth": 0 },
 *     { "text": "Nested item", "depth": 1 },
 *     { "text": "Second item", "depth": 0 }
 *   ],
 *   "lineStart": 5
 * }
 * ```
 *
 * @example Task list
 * ```json
 * {
 *   "type": "list",
 *   "listType": "unordered",
 *   "items": [
 *     { "text": "Completed task", "depth": 0, "checked": true },
 *     { "text": "Pending task", "depth": 0, "checked": false }
 *   ],
 *   "lineStart": 10
 * }
 * ```
 */
export interface ListBlock {
  readonly type: "list";

  /**
   * Type of list (ordered: numbered, unordered: bullets).
   */
  readonly listType: "ordered" | "unordered";

  /**
   * List items with nesting support.
   */
  readonly items: readonly ListItem[];

  /**
   * Starting line number (1-based).
   */
  readonly lineStart: number;
}

/**
 * ListItem represents a single item in a list.
 */
export interface ListItem {
  /**
   * Item text content without the list marker.
   */
  readonly text: string;

  /**
   * Nesting depth (0 for top-level items).
   */
  readonly depth: number;

  /**
   * Checkbox state for task lists.
   * undefined for non-task-list items.
   * true for checked [x], false for unchecked [ ].
   */
  readonly checked?: boolean;
}

/**
 * BlockquoteBlock represents a blockquote (lines starting with >).
 */
export interface BlockquoteBlock {
  readonly type: "blockquote";

  /**
   * Content blocks within the blockquote.
   * Blockquotes can contain other block types recursively.
   */
  readonly content: readonly ContentBlock[];

  /**
   * Starting line number (1-based).
   */
  readonly lineStart: number;
}

/**
 * TableBlock represents a markdown table.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "table",
 *   "headers": ["Name", "Type", "Description"],
 *   "rows": [
 *     ["id", "string", "Unique identifier"],
 *     ["name", "string", "Display name"],
 *     ["count", "number", "Item count"]
 *   ],
 *   "lineStart": 20
 * }
 * ```
 */
export interface TableBlock {
  readonly type: "table";

  /**
   * Table header row cells.
   */
  readonly headers: readonly string[];

  /**
   * Table body rows (each row is an array of cell values).
   */
  readonly rows: readonly (readonly string[])[];

  /**
   * Starting line number (1-based).
   */
  readonly lineStart: number;
}

/**
 * MarkdownMetadata contains aggregate information about the document.
 */
export interface MarkdownMetadata {
  /**
   * Total number of sections in the document.
   */
  readonly sectionCount: number;

  /**
   * Array of heading levels present in the document.
   * Empty array if no headings.
   */
  readonly headingLevels: readonly number[];

  /**
   * Whether the document contains any code blocks.
   */
  readonly hasCodeBlocks: boolean;

  /**
   * Whether the document contains any lists.
   */
  readonly hasLists: boolean;
}

/**
 * ParseOptions configures the parsing behavior.
 */
export interface ParseOptions {
  /**
   * Whether to include raw content in the result.
   * Default: true
   */
  readonly includeRawContent?: boolean;

  /**
   * Whether to include line numbers in blocks.
   * Default: true
   */
  readonly includeLineNumbers?: boolean;
}
