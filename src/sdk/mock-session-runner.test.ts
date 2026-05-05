import { describe, expect, test } from "bun:test";
import {
  MockClaudeRunningSession,
  createMockClaudeSessionRunner,
} from "./mock-session-runner";

function assistantMessage(text: string): object {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "text", text }],
    },
  };
}

describe("MockClaudeSessionRunner", () => {
  test("returns queued start sessions and streams messages", async () => {
    const session = new MockClaudeRunningSession({
      sessionId: "mock-claude-start",
      messages: [assistantMessage("hello")],
    });
    const runner = createMockClaudeSessionRunner({
      startSessions: [session],
    });

    const running = await runner.startSession({ prompt: "start" });
    const streamed: object[] = [];
    for await (const message of running.messages()) {
      streamed.push(message);
    }
    const result = await running.waitForCompletion();

    expect(runner.startSessionCalls).toEqual([{ config: { prompt: "start" } }]);
    expect(streamed).toEqual([assistantMessage("hello")]);
    expect(result.success).toBe(true);
    expect(result.stats.messageCount).toBe(1);
  });

  test("keeps stalled sessions open until completion is triggered", async () => {
    const session = new MockClaudeRunningSession({
      sessionId: "mock-claude-stall",
      autoComplete: false,
    });
    const runner = createMockClaudeSessionRunner({
      startSessions: [session],
    });

    const running = await runner.startSession({ prompt: "start" });
    const iterator = running.messages()[Symbol.asyncIterator]();
    const pending = iterator.next();
    session.pushMessage(assistantMessage("after wait"));

    await expect(pending).resolves.toEqual({
      value: assistantMessage("after wait"),
      done: false,
    });
    expect(running.getState()).toMatchObject({
      state: "running",
      sessionId: "mock-claude-stall",
    });
    session.complete({ success: true });
    await expect(iterator.next()).resolves.toEqual({
      value: undefined,
      done: true,
    });
    await expect(running.waitForCompletion()).resolves.toMatchObject({
      success: true,
    });
    expect(running.getState()).toMatchObject({
      state: "completed",
      sessionId: "mock-claude-stall",
    });
  });

  test("records resume calls and returns queued resumed sessions", async () => {
    const resumed = new MockClaudeRunningSession({
      sessionId: "mock-claude-resume",
      messages: [assistantMessage("resumed")],
    });
    const runner = createMockClaudeSessionRunner({
      resumeSessions: [resumed],
    });

    const running = await runner.resumeSession(
      "mock-claude-resume",
      "continue",
      "system",
    );
    const messages: object[] = [];
    for await (const message of running.messages()) {
      messages.push(message);
    }

    expect(runner.resumeSessionCalls).toEqual([
      {
        sessionId: "mock-claude-resume",
        prompt: "continue",
        systemPrompt: "system",
      },
    ]);
    expect(messages).toEqual([assistantMessage("resumed")]);
  });
});
