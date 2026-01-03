# Client Design

This document describes client-side design specifications.

## Overview

Client design decisions, patterns, and implementation details.

---

## Sections

### TUI and Browser Viewer

Session and task viewer with dual interface support.

See: `design-tui-browser-viewer.md` for detailed design.

**Key Features**:
- TUI mode for terminal-based viewing (default)
- Browser mode via `--browser` flag
- HTTP server with configurable port (`--port` or `CLAUDE_VIEWER_PORT` env)

---
