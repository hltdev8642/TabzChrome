---
description: "Pick the top ready beads issue, explore codebase, and start working with skill-aware prompting. Adapts behavior for autonomous vs interactive mode."
---

# Beads Work - Smart Issue Workflow

Pick the highest priority ready issue, explore relevant codebase (for features), and begin working with optimized skill-aware prompting.

## Mode Detection

**Check if running autonomously (spawned by bd-swarm-auto):**

```
AUTONOMOUS MODE is active if:
- Prompt contains "MODE: AUTONOMOUS" marker
- Or environment has BD_AUTONOMOUS=1
- Or spawned by bd-swarm-auto (check tmux session pattern)
```

| Mode | Behavior |
|------|----------|
| **Interactive** | Can ask clarifying questions, propose approaches |
| **Autonomous** | Make reasonable defaults, no questions, proceed |

---

## Phase 1: Select Issue

### 1.1 Get Ready Issues

```bash
bd ready --json | jq -r '.[] | "\(.id): [\(.priority)] [\(.type)] \(.title)"' | head -5
```

### 1.2 Select Issue

- If user provided an issue ID as argument, use that
- Otherwise, pick the top priority (lowest P number)

### 1.3 Get Issue Details

```bash
ISSUE_ID="<selected-id>"
bd show $ISSUE_ID
```

### 1.4 Claim the Issue

```bash
bd update $ISSUE_ID --status in_progress
```

---

## Phase 2: Determine Complexity

Analyze the issue to determine workflow depth:

| Issue Type | Complexity | Workflow |
|------------|------------|----------|
| `bug` (small fix) | Simple | Fast path → implement |
| `task` (chore) | Simple | Fast path → implement |
| `bug` (complex) | Medium | Explore → implement |
| `feature` | Medium/Complex | Explore → (questions) → implement |
| `epic` | Complex | Explore → architecture → implement |

**Complexity indicators:**
- Description mentions "refactor", "redesign", "new system" → Complex
- Touches multiple components/files → Complex
- Clear single-file fix → Simple
- Documentation/config only → Simple

**For simple issues:** Skip to Phase 5 (Environment) then Phase 7 (Implement)

**For medium/complex issues:** Continue to Phase 3 (Explore)

---

## Phase 3: Codebase Exploration (Features/Complex Issues)

**Goal:** Understand relevant code before implementing.

### 3.1 Launch Code Explorer

Spawn an explorer agent to analyze the relevant codebase:

```markdown
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="Analyze the codebase for implementing: '<issue-title>'

  Find:
  1. Similar existing features to use as patterns
  2. Files that will need modification
  3. Key abstractions and interfaces involved
  4. Any gotchas or constraints from CLAUDE.md

  Return:
  - List of 5-10 most relevant files (with line counts)
  - Existing patterns to follow
  - Suggested approach (1-2 sentences)
  "
)
```

### 3.2 Read Key Files

After explorer returns, read the identified key files (if <500 lines each).

### 3.3 Document Findings

```markdown
## Exploration Summary

**Similar features:** <list>
**Key files:** <list with line counts>
**Patterns to follow:** <brief>
**Suggested approach:** <brief>
```

---

## Phase 4: Clarifying Questions (Interactive Mode Only)

**SKIP THIS PHASE IF AUTONOMOUS MODE**

### 4.1 Identify Ambiguities

Based on exploration, identify any unclear aspects:
- Scope boundaries
- Edge cases
- Integration points
- Design choices

### 4.2 Ask Questions (Interactive Only)

```markdown
## Interactive Mode

Use AskUserQuestion for critical ambiguities:

Question: "How should <ambiguous aspect> be handled?"
Options:
- Option A (explain)
- Option B (explain)
- Your recommendation (Recommended)
```

### 4.3 Autonomous Mode Behavior

```markdown
## Autonomous Mode

Do NOT ask questions. Instead:

1. Pick the simpler/safer option for ambiguities
2. Document assumptions in a comment block at top of PR:
   ```
   ## Assumptions Made (autonomous mode)
   - Assumed X because Y
   - Chose approach A over B because simpler
   ```
3. If truly blocked (cannot proceed without human input):
   - Add comment: `bd comments $ISSUE_ID add "BLOCKED: Need clarification on <topic>"`
   - Close issue: `bd close $ISSUE_ID --reason "needs-clarification"`
   - Create follow-up: `bd create --title "Clarify: <topic>" --type task --priority 1`
   - Move to next issue
```

---

## Phase 5: Prepare Environment

### 5.1 Check for Init Script

```bash
if [ -f ".claude/init.sh" ]; then
  echo "Found .claude/init.sh - running..."
  bash .claude/init.sh
fi
```

### 5.2 Check Dependencies

```bash
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
```

---

## Phase 6: Match Skills

You already have visibility into all installed skills (check `<available_skills>` in your context).

**Match issue keywords to relevant skills:**

| Issue mentions... | Relevant skill |
|-------------------|----------------|
| UI, component, modal, form | `/shadcn-ui` |
| terminal, xterm, pty | `/xterm-js` |
| style, CSS, tailwind | `/tailwindcss` or `/ui-styling:ui-styling` |
| MCP, tools, server | `/mcp-builder:mcp-builder` |
| docs, documentation | `/docs-seeker:docs-seeker` |
| code review, quality | `/conductor:code-review` |

**Invocation formats:**
- User/project skills: `/skill-name`
- Plugin skills: `/plugin-name:skill-name`

---

## Phase 7: Implement

### 7.1 Build Context

From exploration (Phase 3), you now have:
- Key files to reference
- Patterns to follow
- Suggested approach

### 7.2 Find Relevant Files (Size-Aware)

```bash
# Find files by keyword, filter by size
for file in $(grep -ril "keyword" --include="*.ts" --include="*.tsx" src/ 2>/dev/null); do
  LINES=$(wc -l < "$file" 2>/dev/null || echo 9999)
  if [ "$LINES" -lt 500 ]; then
    echo "@$file"
  else
    echo "# LARGE ($LINES lines): $file - explore with subagents"
  fi
done | head -10
```

**Size Guidelines:**
- < 200 lines: Safe to @ reference
- 200-500 lines: Only if highly relevant
- 500+ lines: Don't @ reference - use subagents to explore sections

### 7.3 Implementation Approach

```markdown
## Approach
- **Use subagents liberally to preserve context:**
  - Explore agents (Haiku) for codebase search
  - Parallel subagents for multi-file exploration
  - Subagents for running tests and builds
- Follow patterns identified in exploration
- Match existing code style from CLAUDE.md
```

### 7.4 Begin Implementation

Start working on the issue with the prepared context.

---

## Phase 8: Completion

Run `/conductor:worker-done <issue-id>` which handles:

1. Build verification (npm run build)
2. Test verification (npm test)
3. Code review (spawns code-reviewer subagent)
4. Commit with proper format
5. Close beads issue

If any step fails, fix the issue and run `/conductor:worker-done` again.

---

## Quick Reference

### Simple Issue (bug/task)
```
1. bd show <id>
2. bd update <id> --status in_progress
3. Implement fix
4. /conductor:worker-done <id>
```

### Feature Issue (interactive)
```
1. bd show <id>
2. bd update <id> --status in_progress
3. Explore codebase (Phase 3)
4. Ask questions if unclear (Phase 4)
5. Implement
6. /conductor:worker-done <id>
```

### Feature Issue (autonomous)
```
1. bd show <id>
2. bd update <id> --status in_progress
3. Explore codebase (Phase 3)
4. Make reasonable defaults (no questions)
5. Implement
6. /conductor:worker-done <id>
```

---

## Notes

- `/conductor:worker-done` is idempotent - safe to re-run after fixing issues
- If context gets high (>75%), use `/wipe` to handoff to fresh session
- Update beads with progress: `bd comments <id> add "Progress: ..."`
- In autonomous mode, document assumptions in commit message

Execute this workflow now.
