import { describe, test, expect } from "vitest";
import { MockClaudeSession, type SessionScenario } from "./mock-session";
import { CalculatorScenario, ToolErrorScenario } from "./scenarios";

describe("MockClaudeSession", () => {
  describe("constructor", () => {
    test("should create instance with scenario", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      expect(session).toBeDefined();
    });
  });

  describe("start", () => {
    test("should reset session state", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      expect(session.getToolCallHistory()).toEqual([]);
      expect(session.getToolResultHistory()).toEqual([]);
    });
  });

  describe("expectToolCall", () => {
    test("should validate tool call name", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      expect(() => {
        session.expectToolCall("add");
      }).not.toThrow();
    });

    test("should throw error for wrong tool name", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      expect(() => {
        session.expectToolCall("subtract");
      }).toThrow("Expected tool call to subtract, got add");
    });

    test("should validate tool arguments when provided", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      expect(() => {
        session.expectToolCall("add", { a: 15, b: 27 });
      }).not.toThrow();
    });

    test("should throw error for wrong arguments", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      expect(() => {
        session.expectToolCall("add", { a: 10, b: 20 });
      }).toThrow("Expected argument a to be 10, got 15");
    });

    test("should record tool call", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");

      const history = session.getToolCallHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        toolName: "add",
        serverName: "test-server",
        arguments: { a: 15, b: 27 },
      });
    });

    test("should return this for fluent chaining", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      const result = session.expectToolCall("add");
      expect(result).toBe(session);
    });

    test("should throw error when no tool_use step found", () => {
      const scenario: SessionScenario = {
        name: "test",
        description: "Test scenario",
        steps: [{ type: "assistant", content: "Hello" }],
      };

      const session = new MockClaudeSession(scenario);
      session.start("Test");

      expect(() => {
        session.expectToolCall("add");
      }).toThrow("Expected tool_use step");
    });

    test("should throw error when expect_result step missing after tool_use", () => {
      const scenario: SessionScenario = {
        name: "test",
        description: "Test scenario",
        steps: [
          { type: "tool_use", name: "add", args: { a: 1, b: 2 } },
          { type: "assistant", content: "Done" },
        ],
      };

      const session = new MockClaudeSession(scenario);
      session.start("Test");

      expect(() => {
        session.expectToolCall("add");
      }).toThrow("Expected expect_result step after tool_use");
    });
  });

  describe("respondWithToolResult", () => {
    test("should record tool result", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");
      session.respondWithToolResult({
        content: [{ type: "text", text: "42" }],
      });

      const results = session.getToolResultHistory();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        toolName: "add",
        isError: false,
      });
    });

    test("should record error result", () => {
      const session = new MockClaudeSession(ToolErrorScenario);
      session.start("Divide 10 by 0");

      session.expectToolCall("divide");
      session.respondWithToolResult({
        content: [{ type: "text", text: "Division by zero error" }],
        isError: true,
      });

      const results = session.getToolResultHistory();
      expect(results).toHaveLength(1);
      expect(results[0]?.isError).toBe(true);
    });

    test("should throw error when no pending tool call", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      expect(() => {
        session.respondWithToolResult({
          content: [{ type: "text", text: "42" }],
        });
      }).toThrow("No pending tool call to respond to");
    });

    test("should match tool call and result by toolUseId", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");
      session.respondWithToolResult({
        content: [{ type: "text", text: "42" }],
      });

      const calls = session.getToolCallHistory();
      const results = session.getToolResultHistory();

      expect(calls[0]?.toolUseId).toBe(results[0]?.toolUseId);
    });
  });

  describe("expectCompletion", () => {
    test("should return session stats", async () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");
      session.respondWithToolResult({
        content: [{ type: "text", text: "42" }],
      });

      const stats = await session.expectCompletion();
      expect(stats).toEqual({ cost: 0.001, tokens: 100 });
    });

    test("should throw error when no result step found", async () => {
      const scenario: SessionScenario = {
        name: "test",
        description: "Test scenario",
        steps: [{ type: "assistant", content: "Hello" }],
      };

      const session = new MockClaudeSession(scenario);
      session.start("Test");

      await expect(session.expectCompletion()).rejects.toThrow(
        "No step found at index",
      );
    });

    test("should throw error when step is not result type", async () => {
      const scenario: SessionScenario = {
        name: "test",
        description: "Test scenario",
        steps: [
          { type: "assistant", content: "Hello" },
          { type: "tool_use", name: "test", args: {} },
        ],
      };

      const session = new MockClaudeSession(scenario);
      session.start("Test");

      await expect(session.expectCompletion()).rejects.toThrow(
        "Expected result step at index 1, got tool_use",
      );
    });
  });

  describe("getToolCallHistory", () => {
    test("should return all tool calls", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");

      const history = session.getToolCallHistory();
      expect(history).toHaveLength(1);
    });

    test("should return copy of history", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");

      const history1 = session.getToolCallHistory();
      const history2 = session.getToolCallHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe("getToolResultHistory", () => {
    test("should return all tool results", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");
      session.respondWithToolResult({
        content: [{ type: "text", text: "42" }],
      });

      const history = session.getToolResultHistory();
      expect(history).toHaveLength(1);
    });

    test("should return copy of history", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");
      session.respondWithToolResult({
        content: [{ type: "text", text: "42" }],
      });

      const history1 = session.getToolResultHistory();
      const history2 = session.getToolResultHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe("getCurrentStep", () => {
    test("should return current step", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      const step = session.getCurrentStep();
      expect(step).toEqual({
        type: "assistant",
        content: "I will use the add tool to calculate the result.",
      });
    });

    test("should return undefined when no more steps", () => {
      const scenario: SessionScenario = {
        name: "test",
        description: "Test scenario",
        steps: [],
      };

      const session = new MockClaudeSession(scenario);
      session.start("Test");

      const step = session.getCurrentStep();
      expect(step).toBeUndefined();
    });

    test("should advance after expectToolCall", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add");

      const step = session.getCurrentStep();
      expect(step).toEqual({
        type: "assistant",
        content: "The result of 15 + 27 is 42.",
      });
    });
  });

  describe("Calculator Scenario", () => {
    test("should execute full calculator scenario", async () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      session.expectToolCall("add", { a: 15, b: 27 });
      session.respondWithToolResult({
        content: [{ type: "text", text: "42" }],
      });

      const stats = await session.expectCompletion();

      expect(session.getToolCallHistory()).toHaveLength(1);
      expect(session.getToolResultHistory()).toHaveLength(1);
      expect(stats).toEqual({ cost: 0.001, tokens: 100 });
    });
  });

  describe("Tool Error Scenario", () => {
    test("should execute full tool error scenario", async () => {
      const session = new MockClaudeSession(ToolErrorScenario);
      session.start("Divide 10 by 0");

      session.expectToolCall("divide", { a: 10, b: 0 });
      session.respondWithToolResult({
        content: [{ type: "text", text: "Division by zero error" }],
        isError: true,
      });

      const stats = await session.expectCompletion();

      expect(session.getToolCallHistory()).toHaveLength(1);
      expect(session.getToolResultHistory()).toHaveLength(1);
      expect(session.getToolResultHistory()[0]?.isError).toBe(true);
      expect(stats).toEqual({ cost: 0.001, tokens: 120 });
    });
  });

  describe("Fluent API", () => {
    test("should support method chaining", () => {
      const session = new MockClaudeSession(CalculatorScenario);
      session.start("Calculate 15 + 27");

      const result = session
        .expectToolCall("add", { a: 15, b: 27 })
        .getToolCallHistory();

      expect(result).toHaveLength(1);
    });
  });
});
