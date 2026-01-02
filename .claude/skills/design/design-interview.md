---
name: design-interview
description: Conduct design interview with user. Writes questions to design-docs/qa/pending.md for async communication.
---

# Design Interview Skill

Conduct a design interview session for the current project.

## Workflow

1. Read current design status from `design-docs/README.md`
2. Identify what information is missing
3. Generate appropriate questions
4. Write to `design-docs/qa/pending.md`
5. Update `design-docs/README.md` with current status

## Question Categories

### Category 1: Project Goals
- What is the primary goal?
- Who are the target users?
- What problems does this solve?
- What are the success criteria?

### Category 2: Functional Requirements
- What are the must-have features?
- What are nice-to-have features?
- What are explicit non-goals?
- What are the constraints?

### Category 3: Technical Requirements
- What is the target runtime/platform?
- What are performance requirements?
- What are security requirements?
- What integrations are needed?

### Category 4: Architecture
- What architecture pattern is preferred?
- What are the key modules/components?
- What are the data flow requirements?
- What are the scalability needs?

### Category 5: Technology Stack
- What languages/frameworks are preferred?
- What libraries should be used/avoided?
- What build tools are preferred?
- What testing frameworks are preferred?

## Output Format

Write questions to `design-docs/qa/pending.md` in this format:

```markdown
# Design Questions

## Status: PENDING

Please answer the following questions. You can:
- Check the option boxes [x]
- Write free-form answers
- Ask clarifying questions
- Say "skip" to defer a question

---

## Q1: {Question Title}

**Context**: {Why we need to know this}

**Question**: {The actual question}

**Options** (if applicable):
- [ ] A. {Option}
- [ ] B. {Option}
- [ ] C. Other: _______________

---
```

## Execution

```bash
# Invoke this skill
/design-interview
```

This will:
1. Analyze current spec state
2. Generate relevant questions
3. Write to pending.md
4. Prompt user to answer in responses.md
