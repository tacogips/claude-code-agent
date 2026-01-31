import { describe, test, expect } from "vitest";
import { parseMarkdown } from "./parser";
import type {
  ParagraphBlock,
  CodeBlock,
  ListBlock,
  BlockquoteBlock,
  TableBlock,
} from "./types";

describe("parseMarkdown", () => {
  test("parses empty content", () => {
    const result = parseMarkdown("");

    expect(result.version).toBe("1.0");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.heading).toBeNull();
    expect(result.sections[0]?.content).toEqual([]);
  });

  test("parses content without headings (preamble)", () => {
    const markdown = `This is a paragraph before any headings.
It continues on the next line.`;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.heading).toBeNull();
    expect(result.sections[0]?.content).toHaveLength(1);

    const block = result.sections[0]?.content[0] as ParagraphBlock;
    expect(block.type).toBe("paragraph");
    expect(block.text).toContain("This is a paragraph");
  });

  test("parses single section with heading", () => {
    const markdown = `## Overview
This is the overview section.`;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.heading?.level).toBe(2);
    expect(result.sections[0]?.heading?.text).toBe("Overview");
    expect(result.sections[0]?.heading?.lineNumber).toBe(1);
    expect(result.sections[0]?.content).toHaveLength(1);
  });

  test("parses multiple sections", () => {
    const markdown = `## Section 1
Content 1

## Section 2
Content 2

## Section 3
Content 3`;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]?.heading?.text).toBe("Section 1");
    expect(result.sections[1]?.heading?.text).toBe("Section 2");
    expect(result.sections[2]?.heading?.text).toBe("Section 3");
  });

  test("parses preamble before first heading", () => {
    const markdown = `Preamble content here.

## First Heading
First section content.`;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]?.heading).toBeNull();
    expect(result.sections[0]?.index).toBe(0);
    expect(result.sections[1]?.heading?.text).toBe("First Heading");
    expect(result.sections[1]?.index).toBe(1);
  });

  test("parses code blocks with language", () => {
    const markdown = `## Code Example

\`\`\`typescript
const x = 42;
console.log(x);
\`\`\``;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.content).toHaveLength(1);

    const block = result.sections[0]?.content[0] as CodeBlock;
    expect(block.type).toBe("code");
    expect(block.language).toBe("typescript");
    expect(block.code).toBe("const x = 42;\nconsole.log(x);");
    expect(block.lineStart).toBe(3);
    expect(block.lineEnd).toBe(6); // Closing fence line
  });

  test("parses code blocks without language", () => {
    const markdown = `\`\`\`
plain code
\`\`\``;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as CodeBlock;
    expect(block.type).toBe("code");
    expect(block.language).toBe("");
    expect(block.code).toBe("plain code");
  });

  test("parses unordered lists", () => {
    const markdown = `## List

- Item 1
- Item 2
- Item 3`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as ListBlock;
    expect(block.type).toBe("list");
    expect(block.listType).toBe("unordered");
    expect(block.items).toHaveLength(3);
    expect(block.items[0]?.text).toBe("Item 1");
    expect(block.items[1]?.text).toBe("Item 2");
    expect(block.items[2]?.text).toBe("Item 3");
  });

  test("parses ordered lists", () => {
    const markdown = `1. First
2. Second
3. Third`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as ListBlock;
    expect(block.type).toBe("list");
    expect(block.listType).toBe("ordered");
    expect(block.items).toHaveLength(3);
  });

  test("parses nested lists with depth", () => {
    const markdown = `- Root item
  - Nested level 1
    - Nested level 2
- Another root`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as ListBlock;
    expect(block.items).toHaveLength(4);
    expect(block.items[0]?.depth).toBe(0);
    expect(block.items[1]?.depth).toBe(1);
    expect(block.items[2]?.depth).toBe(2);
    expect(block.items[3]?.depth).toBe(0);
  });

  test("parses task lists with checkboxes", () => {
    const markdown = `- [ ] Unchecked task
- [x] Checked task
- [X] Also checked`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as ListBlock;
    expect(block.items).toHaveLength(3);
    expect(block.items[0]?.checked).toBe(false);
    expect(block.items[1]?.checked).toBe(true);
    expect(block.items[2]?.checked).toBe(true);
  });

  test("parses blockquotes", () => {
    const markdown = `> This is a quote
> spanning multiple lines`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as BlockquoteBlock;
    expect(block.type).toBe("blockquote");
    expect(block.content).toHaveLength(1);

    const innerBlock = block.content[0] as ParagraphBlock;
    expect(innerBlock.type).toBe("paragraph");
    expect(innerBlock.text).toContain("This is a quote");
  });

  test("parses nested blockquote content", () => {
    const markdown = `> # Quoted Heading
> Some text
>
> - List in quote
> - Another item`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as BlockquoteBlock;
    expect(block.type).toBe("blockquote");
    expect(block.content.length).toBeGreaterThan(0);
  });

  test("parses tables", () => {
    const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as TableBlock;
    expect(block.type).toBe("table");
    expect(block.headers).toEqual(["Header 1", "Header 2"]);
    expect(block.rows).toHaveLength(2);
    expect(block.rows[0]).toEqual(["Cell 1", "Cell 2"]);
    expect(block.rows[1]).toEqual(["Cell 3", "Cell 4"]);
  });

  test("parses tables without outer pipes", () => {
    const markdown = `Header 1 | Header 2
---------|----------
Cell 1   | Cell 2`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as TableBlock;
    expect(block.type).toBe("table");
    expect(block.headers).toEqual(["Header 1", "Header 2"]);
    expect(block.rows).toHaveLength(1);
  });

  test("parses mixed content blocks", () => {
    const markdown = `## Section

This is a paragraph.

\`\`\`javascript
const code = true;
\`\`\`

- List item 1
- List item 2

> A blockquote

| Col A | Col B |
|-------|-------|
| A1    | B1    |`;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.content).toHaveLength(5);
    expect(result.sections[0]?.content[0]?.type).toBe("paragraph");
    expect(result.sections[0]?.content[1]?.type).toBe("code");
    expect(result.sections[0]?.content[2]?.type).toBe("list");
    expect(result.sections[0]?.content[3]?.type).toBe("blockquote");
    expect(result.sections[0]?.content[4]?.type).toBe("table");
  });

  test("generates correct metadata", () => {
    const markdown = `# H1

## H2

### H3

\`\`\`
code
\`\`\`

- list`;

    const result = parseMarkdown(markdown);

    expect(result.metadata.sectionCount).toBe(3);
    expect(result.metadata.headingLevels).toEqual([1, 2, 3]);
    expect(result.metadata.hasCodeBlocks).toBe(true);
    expect(result.metadata.hasLists).toBe(true);
  });

  test("metadata reflects no code or lists", () => {
    const markdown = `## Heading

Just paragraphs here.`;

    const result = parseMarkdown(markdown);

    expect(result.metadata.hasCodeBlocks).toBe(false);
    expect(result.metadata.hasLists).toBe(false);
  });

  test("handles includeRawContent option", () => {
    const markdown = "## Test\nContent";

    const withRaw = parseMarkdown(markdown, { includeRawContent: true });
    expect(withRaw.rawContent).toBe(markdown);

    const withoutRaw = parseMarkdown(markdown, { includeRawContent: false });
    expect(withoutRaw.rawContent).toBe("");
  });

  test("handles multiple headings of different levels", () => {
    const markdown = `# Top Level

## Second Level

### Third Level

## Back to Second`;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(4);
    expect(result.sections[0]?.heading?.level).toBe(1);
    expect(result.sections[1]?.heading?.level).toBe(2);
    expect(result.sections[2]?.heading?.level).toBe(3);
    expect(result.sections[3]?.heading?.level).toBe(2);
  });

  test("handles empty lines between content", () => {
    const markdown = `## Section

Paragraph 1


Paragraph 2`;

    const result = parseMarkdown(markdown);

    // Empty lines separate paragraphs
    expect(result.sections[0]?.content).toHaveLength(2);
    expect(result.sections[0]?.content[0]?.type).toBe("paragraph");
    expect(result.sections[0]?.content[1]?.type).toBe("paragraph");
  });

  test("tracks line numbers correctly", () => {
    const markdown = `First paragraph


## Heading

Content here`;

    const result = parseMarkdown(markdown);

    // Preamble section
    const preamble = result.sections[0];
    expect(preamble?.heading).toBeNull();
    expect((preamble?.content[0] as ParagraphBlock).lineStart).toBe(1);

    // Heading section
    const section = result.sections[1];
    expect(section?.heading?.lineNumber).toBe(4);
    expect((section?.content[0] as ParagraphBlock).lineStart).toBe(6);
  });

  test("handles code block without closing fence", () => {
    const markdown = `\`\`\`typescript
const x = 1;
const y = 2;`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as CodeBlock;
    expect(block.type).toBe("code");
    expect(block.code).toBe("const x = 1;\nconst y = 2;");
  });

  test("parses complex real-world example from spec", () => {
    const markdown = `## Overview
This is the overview section.

## Implementation
Here is the implementation details.

- Item 1
- Item 2

## Conclusion
Final thoughts.`;

    const result = parseMarkdown(markdown);

    expect(result.version).toBe("1.0");
    expect(result.sections).toHaveLength(3);

    // Section 0: Overview
    expect(result.sections[0]?.index).toBe(0);
    expect(result.sections[0]?.heading?.level).toBe(2);
    expect(result.sections[0]?.heading?.text).toBe("Overview");
    expect(result.sections[0]?.heading?.lineNumber).toBe(1);
    expect(result.sections[0]?.content).toHaveLength(1);

    const overviewPara = result.sections[0]?.content[0] as ParagraphBlock;
    expect(overviewPara.type).toBe("paragraph");
    expect(overviewPara.text).toBe("This is the overview section.");

    // Section 1: Implementation
    expect(result.sections[1]?.index).toBe(1);
    expect(result.sections[1]?.heading?.text).toBe("Implementation");
    expect(result.sections[1]?.content).toHaveLength(2);

    const implPara = result.sections[1]?.content[0] as ParagraphBlock;
    expect(implPara.type).toBe("paragraph");

    const implList = result.sections[1]?.content[1] as ListBlock;
    expect(implList.type).toBe("list");
    expect(implList.listType).toBe("unordered");
    expect(implList.items).toHaveLength(2);

    // Section 2: Conclusion
    expect(result.sections[2]?.index).toBe(2);
    expect(result.sections[2]?.heading?.text).toBe("Conclusion");

    // Metadata
    expect(result.metadata.sectionCount).toBe(3);
    expect(result.metadata.headingLevels).toEqual([2]);
    expect(result.metadata.hasCodeBlocks).toBe(false);
    expect(result.metadata.hasLists).toBe(true);
  });

  test("handles section index numbering correctly", () => {
    const markdown = `Preamble

## First

## Second`;

    const result = parseMarkdown(markdown);

    expect(result.sections[0]?.index).toBe(0);
    expect(result.sections[1]?.index).toBe(1);
    expect(result.sections[2]?.index).toBe(2);
  });

  test("parses table with alignment markers", () => {
    const markdown = `| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as TableBlock;
    expect(block.type).toBe("table");
    expect(block.headers).toEqual(["Left", "Center", "Right"]);
  });

  test("handles heading with special characters", () => {
    const markdown = `## Overview: The "Big Picture"

Content here.`;

    const result = parseMarkdown(markdown);

    expect(result.sections[0]?.heading?.text).toBe(
      'Overview: The "Big Picture"',
    );
  });

  test("handles lists with different bullet types", () => {
    const markdown = `- Dash item
* Star item
+ Plus item`;

    const result = parseMarkdown(markdown);

    const block = result.sections[0]?.content[0] as ListBlock;
    expect(block.type).toBe("list");
    expect(block.items).toHaveLength(3);
    expect(block.items[0]?.text).toBe("Dash item");
    expect(block.items[1]?.text).toBe("Star item");
    expect(block.items[2]?.text).toBe("Plus item");
  });

  test("parses content with only whitespace", () => {
    const markdown = `

    `;

    const result = parseMarkdown(markdown);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.content).toHaveLength(0);
  });
});
