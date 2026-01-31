/**
 * Main HTTP daemon server implementation.
 *
 * Provides the core HTTP server infrastructure for remote execution
 * capabilities, including server lifecycle, TLS configuration,
 * middleware setup, and route registration framework.
 *
 * @module daemon/server
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import type { Container } from "../container";
import type { DaemonConfig, DaemonStatus } from "./types";
import {
  TokenManager,
  authMiddleware,
  AuthError,
  type AuthenticatedApp,
} from "./auth";
import { ClaudeCodeAgent } from "../sdk";
import {
  sessionRoutes,
  groupRoutes,
  queueRoutes,
  bookmarkRoutes,
  activityRoutes,
} from "./routes";

/**
 * HTTP daemon server with REST API.
 *
 * The DaemonServer class provides the core HTTP server infrastructure
 * with support for TLS, authentication, and extensible route registration.
 *
 * @example Basic usage
 * ```typescript
 * const server = new DaemonServer(config, container);
 * await server.start();
 * console.log(server.getStatus());
 * await server.stop();
 * ```
 *
 * @example With TLS
 * ```typescript
 * const config: DaemonConfig = {
 *   host: "0.0.0.0",
 *   port: 8443,
 *   authTokenFile: "~/.config/tokens.json",
 *   tlsCert: "/path/to/cert.pem",
 *   tlsKey: "/path/to/key.pem",
 *   withViewer: false,
 * };
 * const server = new DaemonServer(config, container);
 * await server.start();
 * ```
 */
export class DaemonServer {
  private readonly app: Elysia;
  private readonly config: DaemonConfig;
  private readonly container: Container;
  private readonly tokenManager: TokenManager;
  private sdk: ClaudeCodeAgent | null = null;
  private server: ReturnType<Elysia["listen"]> | null = null;
  private startTime: number | null = null;
  private connectionCount: number = 0;

  /**
   * Create a new DaemonServer instance.
   *
   * @param config - Server configuration
   * @param container - Dependency injection container
   */
  constructor(config: DaemonConfig, container: Container) {
    this.config = config;
    this.container = container;
    this.tokenManager = new TokenManager(container, config.authTokenFile);
    this.app = new Elysia();

    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware for the server.
   *
   * Registers CORS, authentication, and other middleware.
   * @private
   */
  private setupMiddleware(): void {
    // CORS middleware
    this.app.use(
      cors({
        origin: true, // Allow all origins (can be restricted in production)
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      }),
    );

    // Connection tracking middleware
    this.app.onRequest(() => {
      this.connectionCount++;
    });

    this.app.onAfterResponse(() => {
      this.connectionCount = Math.max(0, this.connectionCount - 1);
    });

    // Error handling middleware
    this.app.onError(({ code, error, set }) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[DaemonServer] Error ${code}:`, errorMessage);

      // Handle authentication errors
      if (error instanceof AuthError) {
        set.status = error.statusCode;
        return { error: "Unauthorized", message: errorMessage };
      }

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
   * Setup routes for the server.
   *
   * Registers all API routes and health check endpoints.
   * Routes requiring authentication use the authMiddleware.
   *
   * @private
   */
  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get("/health", () => ({
      status: "ok",
      uptime: this.getUptime(),
      connections: this.connectionCount,
    }));

    // Status endpoint (no auth required)
    this.app.get("/status", () => this.getStatus());

    // Browser viewer routes (if enabled)
    if (this.config.withViewer) {
      this.app.get("/", () => ({
        message: "Browser viewer not implemented yet",
      }));
    }
  }

  /**
   * Setup API routes after SDK initialization.
   *
   * This is called from start() after SDK is initialized.
   *
   * @private
   */
  private setupApiRoutes(): void {
    if (this.sdk === null) {
      throw new Error("Cannot setup API routes: SDK not initialized");
    }

    // API routes with authentication
    // Use derive to attach validated token to context
    // authMiddleware returns { token: ApiToken } or throws AuthError
    // Type assertion needed due to Elysia's complex type inference
    const authenticatedApp = this.app.derive(
      authMiddleware(this.tokenManager),
    ) as unknown as AuthenticatedApp;

    // Register API routes with authentication
    // Session routes
    sessionRoutes(authenticatedApp, this.sdk, this.tokenManager);

    // Group routes
    groupRoutes(authenticatedApp, this.sdk, this.tokenManager);

    // Queue routes
    queueRoutes(authenticatedApp, this.sdk, this.tokenManager);

    // Bookmark routes
    bookmarkRoutes(authenticatedApp, this.sdk, this.tokenManager);

    // Activity routes
    activityRoutes(authenticatedApp, this.sdk.activity, this.tokenManager);
  }

  /**
   * Start the HTTP server.
   *
   * Initializes the token manager, configures TLS if provided,
   * and begins listening on the configured host and port.
   *
   * @throws {Error} If server is already running
   * @throws {Error} If TLS configuration is incomplete
   * @throws {Error} If failed to start server
   */
  async start(): Promise<void> {
    if (this.server !== null) {
      throw new Error("Server is already running");
    }

    // Initialize SDK
    this.sdk = await ClaudeCodeAgent.create(this.container);

    // Initialize token manager
    await this.tokenManager.initialize();

    // Setup API routes (after SDK initialization)
    this.setupApiRoutes();

    // Validate TLS configuration
    const hasTlsCert = this.config.tlsCert !== undefined;
    const hasTlsKey = this.config.tlsKey !== undefined;

    if (hasTlsCert !== hasTlsKey) {
      throw new Error(
        "Both tlsCert and tlsKey must be provided for TLS configuration",
      );
    }

    try {
      // Configure TLS if provided
      const listenOptions: {
        hostname: string;
        port: number;
        tls?: { cert: string; key: string };
      } = {
        hostname: this.config.host,
        port: this.config.port,
      };

      if (
        hasTlsCert &&
        hasTlsKey &&
        this.config.tlsCert &&
        this.config.tlsKey
      ) {
        // Read TLS files
        const certContent = await this.container.fileSystem.readFile(
          this.config.tlsCert,
        );
        const keyContent = await this.container.fileSystem.readFile(
          this.config.tlsKey,
        );

        listenOptions.tls = {
          cert: certContent,
          key: keyContent,
        };
      }

      // Start listening
      this.server = this.app.listen(listenOptions);
      this.startTime = this.container.clock.now().getTime();

      const protocol = listenOptions.tls ? "https" : "http";
      console.log(
        `[DaemonServer] Server started at ${protocol}://${this.config.host}:${this.config.port}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start server: ${errorMessage}`);
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
      this.sdk = null;
      this.startTime = null;
      this.connectionCount = 0;

      console.log("[DaemonServer] Server stopped");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop server: ${errorMessage}`);
    }
  }

  /**
   * Get current server status.
   *
   * Returns information about the server's current state including
   * running status, host, port, uptime, and active connections.
   *
   * @returns Current daemon status
   */
  getStatus(): DaemonStatus {
    return {
      running: this.server !== null,
      host: this.config.host,
      port: this.config.port,
      uptime: this.getUptime(),
      connections: this.connectionCount,
    };
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

    return this.container.clock.now().getTime() - this.startTime;
  }

  /**
   * Get the TokenManager instance.
   *
   * Exposed for testing and CLI token management commands.
   *
   * @returns TokenManager instance
   * @internal
   */
  getTokenManager(): TokenManager {
    return this.tokenManager;
  }
}
