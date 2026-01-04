# Design Notes

This document contains miscellaneous design notes and notable items.

## Overview

Other design considerations, investigation results, and notable findings.

---

## Claude Code Configuration

### Configuration Paths

See: `design-claude-code-config-paths.md` for custom configuration path options.

Summary:
- `--mcp-config` flag: Load MCP servers from custom JSON files
- `--strict-mcp-config` flag: Ignore all other MCP configurations
- `CLAUDE_CONFIG_DIR` env var: Custom .claude directory location

### claude.json Path Customization (Research Result)

**Question**: Can `~/.claude.json` be specified to a different file path (similar to `.claude` directory)?

**Finding**: **No direct override available for individual file path.**

| Method | Result |
|--------|--------|
| Dedicated CLI flag | Not available |
| Dedicated environment variable | Not available |
| `CLAUDE_CONFIG_DIR` | Indirectly affects location |

**Explanation**:
- `CLAUDE_CONFIG_DIR` changes the entire configuration directory (the `~/.claude` directory and related paths)
- When `CLAUDE_CONFIG_DIR` is set, `claude.json` is stored relative to that directory
- There is no mechanism to specify `claude.json` path independently from the config directory
- Example: `CLAUDE_CONFIG_DIR=/custom/path` results in `/custom/path/claude.json`

**Workaround**: If you need a custom `claude.json` location, set `CLAUDE_CONFIG_DIR` to the parent directory of your desired location.

```bash
# To use /custom/config/claude.json:
export CLAUDE_CONFIG_DIR=/custom/config
claude
```

**Note**: This affects all configuration files, not just `claude.json`.

### Data Structures and Storage

See: `design-claude-code-data-structures.md` for comprehensive documentation of:

- `~/.claude.json` structure (main config, project settings, feature flags)
- `~/.claude/` directory contents:
  - `settings.json` / `settings.local.json` - User settings
  - `CLAUDE.md` - Global user instructions
  - `commands/` - Custom slash commands (YAML frontmatter format)
  - `plugins/` - Plugin system data
  - `history.jsonl` - Prompt history (JSONL format)
  - `stats-cache.json` - Usage statistics
  - `projects/` - Per-project session transcripts
  - `file-history/` - File edit checkpoints
  - `todos/` - Todo list data per session

---

## Nix Installation

See: `design-nix-installation.md` for Nix packaging design.

Summary:
- Uses [bun2nix](https://github.com/nix-community/bun2nix) for building Bun-based TypeScript projects
- Provides native command installation via `nix profile install`
- Supports all major platforms (x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin)
- References [nixpkgs claude-code package](https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/by-name/cl/claude-code/package.nix) and [claude-code-overlay](https://github.com/ryoppippi/claude-code-overlay) patterns

---

## Sections

(Add additional notes below)

---
