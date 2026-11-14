---
name: design-status
description: Show current design status, pending questions, and next steps.
---

# Design Status Skill

Display the current status of the design process.

## Status Report Contents

1. **Overall Progress**
   - Current phase (Requirements, Design, Review)
   - Iteration number
   - Completion percentage estimate

2. **Pending Questions**
   - Count of unanswered questions
   - Summary of pending topics
   - Urgency/priority indicators

3. **Recent Decisions**
   - Last 5 decisions made
   - Documents updated

4. **Blockers**
   - What is blocked waiting on user
   - What is blocked on research

5. **Next Steps**
   - Immediate actions needed
   - User actions required

## Output Format

```
=== Design Status ===

Phase: {Current Phase}
Iteration: {N}
Progress: {Estimate}%

--- Pending Questions ---
{Count} questions waiting for response

Topics:
- {Topic 1} ({priority})
- {Topic 2} ({priority})

--- Recent Decisions ---
- {Decision 1}
- {Decision 2}

--- Blockers ---
- Waiting on: {description}

--- Next Steps ---
For User:
- Answer questions in design-docs/qa/pending.md

For Design:
- {Next design task}

======================
```

## Execution

```bash
# Invoke this skill
/design-status
```

Reads from:
- `design-docs/README.md`
- `design-docs/qa/pending.md`
- `design-docs/qa/responses.md`
- `design-docs/iterations/*.md`
