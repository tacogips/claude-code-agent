/**
 * Markdown block type detection utilities
 *
 * Provides functions to detect and parse different markdown block types
 * including headings, code fences, lists, blockquotes, and tables.
 */

/**
 * Detect if a line is a markdown heading (# through ######)
 */
export function isHeading(line: string): boolean {
  const trimmed = line.trimStart();
  return /^#{1,6}\s+/.test(trimmed);
}

/**
 * Get the heading level (1-6) from a heading line
 * Returns 0 if the line is not a heading
 */
export function getHeadingLevel(line: string): number {
  const trimmed = line.trimStart();
  const match = trimmed.match(/^(#{1,6})\s+/);
  if (match === null || match[1] === undefined) {
    return 0;
  }
  return match[1].length;
}

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
export function isCodeFence(line: string): CodeFenceInfo {
  const trimmed = line.trimStart();

  // Code fence must start with exactly 3 backticks
  if (!trimmed.startsWith("```")) {
    return { isFence: false };
  }

  // Extract everything after the backticks
  const afterBackticks = trimmed.slice(3);

  // If there's content after backticks, it's an opening fence with language
  if (afterBackticks.length > 0 && afterBackticks.trim().length > 0) {
    return {
      isFence: true,
      language: afterBackticks.trim(),
      isOpening: true,
    };
  }

  // Opening fence without language
  if (afterBackticks.trim().length === 0) {
    return {
      isFence: true,
      language: "",
      isOpening: true,
    };
  }

  // Closing fence (just ```)
  return {
    isFence: true,
    isOpening: false,
  };
}

/**
 * Detect if a line is a list item
 * Supports unordered (-, *, +) and ordered (1., 2., etc.) lists
 */
export function isListItem(line: string): boolean {
  const trimmed = line.trimStart();

  // Unordered list patterns: -, *, +
  if (/^[-*+]\s/.test(trimmed)) {
    return true;
  }

  // Ordered list pattern: digit(s) followed by . and space
  if (/^\d+\.\s/.test(trimmed)) {
    return true;
  }

  return false;
}

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
export function getListItemInfo(line: string): ListItemInfo | null {
  // Calculate indentation depth (number of leading spaces / 2)
  const leadingSpaces = line.match(/^(\s*)/);
  const depth =
    leadingSpaces !== null && leadingSpaces[1] !== undefined
      ? Math.floor(leadingSpaces[1].length / 2)
      : 0;

  const trimmed = line.trimStart();

  // Try unordered list
  const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
  if (unorderedMatch !== null && unorderedMatch[1] !== undefined) {
    const content = unorderedMatch[1];

    // Check for task list checkbox
    const checkboxMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    if (
      checkboxMatch !== null &&
      checkboxMatch[1] !== undefined &&
      checkboxMatch[2] !== undefined
    ) {
      const isChecked = checkboxMatch[1].toLowerCase() === "x";
      return {
        text: checkboxMatch[2],
        depth,
        checked: isChecked,
        isOrdered: false,
      };
    }

    return {
      text: content,
      depth,
      isOrdered: false,
    };
  }

  // Try ordered list
  const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
  if (orderedMatch !== null && orderedMatch[1] !== undefined) {
    const content = orderedMatch[1];

    // Check for task list checkbox
    const checkboxMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    if (
      checkboxMatch !== null &&
      checkboxMatch[1] !== undefined &&
      checkboxMatch[2] !== undefined
    ) {
      const isChecked = checkboxMatch[1].toLowerCase() === "x";
      return {
        text: checkboxMatch[2],
        depth,
        checked: isChecked,
        isOrdered: true,
      };
    }

    return {
      text: content,
      depth,
      isOrdered: true,
    };
  }

  return null;
}

/**
 * Detect if a line is a blockquote (starts with >)
 */
export function isBlockquote(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith(">");
}

/**
 * Detect if a line is a table row (contains pipes)
 */
export function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  // Table rows must contain at least one pipe
  // and should have content before/after pipes
  return /\|/.test(trimmed) && trimmed.length > 1;
}

/**
 * Detect if a line is a table separator (|---|---|)
 */
export function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();

  // Table separator pattern: pipes and dashes/colons
  // Examples: |---|---, | --- | --- |, |:---|---:|
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(trimmed);
}
