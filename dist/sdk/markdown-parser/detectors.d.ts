/**
 * Markdown block type detection utilities
 *
 * Provides functions to detect and parse different markdown block types
 * including headings, code fences, lists, blockquotes, and tables.
 */
/**
 * Detect if a line is a markdown heading (# through ######)
 */
export declare function isHeading(line: string): boolean;
/**
 * Get the heading level (1-6) from a heading line
 * Returns 0 if the line is not a heading
 */
export declare function getHeadingLevel(line: string): number;
/**
 * Code fence detection result
 */
export interface CodeFenceInfo {
    /** Whether the line is a code fence */
    isFence: boolean;
    /** Programming language (if specified) */
    language?: string;
    /** Whether this is an opening fence (true) or closing fence (false) */
    isOpening?: boolean;
}
/**
 * Detect if a line is a code fence (```)
 * Returns information about the fence including language and whether it's opening/closing
 */
export declare function isCodeFence(line: string): CodeFenceInfo;
/**
 * Detect if a line is a list item
 * Supports unordered (-, *, +) and ordered (1., 2., etc.) lists
 */
export declare function isListItem(line: string): boolean;
/**
 * List item information
 */
export interface ListItemInfo {
    /** The text content of the list item */
    text: string;
    /** Indentation depth (0 for root level) */
    depth: number;
    /** Checkbox state for task lists (true=checked, false=unchecked) */
    checked?: boolean;
    /** Whether this is an ordered list item */
    isOrdered: boolean;
}
/**
 * Extract detailed information about a list item
 * Returns null if the line is not a list item
 */
export declare function getListItemInfo(line: string): ListItemInfo | null;
/**
 * Detect if a line is a blockquote (starts with >)
 */
export declare function isBlockquote(line: string): boolean;
/**
 * Detect if a line is a table row (contains pipes)
 */
export declare function isTableRow(line: string): boolean;
/**
 * Detect if a line is a table separator (|---|---|)
 */
export declare function isTableSeparator(line: string): boolean;
//# sourceMappingURL=detectors.d.ts.map