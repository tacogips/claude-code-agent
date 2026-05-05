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
    const stateChanges: object[] = [];
    session.on("stateChange", (change) => {
      stateChanges.push(change);
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
    expect(stateChanges).toHaveLength(1);
    expect(stateChanges[0]).toMatchObject({
      from: "running",
      to: "completed",
      info: {
        state: "completed",
        sessionId: "mock-claude-stall",
      },
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

  test("tracks active sessions and close cancels unfinished sessions", async () => {
    const runningSession = new MockClaudeRunningSession({
      sessionId: "mock-claude-active",
      autoComplete: false,
    });
    const runner = createMockClaudeSessionRunner({
      startSessions: [runningSession],
    });

    const running = await runner.startSession({ prompt: "start" });
    expect(runner.getActiveSessions()).toEqual([running]);

    await runner.close();

    expect(runner.getActiveSessions()).toEqual([]);
    expect(running.getState()).toMatchObject({
      state: "cancelled",
      sessionId: "mock-claude-active",
    });
    await expect(running.waitForCompletion()).resolves.toMatchObject({
      success: false,
    });
  });

  test("cancel is a no-op after successful completion", async () => {
    const session = new MockClaudeRunningSession({
      sessionId: "mock-claude-completed",
      autoComplete: false,
    });
    session.complete({ success: true });

    await session.cancel();

    expect(session.getState()).toMatchObject({
      state: "completed",
      sessionId: "mock-claude-completed",
    });
    await expect(session.waitForCompletion()).resolves.toMatchObject({
      success: true,
    });
  });

  test("records start and resume calls as snapshots", async () => {
    const attachment = {
      fileName: "before.txt",
      content: "before",
    };
    const startConfig = {
      prompt: "start",
      systemPrompt: { preset: "claude_code" as const, append: "before" },
      attachments: [attachment],
    };
    const runner = createMockClaudeSessionRunner({
      startSessions: [
        new MockClaudeRunningSession({
          sessionId: "mock-claude-start-snapshot",
        }),
      ],
      resumeSessions: [
        new MockClaudeRunningSession({
          sessionId: "mock-claude-resume-snapshot",
        }),
      ],
    });

    await runner.startSession(startConfig);
    attachment.fileName = "after.txt";
    startConfig.systemPrompt.append = "after";
    startConfig.attachments.push({ fileName: "extra.txt", content: "extra" });

    await runner.resumeSession(
      "mock-claude-resume-snapshot",
      "continue",
      { preset: "claude_code", append: "resume-before" },
      [attachment],
    );
    attachment.content = "after";

    expect(runner.startSessionCalls).toEqual([
      {
        config: {
          prompt: "start",
          systemPrompt: { preset: "claude_code", append: "before" },
          attachments: [{ fileName: "before.txt", content: "before" }],
        },
      },
    ]);
    expect(runner.resumeSessionCalls).toEqual([
      {
        sessionId: "mock-claude-resume-snapshot",
        prompt: "continue",
        systemPrompt: { preset: "claude_code", append: "resume-before" },
        attachments: [{ fileName: "after.txt", content: "before" }],
      },
    ]);
  });
});
