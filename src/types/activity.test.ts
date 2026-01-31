/**
 * Unit tests for activity types.
 */

import { describe, test, expect } from "vitest";
import {
  isActiveStatus,
  isWaitingStatus,
  type ActivityStatus,
  type ActivityEntry,
  type ActivityStore,
} from "./activity";

describe("ActivityStatus type", () => {
  test("accepts valid activity status values", () => {
    const working: ActivityStatus = "working";
    const waiting: ActivityStatus = "waiting_user_response";
    const idle: ActivityStatus = "idle";

    expect(working).toBe("working");
    expect(waiting).toBe("waiting_user_response");
    expect(idle).toBe("idle");
  });
});

describe("ActivityEntry interface", () => {
  test("creates valid activity entry", () => {
    const entry: ActivityEntry = {
      sessionId: "test-session-123",
      status: "working",
      projectPath: "/test/project",
      lastUpdated: "2026-01-31T10:30:00.000Z",
    };

    expect(entry.sessionId).toBe("test-session-123");
    expect(entry.status).toBe("working");
    expect(entry.projectPath).toBe("/test/project");
    expect(entry.lastUpdated).toBe("2026-01-31T10:30:00.000Z");
  });

  test("is readonly", () => {
    const entry: ActivityEntry = {
      sessionId: "test-session-123",
      status: "working",
      projectPath: "/test/project",
      lastUpdated: "2026-01-31T10:30:00.000Z",
    };

    // @ts-expect-error - should be readonly
    entry.status = "idle";
  });
});

describe("ActivityStore interface", () => {
  test("creates valid activity store", () => {
    const store: ActivityStore = {
      version: "1.0",
      sessions: {
        "session-1": {
          status: "working",
          projectPath: "/project1",
          lastUpdated: "2026-01-31T10:30:00.000Z",
        },
        "session-2": {
          status: "idle",
          projectPath: "/project2",
          lastUpdated: "2026-01-31T09:15:00.000Z",
        },
      },
    };

    expect(store.version).toBe("1.0");
    expect(Object.keys(store.sessions)).toHaveLength(2);
    expect(store.sessions["session-1"]?.status).toBe("working");
    expect(store.sessions["session-2"]?.status).toBe("idle");
  });

  test("session entries omit sessionId", () => {
    const store: ActivityStore = {
      version: "1.0",
      sessions: {
        "session-1": {
          status: "working",
          projectPath: "/project1",
          lastUpdated: "2026-01-31T10:30:00.000Z",
        },
      },
    };

    const sessionEntry = store.sessions["session-1"];
    expect(sessionEntry).toBeDefined();

    // Type check: sessionId should not exist in the entry
    // @ts-expect-error - sessionId is omitted from store entries
    const _id: string = sessionEntry!.sessionId;
  });
});

describe("isActiveStatus", () => {
  test("returns true for working status", () => {
    expect(isActiveStatus("working")).toBe(true);
  });

  test("returns false for waiting_user_response status", () => {
    expect(isActiveStatus("waiting_user_response")).toBe(false);
  });

  test("returns false for idle status", () => {
    expect(isActiveStatus("idle")).toBe(false);
  });
});

describe("isWaitingStatus", () => {
  test("returns true for waiting_user_response status", () => {
    expect(isWaitingStatus("waiting_user_response")).toBe(true);
  });

  test("returns false for working status", () => {
    expect(isWaitingStatus("working")).toBe(false);
  });

  test("returns false for idle status", () => {
    expect(isWaitingStatus("idle")).toBe(false);
  });
});

describe("helper functions composition", () => {
  test("working is active but not waiting", () => {
    const status: ActivityStatus = "working";
    expect(isActiveStatus(status)).toBe(true);
    expect(isWaitingStatus(status)).toBe(false);
  });

  test("waiting_user_response is waiting but not active", () => {
    const status: ActivityStatus = "waiting_user_response";
    expect(isActiveStatus(status)).toBe(false);
    expect(isWaitingStatus(status)).toBe(true);
  });

  test("idle is neither active nor waiting", () => {
    const status: ActivityStatus = "idle";
    expect(isActiveStatus(status)).toBe(false);
    expect(isWaitingStatus(status)).toBe(false);
  });
});
