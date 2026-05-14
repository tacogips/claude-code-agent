# Remove Internal Claude Code Print Mode Invocations

Feature-local design for removing Claude Code print-mode billing paths from
claude-code-agent while preserving session continuity and the Divedra workflow
environment expected by the design-and-implement-review-loop.

## Feature Contract

- Feature ID: `claude-invocation-non-print`
- Feature title: Remove internal Claude Code print-mode subprocess usage
- Workflow mode: `issue-resolution`
- Issue reference: Remove Claude Code print mode billing path
- Branch input design path: `design-docs/specs/claude-print-mode-removal.md`
- Branch input implementation-plan path:
  `impl-plans/active/remove-claude-print-mode-billing-path.md`

## Overview

The issue requires internal Claude Code subprocess calls to avoid `claude -p`,
`claude --print`, and print-only stream flags such as `--output-format
stream-json` and `--input-format stream-json`. The affected feature area is the
Claude Code subprocess invocation path and the Divedra workflow setup used by
the bounded fanout branch of `design-and-implement-review-loop`.

The desired behavior is interactive Claude Code invocation with prompts passed
as positional arguments where a one-shot prompt is needed. Session continuity is
preserved through explicit session controls:

- New queue commands use `--session-id <generatedSessionId>`.
- Continuation queue commands use `--resume <sessionId>`.
- New group sessions use the stored `GroupSession.claudeSessionId`, or a stable
  Claude-compatible id derived from `GroupSession.id`, through
  `--session-id <claudeSessionId>`.
- Resumed group sessions use `--resume <claudeSessionId>`.
- SDK subprocess resume uses `--resume <sessionId>` with the initial prompt as
  the final positional argument.
- Readiness probes invoke Claude Code without print mode or stream JSON flags.

The implementation must keep these paths in scope:

- SDK subprocess transport: `src/sdk/transport/subprocess.ts`
- Queue runner command construction: `src/sdk/queue/runner.ts`
- Readiness probes: `src/sdk/readiness.ts`
- Group session processing: `src/sdk/group/session-processor.ts`
- Shared print-mode argument guard, if retained or introduced:
  `src/sdk/claude-args.ts`

Any `additionalArgs` path that can reach an internal spawn must reject `-p`,
`--print`, `--output-format stream-json`, and `--input-format stream-json`
before process creation with an explicit configuration error. Rejection is
preferred over filtering so callers know the requested print-mode behavior was
not executed.

The workflow support requirement is that Divedra design-develop workflow
material copied from `/g/gits/tacogips/divedra` is present locally and that the
Nix development shell exposes a `divedra` command capable of validating
repository workflows. Workflow support includes both copied workflow bundles and
Divedra skill material. The Divedra skill source is
`/g/gits/tacogips/divedra/.agents/skills/`; the local targets are
`.agents/skills/divedra-*`, `.agents/skills/tui-navigation-guardrails`,
`.claude/skills/divedra-*`, and `.claude/skills/tui-navigation-guardrails`.

## Scope

Primary implementation paths:

- `src/sdk/transport/subprocess.ts`
- `src/sdk/readiness.ts`
- `src/sdk/queue/runner.ts`
- `src/sdk/group/session-processor.ts`
- `flake.nix`
- `.divedra/workflows/design-and-implement-review-loop/`
- `.divedra/workflows/design-and-implement-review-loop-feature-plan/`
- `.divedra/workflows/impl-plan-completion-loop/`
- `.divedra/workflows/recent-change-quality-loop/`
- `.agents/skills/divedra-*/`
- `.agents/skills/tui-navigation-guardrails/`
- `.claude/skills/divedra-*/`
- `.claude/skills/tui-navigation-guardrails/`

Expected tests and documentation paths:

- `src/sdk/claude-args.test.ts`
- `src/sdk/transport/subprocess.test.ts`
- `src/sdk/readiness.test.ts`
- `src/sdk/queue/runner.test.ts`
- `src/sdk/group/session-processor.test.ts`
- `src/sdk/group/runner.test.ts`
- `design-docs/spec-command-queue.md`
- `design-docs/spec-sdk-tools.md`
- `design-docs/spec-session-groups.md`

Out of scope:

- External user-authored command examples that intentionally document Claude
  Code behavior outside claude-code-agent internals.
- Historical archive references unless they are consumed as active design or
  implementation guidance.
- Committing or pushing changes in this run.

## Design Decisions

1. Remove internal print-mode invocation rather than wrapping it.
   Any active internal spawn should omit `-p`, `--print`, `--output-format
stream-json`, and `--input-format stream-json`.

2. Use positional prompts for immediate Claude Code turns.
   The subprocess transport appends the initial prompt as the final positional
   argument after configured flags. This keeps startup immediate without using
   print mode.

3. Preserve queue continuity with explicit session IDs.
   Queue execution should generate and store a session ID for new sessions with
   `--session-id`, then continue with `--resume <sessionId>` when command
   session mode requires continuity.

4. Stop depending on print-mode JSON session capture.
   Queue execution should not require parsing `stream-json` output to discover
   session IDs. Known session IDs are assigned before spawning Claude Code.

5. Preserve group session continuity with explicit Claude session IDs.
   Group sessions already have stable `GroupSession.id` values and per-session
   Claude config directories. Starting a group session should pass
   `--session-id <claudeSessionId>`, where `claudeSessionId` is either the
   stored `GroupSession.claudeSessionId` or a deterministic Claude-compatible id
   derived from `GroupSession.id`. Resuming a paused group session should pass
   `--resume <claudeSessionId>`. The implementation plan should keep
   `startGroupSession` and its tests centered on this explicit argument
   contract.

6. Keep readiness probes non-print.
   Model readiness checks invoke `claude --model <model> <prompt>` and report
   stdout, stderr, exit status, timeout, and failure classification without
   print-only flags.

7. Guard all internal extra-argument passthroughs.
   SDK transport `additionalArgs`, queue configuration `additionalArgs`, and
   group configuration `additionalArgs` are still part of an internal spawn
   path. They should reject `-p`, `--print`, `--output-format stream-json`, and
   `--input-format stream-json` before spawning Claude Code. Rejection should
   identify the offending flag and should be tested consistently across SDK
   transport, queue runner, and group session processing.

8. Copy Divedra workflow and skill material into local agent surfaces.
   Workflow bundles copied from `/g/gits/tacogips/divedra/.divedra/workflows/`
   must live under `.divedra/workflows/`. Divedra skills copied from
   `/g/gits/tacogips/divedra/.agents/skills/` must be available under both
   `.agents/skills/` and `.claude/skills/` so Codex-agent and Claude-oriented
   references can resolve the same workflow support material locally. Required
   skill families are `.agents/skills/divedra-*`,
   `.agents/skills/tui-navigation-guardrails`,
   `.claude/skills/divedra-*`, and `.claude/skills/tui-navigation-guardrails`.

9. Expose Divedra through the Nix shell.
   `flake.nix` should provide a `divedra` shell command that runs the local
   reference checkout from `DIVEDRA_REPO` or `/g/gits/tacogips/divedra`.

10. Keep verification focused on active invocation construction.
    Verification may allow forbidden-flag literals in production validation
    constants or error messages used to reject `additionalArgs`, but reviewers
    must inspect command-building and spawn paths to confirm the forbidden flags
    are not appended to active Claude Code invocations.

## Codex Agent References

The feature contract declares these implementation and review references:

- `.agents/agents/ts-coding.md`
- `.agents/agents/check-and-test-after-modify.md`
- `.agents/skills/ts-coding-standards/SKILL.md`
- `.agents/skills/ts-review/SKILL.md`

TypeScript implementation steps remain subject to repository instructions for
the TypeScript coding and post-modification check/test agents.

## Review Findings Addressed By Design

- Print-mode billing risk is addressed by removing print-mode flags from active
  internal Claude Code subprocess arguments.
- Current issue contract feedback is addressed by aligning this document with
  feature ID `claude-invocation-non-print` and implementation-plan path
  `impl-plans/active/remove-claude-print-mode-billing-path.md`.
- Queue session continuity is addressed by designing around generated
  `--session-id` values and explicit `--resume <sessionId>` continuation.
- Group session continuity is addressed by requiring the stored or deterministic
  Claude session id to be passed explicitly to `--session-id` on new starts and
  `--resume` on resumed starts.
- Readiness probing avoids print-mode-specific output handling while preserving
  model and authentication diagnostics.
- Divedra workflow availability is addressed by requiring copied workflow
  material and Nix shell command exposure.
- Step 3 design review feedback on Divedra skill availability is addressed by
  declaring the source path `/g/gits/tacogips/divedra/.agents/skills/` and local
  targets under `.agents/skills/` and `.claude/skills/`.
- Additional-argument regressions are addressed by requiring explicit guards on
  SDK transport, queue, and group `additionalArgs` before spawning Claude Code.
- Step 3 design review feedback on reject-versus-filter ambiguity is addressed
  by choosing explicit rejection of print-only additional arguments.
- Step 3 design review feedback on group processor test coverage is addressed
  by adding `src/sdk/group/session-processor.test.ts` to expected tests.
- Step 3 design review feedback on overly broad negative verification is
  addressed by replacing source-wide forbidden-literal search with active
  invocation construction inspection that allows validation constants.
- Self-review feedback on test-file false positives is addressed by excluding
  `*.test.ts` from active invocation inspection while keeping tests covered by
  `bun run test`.

## Verification Commands

Run these commands from the repository root after implementation:

```bash
rg -n 'args\.(push|concat)|\[.*("-p"|"--print"|"--output-format"|"--input-format"|"stream-json")|spawn\("claude"' src/sdk/transport src/sdk/readiness.ts src/sdk/queue src/sdk/group -g '!*.test.ts'
rg -n 'additionalArgs|--session-id|--resume|buildSubprocessCommand|buildProbeArgs|startGroupSession' src/sdk/transport src/sdk/readiness.ts src/sdk/queue src/sdk/group
rg -n 'spawn\("claude"|args\.push|buildSubprocessCommand|buildProbeArgs|startGroupSession' src/sdk/transport src/sdk/readiness.ts src/sdk/queue src/sdk/group
find .agents/skills .claude/skills -maxdepth 2 -type f -name 'SKILL.md' | sort | rg '(divedra-|tui-navigation)'
nix develop -c divedra workflow validate .divedra/workflows/design-and-implement-review-loop
nix develop -c divedra workflow validate .divedra/workflows/design-and-implement-review-loop-feature-plan
nix develop -c divedra workflow validate .divedra/workflows/impl-plan-completion-loop
nix develop -c divedra workflow validate .divedra/workflows/recent-change-quality-loop
bun run typecheck
bun run test
```

The first `rg` command is an active invocation construction inspection. It
focuses on argument appends, command arrays, and Claude spawn sites so forbidden
flag literals used only for `additionalArgs` validation constants do not fail a
correct implementation. It excludes test files so assertions such as
`not.toContain("--print")` do not fail the acceptance signal. The remaining
`rg` commands are positive inspection checks for session continuity and spawn
construction.

## Risks

- Claude Code interactive invocation behavior with a positional prompt may differ
  from print mode for process lifetime and output timing; tests should assert
  argument construction and process draining.
- Rejecting print-mode flags from `additionalArgs` can break users who
  previously relied on those passthroughs; the implementation should surface a
  clear error message and include tests for each internal spawn path.
- Divedra skill copies can drift from `/g/gits/tacogips/divedra`; workflow
  support changes should refresh `.agents/skills/divedra-*`,
  `.agents/skills/tui-navigation-guardrails`, `.claude/skills/divedra-*`, and
  `.claude/skills/tui-navigation-guardrails` together.
- Nix shell validation depends on the local Divedra checkout path unless
  `DIVEDRA_REPO` is set.
- Verification commands that inspect active invocation construction still
  require reviewer judgment when a match is returned from validation helpers
  near command-building code.
