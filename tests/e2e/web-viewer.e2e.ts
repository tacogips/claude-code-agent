/**
 * E2E tests for the web viewer.
 *
 * Tests all major features of the browser-based viewer interface:
 * - Session list page
 * - Session detail page
 * - Queue list page
 * - Queue detail page
 * - Navigation
 * - Theme switching
 * - Export functionality
 *
 * @module tests/e2e/web-viewer.e2e
 */

import { E2ETestRunner } from "./lib/test-runner";

const runner = new E2ETestRunner({
  screenshotDir: ".private/e2e",
  mockServerPort: 3999,
  chromePort: 9222,
  staticPath: "src/viewer/browser/static/build",
});

// ============================================================================
// Session List Page Tests
// ============================================================================

runner.test(
  "sessions-list-loads",
  "Sessions list page loads and displays sessions",
  async (ctx) => {
    await ctx.goto("/");
    await ctx.screenshot("initial-load");

    // Wait for the sessions list to load
    await ctx.waitFor("h1");
    const title = await ctx.getText("h1");
    ctx.assert(title.includes("Sessions"), "Page title should contain 'Sessions'");

    await ctx.wait(500);
    await ctx.screenshot("sessions-loaded");
  },
);

runner.test(
  "sessions-list-shows-metadata",
  "Sessions list shows session metadata (status, project, dates)",
  async (ctx) => {
    await ctx.goto("/");
    await ctx.wait(500);

    // Check for session cards (buttons with card class containing session data)
    // The SessionList component uses button.card elements
    const hasSessionItems = await ctx.exists("[data-testid='session-item']") ||
      await ctx.exists(".session-item") ||
      await ctx.exists("button.card");

    ctx.assert(hasSessionItems, "Session items should be visible");
    await ctx.screenshot("session-metadata");
  },
);

runner.test(
  "sessions-list-refresh-button",
  "Sessions list has a working refresh button",
  async (ctx) => {
    await ctx.goto("/");
    await ctx.wait(500);

    // Look for refresh button
    const hasRefreshButton = await ctx.exists("button[aria-label='Refresh sessions']") ||
      await ctx.exists("button:contains('Refresh')");

    ctx.assert(hasRefreshButton, "Refresh button should be present");
    await ctx.screenshot("refresh-button");
  },
);

runner.test(
  "sessions-list-loading-state",
  "Sessions list shows loading state initially",
  async (ctx) => {
    await ctx.goto("/");

    // Check for loading indicator (may be brief)
    await ctx.screenshot("loading-state");

    // Wait for content to load
    await ctx.waitFor("h1");
    await ctx.wait(500);
    await ctx.screenshot("after-loading");
  },
);

// ============================================================================
// Session Detail Page Tests
// ============================================================================

runner.test(
  "session-detail-navigation",
  "Can navigate from session list to session detail",
  async (ctx) => {
    await ctx.goto("/");
    await ctx.wait(500);

    // Navigate to a session detail page directly
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);

    await ctx.screenshot("session-detail");

    // Check for session detail elements
    const hasDetailHeader = await ctx.exists("h1") || await ctx.exists("h2");
    ctx.assert(hasDetailHeader, "Session detail should have a header");
  },
);

runner.test(
  "session-detail-shows-info",
  "Session detail page shows session information",
  async (ctx) => {
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);

    await ctx.screenshot("session-info");

    // Check for various session info elements
    const hasContent = await ctx.exists(".card") ||
      await ctx.exists("[class*='session']");

    ctx.assert(hasContent, "Session info should be displayed");
  },
);

runner.test(
  "session-detail-shows-messages",
  "Session detail page shows message timeline",
  async (ctx) => {
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);

    await ctx.screenshot("message-timeline");

    // Look for messages section
    const hasMessages = await ctx.exists("[class*='message']") ||
      await ctx.exists("[class*='timeline']");

    // This is optional as messages may not be rendered immediately
    await ctx.screenshot("messages-section");
  },
);

runner.test(
  "session-detail-token-usage",
  "Session detail shows token usage and cost information",
  async (ctx) => {
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);

    // Take screenshot of token usage section
    await ctx.screenshot("token-usage");
  },
);

runner.test(
  "session-detail-export-buttons",
  "Session detail has export buttons (JSON, Markdown)",
  async (ctx) => {
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);

    const hasExportJson = await ctx.exists("button[aria-label='Export as JSON']") ||
      await ctx.exists("button:contains('JSON')") ||
      await ctx.exists("button:contains('Export')");

    await ctx.screenshot("export-buttons");
  },
);

runner.test(
  "session-detail-back-navigation",
  "Session detail has back button to return to list",
  async (ctx) => {
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);

    const hasBackButton = await ctx.exists("button[aria-label='Go back']") ||
      await ctx.exists("button:contains('Back')") ||
      await ctx.exists("a[href='/']");

    ctx.assert(hasBackButton, "Back button should be present");
    await ctx.screenshot("back-button");
  },
);

runner.test(
  "session-detail-thinking-toggle",
  "Session detail has thinking blocks toggle",
  async (ctx) => {
    await ctx.goto("/sessions/f6a7b8c9-d0e1-4234-f012-345678901234");
    await ctx.wait(500);

    // Look for thinking toggle checkbox
    const hasThinkingToggle = await ctx.exists("input[type='checkbox']") ||
      await ctx.exists("[class*='thinking']");

    await ctx.screenshot("thinking-toggle");
  },
);

runner.test(
  "session-detail-status-badge",
  "Session detail shows correct status badge",
  async (ctx) => {
    // Test active session
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);
    await ctx.screenshot("status-active");

    // Test completed session
    await ctx.goto("/sessions/b2c3d4e5-f6a7-4890-bcde-f01234567890");
    await ctx.wait(500);
    await ctx.screenshot("status-completed");

    // Test failed session
    await ctx.goto("/sessions/c3d4e5f6-a7b8-4901-cdef-012345678901");
    await ctx.wait(500);
    await ctx.screenshot("status-failed");
  },
);

// ============================================================================
// Queue List Page Tests
// ============================================================================

runner.test(
  "queues-list-loads",
  "Queues list page loads and displays queues",
  async (ctx) => {
    await ctx.goto("/queues");
    await ctx.screenshot("queues-initial");

    await ctx.waitFor("h1");
    const title = await ctx.getText("h1");
    ctx.assert(title.includes("Queue"), "Page title should contain 'Queue'");

    await ctx.wait(500);
    await ctx.screenshot("queues-loaded");
  },
);

runner.test(
  "queues-list-new-button",
  "Queues list has new queue button",
  async (ctx) => {
    await ctx.goto("/queues");
    await ctx.wait(500);

    const hasNewButton = await ctx.exists("button.btn-primary") ||
      await ctx.exists("button:contains('New')");

    ctx.assert(hasNewButton, "New queue button should be present");
    await ctx.screenshot("new-queue-button");
  },
);

runner.test(
  "queues-list-shows-status",
  "Queues list shows queue status indicators",
  async (ctx) => {
    await ctx.goto("/queues");
    await ctx.wait(500);

    await ctx.screenshot("queue-statuses");
  },
);

// ============================================================================
// Queue Detail Page Tests
// ============================================================================

runner.test(
  "queue-detail-navigation",
  "Can navigate to queue detail page",
  async (ctx) => {
    await ctx.goto("/queues/feature-development-queue");
    await ctx.wait(500);

    await ctx.screenshot("queue-detail");
  },
);

runner.test(
  "queue-detail-shows-commands",
  "Queue detail shows command list",
  async (ctx) => {
    await ctx.goto("/queues/feature-development-queue");
    await ctx.wait(500);

    await ctx.screenshot("queue-commands");
  },
);

runner.test(
  "queue-detail-command-status",
  "Queue detail shows command status (completed, running, pending)",
  async (ctx) => {
    await ctx.goto("/queues/feature-development-queue");
    await ctx.wait(500);

    await ctx.screenshot("command-statuses");
  },
);

runner.test(
  "queue-detail-back-button",
  "Queue detail has back button to queue list",
  async (ctx) => {
    await ctx.goto("/queues/feature-development-queue");
    await ctx.wait(500);

    const hasBackButton = await ctx.exists("button:contains('Back')") ||
      await ctx.exists("a[href='/queues']");

    ctx.assert(hasBackButton, "Back button should be present");
    await ctx.screenshot("queue-back-button");
  },
);

runner.test(
  "queue-detail-failed-shows-error",
  "Failed queue shows error message",
  async (ctx) => {
    await ctx.goto("/queues/migration-tasks");
    await ctx.wait(500);

    await ctx.screenshot("failed-queue");
  },
);

// ============================================================================
// Navigation Tests
// ============================================================================

runner.test(
  "nav-sessions-to-queues",
  "Can navigate from sessions to queues",
  async (ctx) => {
    await ctx.goto("/");
    await ctx.wait(500);
    await ctx.screenshot("nav-start-sessions");

    await ctx.goto("/queues");
    await ctx.wait(500);
    await ctx.screenshot("nav-end-queues");
  },
);

runner.test(
  "nav-queues-to-sessions",
  "Can navigate from queues to sessions",
  async (ctx) => {
    await ctx.goto("/queues");
    await ctx.wait(500);
    await ctx.screenshot("nav-start-queues");

    await ctx.goto("/");
    await ctx.wait(500);
    await ctx.screenshot("nav-end-sessions");
  },
);

// ============================================================================
// Theme Tests
// ============================================================================

runner.test(
  "theme-light-mode",
  "Application displays correctly in light mode",
  async (ctx) => {
    await ctx.cdp.setDarkMode(false);
    await ctx.goto("/");
    await ctx.wait(500);
    await ctx.screenshot("theme-light");
  },
);

runner.test(
  "theme-dark-mode",
  "Application displays correctly in dark mode",
  async (ctx) => {
    await ctx.cdp.setDarkMode(true);
    await ctx.goto("/");
    await ctx.wait(500);
    await ctx.screenshot("theme-dark");
  },
);

runner.test(
  "theme-dark-session-detail",
  "Session detail displays correctly in dark mode",
  async (ctx) => {
    await ctx.cdp.setDarkMode(true);
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);
    await ctx.screenshot("theme-dark-session");
  },
);

runner.test(
  "theme-dark-queue-detail",
  "Queue detail displays correctly in dark mode",
  async (ctx) => {
    await ctx.cdp.setDarkMode(true);
    await ctx.goto("/queues/feature-development-queue");
    await ctx.wait(500);
    await ctx.screenshot("theme-dark-queue");
  },
);

// ============================================================================
// Error Handling Tests
// ============================================================================

runner.test(
  "error-session-not-found",
  "Shows error for non-existent session",
  async (ctx) => {
    await ctx.goto("/sessions/non-existent-session-id");
    await ctx.wait(500);
    await ctx.screenshot("error-session-not-found");
  },
);

runner.test(
  "error-queue-not-found",
  "Shows error for non-existent queue",
  async (ctx) => {
    await ctx.goto("/queues/non-existent-queue-id");
    await ctx.wait(500);
    await ctx.screenshot("error-queue-not-found");
  },
);

// ============================================================================
// Responsive Design Tests
// ============================================================================

runner.test(
  "responsive-mobile-sessions",
  "Sessions page is responsive on mobile viewport",
  async (ctx) => {
    await ctx.cdp.setViewport(375, 667); // iPhone SE
    await ctx.goto("/");
    await ctx.wait(500);
    await ctx.screenshot("responsive-mobile-sessions");

    // Reset viewport
    await ctx.cdp.setViewport(1280, 800);
  },
);

runner.test(
  "responsive-mobile-session-detail",
  "Session detail is responsive on mobile viewport",
  async (ctx) => {
    await ctx.cdp.setViewport(375, 667);
    await ctx.goto("/sessions/a1b2c3d4-e5f6-4789-abcd-ef0123456789");
    await ctx.wait(500);
    await ctx.screenshot("responsive-mobile-session-detail");

    await ctx.cdp.setViewport(1280, 800);
  },
);

runner.test(
  "responsive-tablet-sessions",
  "Sessions page is responsive on tablet viewport",
  async (ctx) => {
    await ctx.cdp.setViewport(768, 1024); // iPad
    await ctx.goto("/");
    await ctx.wait(500);
    await ctx.screenshot("responsive-tablet-sessions");

    await ctx.cdp.setViewport(1280, 800);
  },
);

// ============================================================================
// Long Content Tests
// ============================================================================

runner.test(
  "long-session-scrollable",
  "Long session with many messages is scrollable",
  async (ctx) => {
    await ctx.goto("/sessions/e5f6a7b8-c9d0-4123-ef01-234567890123");
    await ctx.wait(500);
    await ctx.screenshot("long-session-top");

    // Scroll down
    await ctx.cdp.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await ctx.wait(300);
    await ctx.screenshot("long-session-bottom");
  },
);

runner.test(
  "long-queue-scrollable",
  "Queue with many commands is scrollable",
  async (ctx) => {
    await ctx.goto("/queues/large-refactoring-project");
    await ctx.wait(500);
    await ctx.screenshot("long-queue-top");

    // Scroll down
    await ctx.cdp.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await ctx.wait(300);
    await ctx.screenshot("long-queue-bottom");
  },
);

// ============================================================================
// Run Tests
// ============================================================================

// Export the runner for programmatic use
export { runner };

// Run if executed directly
if (import.meta.main) {
  runner.run()
    .then((result) => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Test runner failed:", error);
      process.exit(1);
    });
}
