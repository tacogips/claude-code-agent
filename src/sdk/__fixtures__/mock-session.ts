/**
 * Mock Claude session that simulates complete conversation flows for testing.
 */

/**
 * Tool call record tracking.
 */
export interface ToolCallRecord {
  toolUseId: string;
  toolName: string;
  serverName: string;
  arguments: Record<string, unknown>;
  timestamp: string;
}

/**
 * Tool result record tracking.
 */
export interface ToolResultRecord {
  toolUseId: string;
  toolName: string;
  result: object;
  isError: boolean;
  timestamp: string;
}

/**
 * Individual step in a scenario conversation.
 */
export type ScenarioStep =
  | { type: "assistant"; content: string }
  | {
      type: "tool_use";
      name: string;
      args: Record<string, unknown>;
      toolUseId?: string;
    }
  | { type: "expect_result" }
  | { type: "result"; stats: { cost: number; tokens: number } };

/**
 * Pre-defined conversation flow for testing.
 */
export interface SessionScenario {
  name: string;
  description: string;
  steps: ScenarioStep[];
}

/**
 * Simulates complete Claude session with tool calls for testing.
 */
export class MockClaudeSession {
  private scenario: SessionScenario;
  private currentStepIndex = 0;
  private toolCallsReceived: ToolCallRecord[] = [];
  private toolResultsReturned: ToolResultRecord[] = [];

  constructor(scenario: SessionScenario) {
    this.scenario = scenario;
  }

  /**
   * Start the session with a prompt.
   */
  start(_prompt: string): void {
    this.currentStepIndex = 0;
    this.toolCallsReceived = [];
    this.toolResultsReturned = [];
  }

  /**
   * Expect a tool call with optional argument validation.
   * Returns this for fluent chaining.
   */
  expectToolCall(
    name: string,
    args?: Record<string, unknown>,
  ): MockClaudeSession {
    // Skip past assistant messages to find tool_use step
    while (
      this.currentStepIndex < this.scenario.steps.length &&
      this.scenario.steps[this.currentStepIndex]?.type === "assistant"
    ) {
      this.currentStepIndex++;
    }

    const step = this.scenario.steps[this.currentStepIndex];

    if (!step || step.type !== "tool_use") {
      throw new Error(
        `Expected tool_use step at index ${this.currentStepIndex}, got ${step?.type ?? "undefined"}`,
      );
    }

    if (step.name !== name) {
      throw new Error(
        `Expected tool call to ${name}, got ${step.name} at step ${this.currentStepIndex}`,
      );
    }

    if (args !== undefined) {
      const stepArgs = step.args;
      for (const [key, value] of Object.entries(args)) {
        if (stepArgs[key] !== value) {
          throw new Error(
            `Expected argument ${key} to be ${String(value)}, got ${String(stepArgs[key])}`,
          );
        }
      }
    }

    const toolUseId = step.toolUseId ?? `tool_use_${this.currentStepIndex}`;
    const timestamp = new Date().toISOString();

    this.toolCallsReceived.push({
      toolUseId,
      toolName: name,
      serverName: "test-server",
      arguments: step.args,
      timestamp,
    });

    this.currentStepIndex++;

    const nextStep = this.scenario.steps[this.currentStepIndex];
    if (nextStep?.type !== "expect_result") {
      throw new Error(
        `Expected expect_result step after tool_use at index ${this.currentStepIndex}, got ${nextStep?.type ?? "undefined"}`,
      );
    }

    this.currentStepIndex++;

    return this;
  }

  /**
   * Provide tool result for pending tool call.
   */
  respondWithToolResult(result: {
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
  }): void {
    if (this.toolCallsReceived.length === 0) {
      throw new Error("No pending tool call to respond to");
    }

    const lastToolCall =
      this.toolCallsReceived[this.toolCallsReceived.length - 1];
    if (!lastToolCall) {
      throw new Error("No tool call record found");
    }

    const timestamp = new Date().toISOString();

    this.toolResultsReturned.push({
      toolUseId: lastToolCall.toolUseId,
      toolName: lastToolCall.toolName,
      result: result as object,
      isError: result.isError ?? false,
      timestamp,
    });
  }

  /**
   * Wait for session completion and return stats.
   */
  async expectCompletion(): Promise<{ cost: number; tokens: number }> {
    // Skip past assistant messages to find result step
    while (
      this.currentStepIndex < this.scenario.steps.length &&
      this.scenario.steps[this.currentStepIndex]?.type === "assistant"
    ) {
      this.currentStepIndex++;
    }

    const step = this.scenario.steps[this.currentStepIndex];

    if (!step) {
      throw new Error(
        `No step found at index ${this.currentStepIndex} for completion`,
      );
    }

    if (step.type !== "result") {
      throw new Error(
        `Expected result step at index ${this.currentStepIndex}, got ${step.type}`,
      );
    }

    this.currentStepIndex++;

    return step.stats;
  }

  /**
   * Get all tool calls made during the session.
   */
  getToolCallHistory(): ToolCallRecord[] {
    return [...this.toolCallsReceived];
  }

  /**
   * Get all tool results returned during the session.
   */
  getToolResultHistory(): ToolResultRecord[] {
    return [...this.toolResultsReturned];
  }

  /**
   * Get the current step in the scenario.
   */
  getCurrentStep(): ScenarioStep | undefined {
    return this.scenario.steps[this.currentStepIndex];
  }
}
