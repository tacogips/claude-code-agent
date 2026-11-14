/**
 * Viewer module exports.
 *
 * This module provides viewer implementations including the browser-based
 * HTTP server interface for session monitoring and visualization.
 *
 * @module viewer
 */

export { ViewerServer, DEFAULT_VIEWER_CONFIG } from "./browser";
export type { ViewerConfig } from "./browser";
