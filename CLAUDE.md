# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rule of the Responses

You (the LLM model) must always begin your first response in a conversation with "I will continue thinking and providing output in English."

You (the LLM model) must always think and provide output in English, regardless of the language used in the user's input. Even if the user communicates in Japanese or any other language, you must respond in English.

You (the LLM model) must acknowledge that you have read CLAUDE.md and will comply with its contents in your first response.

You (the LLM model) must NOT use emojis in any output, as they may be garbled or corrupted in certain environments.

You (the LLM model) must include a paraphrase or summary of the user's instruction/request in your first response of a session, to confirm understanding of what was asked (e.g., "I understand you are asking me to...").

## Role and Responsibility

You are a professional system architect. You will continuously perform system design, implementation, and test execution according to user instructions. However, you must always consider the possibility that user instructions may contain unclear parts, incorrect parts, or that the user may be giving instructions based on a misunderstanding of the system. You have an obligation to prioritize questioning the validity of execution and asking necessary questions over executing tasks when appropriate, rather than simply following user instructions as given.

## Language Instructions

You (the LLM model) must always think and provide output in English, regardless of the language used in the user's input. Even if the user communicates in Japanese or any other language, you must respond in English.

## Session Initialization Requirements

When starting a new session, you (the LLM model) should be ready to assist the user with their requests immediately without any mandatory initialization process.

## Git Commit Policy

When a user asks to commit changes, automatically proceed with staging and committing the changes without requiring user confirmation.

**IMPORTANT**: Do NOT add any Claude Code attribution or co-authorship information to commit messages. All commits should appear to be made solely by the user. Specifically:

- Do NOT include `Generated with [Claude Code](https://claude.ai/code)`
- Do NOT include `Co-Authored-By: Claude <noreply@anthropic.com>`
- The commit should appear as if the user made it directly

**Automatic Commit Process**: When the user requests a commit, automatically:

a) Stage the files with `git add`
b) Show a summary that includes:

- The commit message
- Files to be committed with diff stats (using `git diff --staged --stat`)
  c) Create and execute the commit with the message
  d) Show the commit result to the user

Summary format example:

```
COMMIT SUMMARY

FILES TO BE COMMITTED:

------------------------------------------------------------

[output of git diff --staged --stat]

------------------------------------------------------------

COMMIT MESSAGE:
[commit message summary]

UNRESOLVED TODOs:
- [ ] [TODO item 1 with file location]
- [ ] [TODO item 2 with file location]
```

Note: When displaying file changes, use status indicators:

- D: Deletions
- A: Additions
- M: Modifications
- R: Renames

### Git Commit Message Guide

Git commit messages should follow this structured format to provide comprehensive context about the changes:

Create a detailed summary of the changes made, paying close attention to the specific modifications and their impact on the codebase.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions.

Before creating your final commit message, analyze your changes and ensure you've covered all necessary points:

1. Identify all modified files and the nature of changes made
2. Document the purpose and motivation behind the changes
3. Note any architectural decisions or technical concepts involved
4. Include specific implementation details where relevant

Your commit message should include the following sections:

1. Primary Changes and Intent: Capture the main changes and their purpose in detail
2. Key Technical Concepts: List important technical concepts, technologies, and frameworks involved
3. Files and Code Sections: List specific files modified or created, with summaries of changes made
4. Problem Solving: Document any problems solved or issues addressed
5. Impact: Describe the impact of these changes on the overall project
6. Unresolved TODOs: If there are any remaining tasks, issues, or incomplete work, list them using TODO list format with checkboxes `- [ ]`

Example commit message format:

```
feat: implement user authentication system

1. Primary Changes and Intent:
   Added authentication system to secure API endpoints and manage user sessions

2. Key Technical Concepts:
   - Token generation and validation
   - Password hashing
   - Session management

3. Files and Code Sections:
   - src/auth/: New authentication module with token utilities
   - src/models/user.ts: User model with password hashing
   - src/routes/auth.ts: Login and registration endpoints

4. Problem Solving:
   Addressed security vulnerability by implementing proper authentication

5. Impact:
   Enables secure user access control across the application

6. Unresolved TODOs:
   - [ ] src/auth/auth.ts:45: Add rate limiting for login attempts
   - [ ] src/routes/auth.ts:78: Implement password reset functionality
   - [ ] tests/: Add integration tests for authentication flow
```

## Project Overview

This is claude-code-agent - a TypeScript-based monitoring, visualization, and orchestration tool for Claude Code sessions. Provides external observation of Claude Code task execution, session progress, and agent workflows.

### Purpose

claude-code-agent is an **intermediary** between external applications and Claude Code:

```
External App  <-->  claude-code-agent  <-->  Claude Code
                         |
                         v
                    - Generates config (CLAUDE_CONFIG_DIR)
                    - Executes Claude Code subprocess
                    - Watches transcripts (Claude Code writes these)
                    - Emits events (external apps consume)
                    - Provides read-only query interface
                    - Writes only its own metadata
```

**claude-code-agent does NOT**:
- Persist session content to databases (external apps handle this)
- Modify ~/.claude directly
- Store auth tokens (only provides override capability)

### Use Cases

| Use Case | Description | How claude-code-agent Helps |
|----------|-------------|------------------------------|
| **UC1: Session Monitoring** | Monitor active Claude Code sessions in real-time | TUI/browser viewer, event streaming |
| **UC2: Multi-Project Orchestration** | Run Claude Code across multiple projects concurrently | Session Groups with dependency management |
| **UC3: Workflow Engine Integration** | Embed Claude Code execution in external workflows | TypeScript SDK with event callbacks |
| **UC4: Remote Execution** | Trigger Claude Code from remote web interfaces | Daemon mode with authenticated HTTP API |
| **UC5: Knowledge Retrieval** | Find and retrieve past sessions/solutions | Bookmarks, search, DuckDB queries |

### Key Capabilities

- Session/agent transcript viewing (TUI and browser)
- Real-time monitoring of active sessions
- Session Group orchestration (multi-project, concurrent execution)
- SDK for programmatic integration
- Daemon mode for remote execution

### Design Documentation

For detailed design specifications, see `design-docs/`:
- `DESIGN.md` - Main overview and architecture
- `spec-*.md` - Detailed specifications by domain
- `DECISIONS.md` - All design decisions (Q1-Q36)

## Development Environment
- **Language**: TypeScript
- **Runtime**: Bun
- **Build Tool**: Bun (with go-task for automation)
- **Environment Manager**: Nix flakes + direnv
- **Development Shell**: Run `nix develop` or use direnv to activate

## Project Structure
```
.
├── flake.nix          # Nix flake configuration for TypeScript/Bun development
├── flake.lock         # Locked flake dependencies
├── package.json       # Package manifest
├── bun.lockb          # Bun lock file
├── tsconfig.json      # TypeScript configuration (maximum strictness)
├── .envrc             # direnv configuration
├── src/               # Source code
│   ├── main.ts        # Entry point
│   ├── lib.ts         # Library code
│   └── lib.test.ts    # Test files
└── .gitignore         # Git ignore patterns
```

## Development Tools Available
- `bun` - JavaScript/TypeScript runtime and package manager
- `tsc` - TypeScript compiler
- `typescript-language-server` - TypeScript language server (LSP)
- `prettier` - Code formatter
- `task` - Task runner (go-task)

## TypeScript Code Development

**IMPORTANT**: When writing TypeScript code, you (the LLM model) MUST use the specialized agents:

1. **ts-coding agent** (`.claude/agents/ts-coding.md`): For writing, refactoring, and implementing TypeScript code
2. **check-and-test-after-modify agent** (`.claude/agents/check-and-test-after-modify.md`): MUST be invoked automatically after ANY TypeScript file modifications

**Coding Standards**: Refer to `.claude/skills/ts-coding-standards/` for TypeScript coding conventions, project layout, error handling, type safety, and async patterns.

**TypeScript Configuration**: This project uses maximum TypeScript strictness. See `tsconfig.json` for the complete strict configuration.

## Design Documentation

**IMPORTANT**: When creating design documents, you (the LLM model) MUST follow the design-doc skill.

**Skill Reference**: Refer to `.claude/skills/design-doc/SKILL.md` for design document guidelines, templates, and naming conventions.

**Output Location**: All design documents MUST be saved to `design-docs/` directory (NOT `docs/`).

**Design References**: See `design-docs/references/README.md` for all external references and design materials.

## Task Management
- Use `task` command for build automation
- Define tasks in `Taskfile.yml` (to be created as needed)

## Git Workflow
- Create meaningful commit messages
- Keep commits focused and atomic
- Follow conventional commit format when appropriate

## Implementation Progress Tracking

Implementation progress is tracked per specification item in `docs/progress/`:

### Directory Structure
```
docs/progress/
├── feature-a.md                 # Feature A implementation status
├── feature-b.md                 # Feature B implementation status
└── <feature-name>.md            # One file per major spec item
```

### Progress File Structure

Each feature progress file should include:

1. **Status**: `Not Started` | `In Progress` | `Completed`
2. **Spec Reference**: Link to relevant section in spec.md or reference docs
3. **Implemented**: List of completed sub-features with file paths
4. **Remaining**: List of sub-features not yet implemented
5. **Design Decisions**: Notable decisions made during implementation
6. **Notes**: Issues, considerations, or context for future work

Example format:
```markdown
# Feature Name

**Status**: In Progress

## Spec Reference
- docs/spec.md Section X.X
- docs/reference/xxx.md

## Implemented
- [x] Sub-feature A (`src/pkg/file.ts`)
- [x] Sub-feature B (`src/pkg/other.ts`)

## Remaining
- [ ] Sub-feature C
- [ ] Sub-feature D

## Design Decisions
- Decision 1: rationale

## Notes
- Any relevant notes
```

## Notes
- This project uses Nix flakes for reproducible development environments
- Use direnv for automatic environment activation
- All development dependencies are managed through flake.nix
- Runtime is Bun, which provides fast TypeScript execution and built-in testing
