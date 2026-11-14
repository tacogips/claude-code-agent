# Research: Claude Code Interactive Questions (AskUserQuestion Tool)

This document investigates how Claude Code implements interactive list prompts and whether claude-code-agent can receive and reproduce them on web/TUI.

---

## 1. Summary

Claude Code's interactive checkbox/radio UI is implemented via the **AskUserQuestion tool**. This tool:
- Is called by Claude as a regular tool_use block
- Contains structured JSON with questions, options, and selection type
- Records both the question and user's answer in the transcript JSONL
- **Can be intercepted and reproduced by claude-code-agent**

---

## 2. AskUserQuestion Tool Structure

### 2.1 Tool Call Schema

```typescript
interface AskUserQuestionInput {
  questions: Question[];  // 1-4 questions (required)
}

interface Question {
  question: string;       // Full question text (required)
  header: string;         // Short label, max 12 chars (required)
  multiSelect: boolean;   // true = checkboxes, false = radio (required)
  options: Option[];      // 2-4 choices (required)
}

interface Option {
  label: string;          // Display text, 1-5 words (required)
  description: string;    // Explanation text (required)
}
```

### 2.2 Example Tool Call (from transcript)

```json
{
  "type": "tool_use",
  "id": "toolu_01UZNbNWpaDqZmyCDbuGPeKo",
  "name": "AskUserQuestion",
  "input": {
    "questions": [
      {
        "question": "What is a 'command' in this queue?",
        "header": "Command Type",
        "multiSelect": false,
        "options": [
          {
            "label": "Prompt to Claude Code",
            "description": "User prompts queued and sent to Claude Code sequentially"
          },
          {
            "label": "Agent operation",
            "description": "claude-code-agent CLI operations queued"
          },
          {
            "label": "Both",
            "description": "Queue can contain both prompts and agent operations"
          }
        ]
      }
    ]
  }
}
```

### 2.3 User Response (tool_result in transcript)

The transcript records the user's answer with full question context preserved:

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "content": "User has answered your questions: \"What is a 'command'...\"=\"Prompt to Claude Code\"...",
        "tool_use_id": "toolu_01UZNbNWpaDqZmyCDbuGPeKo"
      }
    ]
  },
  "toolUseResult": {
    "questions": [...],  // Full question structure preserved
    "answers": {...}     // User's selections
  }
}
```

---

## 3. CLI Terminal Rendering

In the Claude Code CLI:
1. Questions are displayed with numbered options
2. User types a number to select
3. Arrow key + Enter checkbox selection is **NOT** the standard behavior
4. The interactive checkbox UI is proposed for VS Code extension (GitHub issue #12609)

### 3.1 Current CLI Behavior

```
Clarifying Questions:

Question 1: What is a 'command' in this queue?
  1. Prompt to Claude Code - User prompts queued and sent sequentially
  2. Agent operation - claude-code-agent CLI operations queued
  3. Both - Queue can contain both prompts and operations

Enter your choice (1-3): _
```

### 3.2 Proposed VS Code UI (Feature Request #12609)

```
+-- Clarifying Questions -------------------------+
|                                                 |
| Question 1: What is a 'command' in this queue? |
|                                                 |
| ( ) Prompt to Claude Code                       |
| (*) Agent operation                             |
| ( ) Both                                        |
|                                                 |
| [Skip]  [Continue]                              |
+-------------------------------------------------+
```

---

## 4. Can claude-code-agent Intercept and Reproduce?

**YES**, with the following approach:

### 4.1 Detection (Transcript Watching)

```typescript
// Watch transcript for AskUserQuestion tool calls
const watcher = new TranscriptWatcher(sessionPath);

watcher.on('message', (message) => {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'tool_use' && block.name === 'AskUserQuestion') {
        // Emit interactive question event
        emit('interactive_question', {
          toolUseId: block.id,
          questions: block.input.questions,
        });
      }
    }
  }
});
```

### 4.2 Rendering (TUI with Ink)

```typescript
// TUI component for interactive questions
function InteractiveQuestion({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({});

  return (
    <Box flexDirection="column">
      {questions.map((q, idx) => (
        <Box key={idx}>
          <Text bold>{q.header}: {q.question}</Text>
          {q.options.map((opt, optIdx) => (
            <SelectableOption
              key={optIdx}
              label={opt.label}
              description={opt.description}
              selected={answers[idx] === optIdx}
              multiSelect={q.multiSelect}
              onSelect={() => handleSelect(idx, optIdx)}
            />
          ))}
        </Box>
      ))}
      <Button onPress={() => onSubmit(answers)}>Continue</Button>
    </Box>
  );
}
```

### 4.3 Rendering (Web/Browser)

```html
<!-- Web component for interactive questions -->
<div class="question-panel">
  <h3>{{ question.header }}</h3>
  <p>{{ question.question }}</p>

  <div v-for="option in question.options">
    <label>
      <input
        :type="question.multiSelect ? 'checkbox' : 'radio'"
        :name="question.header"
        :value="option.label"
      />
      <span class="label">{{ option.label }}</span>
      <span class="description">{{ option.description }}</span>
    </label>
  </div>

  <button @click="submit">Continue</button>
</div>
```

### 4.4 Response Injection

**Challenge**: How to send the user's answer back to Claude Code?

#### Current State (as of 2026-01)

| Method | Status | Notes |
|--------|--------|-------|
| stdin injection | **Only option available** | Must spawn Claude Code with stdio control |
| File-based answers | **Requested, not implemented** | Issue #12605 Option B |
| Hook support | **Requested, not implemented** | Issue #10168 (OPEN) |
| --print mode | **Does not support** | AskUserQuestion behavior undefined in non-interactive mode |

#### Option A: stdin Injection (Currently Only Method)

```typescript
// Claude Code process spawned by claude-code-agent
const claudeProcess = spawn('claude', [...args], { stdio: ['pipe', 'pipe', 'pipe'] });

// When user selects an option in TUI/web
function submitAnswer(selectedOptionIndex: number) {
  claudeProcess.stdin.write(`${selectedOptionIndex}\n`);
}
```

#### Option B: File-based Answers (Proposed in #12605, NOT YET AVAILABLE)

This is the approach the user suggested and would be ideal:

```bash
# Proposed mechanism (NOT IMPLEMENTED IN CLAUDE CODE YET)
# 1. Read question from transcript file
# 2. Write answer to temporary file
echo '{"answers": {"0": "Option A"}}' > /tmp/claude-answer-${SESSION_ID}.json
# 3. Claude Code would read from this file
```

**Why this doesn't work yet:**
- Claude Code does not poll or read answer files
- No configuration to specify answer file path
- Issue #12605 proposes this as "Option B" but is not implemented

#### Option C: Hook-based Response (Proposed in #10168, NOT YET AVAILABLE)

```json
// Proposed hook configuration (NOT IMPLEMENTED YET)
{
  "hooks": {
    "PreAskUserQuestion": [{
      "type": "command",
      "command": "my-answer-provider.sh"
    }]
  }
}
```

**Why this doesn't work yet:**
- Issue #10168 is still OPEN (as of 2025-12-31)
- `PreAskUserQuestion` / `UserInputRequired` hook event does not exist
- 19 upvotes and 18 comments show community demand

#### Option D: Agent SDK (Alternative Approach)

For programmatic use, the official recommendation is to use the **Agent SDK** (Python/TypeScript) instead of CLI:

```typescript
// Using Claude Agent SDK (separate from Claude Code CLI)
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
// Full programmatic control over tool approval and responses
```

**Trade-off**: This bypasses Claude Code entirely, losing features like:
- Transcript persistence
- MCP server integration
- Project-specific CLAUDE.md
- Session history

---

## 5. Implementation Approach for claude-code-agent

### 5.1 Event Types

Add new event types for interactive questions:

```typescript
type SessionEvent =
  // ... existing events ...

  // Interactive question events
  | {
      type: 'interactive_question';
      sessionId: string;
      toolUseId: string;
      questions: Question[];
    }
  | {
      type: 'interactive_question_answered';
      sessionId: string;
      toolUseId: string;
      answers: Record<string, string | string[]>;
    };
```

### 5.2 SDK API

```typescript
class ClaudeCodeSession {
  // Listen for interactive questions
  on(event: 'interactive_question', handler: (q: InteractiveQuestion) => void): void;

  // Submit answer programmatically
  async submitAnswer(toolUseId: string, answers: Record<string, string>): Promise<void>;
}
```

### 5.3 REST API Endpoints

```
GET  /api/sessions/:id/pending-questions
     Returns any unanswered interactive questions

POST /api/sessions/:id/answer
     Body: { toolUseId: string, answers: Record<string, string> }
     Submits answer to Claude Code process
```

### 5.4 SSE Events

```
event: interactive_question
data: {"toolUseId": "...", "questions": [...]}

event: interactive_question_answered
data: {"toolUseId": "...", "answers": {...}}
```

---

## 6. Architecture Diagram

```
+----------------+     +-----------------------+     +------------------+
|  Claude Code   |     |   claude-code-agent   |     |   Web/TUI        |
|  (subprocess)  |     |                       |     |   Client         |
+----------------+     +-----------------------+     +------------------+
        |                        |                          |
        | writes transcript      |                          |
        +----------------------->| watches transcript       |
        |                        +------------------------->|
        |                        | emits event:             |
        |                        | interactive_question     |
        |                        |                          |
        |                        |                          | renders UI
        |                        |                          | (radio/checkbox)
        |                        |                          |
        |                        |<-------------------------+
        |                        | receives answer          |
        |<-----------------------+                          |
        | stdin: "1\n"           | injects to stdin         |
        |                        |                          |
        | writes tool_result     |                          |
        +----------------------->| watches transcript       |
                                 +------------------------->|
                                 | emits event:             |
                                 | question_answered        |
```

---

## 7. Conclusion

### 7.1 Feasibility

**YES**, claude-code-agent can receive and reproduce interactive questions:

| Aspect | Feasibility | Notes |
|--------|-------------|-------|
| Detection | Fully possible | Watch transcript for `tool_use` with `name: "AskUserQuestion"` |
| JSON format | Available | Full question structure in `input` field |
| TUI rendering | Fully possible | Use Ink with radio/checkbox components |
| Web rendering | Fully possible | Standard HTML form elements |
| Response injection | Possible (stdin) | Requires spawning Claude Code with stdio control |

### 7.2 Limitations

1. **Stdin control required (current)**: Must spawn Claude Code subprocess with stdin pipe
   - File-based answers proposed but NOT implemented (Issue #12605)
   - Hook-based responses proposed but NOT implemented (Issue #10168)
2. **No official API**: Response mechanism is via stdin, not a stable API
3. **Timing sensitive**: Must inject response while Claude Code is waiting for input
4. **--print mode incompatible**: Non-interactive mode does not handle AskUserQuestion gracefully

### 7.3 Recommendations

1. **Phase 1**: Implement read-only question display (TUI/web shows pending questions)
2. **Phase 2**: Add stdin injection for programmatic responses
3. **Future**: Monitor Claude Code updates for official API/hook support

---

## 8. Methods to Prevent AskUserQuestion

### 8.1 Summary

| Method | Effectiveness | Notes |
|--------|---------------|-------|
| Permission deny rules | **NOT possible** | AskUserQuestion does not require permission |
| --disallowedTools | **NOT possible** | No such option exists |
| CLAUDE.md instruction | **Partial** | Can instruct Claude not to use the tool |
| Subagent (Task tool) | **Works** | Subagents cannot use AskUserQuestion by design |
| --print mode | **Uncertain** | Behavior undefined; may skip or fail |

### 8.2 Cannot Disable via Permissions

From Claude Code documentation:

> **AskUserQuestion**
> Asks the user multiple choice questions to gather information or clarify ambiguity
>
> Permission Required: **No**

The tool is always available and cannot be restricted through `permissions.deny` settings.

### 8.3 CLAUDE.md Instruction (Partial Solution)

Add to project's `CLAUDE.md`:

```markdown
## Tool Usage Restrictions

Do NOT use the AskUserQuestion tool. Instead:
- Make reasonable assumptions and document them
- Proceed with the most common/standard approach
- State your assumptions in your response text
- If truly ambiguous, explain the options in plain text and wait for user reply
```

**Effectiveness**: Partial - Claude may still use AskUserQuestion if it deems clarification critical.

### 8.4 Use Subagents (Task Tool)

**Subagents cannot use AskUserQuestion** - this is by design (Issue #12890).

```typescript
// Main agent spawns subagent for non-interactive execution
await Task({
  subagent_type: 'general-purpose',
  prompt: 'Implement feature X with these assumptions: ...',
});
// Subagent will NOT use AskUserQuestion
```

**Use case**: When claude-code-agent needs guaranteed non-interactive execution:
1. Main session receives task
2. Main session spawns subagent via Task tool
3. Subagent executes without AskUserQuestion capability
4. Subagent returns result to main session

**Limitation**: Subagents have limited context and cannot see full conversation history.

### 8.5 --print Mode (Uncertain)

```bash
claude -p "Implement feature X" --allowedTools "Read,Edit,Bash"
```

**Behavior**: Undefined when AskUserQuestion would normally be triggered.
- May skip the question entirely
- May fail or hang
- Not documented by Anthropic

### 8.6 Recommended Approach for claude-code-agent

For automated/non-interactive execution:

1. **Use CLAUDE.md instructions** to discourage AskUserQuestion usage
2. **Spawn subagents** for tasks that must not be interactive
3. **Implement stdin injection** as fallback for questions that do occur
4. **Monitor for AskUserQuestion** in transcript and handle gracefully

```typescript
// claude-code-agent approach
const session = await agent.runSession({
  projectPath: '/path/to/project',
  prompt: 'Task description...',
  claudeMd: `
## Non-Interactive Mode
Do NOT use AskUserQuestion. Make reasonable assumptions.
`,
  onInteractiveQuestion: async (question) => {
    // Fallback: auto-answer or notify external system
    return autoSelectFirstOption(question);
  },
});
```

---

## 9. References

- GitHub Issue #10346: Missing AskUserQuestion Documentation
- GitHub Issue #12609: Feature request for interactive UI in VS Code
- GitHub Issue #12605: Feature request for hook support
- GitHub Issue #10168: Hook for user input events (OPEN)
- GitHub Issue #12890: AskUserQuestion not available to subagents
- Piebald-AI/claude-code-system-prompts: Tool descriptions and schemas
- Claude Code Settings Documentation: https://code.claude.com/docs/en/settings
