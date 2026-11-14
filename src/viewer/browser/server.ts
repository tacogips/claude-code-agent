/**
 * Browser Viewer HTTP server implementation.
 *
 * Provides HTTP server for the browser-based viewer interface with
 * static file serving, REST API, WebSocket support, and auto-open browser.
 *
 * @module viewer/browser/server
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { ClaudeCodeAgent } from "../../sdk";
import { createTaggedLogger } from "../../logger";

const logger = createTaggedLogger("viewer");

/**
 * Get the directory path for this module.
 * Required for resolving the static build directory.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Path to the SvelteKit build output directory.
 */
const BUILD_DIR = resolve(__dirname, "static", "build");

/**
 * Configuration for the ViewerServer.
 */
export interface ViewerConfig {
  /**
   * Port to listen on.
   * @default 3000
   */
  port: number;

  /**
   * Host to bind to.
   * @default "127.0.0.1"
   */
  host: string;

  /**
   * Automatically open browser when server starts.
   * @default true
   */
  openBrowser: boolean;
}

/**
 * Default configuration values for ViewerServer.
 */
export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  port: 3000,
  host: "127.0.0.1",
  openBrowser: true,
};

/**
 * HTTP server for browser-based viewer interface.
 *
 * The ViewerServer class provides the HTTP server infrastructure for
 * the browser viewer with support for static file serving, REST API,
 * and WebSocket real-time updates.
 *
 * @example Basic usage
 * ```typescript
 * const config = {
 *   port: 3000,
 *   host: "127.0.0.1",
 *   openBrowser: true,
 * };
 * const server = new ViewerServer(config, sdk);
 * await server.start();
 * console.log(`Viewer running at: ${server.getUrl()}`);
 * await server.stop();
 * ```
 *
 * @example Custom port without auto-open
 * ```typescript
 * const config = {
 *   port: 8080,
 *   host: "0.0.0.0",
 *   openBrowser: false,
 * };
 * const server = new ViewerServer(config, sdk);
 * await server.start();
 * ```
 */
export class ViewerServer {
  private readonly app: Elysia;
  private readonly config: ViewerConfig;
  private readonly sdk: ClaudeCodeAgent;
  private server: ReturnType<Elysia["listen"]> | null = null;
  private startTime: number | null = null;

  /**
   * Create a new ViewerServer instance.
   *
   * @param config - Server configuration
   * @param sdk - ClaudeCodeAgent SDK instance
   */
  constructor(config: ViewerConfig, sdk: ClaudeCodeAgent) {
    this.config = config;
    this.sdk = sdk;
    this.app = new Elysia();

    // Setup middleware and routes
    // Note: API routes must be set up before static routes
    // because static routes include a catch-all fallback for SPA
    this.setupMiddleware();
    this.setupApiRoutes();
    this.setupWebSocket();
    this.setupStaticRoutes();
  }

  /**
   * Setup middleware for the server.
   *
   * Registers CORS and error handling middleware.
   * @private
   */
  private setupMiddleware(): void {
    // CORS middleware
    this.app.use(
      cors({
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      }),
    );

    // Error handling middleware
    this.app.onError(({ code, error, set }) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error ${code}:`, errorMessage);

      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: "Not Found", message: errorMessage };
      }

      if (code === "VALIDATION") {
        set.status = 400;
        return { error: "Bad Request", message: errorMessage };
      }

      if (code === "PARSE") {
        set.status = 400;
        return { error: "Bad Request", message: "Invalid JSON" };
      }

      // Internal server error
      set.status = 500;
      return { error: "Internal Server Error", message: errorMessage };
    });
  }

  /**
   * Setup static file routes.
   *
   * Configures serving of static assets from the SvelteKit build directory.
   * Uses @elysiajs/static plugin to serve built files with SPA fallback to index.html.
   *
   * @private
   */
  private setupStaticRoutes(): void {
    // Serve static files from the build directory
    this.app.use(
      staticPlugin({
        assets: BUILD_DIR,
        prefix: "/",
        alwaysStatic: true,
      }),
    );

    // SPA fallback: serve index.html for any unmatched routes (client-side routing)
    this.app.get("/*", () => {
      return Bun.file(resolve(BUILD_DIR, "index.html"));
    });
  }

  /**
   * Setup REST API routes.
   *
   * Configures API endpoints for sessions, tasks, projects, and queues.
   * Route implementations are in routes/api.ts.
   *
   * @private
   */
  private setupApiRoutes(): void {
    // Health check endpoint
    this.app.get("/api/health", () => ({
      status: "ok",
      uptime: this.getUptime(),
    }));

    // Import and setup API routes
    const { setupApiRoutes } = require("./routes/api");
    setupApiRoutes(this.app, this.sdk);
  }

  /**
   * Setup WebSocket handler for real-time updates.
   *
   * Configures WebSocket endpoint for real-time session and queue updates.
   * Route implementation is in routes/ws.ts.
   *
   * @private
   */
  private setupWebSocket(): void {
    // Import and setup WebSocket routes
    const { setupWebSocket } = require("./routes/ws");
    setupWebSocket(this.app, this.sdk.events);
  }

  /**
   * Start the HTTP server.
   *
   * Begins listening on the configured host and port, and optionally
   * opens the browser if configured.
   *
   * @throws {Error} If server is already running
   * @throws {Error} If failed to start server
   */
  async start(): Promise<void> {
    if (this.server !== null) {
      throw new Error("Server is already running");
    }

    try {
      // Start listening
      this.server = this.app.listen({
        hostname: this.config.host,
        port: this.config.port,
      });

      this.startTime = Date.now();

      const url = this.getUrl();
      logger.success(`Browser viewer started at ${url}`);

      // Auto-open browser if configured
      if (this.config.openBrowser) {
        await this.openBrowser(url);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start viewer server: ${errorMessage}`);
    }
  }

  /**
   * Stop the HTTP server.
   *
   * Gracefully shuts down the server and cleans up resources.
   *
   * @throws {Error} If server is not running
   */
  async stop(): Promise<void> {
    if (this.server === null) {
      throw new Error("Server is not running");
    }

    try {
      await this.server.stop();
      this.server = null;
      this.startTime = null;

      logger.info("Browser viewer stopped");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop viewer server: ${errorMessage}`);
    }
  }

  /**
   * Get the server URL.
   *
   * @returns Full HTTP URL for the viewer (e.g., "http://127.0.0.1:3000")
   */
  getUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get the SDK instance.
   *
   * Exposed for route handlers that will be implemented in TASK-002 and TASK-003.
   *
   * @returns ClaudeCodeAgent SDK instance
   * @internal
   */
  getSdk(): ClaudeCodeAgent {
    return this.sdk;
  }

  /**
   * Get server uptime in milliseconds.
   *
   * @returns Uptime in milliseconds, or 0 if server is not running
   * @private
   */
  private getUptime(): number {
    if (this.startTime === null) {
      return 0;
    }

    return Date.now() - this.startTime;
  }

  /**
   * Open browser to the viewer URL.
   *
   * Uses platform-specific commands to open the default browser.
   * Falls back gracefully if browser cannot be opened.
   *
   * @param url - URL to open
   * @private
   */
  private async openBrowser(url: string): Promise<void> {
    try {
      // Determine platform-specific command
      const platform = process.platform;
      let command: string;

      switch (platform) {
        case "darwin":
          command = `open "${url}"`;
          break;
        case "win32":
          command = `start "" "${url}"`;
          break;
        default: // linux and others
          command = `xdg-open "${url}"`;
          break;
      }

      // Execute command using Bun's shell
      const proc = Bun.spawn(command.split(" "), {
        stdout: "ignore",
        stderr: "ignore",
      });

      await proc.exited;

      logger.info(`Browser opened at ${url}`);
    } catch (error) {
      // Non-critical failure - just log and continue
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`Could not open browser: ${errorMessage}`);
      logger.info(`Please open manually: ${url}`);
    }
  }
}
