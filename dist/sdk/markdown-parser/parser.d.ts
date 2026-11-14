/**
 * Core markdown parser implementation
 *
 * Parses markdown content into a structured JSON representation,
 * splitting by headings and identifying different content block types.
 */
import type { ParsedMarkdown, ParseOptions } from "./types";
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
export declare function parseMarkdown(content: string, options?: ParseOptions): ParsedMarkdown;
//# sourceMappingURL=parser.d.ts.map