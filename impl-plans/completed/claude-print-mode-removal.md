# Remove Claude Code Print Mode Billing Path Implementation Plan

**Status**: Completed
**Design Reference**: `design-docs/specs/claude-print-mode-removal.md`
**Created**: 2026-05-14
**Last Updated**: 2026-05-14

---

## Design Document Reference

**Source**: `design-docs/specs/claude-print-mode-removal.md`
**Workflow Mode**: issue-resolution
**Issue Reference**: runtimeVariables.issueTitle: Remove Claude Code print mode billing path
**Feature ID**: claude-print-mode-removal
**Fanout Feature ID**: claude-print-mode-removal
**Codex Agent References**:
- `.agents/agents/ts-coding.md`
- `.agents/agents/check-and-test-after-modify.md`
- `.agents/skills/ts-coding-standards/SKILL.md`
- `.agents/skills/ts-review/SKILL.md`

### Summary

Remove active internal Claude Code print-mode invocation paths from subprocess
transport, readiness probing, queue execution, and group session processing.
Preserve session continuity without parsing print-mode JSON by using explicit
`--session-id` for new sessions and `--resume <sessionId>` for continuation.
Expose local Divedra workflow validation through the Nix development shell and
keep tests and design documentation aligned.

### Scope

**Included**:
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
- Related tests and documentation under the paths listed below

**Excluded**:
- External user-authored Claude Code examples outside internal invocation paths
- Historical archive references not consumed by active implementation
- Git commit or push work for this issue-resolution run

---

## Deliverables

### TASK-001: SDK Subprocess Transport Arguments

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/transport/subprocess.ts`
- `src/sdk/transport/subprocess.test.ts`

**Required Argument Contract**:
```typescript
interface TransportOptions {
  readonly resumeSessionId?: string | undefined;
  readonly prompt?: string | undefined;
  readonly additionalArgs?: readonly string[] | undefined;
}

function buildSubprocessCommand(options: TransportOptions): string[];
```

**Implementation Notes**:
- Remove active internal use of `-p`, `--print`, `--output-format stream-json`,
  and `--input-format stream-json`.
- Append prompt as the final positional argument when a startup prompt exists.
- Use `--resume <resumeSessionId>` when resuming.
- Reject caller-provided `additionalArgs` that include `-p`, `--print`,
  `--output-format stream-json`, or `--input-format stream-json` before spawn.
- Return an explicit configuration error identifying the offending flag.

**Completion Criteria**:
- [x] Subprocess command builder emits no print-mode or stream-json flags.
- [x] Resume invocation emits `--resume <sessionId>`.
- [x] Startup prompt remains positional and last.
- [x] Tests cover no-print flags, resume, positional prompt ordering, and
      `additionalArgs` rejection behavior.

---

### TASK-002: Claude Readiness Probe Invocation

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `src/sdk/readiness.ts`
- `src/sdk/readiness.test.ts`

**Required Argument Contract**:
```typescript
interface VerifyClaudeReadinessOptions {
  readonly model?: string | undefined;
  readonly prompt?: string | undefined;
  readonly timeoutMs?: number | undefined;
}

function buildProbeArgs(model: string, prompt?: string): readonly string[];
```

**Implementation Notes**:
- Invoke readiness probes as `claude --model <model> <prompt>`.
- Preserve stdout, stderr, exit status, timeout handling, and failure
  classification.
- Do not use print-mode or print-only stream flags for probe output.

**Completion Criteria**:
- [x] Probe argument construction contains no `-p`, `--print`,
      `--output-format`, or `--input-format`.
- [x] Timeout behavior still terminates the probe and classifies timeout.
- [x] Tests assert non-print arguments and retained readiness diagnostics.

---

### TASK-003: Queue Runner Session Continuity

**Status**: Completed
**Parallelizable**: No
**Depends On**: TASK-001 print-flag decision for shared argument policy
**Deliverables**:
- `src/sdk/queue/runner.ts`
- `src/sdk/queue/runner.test.ts`
- `design-docs/spec-command-queue.md`

**Required Argument Contract**:
```typescript
interface QueueCommandExecutionArgs {
  readonly prompt: string;
  readonly sessionMode: "new" | "continue";
  readonly currentSessionId?: string | undefined;
}

type QueueClaudeArgs = readonly string[];
```

**Implementation Notes**:
- For a new queue session, generate and persist a known session id and pass
  `--session-id <generatedSessionId>`.
- For continuation, pass `--resume <sessionId>`.
- Stop parsing print-mode JSON or stream-json output to discover session ids.
- Reject queue `additionalArgs` print-only flags before spawning Claude Code.
- Drain stdout and stderr so interactive subprocesses cannot block on full pipes.

**Completion Criteria**:
- [x] New queue command uses `--session-id` and positional prompt.
- [x] Continued queue command uses `--resume <sessionId>` and positional prompt.
- [x] Queue session id is stored without parsing print-mode JSON.
- [x] Queue `additionalArgs` reject print-only flags before spawn.
- [x] Tests cover new session, continuation, pause/resume, failed process, and
      no print-only flags.
- [x] `design-docs/spec-command-queue.md` reflects the non-print contract.

---

### TASK-004: Group Session Processor Continuity

**Status**: Completed
**Parallelizable**: No
**Depends On**: TASK-001 print-flag decision for shared argument policy
**Deliverables**:
- `src/sdk/group/session-processor.ts`
- `src/sdk/group/session-processor.test.ts`
- `src/sdk/group/runner.test.ts`
- `design-docs/spec-session-groups.md`

**Required Argument Contract**:
```typescript
interface GroupSessionStartArgs {
  readonly sessionId: string;
  readonly prompt: string;
  readonly resumeFlag: boolean;
}

type GroupClaudeArgs = readonly string[];
```

**Implementation Notes**:
- Start new group sessions with `--session-id <groupSessionId>`.
- Resume group sessions with `--resume <groupSessionId>`.
- Use stored `GroupSession.claudeSessionId`, or a deterministic
  Claude-compatible id derived from `GroupSession.id`, as the Claude Code
  session id.
- Reject group `additionalArgs` print-only flags before spawning Claude Code.
- Preserve per-session `CLAUDE_CONFIG_DIR`.

**Completion Criteria**:
- [x] New group session invocation includes `--session-id <groupSessionId>`.
- [x] Resumed group session invocation includes `--resume <groupSessionId>`.
- [x] `src/sdk/group/session-processor.test.ts` covers session id and
      print-only flag rejection behavior.
- [x] Group tests assert no print-only flags and correct session continuity.
- [x] `design-docs/spec-session-groups.md` documents the explicit session id
      contract.

---

### TASK-005: Divedra Workflow Material and Nix Shell Exposure

**Status**: Completed
**Parallelizable**: Yes
**Deliverables**:
- `flake.nix`
- `.divedra/workflows/design-and-implement-review-loop/`
- `.divedra/workflows/design-and-implement-review-loop-feature-plan/`
- `.divedra/workflows/impl-plan-completion-loop/`
- `.divedra/workflows/recent-change-quality-loop/`
- `.agents/skills/divedra-*/`
- `.agents/skills/tui-navigation-guardrails/`
- `.claude/skills/divedra-*/`
- `.claude/skills/tui-navigation-guardrails/`

**Required Shell Contract**:
```typescript
interface DivedraShellContract {
  readonly command: "divedra";
  readonly defaultRepo: "/g/gits/tacogips/divedra";
  readonly overrideEnv: "DIVEDRA_REPO";
}
```

**Implementation Notes**:
- Copy or refresh workflow material from `/g/gits/tacogips/divedra`.
- Copy or refresh Divedra skill material from
  `/g/gits/tacogips/divedra/.agents/skills/` into both `.agents/skills/` and
  `.claude/skills/`.
- Expose `divedra` in `nix develop` using `DIVEDRA_REPO` when set and
  `/g/gits/tacogips/divedra` by default.
- Validate all four workflow directories from the repository root.

**Completion Criteria**:
- [x] `nix develop -c divedra ...` resolves the local Divedra CLI.
- [x] Required workflow directories exist and validate.
- [x] Required Divedra skill directories exist under `.agents/skills/` and
      `.claude/skills/`.
- [x] Nix change remains scoped to dev shell exposure.

---

### TASK-006: Final Verification and Documentation Sweep

**Status**: Completed
**Parallelizable**: No
**Depends On**: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005
**Deliverables**:
- `design-docs/spec-sdk-tools.md`
- `design-docs/spec-command-queue.md`
- `design-docs/spec-session-groups.md`
- Test updates from TASK-001 through TASK-004

**Completion Criteria**:
- [x] Documentation references no active internal print-mode billing path.
- [x] Active invocation construction inspection follows the accepted design
      baseline and excludes test files.
- [x] All TypeScript checks pass.
- [x] All Bun tests pass.
- [x] Commit and push are handled after implementation verification when
      explicitly requested by the user.

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Subprocess transport | `src/sdk/transport/subprocess.ts` | Completed | `src/sdk/transport/subprocess.test.ts` |
| Readiness probe | `src/sdk/readiness.ts` | Completed | `src/sdk/readiness.test.ts` |
| Queue runner | `src/sdk/queue/runner.ts` | Completed | `src/sdk/queue/runner.test.ts` |
| Group session processor | `src/sdk/group/session-processor.ts` | Completed | `src/sdk/group/session-processor.test.ts`, `src/sdk/group/runner.test.ts` |
| Divedra shell/workflows/skills | `flake.nix`, `.divedra/workflows/*`, `.agents/skills/divedra-*`, `.claude/skills/divedra-*` | Completed | workflow validation commands, skill path discovery |
| Documentation sweep | `design-docs/spec-*.md` | Completed | grep and review |

## Dependencies

| Task | Depends On | Status |
|------|------------|--------|
| TASK-001 | Accepted design review | Completed |
| TASK-002 | Accepted design review | Completed |
| TASK-003 | TASK-001 shared print-flag policy | Completed |
| TASK-004 | TASK-001 shared print-flag policy | Completed |
| TASK-005 | Accepted design review; local `/g/gits/tacogips/divedra` or `DIVEDRA_REPO` | Completed |
| TASK-006 | TASK-001, TASK-002, TASK-003, TASK-004, TASK-005 | Completed |

## Parallelization

TASK-001, TASK-002, and TASK-005 can start concurrently. TASK-003 and TASK-004
can proceed after the shared `additionalArgs` print-flag policy is settled in
TASK-001. TASK-006 is the serial final verification gate.

## Verification Commands

Run from the repository root after implementation:

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

## Completion Criteria

- [x] No active internal invocation uses `claude -p`, `--print`,
      `--output-format stream-json`, or `--input-format stream-json`.
- [x] Queue runner uses `--session-id <generatedSessionId>` for new sessions
      and `--resume <sessionId>` for continuation.
- [x] Group processor uses `--session-id <groupSessionId>` for new group
      sessions and `--resume <groupSessionId>` for resumed group sessions.
- [x] Readiness probe uses non-print Claude invocation.
- [x] Subprocess transport omits print-only flags and preserves prompt startup.
- [x] SDK transport, queue runner, and group processor reject print-only
      `additionalArgs` before spawn with explicit errors.
- [x] Divedra workflows and skills are copied from `/g/gits/tacogips/divedra`
      into the declared local paths.
- [x] Divedra workflow validation succeeds through `nix develop`.
- [x] `bun run typecheck` passes.
- [x] `bun run test` passes.
- [x] Commit and push are performed only after explicit user request.

## Addressed Feedback

- Step 3 design review accepted the revised design with `reviewDecision:
  accepted`, `accepted: true`, and `needs_revision: false`.
- Low finding addressed for `impl-plans/completed/claude-print-mode-removal.md`:
  verification now keeps the design-doc command set as the review baseline
  instead of using broader `|| true` guarded grep commands.
- Low finding noted for `design-docs/specs/claude-print-mode-removal.md`:
  retrospective Step 3 wording remains a design provenance concern but is not
  a blocker for implementation planning.
- Prior Step 3 feedback is carried into deliverables: explicit Divedra skill
  source/targets, explicit `additionalArgs` rejection before spawn, and
  `src/sdk/group/session-processor.test.ts` coverage.
- Active invocation grep excludes `*.test.ts` while test behavior is verified
  through `bun run test`.

## Risks

- Interactive positional-prompt Claude invocation may differ from print mode in
  process lifetime, stdout/stderr timing, and completion behavior.
- Caller-provided `additionalArgs` rejection can break users who relied on
  passthrough print-mode behavior; errors must be clear and tested.
- Divedra skill copies can drift from `/g/gits/tacogips/divedra`; refresh
  `.agents/skills` and `.claude/skills` together.
- Divedra validation depends on `/g/gits/tacogips/divedra` unless
  `DIVEDRA_REPO` is set.
- Existing code or untracked files may already contain partial changes; implementers
  must preserve user changes and avoid unrelated rewrites.

## Progress Log

### Session: 2026-05-14 00:00

**Tasks Completed**: Implementation plan created.
**Tasks In Progress**: None.
**Blockers**: None for planning.
**Notes**: Created from accepted design review for
`claude-print-mode-removal`; implementation and verification were completed in
the follow-up session.

### Session: 2026-05-14 11:59

**Tasks Completed**: TASK-001 through TASK-006.
**Tasks In Progress**: None.
**Blockers**: None.
**Notes**: Removed active internal Claude Code print-mode invocations, added
explicit session id handling for queue and group execution, rejected print-mode
passthrough flags, copied Divedra workflow and skill material, and completed
focused plus full regression checks.

## Related Plans

- **Design**: `design-docs/specs/claude-print-mode-removal.md`
- **Related Existing Plans**: `impl-plans/command-queue-core.md`,
  `impl-plans/session-groups-runner.md`, `impl-plans/sdk-tools.md`
