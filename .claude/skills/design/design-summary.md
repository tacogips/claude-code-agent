---
name: design-summary
description: Generate a summary of the current design state for user review and feedback.
---

# Design Summary Skill

Generate a comprehensive summary of the current design for user review.

## Summary Contents

1. **Project Overview**
   - Purpose and goals
   - Target users
   - Key features

2. **Architecture Summary**
   - High-level architecture
   - Key components/modules
   - Data flow

3. **Technology Decisions**
   - Language/runtime
   - Frameworks
   - Libraries
   - Build tools

4. **Feature Summary**
   - Confirmed features
   - Deferred features
   - Excluded features

5. **Open Items**
   - Pending decisions
   - Unresolved questions
   - Known risks

6. **Feedback Request**
   - Specific areas needing feedback
   - Questions for user

## Output

Writes to `design-docs/summary.md`:

```markdown
# Design Summary

## Project Overview
{Summary of project purpose and goals}

## Architecture
{High-level architecture description}

### Components
| Component | Purpose | Status |
|-----------|---------|--------|
| {name}    | {desc}  | {status} |

## Technology Stack
| Category | Choice | Rationale |
|----------|--------|-----------|
| {cat}    | {choice} | {why} |

## Features
### Confirmed
- {Feature 1}
- {Feature 2}

### Deferred
- {Feature}

### Excluded
- {Feature}

## Open Items
- [ ] {Item 1}
- [ ] {Item 2}

## Feedback Requested

Please review and provide feedback on:
1. {Specific area 1}
2. {Specific area 2}

Write feedback to `design-docs/qa/responses.md`
```

## Execution

```bash
# Invoke this skill
/design-summary
```

This aggregates all design documents and creates a reviewable summary.
