---
name: design-process-responses
description: Process user responses from design-docs/qa/responses.md and update design documents accordingly.
---

# Process Responses Skill

Process user responses and update design documents.

## Workflow

1. Read `design-docs/qa/responses.md`
2. Parse user answers
3. Update relevant design documents:
   - `design-docs/architecture/*.md` for architecture decisions
   - `design-docs/features/*.md` for feature decisions
   - `design-docs/*.md` for general decisions
4. Archive Q&A to `design-docs/qa/history/{topic}.md`
5. Clear processed items from `design-docs/qa/responses.md`
6. Generate follow-up questions if needed
7. Update `design-docs/README.md` with progress

## Response Parsing

Expect responses in formats:
- Checkbox selection: `[x] A. Option`
- Free text: Written answer under question
- Skip: "skip" or "defer"
- Clarification request: Question from user

## Document Updates

For each answered question:
1. Find related design document
2. Update with decision
3. Add rationale from user
4. Note any follow-up items

## Archive Format

```markdown
# Q&A Session - {Topic}

## Questions Asked

### Q1: {Title}
**Question**: {Original question}
**Answer**: {User's answer}
**Decision**: {Resulting decision}
**Updated Docs**: {List of updated files}

---
```

## Execution

```bash
# Invoke this skill
/design-process-responses
```

This will:
1. Read and parse responses
2. Update design documents
3. Archive the Q&A
4. Report what was updated
