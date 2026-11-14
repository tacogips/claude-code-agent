import { describe, test, expect } from "vitest";
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

describe("isHeading", () => {
  test("detects headings from h1 to h6", () => {
    expect(isHeading("# Heading 1")).toBe(true);
    expect(isHeading("## Heading 2")).toBe(true);
    expect(isHeading("### Heading 3")).toBe(true);
    expect(isHeading("#### Heading 4")).toBe(true);
    expect(isHeading("##### Heading 5")).toBe(true);
    expect(isHeading("###### Heading 6")).toBe(true);
  });

  test("handles leading whitespace", () => {
    expect(isHeading("  ## Heading with indent")).toBe(true);
    expect(isHeading("\t### Heading with tab")).toBe(true);
  });

  test("rejects invalid heading patterns", () => {
    expect(isHeading("####### Too many hashes")).toBe(false);
    expect(isHeading("##No space after hashes")).toBe(false);
    expect(isHeading("Not a heading")).toBe(false);
  });
});

describe("getHeadingLevel", () => {
  test("returns correct level for headings", () => {
    expect(getHeadingLevel("# Level 1")).toBe(1);
    expect(getHeadingLevel("## Level 2")).toBe(2);
    expect(getHeadingLevel("### Level 3")).toBe(3);
    expect(getHeadingLevel("#### Level 4")).toBe(4);
    expect(getHeadingLevel("##### Level 5")).toBe(5);
    expect(getHeadingLevel("###### Level 6")).toBe(6);
  });

  test("handles leading whitespace", () => {
    expect(getHeadingLevel("  ## Level 2 with indent")).toBe(2);
    expect(getHeadingLevel("\t### Level 3 with tab")).toBe(3);
  });

  test("returns 0 for non-headings", () => {
    expect(getHeadingLevel("Not a heading")).toBe(0);
    expect(getHeadingLevel("####### Too many")).toBe(0);
    expect(getHeadingLevel("##No space")).toBe(0);
  });
});

describe("isCodeFence", () => {
  test("detects opening fence with language", () => {
    const result = isCodeFence("```typescript");
    expect(result.isFence).toBe(true);
    expect(result.language).toBe("typescript");
    expect(result.isOpening).toBe(true);
  });

  test("detects opening fence without language", () => {
    const result = isCodeFence("```");
    expect(result.isFence).toBe(true);
    expect(result.language).toBe("");
    expect(result.isOpening).toBe(true);
  });

  test("detects closing fence", () => {
    const result = isCodeFence("```");
    expect(result.isFence).toBe(true);
    expect(result.isOpening).toBe(true); // Empty is treated as opening
  });

  test("handles various language names", () => {
    expect(isCodeFence("```javascript").language).toBe("javascript");
    expect(isCodeFence("```python").language).toBe("python");
    expect(isCodeFence("```rust").language).toBe("rust");
    expect(isCodeFence("```go").language).toBe("go");
  });

  test("handles leading whitespace", () => {
    const result = isCodeFence("  ```typescript");
    expect(result.isFence).toBe(true);
    expect(result.language).toBe("typescript");
  });

  test("rejects non-fence lines", () => {
    expect(isCodeFence("Not a fence").isFence).toBe(false);
    expect(isCodeFence("``Only two backticks").isFence).toBe(false);
    expect(isCodeFence("`Single backtick").isFence).toBe(false);
  });
});

describe("isListItem", () => {
  test("detects unordered list items with -", () => {
    expect(isListItem("- Item")).toBe(true);
    expect(isListItem("  - Nested item")).toBe(true);
  });

  test("detects unordered list items with *", () => {
    expect(isListItem("* Item")).toBe(true);
    expect(isListItem("  * Nested item")).toBe(true);
  });

  test("detects unordered list items with +", () => {
    expect(isListItem("+ Item")).toBe(true);
    expect(isListItem("  + Nested item")).toBe(true);
  });

  test("detects ordered list items", () => {
    expect(isListItem("1. First")).toBe(true);
    expect(isListItem("2. Second")).toBe(true);
    expect(isListItem("10. Tenth")).toBe(true);
    expect(isListItem("  1. Nested")).toBe(true);
  });

  test("rejects non-list items", () => {
    expect(isListItem("Not a list")).toBe(false);
    expect(isListItem("-No space")).toBe(false);
    expect(isListItem("1.No space")).toBe(false);
  });
});

describe("getListItemInfo", () => {
  test("extracts unordered list item info", () => {
    const info = getListItemInfo("- Simple item");
    expect(info).toEqual({
      text: "Simple item",
      depth: 0,
      isOrdered: false,
    });
  });

  test("extracts ordered list item info", () => {
    const info = getListItemInfo("1. First item");
    expect(info).toEqual({
      text: "First item",
      depth: 0,
      isOrdered: true,
    });
  });

  test("calculates depth from indentation", () => {
    expect(getListItemInfo("- Root")?.depth).toBe(0);
    expect(getListItemInfo("  - Level 1")?.depth).toBe(1);
    expect(getListItemInfo("    - Level 2")?.depth).toBe(2);
    expect(getListItemInfo("      - Level 3")?.depth).toBe(3);
  });

  test("detects unchecked task list items", () => {
    const info = getListItemInfo("- [ ] Unchecked task");
    expect(info?.checked).toBe(false);
    expect(info?.text).toBe("Unchecked task");
  });

  test("detects checked task list items", () => {
    const infoLower = getListItemInfo("- [x] Checked task");
    expect(infoLower?.checked).toBe(true);
    expect(infoLower?.text).toBe("Checked task");

    const infoUpper = getListItemInfo("- [X] Checked task");
    expect(infoUpper?.checked).toBe(true);
    expect(infoUpper?.text).toBe("Checked task");
  });

  test("handles task lists with ordered items", () => {
    const info = getListItemInfo("1. [x] Ordered task");
    expect(info).toEqual({
      text: "Ordered task",
      depth: 0,
      checked: true,
      isOrdered: true,
    });
  });

  test("handles nested task lists", () => {
    const info = getListItemInfo("  - [ ] Nested task");
    expect(info?.depth).toBe(1);
    expect(info?.checked).toBe(false);
    expect(info?.text).toBe("Nested task");
  });

  test("returns null for non-list items", () => {
    expect(getListItemInfo("Not a list")).toBeNull();
    expect(getListItemInfo("Just text")).toBeNull();
  });

  test("handles different bullet types", () => {
    expect(getListItemInfo("* Star item")?.text).toBe("Star item");
    expect(getListItemInfo("+ Plus item")?.text).toBe("Plus item");
  });
});

describe("isBlockquote", () => {
  test("detects blockquotes", () => {
    expect(isBlockquote("> Quote")).toBe(true);
    expect(isBlockquote("> Multi word quote")).toBe(true);
  });

  test("handles leading whitespace", () => {
    expect(isBlockquote("  > Indented quote")).toBe(true);
    expect(isBlockquote("\t> Tabbed quote")).toBe(true);
  });

  test("rejects non-blockquotes", () => {
    expect(isBlockquote("Not a quote")).toBe(false);
    expect(isBlockquote("No > symbol")).toBe(false);
  });
});

describe("isTableRow", () => {
  test("detects table rows", () => {
    expect(isTableRow("| Col1 | Col2 |")).toBe(true);
    expect(isTableRow("| A | B | C |")).toBe(true);
  });

  test("handles rows without surrounding pipes", () => {
    expect(isTableRow("Col1 | Col2")).toBe(true);
  });

  test("rejects non-table content", () => {
    expect(isTableRow("No pipes here")).toBe(false);
    expect(isTableRow("|")).toBe(false); // Just pipe, no content
  });
});

describe("isTableSeparator", () => {
  test("detects standard separators", () => {
    expect(isTableSeparator("|---|---|")).toBe(true);
    expect(isTableSeparator("| --- | --- |")).toBe(true);
  });

  test("detects separators with alignment", () => {
    expect(isTableSeparator("|:---|---:|")).toBe(true); // Left and right align
    expect(isTableSeparator("| :--- | :---: | ---: |")).toBe(true); // All alignments
  });

  test("handles varying dash counts", () => {
    expect(isTableSeparator("|---|-----|")).toBe(true);
    expect(isTableSeparator("|--------|----|")).toBe(true);
  });

  test("handles optional outer pipes", () => {
    expect(isTableSeparator("--- | ---")).toBe(true);
  });

  test("rejects non-separator content", () => {
    expect(isTableSeparator("| Data | Data |")).toBe(false);
    expect(isTableSeparator("Not a separator")).toBe(false);
    expect(isTableSeparator("---")).toBe(false); // Just dashes, no pipes
  });
});
