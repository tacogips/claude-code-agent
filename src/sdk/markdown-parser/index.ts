/**
 * Markdown Parser Module
 *
 * Provides markdown-to-JSON parsing functionality for Claude Code message content.
 *
 * @example Basic usage
 * ```typescript
 * import { parseMarkdown } from 'claude-code-agent';
 *
 * const markdown = `
 * ## Overview
 * This is a description.
 *
 * ## Implementation
 * - Step 1: First task
 * - Step 2: Second task
 *
 * \`\`\`typescript
 * const x = 42;
 * \`\`\`
 * `;
 *
 * const parsed = parseMarkdown(markdown);
 *
 * // Access sections
 * console.log(parsed.sections.length); // 2
 * console.log(parsed.sections[0]?.heading?.text); // "Overview"
 *
 * // Access content blocks
 * const firstSection = parsed.sections[0];
 * if (firstSection) {
 *   for (const block of firstSection.content) {
 *     if (block.type === 'paragraph') {
 *       console.log(block.text);
 *     }
 *   }
 * }
 *
 * // Check metadata
 * console.log(parsed.metadata.hasCodeBlocks); // true
 * console.log(parsed.metadata.hasLists); // true
 * ```
 *
 * @example With options
 * ```typescript
 * import { parseMarkdown } from 'claude-code-agent';
 *
 * const parsed = parseMarkdown(content, {
 *   includeRawContent: false,    // Omit raw markdown from result
 *   includeLineNumbers: true,    // Include line numbers (default)
 * });
 * ```
 *
 * @module markdown-parser
 */

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
  ParseOptions,
} from "./types";

// Export the main parser function
export { parseMarkdown } from "./parser";
