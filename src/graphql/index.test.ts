import { describe, expect, test, vi } from "vitest";
import {
  executeGraphqlDocument,
  type GraphqlContext,
} from "./index";

describe("executeGraphqlDocument", () => {
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
