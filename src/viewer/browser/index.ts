/**
 * Browser Viewer module exports.
 *
 * This module provides the HTTP server infrastructure for the browser-based
 * viewer interface, including server lifecycle, configuration, and routing.
 *
 * @module viewer/browser
 */

export { ViewerServer, DEFAULT_VIEWER_CONFIG } from "./server";
export type { ViewerConfig } from "./server";
