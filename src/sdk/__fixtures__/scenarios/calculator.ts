import type { SessionScenario } from "../mock-session";

/**
 * Calculator scenario: Tests add tool call flow.
 */
export const CalculatorScenario: SessionScenario = {
  name: "calculator",
  description: "Tests add tool call flow",
  steps: [
    {
      type: "assistant",
      content: "I will use the add tool to calculate the result.",
    },
    {
      type: "tool_use",
      name: "add",
      args: { a: 15, b: 27 },
      toolUseId: "tool_use_1",
    },
    { type: "expect_result" },
    {
      type: "assistant",
      content: "The result of 15 + 27 is 42.",
    },
    { type: "result", stats: { cost: 0.001, tokens: 100 } },
  ],
};
