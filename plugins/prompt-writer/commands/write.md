---
name: write
description: "Craft a worker prompt for a backlog issue"
argument-hint: "ISSUE_ID"
---

# Write Worker Prompt

Transform a backlog issue into a worker-ready prompt with skill hints and context.

## Usage

```bash
/prompt-writer:write ISSUE-ID
```

## Workflow

### 1. Read the Issue

```python
mcp__beads__show(issue_id="ISSUE-ID")
```

Verify:
- Issue exists
- Status is `open` or `backlog` (not already in_progress/closed)

### 2. Discover Relevant Skills

Use the `tabz_list_skills` MCP tool to find skills that match the work:

```python
# List all available skills
tabz_list_skills()

# Or search by keyword
tabz_list_skills(query="terminal")
```

Match skills based on:
- Files mentioned in issue (`.tsx` -> frontend-development, xterm-js)
- Keywords in description (auth -> better-auth, database -> databases)
- Issue type (docs -> docs-seeker, visual -> ui-styling)

### 3. Quick File Exploration

Use Explore agent to identify 3-5 key files:

```
Task(subagent_type="Explore", prompt="Find the main files related to: [issue description]")
```

### 4. Craft the Prompt

Create a focused prompt following Claude 4 best practices:

```markdown
## Context
[1-2 sentences about the goal and why]

## Task
[Explicit instruction - what to DO, not suggest]

## Approach
Use the [skill] skill for [specific purpose].
Use subagents in parallel to explore [areas].

## Key Files
- path/to/main/file.ts
- path/to/related/file.ts

## When Done
Close issue: bd close ISSUE-ID --reason "summary"
```

### 5. Store Prompt in Issue Notes

```python
mcp__beads__update(
  issue_id="ISSUE-ID",
  notes="""[existing notes]

## Prepared Prompt
[Your crafted prompt]
"""
)
```

### 6. Mark Issue Ready

```python
mcp__beads__update(issue_id="ISSUE-ID", add_labels=["ready"])
```

Or move to ready status:
```bash
bd update ISSUE-ID --status ready
```

## Prompt Engineering Principles

### Be Explicit
Claude 4.x follows instructions precisely. Use action verbs.
- Less: "Can you suggest improvements?"
- More: "Update the function to improve performance."

### Add Context/Motivation
Explain WHY, not just WHAT. Claude generalizes from explanations.
- Less: "Never use ellipses"
- More: "Never use ellipses since the TTS engine won't know how to pronounce them."

### Natural Skill Triggers
Use natural language, not aggressive markers:
- Avoid: "CRITICAL: You MUST use this tool when..."
- Use: "Use the X skill for Y."

### Subagent Hints
Claude 4.5 naturally delegates. Prompt with:
"Use subagents in parallel to explore the codebase first."

### Avoid Overengineering
- Tell Claude what to DO (positive framing)
- Explain the goal and context
- Reference existing patterns in the codebase
- Avoid excessive ALL CAPS or MUST/NEVER language

## Example Output

For an issue about fixing terminal resize:

```markdown
## Context
Terminal resize events aren't being properly handled, causing text corruption when the sidebar is narrowed quickly.

## Task
Fix the resize handling in Terminal.tsx to debounce resize events and re-fit the terminal after resize completes.

## Approach
Use the xterm-js skill for terminal integration and resize handling.
Check the docs/lessons-learned/terminal-rendering.md for known patterns.

## Key Files
- extension/components/Terminal.tsx
- docs/lessons-learned/terminal-rendering.md

## When Done
Close issue: bd close ISSUE-ID --reason "Fixed terminal resize with debouncing"
```

## Notes

- Keep prompts focused - workers read the full issue description
- Include skill hints but don't overload
- 3-5 key files is enough - workers can explore more
- Reference existing docs/lessons-learned when relevant
