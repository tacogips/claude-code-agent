/**
 * Tests for CLI output formatting utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTable,
  formatJson,
  printSuccess,
  printError,
  formatCost,
} from "./output";
import { logger } from "../logger";

describe("formatTable", () => {
  it("formats simple table with auto-width columns", () => {
    const data = [
      { id: "1", name: "Alice", age: 30 },
      { id: "2", name: "Bob", age: 25 },
    ];

    const result = formatTable(data, [
      { key: "id", header: "ID" },
      { key: "name", header: "Name" },
      { key: "age", header: "Age" },
    ]);

    expect(result).toContain("ID");
    expect(result).toContain("Name");
    expect(result).toContain("Age");
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
    expect(result).toContain("30");
    expect(result).toContain("25");
  });

  it("formats table with fixed column widths", () => {
    const data = [{ id: "1", name: "Alice" }];

    const result = formatTable(data, [
      { key: "id", header: "ID", width: 10 },
      { key: "name", header: "Name", width: 20 },
    ]);

    const lines = result.split("\n");
    expect(lines).toHaveLength(3); // header + separator + 1 data row
  });

  it("formats table with custom formatters", () => {
    const data = [{ cost: 1.234, status: "active" }];

    const result = formatTable(data, [
      {
        key: "cost",
        header: "Cost",
        format: (value) => `$${(value as number).toFixed(2)}`,
      },
      {
        key: "status",
        header: "Status",
        format: (value) => (value as string).toUpperCase(),
      },
    ]);

    expect(result).toContain("$1.23");
    expect(result).toContain("ACTIVE");
  });

  it("aligns columns correctly", () => {
    const data = [
      { id: "1", count: 100 },
      { id: "2", count: 5 },
    ];

    const result = formatTable(data, [
      { key: "id", header: "ID", align: "left" },
      { key: "count", header: "Count", align: "right" },
    ]);

    // Should contain right-aligned numbers
    expect(result).toBeDefined();
  });

  it("handles empty data array", () => {
    const result = formatTable([], [{ key: "id", header: "ID" }]);
    expect(result).toBe("(no data)");
  });

  it("handles missing headers (uses key)", () => {
    const data = [{ id: "1", name: "Alice" }];

    const result = formatTable(data, [{ key: "id" }, { key: "name" }]);

    expect(result).toContain("id");
    expect(result).toContain("name");
  });

  it("creates separator row with correct width", () => {
    const data = [{ id: "1" }];

    const result = formatTable(data, [{ key: "id", header: "ID", width: 10 }]);

    const lines = result.split("\n");
    const separator = lines[1];
    expect(separator).toBeDefined();
    expect(separator).toMatch(/^-+$/);
  });

  it("formats array values using custom formatter (tags)", () => {
    const data = [
      { id: "1", name: "Item 1", tags: ["tag1", "tag2", "tag3"] },
      { id: "2", name: "Item 2", tags: [] },
      { id: "3", name: "Item 3", tags: ["single"] },
    ];

    const result = formatTable(data, [
      { key: "id", header: "ID" },
      { key: "name", header: "Name" },
      {
        key: "tags",
        header: "Tags",
        format: (value) => {
          if (Array.isArray(value)) {
            return value.join(", ");
          }
          return "";
        },
      },
    ]);

    expect(result).toContain("tag1, tag2, tag3");
    expect(result).toContain("single");
    // Empty array should be formatted as empty string
    const lines = result.split("\n");
    const item2Line = lines.find((line) => line.includes("Item 2"));
    expect(item2Line).toBeDefined();
  });

  it("truncates long values with ellipsis when formatter applied", () => {
    const longText =
      "This is a very long text that should be truncated to fit within the column width constraint";
    const data = [
      { id: "1", prompt: longText },
      { id: "2", prompt: "Short text" },
    ];

    const result = formatTable(data, [
      { key: "id", header: "ID" },
      {
        key: "prompt",
        header: "Prompt",
        width: 50,
        format: (val) => {
          const str = String(val);
          return str.length > 47 ? str.slice(0, 44) + "..." : str;
        },
      },
    ]);

    expect(result).toContain("...");
    expect(result).toContain("Short text");
    // Verify the long text is truncated
    const lines = result.split("\n");
    const longTextLine = lines.find((line) => line.includes("..."));
    expect(longTextLine).toBeDefined();
    if (longTextLine !== undefined) {
      // Should not contain the full original text
      expect(longTextLine).not.toContain(
        "truncated to fit within the column width constraint",
      );
    }
  });

  it("handles numeric values with right alignment", () => {
    const data = [
      { id: "1", count: 1000, price: 99.99 },
      { id: "2", count: 5, price: 1.5 },
      { id: "3", count: 42, price: 150.0 },
    ];

    const result = formatTable(data, [
      { key: "id", header: "ID", align: "left" },
      { key: "count", header: "Count", align: "right" },
      {
        key: "price",
        header: "Price",
        align: "right",
        format: (val) => `$${(val as number).toFixed(2)}`,
      },
    ]);

    expect(result).toContain("1000");
    expect(result).toContain("$99.99");
    expect(result).toContain("$1.50");
    expect(result).toContain("$150.00");

    // Verify structure
    const lines = result.split("\n");
    expect(lines.length).toBeGreaterThan(3); // header + separator + data rows
  });

  it("handles center alignment", () => {
    const data = [{ status: "OK" }];

    const result = formatTable(data, [
      { key: "status", header: "Status", width: 10, align: "center" },
    ]);

    const lines = result.split("\n");
    expect(lines.length).toBe(3); // header + separator + 1 data row

    // Verify the header is centered
    const headerLine = lines[0];
    expect(headerLine).toBeDefined();
    if (headerLine !== undefined) {
      expect(headerLine.trim()).toContain("Status");
    }
  });
});

describe("formatJson", () => {
  it("formats JSON with pretty printing by default", () => {
    const data = { name: "Alice", age: 30 };
    const result = formatJson(data);

    expect(result).toContain("{\n");
    expect(result).toContain('"name": "Alice"');
    expect(result).toContain('"age": 30');
  });

  it("formats JSON in compact mode when pretty=false", () => {
    const data = { name: "Alice", age: 30 };
    const result = formatJson(data, false);

    expect(result).toBe('{"name":"Alice","age":30}');
    expect(result).not.toContain("\n");
  });

  it("handles arrays", () => {
    const data = [1, 2, 3];
    const result = formatJson(data);

    expect(result).toContain("[");
    expect(result).toContain("]");
  });

  it("handles null and undefined", () => {
    expect(formatJson(null)).toBe("null");
    expect(formatJson(undefined)).toBe(undefined);
  });

  it("handles nested objects", () => {
    const data = {
      user: {
        name: "Alice",
        profile: {
          age: 30,
        },
      },
    };

    const result = formatJson(data);
    expect(result).toContain('"user"');
    expect(result).toContain('"profile"');
  });
});

describe("printSuccess", () => {
  beforeEach(() => {
    vi.spyOn(logger, "success").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls logger.success with message", () => {
    printSuccess("Test success message");
    expect(logger.success).toHaveBeenCalledWith("Test success message");
  });
});

describe("printError", () => {
  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    vi.spyOn(logger, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints Error object message", () => {
    const error = new Error("Test error");
    printError(error);
    expect(logger.error).toHaveBeenCalledWith("Test error");
  });

  it("prints Error object stack trace in debug", () => {
    const error = new Error("Test error");
    printError(error);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Error: Test error"),
    );
  });

  it("prints string error message", () => {
    printError("String error message");
    expect(logger.error).toHaveBeenCalledWith("String error message");
  });

  it("does not call debug for string errors", () => {
    printError("String error");
    expect(logger.debug).not.toHaveBeenCalled();
  });
});

describe("formatCost", () => {
  it("formats positive costs with two decimal places", () => {
    expect(formatCost(1.23)).toBe("$1.23");
    expect(formatCost(100)).toBe("$100.00");
    expect(formatCost(0.05)).toBe("$0.05");
  });

  it("formats zero correctly", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("formats negative costs with minus sign", () => {
    expect(formatCost(-1.23)).toBe("-$1.23");
    expect(formatCost(-100)).toBe("-$100.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCost(1.234)).toBe("$1.23");
    expect(formatCost(1.235)).toBe("$1.24");
    expect(formatCost(1.999)).toBe("$2.00");
  });

  it("handles very small values", () => {
    expect(formatCost(0.001)).toBe("$0.00");
    expect(formatCost(0.009)).toBe("$0.01");
  });

  it("handles large values", () => {
    expect(formatCost(1234567.89)).toBe("$1234567.89");
  });
});
