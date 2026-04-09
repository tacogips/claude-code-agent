import { describe, expect, test, vi } from "vitest";
import { executeGraphqlDocument, type GraphqlContext } from "./index";

describe("executeGraphqlDocument", () => {
  test("lists sessions through the typed session query", async () => {
    const context = createContext({
      sessions: {
        listSessions: vi.fn().mockResolvedValue([
          {
            id: "s1",
            projectPath: "/tmp/a",
            status: "completed",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:01:00.000Z",
            messageCount: 3,
          },
          {
            id: "s2",
            projectPath: "/tmp/b",
            status: "running",
            createdAt: "2026-04-09T00:02:00.000Z",
            updatedAt: "2026-04-09T00:03:00.000Z",
            messageCount: 5,
          },
        ]),
      },
    });

    const result = await executeGraphqlDocument({
      document: `
        query {
          sessions(status: "running") {
            total
            nodes {
              id
              status
              messageCount
            }
          }
        }
      `,
      context,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      sessions: {
        total: 1,
        nodes: [
          {
            id: "s2",
            status: "running",
            messageCount: 5,
          },
        ],
      },
    });
  });

  test("returns session history through the typed session field", async () => {
    const readTranscript = vi.fn().mockResolvedValue({
      isErr: () => false,
      value: {
        events: [
          {
            type: "assistant",
            uuid: "msg-1",
            timestamp: "2026-04-09T00:00:00.000Z",
            content: "hello",
            raw: { type: "assistant" },
          },
        ],
        total: 1,
        tokenUsage: {
          input: 10,
          output: 20,
        },
      },
    });
    const context = createContext({
      sessions: {
        getSession: vi.fn().mockResolvedValue({
          id: "session-1",
          projectPath: "/tmp/project",
          status: "completed",
          createdAt: "2026-04-09T00:00:00.000Z",
          updatedAt: "2026-04-09T00:10:00.000Z",
          messages: [],
          tasks: [],
        }),
        readTranscript,
      },
    });

    const result = await executeGraphqlDocument({
      document: `
        query {
          session(id: "session-1") {
            id
            history(limit: 10) {
              total
              limit
              events {
                type
                uuid
              }
              tokenUsage {
                input
                output
              }
            }
          }
        }
      `,
      context,
    });

    expect(readTranscript).toHaveBeenCalledWith("session-1", {
      offset: undefined,
      limit: 10,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      session: {
        id: "session-1",
        history: {
          total: 1,
          limit: 10,
          events: [
            {
              type: "assistant",
              uuid: "msg-1",
            },
          ],
          tokenUsage: {
            input: 10,
            output: 20,
          },
        },
      },
    });
  });

  test("supports per-session grep through the typed session field", async () => {
    const searchTranscript = vi.fn().mockResolvedValue({
      isErr: () => false,
      value: {
        sessionId: "session-1",
        matched: true,
        matchCount: 2,
        scannedBytes: 128,
        scannedLines: 4,
        truncated: false,
        timedOut: false,
      },
    });
    const context = createContext({
      sessions: {
        getSession: vi.fn().mockResolvedValue({
          id: "session-1",
          projectPath: "/tmp/project",
          status: "completed",
          createdAt: "2026-04-09T00:00:00.000Z",
          updatedAt: "2026-04-09T00:10:00.000Z",
          messages: [],
          tasks: [],
        }),
        searchTranscript,
      },
    });

    const result = await executeGraphqlDocument({
      document: `
        query {
          session(id: "session-1") {
            grep(query: "needle", maxMatches: 5) {
              sessionId
              matched
              matchCount
            }
          }
        }
      `,
      context,
    });

    expect(searchTranscript).toHaveBeenCalledWith("session-1", "needle", {
      caseSensitive: undefined,
      role: undefined,
      maxMatches: 5,
      maxBytes: undefined,
      timeoutMs: undefined,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      session: {
        grep: {
          sessionId: "session-1",
          matched: true,
          matchCount: 2,
        },
      },
    });
  });

  test("supports grep-style search across sessions", async () => {
    const searchSessions = vi.fn().mockResolvedValue({
      sessionIds: ["session-1", "session-2"],
      total: 2,
      offset: 0,
      limit: 50,
      scannedSessions: 3,
      truncated: false,
      timedOut: false,
    });
    const context = createContext({
      sessions: {
        searchSessions,
      },
    });

    const result = await executeGraphqlDocument({
      document: `
        query {
          searchSessions(query: "needle", source: UUID) {
            sessionIds
            total
            scannedSessions
          }
        }
      `,
      context,
    });

    expect(searchSessions).toHaveBeenCalledWith("needle", {
      projectPath: undefined,
      workingDirectoryPrefix: undefined,
      projectPathPrefix: undefined,
      source: "uuid",
      offset: undefined,
      limit: undefined,
      maxSessions: undefined,
      caseSensitive: undefined,
      role: undefined,
      maxMatches: undefined,
      maxBytes: undefined,
      timeoutMs: undefined,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      searchSessions: {
        sessionIds: ["session-1", "session-2"],
        total: 2,
        scannedSessions: 3,
      },
    });
  });

  test("executes session.list via GraphQL command wrapper", async () => {
    const context = createContext({
      sessions: {
        listSessions: vi.fn().mockResolvedValue([
          { id: "s1", status: "completed" },
          { id: "s2", status: "running" },
        ]),
      },
    });

    const result = await executeGraphqlDocument({
      document:
        'query ($param: JSON) { command(name: "session.list", params: $param) }',
      variables: {
        param: {
          status: "running",
        },
      },
      context,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      command: [{ id: "s2", status: "running" }],
    });
  });

  test("enforces permissions when token context is present", async () => {
    const context = createContext(
      {
        sessions: {
          listSessions: vi.fn().mockResolvedValue([]),
        },
      },
      {
        tokenManager: {
          hasPermission: vi.fn().mockReturnValue(false),
        },
        token: {
          id: "token-1",
          name: "limited",
          hash: "sha256:test",
          permissions: ["bookmark:*"],
          createdAt: "2026-03-16T00:00:00.000Z",
        },
      },
    );

    const result = await executeGraphqlDocument({
      document: 'query { command(name: "session.list") }',
      context,
    });

    expect(result.errors?.[0]?.message).toContain("Missing permission");
  });

  test("runs queue mutation commands", async () => {
    const run = vi.fn().mockResolvedValue({ status: "completed" });
    const context = createContext({
      queueRunner: {
        run,
      },
    });

    const result = await executeGraphqlDocument({
      document:
        'mutation ($param: JSON) { command(name: "queue.run", params: $param) }',
      variables: {
        param: { id: "queue-1" },
      },
      context,
    });

    expect(run).toHaveBeenCalledWith("queue-1");
    expect(result.data).toEqual({
      command: { status: "completed" },
    });
  });
});

function createContext(
  overrides: Record<string, unknown>,
  authOverrides?: Partial<GraphqlContext>,
): GraphqlContext {
  return {
    sdk: {
      sessions: {
        listSessions: vi.fn().mockResolvedValue([]),
        getSession: vi.fn().mockResolvedValue(null),
        getMessages: vi.fn().mockResolvedValue([]),
        readTranscript: vi.fn(),
        searchTranscript: vi.fn(),
        searchSessions: vi.fn().mockResolvedValue({
          sessionIds: [],
          total: 0,
          offset: 0,
          limit: 50,
          scannedSessions: 0,
          truncated: false,
          timedOut: false,
        }),
      },
      parseMarkdown: vi.fn((value: string) => ({ value })),
      groups: {
        createGroup: vi.fn(),
        listGroups: vi.fn().mockResolvedValue([]),
        getGroup: vi.fn().mockResolvedValue(null),
        deleteGroup: vi.fn(),
        addSession: vi.fn(),
        removeSession: vi.fn(),
      },
      groupRunner: {
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      queues: {
        createQueue: vi.fn(),
        listQueues: vi.fn().mockResolvedValue([]),
        getQueue: vi.fn().mockResolvedValue(null),
        addCommand: vi.fn(),
        updateCommand: vi.fn(),
        removeCommand: vi.fn(),
        deleteQueue: vi.fn(),
      },
      queueRunner: {
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      bookmarks: {
        add: vi.fn(),
        list: vi.fn().mockResolvedValue([]),
        search: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        getWithContent: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(false),
      },
      activity: {
        list: vi.fn().mockResolvedValue([]),
        getStatus: vi.fn().mockResolvedValue(null),
      },
      ...(overrides as object),
    } as unknown as GraphqlContext["sdk"],
    ...authOverrides,
  };
}
