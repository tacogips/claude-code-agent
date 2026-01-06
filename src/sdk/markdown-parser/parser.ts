/**
 * Core markdown parser implementation
 *
 * Parses markdown content into a structured JSON representation,
 * splitting by headings and identifying different content block types.
 */

import type {
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
  ParseOptions,
} from "./types";

import {
  isHeading,
  getHeadingLevel,
  isCodeFence,
  isListItem,
  getListItemInfo,
  isBlockquote,
  isTableRow,
  isTableSeparator,
} from "./detectors";

/**
 * Line represents a single line with its content and 1-based line number
 */
interface Line {
  readonly content: string;
  readonly number: number;
}

/**
 * BlockTypeDetectionResult represents detected block type
 */
type BlockType =
  | "heading"
  | "code_fence"
  | "list"
  | "blockquote"
  | "table"
  | "paragraph"
  | "empty";

/**
 * MarkdownParser parses markdown content into structured blocks
 */
class MarkdownParser {
  private readonly content: string;
  private readonly options: Required<ParseOptions>;

  constructor(content: string, options: ParseOptions = {}) {
    this.content = content;
    this.options = {
      includeRawContent: options.includeRawContent ?? true,
      includeLineNumbers: options.includeLineNumbers ?? true,
    };
  }

  /**
   * Parse the markdown content into structured sections
   */
  parse(): ParsedMarkdown {
    const lines = this.splitIntoLines();
    const sections = this.buildSections(lines);
    const metadata = this.buildMetadata(sections);

    return {
      version: "1.0",
      rawContent: this.options.includeRawContent ? this.content : "",
      sections,
      metadata,
    };
  }

  /**
   * Split content into lines with line numbers
   */
  private splitIntoLines(): Line[] {
    const lines = this.content.split("\n");
    return lines.map((content, index) => ({
      content,
      number: index + 1, // 1-based line numbers
    }));
  }

  /**
   * Build sections from lines, splitting at headings
   */
  private buildSections(lines: Line[]): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    let currentSectionStart = 0;
    let currentHeading: HeadingInfo | null = null;
    let sectionIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;

      if (isHeading(line.content)) {
        // Save previous section if it has content
        if (i > currentSectionStart) {
          const sectionLines = lines.slice(currentSectionStart, i);
          const content = this.parseContentBlocks(
            sectionLines,
            currentHeading ? 1 : 0,
          ); // Skip heading line if present

          sections.push({
            index: sectionIndex++,
            heading: currentHeading,
            content,
          });
        }

        // Start new section
        currentHeading = this.parseHeading(line);
        currentSectionStart = i;
      }
    }

    // Add final section
    if (currentSectionStart < lines.length) {
      const sectionLines = lines.slice(currentSectionStart);
      const content = this.parseContentBlocks(
        sectionLines,
        currentHeading ? 1 : 0,
      );

      sections.push({
        index: sectionIndex,
        heading: currentHeading,
        content,
      });
    }

    // Handle empty document
    if (sections.length === 0) {
      sections.push({
        index: 0,
        heading: null,
        content: [],
      });
    }

    return sections;
  }

  /**
   * Parse content blocks from a section's lines
   */
  private parseContentBlocks(lines: Line[], skipLines: number): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const contentLines = lines.slice(skipLines);
    let i = 0;

    while (i < contentLines.length) {
      const line = contentLines[i];
      if (line === undefined) {
        i++;
        continue;
      }

      // Skip empty lines
      if (line.content.trim() === "") {
        i++;
        continue;
      }

      const blockType = this.detectBlockType(line);

      switch (blockType) {
        case "code_fence": {
          const { block, endIndex } = this.parseCodeBlock(contentLines, i);
          blocks.push(block);
          i = endIndex + 1;
          break;
        }
        case "list": {
          const { block, endIndex } = this.parseList(contentLines, i);
          blocks.push(block);
          i = endIndex + 1;
          break;
        }
        case "blockquote": {
          const { block, endIndex } = this.parseBlockquote(contentLines, i);
          blocks.push(block);
          i = endIndex + 1;
          break;
        }
        case "table": {
          const { block, endIndex } = this.parseTable(contentLines, i);
          blocks.push(block);
          i = endIndex + 1;
          break;
        }
        case "paragraph":
        case "empty":
        default: {
          const { block, endIndex } = this.parseParagraph(contentLines, i);
          blocks.push(block);
          i = endIndex + 1;
          break;
        }
      }
    }

    return blocks;
  }

  /**
   * Detect the type of block a line starts
   */
  private detectBlockType(line: Line): BlockType {
    if (line.content.trim() === "") {
      return "empty";
    }

    if (isHeading(line.content)) {
      return "heading";
    }

    if (isCodeFence(line.content).isFence) {
      return "code_fence";
    }

    if (isListItem(line.content)) {
      return "list";
    }

    if (isBlockquote(line.content)) {
      return "blockquote";
    }

    if (isTableRow(line.content)) {
      return "table";
    }

    return "paragraph";
  }

  /**
   * Parse heading information from a line
   */
  private parseHeading(line: Line): HeadingInfo {
    const level = getHeadingLevel(line.content);
    const text = line.content
      .trimStart()
      .replace(/^#{1,6}\s+/, "")
      .trim();

    return {
      level,
      text,
      lineNumber: line.number,
    };
  }

  /**
   * Parse a code block starting at startIndex
   */
  private parseCodeBlock(
    lines: Line[],
    startIndex: number,
  ): { block: CodeBlock; endIndex: number } {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for code block");
    }

    const fenceInfo = isCodeFence(startLine.content);
    const language = fenceInfo.language ?? "";
    const codeLines: string[] = [];

    let endIndex = startIndex + 1;
    let foundClosing = false;

    // Find closing fence
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined) break;

      if (isCodeFence(line.content).isFence) {
        foundClosing = true;
        break;
      }

      codeLines.push(line.content);
      endIndex++;
    }

    // If no closing fence found, treat rest of content as code
    if (!foundClosing && endIndex === lines.length) {
      endIndex = lines.length - 1;
    }

    return {
      block: {
        type: "code",
        code: codeLines.join("\n"),
        language,
        lineStart: startLine.number,
        lineEnd:
          endIndex < lines.length
            ? lines[endIndex]!.number
            : lines[lines.length - 1]!.number,
      },
      endIndex,
    };
  }

  /**
   * Parse a list block starting at startIndex
   */
  private parseList(
    lines: Line[],
    startIndex: number,
  ): { block: ListBlock; endIndex: number } {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for list");
    }

    const firstItemInfo = getListItemInfo(startLine.content);
    if (firstItemInfo === null) {
      throw new Error("Expected list item at startIndex");
    }

    const listType = firstItemInfo.isOrdered ? "ordered" : "unordered";
    const items: ListItem[] = [];

    let endIndex = startIndex;

    // Collect consecutive list items
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined) break;

      // Stop at empty line or non-list content
      if (line.content.trim() === "") {
        break;
      }

      const itemInfo = getListItemInfo(line.content);
      if (itemInfo === null) {
        break;
      }

      // Build list item with optional checked property
      const listItem: ListItem = {
        text: itemInfo.text,
        depth: itemInfo.depth,
      };

      // Only add checked property if it's defined
      if (itemInfo.checked !== undefined) {
        (listItem as { checked: boolean }).checked = itemInfo.checked;
      }

      items.push(listItem);

      endIndex++;
    }

    // endIndex is now one past the last list item
    return {
      block: {
        type: "list",
        listType,
        items,
        lineStart: startLine.number,
      },
      endIndex: endIndex - 1,
    };
  }

  /**
   * Parse a blockquote block starting at startIndex
   */
  private parseBlockquote(
    lines: Line[],
    startIndex: number,
  ): { block: BlockquoteBlock; endIndex: number } {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for blockquote");
    }

    const quoteLines: Line[] = [];
    let endIndex = startIndex;

    // Collect consecutive blockquote lines
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined) break;

      // Stop at empty line
      if (line.content.trim() === "") {
        break;
      }

      if (!isBlockquote(line.content)) {
        break;
      }

      // Remove > prefix and add to quote lines
      const quoteContent = line.content.trimStart().replace(/^>\s?/, "");
      quoteLines.push({
        content: quoteContent,
        number: line.number,
      });

      endIndex++;
    }

    // Recursively parse blockquote content
    const content = this.parseContentBlocks(quoteLines, 0);

    return {
      block: {
        type: "blockquote",
        content,
        lineStart: startLine.number,
      },
      endIndex: endIndex - 1,
    };
  }

  /**
   * Parse a table block starting at startIndex
   */
  private parseTable(
    lines: Line[],
    startIndex: number,
  ):
    | { block: TableBlock; endIndex: number }
    | { block: ParagraphBlock; endIndex: number } {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for table");
    }

    // Parse header row
    const headerCells = this.parseTableRow(startLine.content);

    let endIndex = startIndex + 1;

    // Check for separator row
    const separatorLine = lines[endIndex];
    if (
      separatorLine === undefined ||
      !isTableSeparator(separatorLine.content)
    ) {
      // No separator - treat as paragraph instead
      return this.parseParagraph(lines, startIndex);
    }

    endIndex++; // Move past separator

    // Parse data rows
    const rows: (readonly string[])[] = [];
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined) break;

      if (line.content.trim() === "" || !isTableRow(line.content)) {
        break;
      }

      const cells = this.parseTableRow(line.content);
      rows.push(cells);
      endIndex++;
    }

    return {
      block: {
        type: "table",
        headers: headerCells,
        rows,
        lineStart: startLine.number,
      },
      endIndex: endIndex - 1,
    };
  }

  /**
   * Parse a table row into cells
   */
  private parseTableRow(line: string): readonly string[] {
    const trimmed = line.trim();
    // Remove leading/trailing pipes
    const content = trimmed.replace(/^\||\|$/g, "");
    // Split by pipe and trim each cell
    return content.split("|").map((cell) => cell.trim());
  }

  /**
   * Parse a paragraph block starting at startIndex
   */
  private parseParagraph(
    lines: Line[],
    startIndex: number,
  ): { block: ParagraphBlock; endIndex: number } {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for paragraph");
    }

    const paragraphLines: string[] = [];
    let endIndex = startIndex;

    // Collect consecutive non-empty, non-special lines
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined) break;

      // Stop at empty line
      if (line.content.trim() === "") {
        break;
      }

      // Stop at special block types
      if (
        isCodeFence(line.content).isFence ||
        isListItem(line.content) ||
        isBlockquote(line.content) ||
        (endIndex > startIndex && isTableRow(line.content))
      ) {
        break;
      }

      paragraphLines.push(line.content);
      endIndex++;
    }

    const endLine = lines[endIndex - 1];

    return {
      block: {
        type: "paragraph",
        text: paragraphLines.join("\n"),
        lineStart: startLine.number,
        lineEnd: endLine !== undefined ? endLine.number : startLine.number,
      },
      endIndex: endIndex - 1,
    };
  }

  /**
   * Build metadata from parsed sections
   */
  private buildMetadata(
    sections: readonly MarkdownSection[],
  ): MarkdownMetadata {
    const headingLevels = new Set<number>();
    let hasCodeBlocks = false;
    let hasLists = false;

    for (const section of sections) {
      if (section.heading !== null) {
        headingLevels.add(section.heading.level);
      }

      for (const block of section.content) {
        if (block.type === "code") {
          hasCodeBlocks = true;
        } else if (block.type === "list") {
          hasLists = true;
        }
      }
    }

    return {
      sectionCount: sections.length,
      headingLevels: Array.from(headingLevels).sort((a, b) => a - b),
      hasCodeBlocks,
      hasLists,
    };
  }
}

/**
 * Parse markdown content into structured JSON
 *
 * @param content - Raw markdown content to parse
 * @param options - Parsing options
 * @returns Parsed markdown structure
 *
 * @example
 * ```typescript
 * const markdown = `
 * ## Overview
 * This is a paragraph.
 *
 * ## Details
 * - Item 1
 * - Item 2
 * `;
 *
 * const parsed = parseMarkdown(markdown);
 * console.log(parsed.sections.length); // 2
 * ```
 */
export function parseMarkdown(
  content: string,
  options?: ParseOptions,
): ParsedMarkdown {
  const parser = new MarkdownParser(content, options);
  return parser.parse();
}
