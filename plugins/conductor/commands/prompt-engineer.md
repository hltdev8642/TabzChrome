---
description: "Craft context-rich prompts for beads issues. Spawns parallel Explore agents to gather file paths, patterns, and dependencies, then synthesizes into monster prompts."
---

# Prompt Engineer - Context-Aware Prompt Crafting

Craft detailed, context-rich prompts for beads issues by first gathering codebase context via parallel exploration.

## Usage

```bash
/conductor:prompt-engineer TabzChrome-abc TabzChrome-def
```

## Workflow

```
1. Receive issue(s) to prepare prompts for
2. Match skills based on issue title/description (match-skills.sh)
3. Spawn parallel Explore agents (haiku) to gather context per issue
4. Synthesize findings + skill triggers into monster prompts
5. Return prompts ready for worker spawning
```

---

## Phase 0: Match Skills

For each issue, run the skill matcher to identify relevant skills:

```bash
# Get issue details
ISSUE_JSON=$(bd show "$ISSUE_ID" --json 2>/dev/null)
TITLE=$(echo "$ISSUE_JSON" | jq -r '.[0].title // ""')
DESC=$(echo "$ISSUE_JSON" | jq -r '.[0].description // ""')

# Match skills and get trigger phrases
SKILL_TRIGGERS=$(${CLAUDE_PLUGIN_ROOT}/scripts/match-skills.sh --triggers "$TITLE $DESC")

# Example output:
# Use the xterm-js skill for terminal integration and resize handling.
# Use the ui-styling skill for UI components and styling patterns.
```

These triggers will be added to the prompt's "Skills" section.

---

## Phase 1: Parallel Context Gathering

For each issue, spawn an Explore agent to gather context:

```markdown
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="For issue [ISSUE-ID]: [title]

  Find:
  - Key files that will need changes (with line numbers for relevant sections)
  - Existing patterns to follow (show examples)
  - Dependencies and imports
  - Related test files
  - Any similar past implementations to reference

  Return structured context, not recommendations."
)
```

Spawn these in parallel - one per issue. Haiku is fast and cheap.

---

## Phase 2: Prompt Synthesis

Using gathered context + skill triggers, craft prompts following this structure:

```markdown
## Task: [ISSUE-ID] - [Title]
[Explicit, actionable description of what to do - be specific about the work]

## Context
[Background and WHY this matters - gathered from exploration]

## Skills
[Skill triggers from match-skills.sh - these help Claude load the right capabilities]
- Use the xterm-js skill for terminal integration and resize handling.
- Use the ui-styling skill for UI components and styling patterns.

## Key Files
[Specific file paths with line numbers from exploration]
- `/path/to/file.ts:45-60` - [what's relevant here]
- `/path/to/other.ts:120` - [pattern to follow]

## Patterns to Follow
[Code examples from exploration showing existing patterns]

## Approach
[Implementation guidance based on codebase patterns]

## When Done
Run `/conductor:worker-done [ISSUE-ID]`
```

**Important:** The Skills section uses natural trigger phrases from match-skills.sh. These phrases help Claude identify which skills are relevant and load them via the Skill tool.

### Prompt Principles

**Be explicit and specific:**
| Less Effective | More Effective |
|----------------|----------------|
| Fix the bug | Fix the null reference on line 45 of Terminal.tsx when resize fires before init |
| Improve the UI | Add loading state to button with disabled styling and spinner |

**Add context (explain WHY):**
```
Add try-catch around WebSocket connection to gracefully handle backend
disconnections. Currently users see a cryptic error when the backend restarts.
```

**Reference existing patterns:**
```
Follow the same error handling pattern used in useTerminalSessions.ts
(lines 45-60) for consistency.
```

---

## Phase 3: Return Prompts

Return all crafted prompts in a structured format:

```markdown
## Prepared Prompts

### [ISSUE-ID-1]
\`\`\`prompt
[Full prompt content]
\`\`\`

### [ISSUE-ID-2]
\`\`\`prompt
[Full prompt content]
\`\`\`
```

---

## Execute Now

Get the issue IDs from the command args, then:
1. Spawn parallel Explore agents (haiku)
2. Synthesize findings into prompts
3. Return the formatted prompts ready for worker spawning
