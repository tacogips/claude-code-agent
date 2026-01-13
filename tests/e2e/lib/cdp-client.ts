/**
 * Chrome DevTools Protocol (CDP) client for E2E testing.
 *
 * Provides a low-level CDP interface for browser automation,
 * including page navigation, element interaction, and screenshot capture.
 *
 * @module tests/e2e/lib/cdp-client
 */

import * as http from "node:http";
import * as https from "node:https";
import { WebSocket } from "ws";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * CDP command response.
 */
interface CDPResponse {
  readonly id: number;
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
}

/**
 * CDP event.
 */
interface CDPEvent {
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

/**
 * Browser version info from CDP.
 */
interface BrowserVersion {
  readonly Browser: string;
  readonly "Protocol-Version": string;
  readonly "User-Agent": string;
  readonly "V8-Version": string;
  readonly "WebKit-Version": string;
  readonly webSocketDebuggerUrl: string;
}

/**
 * Target info from CDP.
 */
interface TargetInfo {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly url: string;
  readonly webSocketDebuggerUrl?: string;
}

/**
 * Screenshot options.
 */
export interface ScreenshotOptions {
  /** Format: jpeg or png */
  readonly format?: "jpeg" | "png";
  /** Quality (0-100, jpeg only) */
  readonly quality?: number;
  /** Capture full page */
  readonly fullPage?: boolean;
  /** Clip region */
  readonly clip?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

/**
 * Element bounds.
 */
interface ElementBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * CDP client for browser automation.
 */
export class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private readonly pendingCommands = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private readonly eventListeners = new Map<string, Set<(params: Record<string, unknown>) => void>>();
  private rootNodeId: number | null = null;

  private constructor(
    private readonly wsUrl: string,
  ) {}

  /**
   * Connect to a Chrome instance at the given debugging port.
   */
  static async connect(port: number = 9222): Promise<CDPClient> {
    // Get browser version and WebSocket URL
    const version = await CDPClient.httpGet<BrowserVersion>(
      `http://localhost:${port}/json/version`,
    );

    const client = new CDPClient(version.webSocketDebuggerUrl);
    await client.connectWebSocket();
    return client;
  }

  /**
   * Connect to a specific page target.
   */
  static async connectToPage(port: number = 9222, pageIndex: number = 0): Promise<CDPClient> {
    const targets = await CDPClient.httpGet<TargetInfo[]>(
      `http://localhost:${port}/json/list`,
    );

    const pageTargets = targets.filter((t) => t.type === "page");
    if (pageIndex >= pageTargets.length) {
      throw new Error(`Page index ${pageIndex} out of range (${pageTargets.length} pages)`);
    }

    const target = pageTargets[pageIndex];
    if (target.webSocketDebuggerUrl === undefined) {
      throw new Error("Target has no WebSocket debugger URL");
    }

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connectWebSocket();
    return client;
  }

  /**
   * Create a new page and connect to it.
   */
  static async createPage(port: number = 9222, url?: string): Promise<CDPClient> {
    const createUrl = url !== undefined
      ? `http://localhost:${port}/json/new?${encodeURIComponent(url)}`
      : `http://localhost:${port}/json/new`;

    const target = await CDPClient.httpGet<TargetInfo>(createUrl);

    if (target.webSocketDebuggerUrl === undefined) {
      throw new Error("Created target has no WebSocket debugger URL");
    }

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connectWebSocket();
    return client;
  }

  /**
   * HTTP GET helper.
   */
  private static httpGet<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith("https") ? https : http;
      client.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      }).on("error", reject);
    });
  }

  /**
   * Connect the WebSocket.
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        resolve();
      });

      this.ws.on("message", (data: Buffer) => {
        const message = JSON.parse(data.toString()) as CDPResponse | CDPEvent;

        if ("id" in message) {
          // Response to a command
          const pending = this.pendingCommands.get(message.id);
          if (pending !== undefined) {
            this.pendingCommands.delete(message.id);
            if (message.error !== undefined) {
              pending.reject(new Error(`CDP error: ${message.error.message}`));
            } else {
              pending.resolve(message.result);
            }
          }
        } else if ("method" in message) {
          // Event
          const listeners = this.eventListeners.get(message.method);
          if (listeners !== undefined) {
            listeners.forEach((listener) => {
              listener(message.params ?? {});
            });
          }
        }
      });

      this.ws.on("error", reject);
      this.ws.on("close", () => {
        // Reject all pending commands
        this.pendingCommands.forEach((pending, id) => {
          pending.reject(new Error("WebSocket closed"));
          this.pendingCommands.delete(id);
        });
      });
    });
  }

  /**
   * Send a CDP command.
   */
  async send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (this.ws === null) {
      throw new Error("WebSocket not connected");
    }

    const id = ++this.messageId;
    const message = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.ws!.send(message);
    });
  }

  /**
   * Subscribe to a CDP event.
   */
  on(event: string, listener: (params: Record<string, unknown>) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Unsubscribe from a CDP event.
   */
  off(event: string, listener: (params: Record<string, unknown>) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners !== undefined) {
      listeners.delete(listener);
    }
  }

  /**
   * Enable a CDP domain.
   */
  async enableDomain(domain: string): Promise<void> {
    await this.send(`${domain}.enable`);
  }

  /**
   * Navigate to a URL and wait for load.
   */
  async navigate(url: string): Promise<void> {
    await this.enableDomain("Page");

    const loadPromise = new Promise<void>((resolve) => {
      const handler = (): void => {
        this.off("Page.loadEventFired", handler);
        resolve();
      };
      this.on("Page.loadEventFired", handler);
    });

    await this.send("Page.navigate", { url });
    await loadPromise;

    // Ensure DOM is ready
    await this.enableDomain("DOM");
    const doc = await this.send<{ root: { nodeId: number } }>("DOM.getDocument");
    this.rootNodeId = doc.root.nodeId;
  }

  /**
   * Wait for an element matching the selector.
   */
  async waitForSelector(selector: string, timeout: number = 10000): Promise<number> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.send<{ nodeId: number }>("DOM.querySelector", {
          nodeId: this.rootNodeId,
          selector,
        });

        if (result.nodeId !== 0) {
          return result.nodeId;
        }
      } catch {
        // Element not found yet
      }

      await this.sleep(100);
    }

    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  /**
   * Get element bounds for clicking or screenshots.
   */
  async getElementBounds(nodeId: number): Promise<ElementBounds> {
    const result = await this.send<{ model: { content: number[] } }>(
      "DOM.getBoxModel",
      { nodeId },
    );

    const content = result.model.content;
    return {
      x: content[0],
      y: content[1],
      width: content[2] - content[0],
      height: content[5] - content[1],
    };
  }

  /**
   * Click an element.
   */
  async click(selector: string): Promise<void> {
    const nodeId = await this.waitForSelector(selector);
    const bounds = await this.getElementBounds(nodeId);

    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;

    await this.enableDomain("Input");

    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });

    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }

  /**
   * Type text into the focused element.
   */
  async type(text: string): Promise<void> {
    await this.enableDomain("Input");

    for (const char of text) {
      await this.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        text: char,
      });
      await this.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        text: char,
      });
    }
  }

  /**
   * Get the text content of an element.
   */
  async getTextContent(selector: string): Promise<string> {
    const nodeId = await this.waitForSelector(selector);

    const result = await this.send<{ outerHTML: string }>(
      "DOM.getOuterHTML",
      { nodeId },
    );

    // Extract text content from HTML (simple extraction)
    return result.outerHTML.replace(/<[^>]*>/g, "").trim();
  }

  /**
   * Check if an element exists.
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const result = await this.send<{ nodeId: number }>("DOM.querySelector", {
        nodeId: this.rootNodeId,
        selector,
      });
      return result.nodeId !== 0;
    } catch {
      return false;
    }
  }

  /**
   * Take a screenshot.
   */
  async screenshot(options: ScreenshotOptions = {}): Promise<Buffer> {
    await this.enableDomain("Page");

    const params: Record<string, unknown> = {
      format: options.format ?? "png",
    };

    if (options.quality !== undefined) {
      params.quality = options.quality;
    }

    if (options.fullPage === true) {
      // Get full page dimensions
      const metrics = await this.send<{
        contentSize: { width: number; height: number };
      }>("Page.getLayoutMetrics");

      params.clip = {
        x: 0,
        y: 0,
        width: metrics.contentSize.width,
        height: metrics.contentSize.height,
        scale: 1,
      };
    } else if (options.clip !== undefined) {
      params.clip = { ...options.clip, scale: 1 };
    }

    const result = await this.send<{ data: string }>(
      "Page.captureScreenshot",
      params,
    );

    return Buffer.from(result.data, "base64");
  }

  /**
   * Save a screenshot to a file.
   */
  async saveScreenshot(
    filePath: string,
    options: ScreenshotOptions = {},
  ): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const buffer = await this.screenshot(options);
    await fs.writeFile(filePath, new Uint8Array(buffer));
  }

  /**
   * Evaluate JavaScript in the page context.
   */
  async evaluate<T>(expression: string): Promise<T> {
    await this.enableDomain("Runtime");

    const result = await this.send<{
      result: { value?: T; type: string; description?: string };
      exceptionDetails?: { text: string };
    }>("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });

    if (result.exceptionDetails !== undefined) {
      throw new Error(`Evaluation failed: ${result.exceptionDetails.text}`);
    }

    return result.result.value as T;
  }

  /**
   * Set viewport size.
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  /**
   * Set dark mode preference.
   */
  async setDarkMode(enabled: boolean): Promise<void> {
    await this.send("Emulation.setEmulatedMedia", {
      features: [
        {
          name: "prefers-color-scheme",
          value: enabled ? "dark" : "light",
        },
      ],
    });
  }

  /**
   * Sleep helper.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for a specified time.
   */
  async wait(ms: number): Promise<void> {
    await this.sleep(ms);
  }

  /**
   * Close the connection.
   */
  async close(): Promise<void> {
    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }
  }
}
