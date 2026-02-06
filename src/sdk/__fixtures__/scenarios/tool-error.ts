import type { SessionScenario } from "../mock-session";

/**
 * Tool error scenario: Tests tool error handling.
 */
export const ToolErrorScenario: SessionScenario = {
  name: "tool-error",
  description: "Tests tool error handling",
  steps: [
    {
      type: "assistant",
      content: "I will try to divide.",
    },
    {
      type: "tool_use",
      name: "divide",
      args: { a: 10, b: 0 },
      toolUseId: "tool_use_1",
    },
    { type: "expect_result" },
    {
      type: "assistant",
      content: "The division failed because you cannot divide by zero.",
    },
    { type: "result", stats: { cost: 0.001, tokens: 120 } },
  ],
};
