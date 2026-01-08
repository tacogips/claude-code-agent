/**
 * CLI output formatting utilities.
 *
 * Provides functions for formatting data as tables or JSON, printing success/error
 * messages with colors, and formatting cost values.
 *
 * @module cli/output
 */

import { logger } from "../logger";

/**
 * Column definition for table formatting.
 *
 * @template T - Type of data being formatted
 */
export interface ColumnDef<T> {
  /**
   * Key in the data object to display in this column.
   */
  readonly key: keyof T;

  /**
   * Header text for the column. If not provided, uses the key.
   */
  readonly header?: string;

  /**
   * Fixed width for the column in characters. If not provided, auto-sizes.
   */
  readonly width?: number;

  /**
   * Text alignment within the column.
   * @default "left"
   */
  readonly align?: "left" | "right" | "center";

  /**
   * Custom formatter function for cell values.
   * If not provided, uses String(value).
   */
  readonly format?: (value: T[keyof T]) => string;
}

/**
 * Format data as an ASCII table.
 *
 * Creates a formatted table with headers and aligned columns. Automatically
 * calculates column widths based on content if not specified.
 *
 * @template T - Type of data objects
 * @param data - Array of data objects to format
 * @param columns - Column definitions
 * @returns Formatted ASCII table as string
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: "1", name: "Alice", email: "alice@example.com" },
 *   { id: "2", name: "Bob", email: "bob@example.com" }
 * ];
 *
 * const table = formatTable(users, [
 *   { key: "id", header: "ID", width: 4 },
 *   { key: "name", header: "Name", width: 10 },
 *   { key: "email", header: "Email" }
 * ]);
 * ```
 */
export function formatTable<T extends Record<string, unknown>>(
  data: readonly T[],
  columns: readonly ColumnDef<T>[],
): string {
  if (data.length === 0) {
    return "(no data)";
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    if (col.width !== undefined) {
      return col.width;
    }

    // Auto-calculate width from header and data
    const headerText = col.header ?? String(col.key);
    const headerWidth = headerText.length;

    const dataWidths = data.map((row) => {
      const value = row[col.key];
      const formatted =
        col.format !== undefined ? col.format(value) : String(value);
      return formatted.length;
    });

    const maxDataWidth = Math.max(...dataWidths);
    return Math.max(headerWidth, maxDataWidth);
  });

  // Helper to pad text
  const pad = (
    text: string,
    width: number,
    align: "left" | "right" | "center" = "left",
  ): string => {
    const padSize = Math.max(0, width - text.length);

    switch (align) {
      case "right":
        return " ".repeat(padSize) + text;
      case "center": {
        const leftPad = Math.floor(padSize / 2);
        const rightPad = padSize - leftPad;
        return " ".repeat(leftPad) + text + " ".repeat(rightPad);
      }
      case "left":
      default:
        return text + " ".repeat(padSize);
    }
  };

  // Build header row
  const headers = columns.map((col, idx) => {
    const headerText = col.header ?? String(col.key);
    const width = widths[idx];
    if (width === undefined) {
      throw new Error(`Width not calculated for column ${idx}`);
    }
    return pad(headerText, width, col.align);
  });

  const headerRow = headers.join("  ");

  // Build separator row
  const separators = widths.map((width) => {
    if (width === undefined) {
      throw new Error("Width is undefined");
    }
    return "-".repeat(width);
  });
  const separatorRow = separators.join("  ");

  // Build data rows
  const dataRows = data.map((row) => {
    const cells = columns.map((col, idx) => {
      const value = row[col.key];
      const formatted =
        col.format !== undefined ? col.format(value) : String(value);
      const width = widths[idx];
      if (width === undefined) {
        throw new Error(`Width not calculated for column ${idx}`);
      }
      return pad(formatted, width, col.align);
    });
    return cells.join("  ");
  });

  return [headerRow, separatorRow, ...dataRows].join("\n");
}

/**
 * Format data as JSON string.
 *
 * @param data - Data to format as JSON
 * @param pretty - Enable pretty printing with indentation (default: true)
 * @returns Formatted JSON string
 *
 * @example
 * ```typescript
 * const json = formatJson({ name: "Alice", age: 30 });
 * // {
 * //   "name": "Alice",
 * //   "age": 30
 * // }
 *
 * const compact = formatJson({ name: "Alice" }, false);
 * // {"name":"Alice"}
 * ```
 */
export function formatJson(data: unknown, pretty: boolean = true): string {
  if (pretty) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data);
}

/**
 * Print success message to stdout with color.
 *
 * Uses green color for success messages in terminal environments that support it.
 * Writes to stdout.
 *
 * @param message - Success message to print
 *
 * @example
 * ```typescript
 * printSuccess("Session completed successfully");
 * ```
 */
export function printSuccess(message: string): void {
  logger.success(message);
}

/**
 * Print error message to stderr with color.
 *
 * Uses red color for error messages in terminal environments that support it.
 * Writes to stderr. Accepts either Error objects or string messages.
 *
 * @param error - Error object or error message string
 *
 * @example
 * ```typescript
 * printError(new Error("Connection failed"));
 * printError("Invalid configuration");
 * ```
 */
export function printError(error: Error | string): void {
  if (error instanceof Error) {
    logger.error(error.message);
    if (error.stack !== undefined) {
      logger.debug(error.stack);
    }
  } else {
    logger.error(error);
  }
}

/**
 * Format cost value in USD with cents precision.
 *
 * Formats numbers as currency strings with dollar sign and two decimal places.
 * Handles edge cases like negative values and zero.
 *
 * @param usd - Amount in US dollars
 * @returns Formatted string like "$1.23"
 *
 * @example
 * ```typescript
 * formatCost(1.23);      // "$1.23"
 * formatCost(0.05);      // "$0.05"
 * formatCost(100);       // "$100.00"
 * formatCost(0);         // "$0.00"
 * formatCost(-5.50);     // "-$5.50"
 * ```
 */
export function formatCost(usd: number): string {
  const absValue = Math.abs(usd);
  const formatted = absValue.toFixed(2);

  if (usd < 0) {
    return `-$${formatted}`;
  }
  return `$${formatted}`;
}
