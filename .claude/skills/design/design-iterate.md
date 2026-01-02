---
name: design-iterate
description: Run one iteration of the design process. Checks responses, updates docs, generates new questions.
---

# Design Iteration Skill

Run a complete design iteration cycle.

## Iteration Cycle

```
1. Check Status
   └── Read design-docs/README.md
   └── Check design-docs/qa/responses.md for new answers

2. Process Responses (if any)
   └── Parse answers
   └── Update design documents
   └── Archive to history

3. Analyze Gaps
   └── What decisions are still pending?
   └── What information is missing?
   └── What needs user confirmation?

4. Generate Questions
   └── Technical questions (architecture, libraries)
   └── Feature questions (scope, priority)
   └── Confirmation questions (verify understanding)

5. Update Status
   └── Update design-docs/README.md
   └── Write to design-docs/qa/pending.md
   └── Log iteration in design-docs/iterations/
```

## Iteration Log Format

Create `design-docs/iterations/{n}-summary.md`:

```markdown
# Iteration {n}

## Processed
- {List of processed Q&A}

## Decisions Made
- {List of decisions with rationale}

## Documents Updated
- {List of updated files}

## New Questions
- {List of new questions generated}

## Next Steps
- {What needs to happen next}

## Blockers
- {Any blockers waiting on user}
```

## Gap Analysis

Check for missing information in:
- [ ] Project goals and scope
- [ ] Target users and use cases
- [ ] Functional requirements
- [ ] Non-functional requirements
- [ ] Architecture decisions
- [ ] Technology stack choices
- [ ] Integration requirements
- [ ] Security considerations
- [ ] Performance requirements

## Execution

```bash
# Invoke this skill
/design-iterate
```

This runs one complete iteration and reports:
- What was processed
- What was updated
- What questions are pending
- What the next steps are
