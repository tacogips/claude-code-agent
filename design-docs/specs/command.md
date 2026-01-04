# Command Design

This document describes CLI command interface design specifications.

## Overview

Command-line interface design decisions, including subcommands, flags, options, and environment variables.

---

## Sections

### Subcommands

Define the CLI subcommand structure and hierarchy.

### Flags and Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (Add flags here) | | | |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| (Add env vars here) | | | |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| (Add more exit codes as needed) | |

---

## TUI and Browser Viewer

Session and task viewer with dual interface support.

See: `design-tui-browser-viewer.md` for detailed design.

**Key Features**:
- TUI mode for terminal-based viewing (default)
- Browser mode via `--browser` flag
- HTTP server with configurable port (`--port` or `CLAUDE_VIEWER_PORT` env)

---
