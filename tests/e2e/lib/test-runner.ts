/**
 * E2E test runner for browser viewer.
 *
 * Provides a test harness that manages browser lifecycle,
 * mock server, and test execution with screenshot capture.
 *
 * @module tests/e2e/lib/test-runner
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { CDPClient } from "./cdp-client";
import { createMockServer, type MockServerInstance } from "./mock-server";

/**
 * Test result status.
 */
export type TestStatus = "passed" | "failed" | "skipped";

/**
 * Individual test result.
 */
export interface TestResult {
  readonly id: string;
  readonly name: string;
  readonly status: TestStatus;
  readonly duration: number;
  readonly error?: string;
  readonly screenshots: readonly string[];
}

/**
 * Test suite result.
 */
export interface TestSuiteResult {
  readonly name: string;
  readonly tests: readonly TestResult[];
  readonly duration: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}

/**
 * Test context provided to test functions.
 */
export interface TestContext {
  /** CDP client for browser automation */
  readonly cdp: CDPClient;
  /** Base URL of the mock server */
  readonly baseUrl: string;
  /** Test ID for organizing screenshots */
  readonly testId: string;
  /** Take and save a screenshot */
  screenshot(name: string): Promise<string>;
  /** Navigate to a path (relative to baseUrl) */
  goto(path: string): Promise<void>;
  /** Wait for an element */
  waitFor(selector: string, timeout?: number): Promise<void>;
  /** Click an element */
  click(selector: string): Promise<void>;
  /** Type text */
  type(text: string): Promise<void>;
  /** Get text content */
  getText(selector: string): Promise<string>;
  /** Check if element exists */
  exists(selector: string): Promise<boolean>;
  /** Wait for specified milliseconds */
  wait(ms: number): Promise<void>;
  /** Assert condition is true */
  assert(condition: boolean, message: string): void;
  /** Assert elements match expected count */
  assertCount(selector: string, count: number): Promise<void>;
}

/**
 * Test function type.
 */
export type TestFn = (ctx: TestContext) => Promise<void>;

/**
 * Test definition.
 */
interface TestDefinition {
  readonly id: string;
  readonly name: string;
  readonly fn: TestFn;
  readonly skip?: boolean;
}

/**
 * E2E test runner.
 */
export class E2ETestRunner {
  private readonly tests: TestDefinition[] = [];
  private mockServer: MockServerInstance | null = null;
  private chromeProcess: ChildProcess | null = null;
  private cdp: CDPClient | null = null;

  private readonly screenshotDir: string;
  private readonly mockServerPort: number;
  private readonly chromePort: number;
  private readonly staticPath: string;
  private readonly browserPreference: "brave" | "chrome" | "auto";

  constructor(options?: {
    screenshotDir?: string;
    mockServerPort?: number;
    chromePort?: number;
    staticPath?: string;
    /** Browser preference: "brave", "chrome", or "auto" (default: "auto") */
    browser?: "brave" | "chrome" | "auto";
  }) {
    this.screenshotDir = options?.screenshotDir ?? ".private/e2e";
    this.mockServerPort = options?.mockServerPort ?? 3999;
    this.chromePort = options?.chromePort ?? 9222;
    this.staticPath = options?.staticPath ?? "src/viewer/browser/static/build";
    // Check E2E_BROWSER environment variable, then options, then default to "auto"
    this.browserPreference = (process.env.E2E_BROWSER as "brave" | "chrome" | "auto") ??
      options?.browser ?? "auto";
  }

  /**
   * Register a test.
   */
  test(id: string, name: string, fn: TestFn): void {
    this.tests.push({ id, name, fn });
  }

  /**
   * Register a skipped test.
   */
  skip(id: string, name: string, fn: TestFn): void {
    this.tests.push({ id, name, fn, skip: true });
  }

  /**
   * Start Chrome/Brave with remote debugging enabled.
   */
  private async startChrome(): Promise<void> {
    const bravePaths = [
      "/usr/bin/brave",
      "/usr/bin/brave-browser",
      "/usr/bin/brave-browser-stable",
      "/opt/brave.com/brave/brave-browser",
      "/snap/bin/brave",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "brave",
      "brave-browser",
    ];

    const chromePaths = [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "chromium",
      "google-chrome",
    ];

    // Build search paths based on preference
    let searchPaths: string[];
    if (this.browserPreference === "brave") {
      searchPaths = bravePaths;
    } else if (this.browserPreference === "chrome") {
      searchPaths = chromePaths;
    } else {
      // "auto" - try Brave first, then Chrome
      searchPaths = [...bravePaths, ...chromePaths];
    }

    let browserPath: string | null = null;
    for (const p of searchPaths) {
      try {
        await fs.access(p);
        browserPath = p;
        break;
      } catch {
        // Try next path
      }
    }

    if (browserPath === null) {
      // Try to find via which
      const whichCommands = this.browserPreference === "brave"
        ? ["brave", "brave-browser"]
        : this.browserPreference === "chrome"
          ? ["chromium", "google-chrome"]
          : ["brave", "brave-browser", "chromium", "google-chrome"];

      try {
        const result = await new Promise<string>((resolve, reject) => {
          const proc = spawn("which", whichCommands);
          let output = "";
          proc.stdout.on("data", (data) => { output += data.toString(); });
          proc.on("close", (code) => {
            if (code === 0 && output.trim()) {
              resolve(output.trim().split("\n")[0]);
            } else {
              reject(new Error("Browser not found"));
            }
          });
        });
        browserPath = result;
      } catch {
        const browserName = this.browserPreference === "auto"
          ? "Brave/Chrome/Chromium"
          : this.browserPreference === "brave" ? "Brave" : "Chrome/Chromium";
        throw new Error(`${browserName} not found. Please install the browser.`);
      }
    }

    console.log(`Using browser: ${browserPath}`);
    this.chromeProcess = spawn(browserPath, [
      `--remote-debugging-port=${this.chromePort}`,
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,800",
      "about:blank",
    ], {
      stdio: "ignore",
      detached: false,
    });

    // Wait for Chrome to be ready
    await this.waitForChrome();
  }

  /**
   * Wait for Chrome to be ready.
   */
  private async waitForChrome(timeout: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        this.cdp = await CDPClient.connectToPage(this.chromePort);
        return;
      } catch {
        await this.sleep(200);
      }
    }

    throw new Error("Timeout waiting for Chrome to start");
  }

  /**
   * Run all tests.
   */
  async run(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    console.log("\n=== E2E Test Suite ===\n");

    try {
      // Ensure screenshot directory exists
      await fs.mkdir(this.screenshotDir, { recursive: true });

      // Start mock server
      console.log("Starting mock server...");
      this.mockServer = await createMockServer({
        port: this.mockServerPort,
        staticPath: this.staticPath,
      });
      console.log(`Mock server running at ${this.mockServer.url}`);

      // Start Chrome
      console.log("Starting Chrome...");
      await this.startChrome();
      console.log("Chrome ready");

      // Set viewport
      await this.cdp!.setViewport(1280, 800);

      // Run each test
      for (const test of this.tests) {
        const result = await this.runTest(test);
        results.push(result);

        const statusSymbol = result.status === "passed" ? "[PASS]" :
          result.status === "failed" ? "[FAIL]" : "[SKIP]";
        console.log(`${statusSymbol} ${test.name} (${result.duration}ms)`);

        if (result.error !== undefined) {
          console.log(`  Error: ${result.error}`);
        }
      }
    } finally {
      // Cleanup
      if (this.cdp !== null) {
        await this.cdp.close();
        this.cdp = null;
      }

      if (this.chromeProcess !== null) {
        this.chromeProcess.kill();
        this.chromeProcess = null;
      }

      if (this.mockServer !== null) {
        await this.mockServer.stop();
        this.mockServer = null;
      }
    }

    const duration = Date.now() - startTime;
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    console.log("\n=== Summary ===");
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
    console.log(`Duration: ${duration}ms`);
    console.log("");

    return {
      name: "E2E Test Suite",
      tests: results,
      duration,
      passed,
      failed,
      skipped,
    };
  }

  /**
   * Run a single test.
   */
  private async runTest(test: TestDefinition): Promise<TestResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];

    if (test.skip === true) {
      return {
        id: test.id,
        name: test.name,
        status: "skipped",
        duration: 0,
        screenshots: [],
      };
    }

    // Create test-specific screenshot directory
    const testScreenshotDir = path.join(this.screenshotDir, test.id);
    await fs.mkdir(testScreenshotDir, { recursive: true });

    // Extract references for closure access
    const cdpClient = this.cdp!;
    const baseUrl = this.mockServer!.url;

    const ctx: TestContext = {
      cdp: cdpClient,
      baseUrl,
      testId: test.id,

      async screenshot(name: string): Promise<string> {
        const filename = `${name.replace(/[^a-zA-Z0-9-_]/g, "_")}.png`;
        const filepath = path.join(testScreenshotDir, filename);
        await cdpClient.saveScreenshot(filepath);
        screenshots.push(filepath);
        return filepath;
      },

      async goto(urlPath: string): Promise<void> {
        const url = `${baseUrl}${urlPath}`;
        await cdpClient.navigate(url);
      },

      async waitFor(selector: string, timeout?: number): Promise<void> {
        await cdpClient.waitForSelector(selector, timeout);
      },

      async click(selector: string): Promise<void> {
        await cdpClient.click(selector);
      },

      async type(text: string): Promise<void> {
        await cdpClient.type(text);
      },

      async getText(selector: string): Promise<string> {
        return cdpClient.getTextContent(selector);
      },

      async exists(selector: string): Promise<boolean> {
        return cdpClient.elementExists(selector);
      },

      async wait(ms: number): Promise<void> {
        await cdpClient.wait(ms);
      },

      assert(condition: boolean, message: string): void {
        if (!condition) {
          throw new Error(`Assertion failed: ${message}`);
        }
      },

      async assertCount(selector: string, expectedCount: number): Promise<void> {
        const count = await cdpClient.evaluate<number>(
          `document.querySelectorAll('${selector}').length`,
        );
        if (count !== expectedCount) {
          throw new Error(`Expected ${expectedCount} elements matching "${selector}", found ${count}`);
        }
      },
    };

    try {
      await test.fn(ctx);

      // Take final screenshot on success
      const finalPath = path.join(testScreenshotDir, "final.png");
      await this.cdp!.saveScreenshot(finalPath);
      screenshots.push(finalPath);

      return {
        id: test.id,
        name: test.name,
        status: "passed",
        duration: Date.now() - startTime,
        screenshots,
      };
    } catch (error) {
      // Take screenshot on failure
      const errorPath = path.join(testScreenshotDir, "error.png");
      try {
        await this.cdp!.saveScreenshot(errorPath);
        screenshots.push(errorPath);
      } catch {
        // Ignore screenshot errors
      }

      return {
        id: test.id,
        name: test.name,
        status: "failed",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        screenshots,
      };
    }
  }

  /**
   * Sleep helper.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
