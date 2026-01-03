# Claude Code Configuration Paths

This document describes how to specify custom configuration paths when running Claude Code.

## Overview

Claude Code supports customizing configuration file locations through:
1. Command-line flags for MCP configuration
2. Environment variables for the `.claude` directory

---

## 1. Custom MCP Configuration File Path

### Flag: `--mcp-config`

Allows loading MCP servers from custom JSON files instead of default locations.

### Usage

```bash
# Load from a custom JSON file
claude --mcp-config ./mcp.json

# Load from multiple files (space-separated)
claude --mcp-config ./mcp.json ./additional-mcp.json

# In non-interactive mode (print mode)
claude -p --mcp-config ./mcp.json "Your query"
```

### Strict Mode: `--strict-mcp-config`

When combined with `--mcp-config`, ignores ALL other MCP configurations:
- Project-scoped `.mcp.json`
- User-scoped `~/.claude.json`
- Managed MCP configurations

```bash
# Use ONLY the specified MCP config
claude --strict-mcp-config --mcp-config ./mcp.json "Your query"
```

---

## 2. Custom .claude Directory Path

### Environment Variable: `CLAUDE_CONFIG_DIR`

Customizes where Claude Code stores its configuration and data files.

### Usage

```bash
# Set custom config directory before running
export CLAUDE_CONFIG_DIR=/custom/path/to/config
claude

# Or inline
CLAUDE_CONFIG_DIR=/custom/path/to/config claude

# In non-interactive mode
CLAUDE_CONFIG_DIR=/custom/path/to/config claude -p "Your query"
```

### Affected Paths

| Default Location | With CLAUDE_CONFIG_DIR |
|---|---|
| `~/.claude/settings.json` | `$CLAUDE_CONFIG_DIR/settings.json` |
| `~/.claude/agents/` | `$CLAUDE_CONFIG_DIR/agents/` |
| `~/.claude/projects/` | `$CLAUDE_CONFIG_DIR/projects/` |
| `~/.claude.json` | `$CLAUDE_CONFIG_DIR/.claude.json` |

### Important Notes

- Must be set **before** starting Claude Code to take effect
- Project-scoped `.mcp.json` at project root is NOT affected by this variable
- Subagents, session files, and cache are all relocated

---

## 3. Summary Table

| Configuration | Method | Flag/Env Var | Description |
|---|---|---|---|
| Custom MCP config file | CLI flag | `--mcp-config ./path/to/mcp.json` | Load MCP servers from custom location |
| Strict MCP mode | CLI flag | `--strict-mcp-config` | Ignore all other MCP configs |
| Custom .claude directory | Env var | `CLAUDE_CONFIG_DIR=/custom/path` | Relocate entire config/data directory |

---

## 4. Enterprise/Managed MCP Configuration

For enterprise deployments, managed MCP configuration can be deployed to system directories:

| Platform | Path |
|---|---|
| macOS | `/Library/Application Support/ClaudeCode/managed-mcp.json` |
| Linux/WSL | `/etc/claude-code/managed-mcp.json` |
| Windows | `C:\Program Files\ClaudeCode\managed-mcp.json` |

---

## 5. Use Cases

### Isolated Development Environment

```bash
# Run Claude Code with completely isolated configuration
CLAUDE_CONFIG_DIR=./project-config \
  claude --strict-mcp-config --mcp-config ./project-mcp.json
```

### CI/CD Pipeline

```bash
# Use specific MCP servers for automated tasks
claude -p --strict-mcp-config --mcp-config ./ci-mcp.json "Run tests"
```

### Multiple Project Profiles

```bash
# Project A configuration
CLAUDE_CONFIG_DIR=~/.claude-project-a claude

# Project B configuration
CLAUDE_CONFIG_DIR=~/.claude-project-b claude
```

---

## References

See `design-docs/references/README.md` for external references.

Source documentation:
- Claude Code CLI Reference: https://code.claude.com/docs/en/cli-reference.md
- Claude Code MCP Documentation: https://code.claude.com/docs/en/mcp.md
- Claude Code Settings Documentation: https://code.claude.com/docs/en/settings.md
