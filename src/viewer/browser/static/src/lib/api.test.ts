import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import api from "./api";

describe("viewer static api client", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    (globalThis as { fetch: typeof fetch }).fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("adds excludeToolMessages query parameter when requested", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await api.sessions.getMessages("session-123", {
      excludeToolMessages: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/session-123/messages?excludeToolMessages=true",
    );
  });

  it("does not add excludeToolMessages query parameter by default", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await api.sessions.getMessages("session-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-123/messages");
  });
});
