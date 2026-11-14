/**
 * Tests for MockTransport.
 *
 * Verifies the mock transport correctly simulates CLI communication
 * for unit testing SDK components.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockTransport, type Transport } from "./mock-transport";

describe("MockTransport", () => {
  describe("construction", () => {
    it("should create transport in disconnected state", () => {
      const transport = new MockTransport();
      expect(transport.isConnected()).toBe(false);
      expect(transport.isClosed()).toBe(false);
    });

    it("should auto-connect when autoConnect option is true", async () => {
      const transport = new MockTransport({ autoConnect: true });
      // Give time for async connect
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(transport.isConnected()).toBe(true);
    });

    it("should enqueue pre-configured responses", () => {
      const responses = [{ type: "msg1" }, { type: "msg2" }];
      const transport = new MockTransport({ simulatedResponses: responses });
      expect(transport.getQueueSize()).toBe(2);
    });
  });

  describe("connect", () => {
    it("should connect successfully", async () => {
      const transport = new MockTransport();
      await transport.connect();
      expect(transport.isConnected()).toBe(true);
    });

    it("should throw if already connected", async () => {
      const transport = new MockTransport();
      await transport.connect();
      await expect(transport.connect()).rejects.toThrow(
        "Transport already connected",
      );
    });

    it("should throw if transport is closed", async () => {
      const transport = new MockTransport();
      await transport.connect();
      await transport.close();
      await expect(transport.connect()).rejects.toThrow(
        "Cannot connect to closed transport",
      );
    });
  });

  describe("write", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should store written message", async () => {
      const message = { type: "user", content: "Hello" };
      await transport.write(JSON.stringify(message));

      const written = transport.getWrittenMessages();
      expect(written).toHaveLength(1);
      expect(written[0]).toEqual(message);
    });

    it("should parse and store multiple messages", async () => {
      await transport.write(JSON.stringify({ type: "msg1" }));
      await transport.write(JSON.stringify({ type: "msg2" }));
      await transport.write(JSON.stringify({ type: "msg3" }));

      const written = transport.getWrittenMessages();
      expect(written).toHaveLength(3);
      expect(written[0]).toEqual({ type: "msg1" });
      expect(written[1]).toEqual({ type: "msg2" });
      expect(written[2]).toEqual({ type: "msg3" });
    });

    it("should throw on invalid JSON", async () => {
      await expect(transport.write("not json")).rejects.toThrow(
        "Failed to parse JSON",
      );
    });

    it("should throw if not connected", async () => {
      const disconnected = new MockTransport();
      await expect(disconnected.write("{}")).rejects.toThrow(
        "Transport not connected",
      );
    });

    it("should throw if closed", async () => {
      await transport.close();
      await expect(transport.write("{}")).rejects.toThrow("Transport closed");
    });
  });

  describe("readMessages", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should yield simulated messages", async () => {
      const message1 = { type: "assistant", content: "Hello" };
      const message2 = { type: "assistant", content: "World" };

      transport.simulateMessage(message1);
      transport.simulateMessage(message2);

      const messages: object[] = [];
      let count = 0;
      for await (const msg of transport.readMessages()) {
        messages.push(msg);
        count++;
        if (count === 2) break; // Read only 2 messages
      }

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(message1);
      expect(messages[1]).toEqual(message2);
    });

    it("should yield pre-configured responses", async () => {
      const responses = [{ type: "msg1" }, { type: "msg2" }];
      const transport2 = new MockTransport({ simulatedResponses: responses });
      await transport2.connect();

      const messages: object[] = [];
      let count = 0;
      for await (const msg of transport2.readMessages()) {
        messages.push(msg);
        count++;
        if (count === 2) break;
      }

      expect(messages).toEqual(responses);
    });

    it("should wait for new messages when queue is empty", async () => {
      let messageRead = false;

      // Start reading in background
      const readPromise = (async () => {
        for await (const msg of transport.readMessages()) {
          messageRead = true;
          expect(msg).toEqual({ type: "delayed" });
          break;
        }
      })();

      // Give reader time to start waiting
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(messageRead).toBe(false);

      // Inject message - should wake up reader
      transport.simulateMessage({ type: "delayed" });

      // Wait for reader to finish
      await readPromise;
      expect(messageRead).toBe(true);
    });

    it("should apply message delay if configured", async () => {
      const delayMs = 50;
      const transport2 = new MockTransport({
        messageDelay: delayMs,
        simulatedResponses: [{ type: "msg" }],
      });
      await transport2.connect();

      const startTime = Date.now();
      for await (const msg of transport2.readMessages()) {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(delayMs - 10); // Allow 10ms tolerance
        expect(msg).toEqual({ type: "msg" });
        break;
      }
    });

    it("should throw if not connected", async () => {
      const disconnected = new MockTransport();
      const iterable = disconnected.readMessages();
      const iterator = iterable[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toThrow("Transport not connected");
    });

    it("should stop iteration after endInput", async () => {
      transport.simulateMessage({ type: "msg1" });
      await transport.endInput();

      const messages: object[] = [];
      for await (const msg of transport.readMessages()) {
        messages.push(msg);
      }

      // Should only get the one message, then stop
      expect(messages).toHaveLength(1);
    });

    it("should throw when calling readMessages after close", async () => {
      await transport.close();

      const iterable = transport.readMessages();
      const iterator = iterable[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toThrow("Transport not connected");
    });
  });

  describe("endInput", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should mark input as ended", async () => {
      await transport.endInput();
      // endInput should succeed without error
      expect(transport.isConnected()).toBe(true);
    });

    it("should throw if not connected", async () => {
      const disconnected = new MockTransport();
      await expect(disconnected.endInput()).rejects.toThrow(
        "Transport not connected",
      );
    });

    it("should wake up waiting reader", async () => {
      let readerFinished = false;

      // Start reading in background
      const readPromise = (async () => {
        for await (const msg of transport.readMessages()) {
          // Should not get here since no messages
          expect(msg).toBe(null);
        }
        readerFinished = true;
      })();

      // Give reader time to start waiting
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(readerFinished).toBe(false);

      // End input - should wake up reader
      await transport.endInput();

      // Wait for reader to finish
      await readPromise;
      expect(readerFinished).toBe(true);
    });
  });

  describe("close", () => {
    it("should mark transport as closed", async () => {
      const transport = new MockTransport();
      await transport.connect();
      await transport.close();

      expect(transport.isConnected()).toBe(false);
      expect(transport.isClosed()).toBe(true);
    });

    it("should be safe to call multiple times", async () => {
      const transport = new MockTransport();
      await transport.connect();
      await transport.close();
      await transport.close(); // Should not throw
      expect(transport.isClosed()).toBe(true);
    });

    it("should clear message queue", async () => {
      const transport = new MockTransport();
      await transport.connect();
      transport.simulateMessage({ type: "msg" });
      expect(transport.getQueueSize()).toBe(1);

      await transport.close();
      expect(transport.getQueueSize()).toBe(0);
    });
  });

  describe("simulateMessage", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should add message to queue", () => {
      const message = { type: "test" };
      transport.simulateMessage(message);
      expect(transport.getQueueSize()).toBe(1);
    });

    it("should add multiple messages in order", () => {
      transport.simulateMessage({ type: "msg1" });
      transport.simulateMessage({ type: "msg2" });
      transport.simulateMessage({ type: "msg3" });
      expect(transport.getQueueSize()).toBe(3);
    });

    it("should throw if transport is closed", async () => {
      await transport.close();
      expect(() => transport.simulateMessage({ type: "test" })).toThrow(
        "Cannot simulate message on closed transport",
      );
    });
  });

  describe("simulateToolCall", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should create control_request with mcp_message", () => {
      transport.simulateToolCall("add", { a: 1, b: 2 });
      expect(transport.getQueueSize()).toBe(1);

      const messages = transport.getWrittenMessages();
      // No messages written yet, this is simulating incoming
      expect(messages).toHaveLength(0);
    });

    it("should use custom server name", () => {
      transport.simulateToolCall("calculate", { x: 5 }, "my-server");

      // Read the simulated message
      const message = { type: "placeholder" };
      transport.simulateMessage(message); // Trigger queue processing

      expect(transport.getQueueSize()).toBe(2); // Both messages in queue
    });

    it("should generate valid JSON-RPC structure", async () => {
      transport.simulateToolCall("multiply", { x: 3, y: 4 }, "math-server");

      for await (const msg of transport.readMessages()) {
        const toolCall = msg as Record<string, unknown>;
        expect(toolCall["type"]).toBe("control_request");
        expect(toolCall["request_id"]).toBeDefined();

        const request = toolCall["request"] as Record<string, unknown>;
        expect(request["subtype"]).toBe("mcp_message");
        expect(request["server_name"]).toBe("math-server");

        const message = request["message"] as Record<string, unknown>;
        expect(message["jsonrpc"]).toBe("2.0");
        expect(message["method"]).toBe("tools/call");

        const params = message["params"] as Record<string, unknown>;
        expect(params["name"]).toBe("multiply");
        expect(params["arguments"]).toEqual({ x: 3, y: 4 });

        break;
      }
    });
  });

  describe("getWrittenMessages", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should return copy of written messages", async () => {
      await transport.write(JSON.stringify({ type: "msg1" }));
      await transport.write(JSON.stringify({ type: "msg2" }));

      const written1 = transport.getWrittenMessages();
      expect(written1).toHaveLength(2);

      // Verify it's a copy (not the same reference)
      await transport.write(JSON.stringify({ type: "msg3" }));
      expect(written1).toHaveLength(2); // Original copy unchanged

      const written2 = transport.getWrittenMessages();
      expect(written2).toHaveLength(3);
    });

    it("should return empty array initially", () => {
      const written = transport.getWrittenMessages();
      expect(written).toHaveLength(0);
      expect(written).toEqual([]);
    });
  });

  describe("clearWrittenMessages", () => {
    let transport: MockTransport;

    beforeEach(async () => {
      transport = new MockTransport();
      await transport.connect();
    });

    it("should clear written messages", async () => {
      await transport.write(JSON.stringify({ type: "msg1" }));
      await transport.write(JSON.stringify({ type: "msg2" }));
      expect(transport.getWrittenMessages()).toHaveLength(2);

      transport.clearWrittenMessages();
      expect(transport.getWrittenMessages()).toHaveLength(0);
    });

    it("should allow writing after clear", async () => {
      await transport.write(JSON.stringify({ type: "msg1" }));
      transport.clearWrittenMessages();

      await transport.write(JSON.stringify({ type: "msg2" }));
      const written = transport.getWrittenMessages();
      expect(written).toHaveLength(1);
      expect(written[0]).toEqual({ type: "msg2" });
    });
  });

  describe("Transport interface compliance", () => {
    it("should implement Transport interface", () => {
      const transport: Transport = new MockTransport();
      expect(transport).toBeDefined();
      expect(typeof transport.connect).toBe("function");
      expect(typeof transport.write).toBe("function");
      expect(typeof transport.readMessages).toBe("function");
      expect(typeof transport.endInput).toBe("function");
      expect(typeof transport.close).toBe("function");
    });
  });

  describe("integration scenario", () => {
    it("should handle bidirectional communication flow", async () => {
      const transport = new MockTransport();
      await transport.connect();

      // SDK writes user message
      await transport.write(JSON.stringify({ type: "user", content: "Hi" }));

      // CLI responds with assistant message
      transport.simulateMessage({
        type: "assistant",
        content: "Hello! How can I help?",
      });

      // SDK reads response
      const responses: object[] = [];
      for await (const msg of transport.readMessages()) {
        responses.push(msg);
        break;
      }

      // Verify bidirectional communication
      expect(transport.getWrittenMessages()).toHaveLength(1);
      expect(transport.getWrittenMessages()[0]).toEqual({
        type: "user",
        content: "Hi",
      });
      expect(responses).toHaveLength(1);
      expect(responses[0]).toEqual({
        type: "assistant",
        content: "Hello! How can I help?",
      });

      await transport.close();
    });
  });
});
