---
name: plan
description: "Break down a feature or epic into concrete backlog issues"
argument-hint: "FEATURE_DESCRIPTION"
---

# Plan Feature

Break down a feature description or epic into concrete, parallelizable backlog issues with dependencies.

## Usage

```bash
/planner:plan "Add dark mode support to the application"
```

Or plan from an existing epic:
```bash
/planner:plan --epic EPIC-ID
```

## Workflow

### 1. Understand the Scope

If given a description, analyze it. If given an epic ID, read it:

```python
mcp__beads__show(issue_id="EPIC-ID")
```

### 2. Explore the Codebase

Use Explore agent to understand:
- Existing patterns and architecture
- Related code that might need changes
- Potential file conflicts between tasks

```
Task(subagent_type="Explore", prompt="Find the main components and patterns for: [feature area]")
```

### 3. Break Down Into Tasks

Create concrete, actionable tasks:

**Good tasks:**
- "Add theme context provider to React app"
- "Update Header component for dark mode support"
- "Add localStorage persistence for theme preference"

**Bad tasks:**
- "Implement dark mode" (too vague)
- "Fix everything" (not actionable)

### 4. Identify Dependencies

Determine which tasks must run in sequence vs. parallel:

```
Task A: Create theme context
Task B: Update Header (depends on A)
Task C: Update Footer (depends on A)
Task D: Add persistence (depends on A)
```

B, C, D can run in parallel after A completes.

### 5. Identify File Overlaps

Tasks touching the same files should have dependencies to prevent merge conflicts:

```
If Task B and Task C both touch src/styles.css:
  -> Make C depend on B (or vice versa)
```

### 6. Create Issues

**Using MCP:**
```python
# Create parent epic (if not exists)
mcp__beads__create(
  title="Dark mode support",
  issue_type="epic",
  priority=2,
  description="Full dark mode implementation..."
)

# Create subtasks
mcp__beads__create(
  title="Add theme context provider",
  issue_type="task",
  priority=1,
  description="Create React context for theme state management"
)

mcp__beads__create(
  title="Update Header for dark mode",
  issue_type="task",
  priority=2,
  deps=["blocks:CONTEXT-ID"]  # Depends on context task
)
```

**Using CLI:**
```bash
# Create epic
bd create "Dark mode support" --type epic --priority 2

# Create subtasks with dependencies
bd create "Add theme context provider" --priority 1
bd create "Update Header for dark mode" --deps "blocked-by:CONTEXT-ID"
```

### 7. Wire to Epic

Link subtasks to the epic:

```python
mcp__beads__dep(issue_id="EPIC-ID", depends_on_id="SUBTASK-ID")
```

Or as epic children:
```bash
bd update SUBTASK-ID --parent EPIC-ID
```

### 8. Output Sprint Plan

Present the organized breakdown:

```markdown
## Epic: Dark mode support (EPIC-ID)

### Wave 1 (Start immediately)
| Issue | Priority | Description |
|-------|----------|-------------|
| ABC-1 | P1 | Add theme context provider |

### Wave 2 (After Wave 1)
| Issue | Blocked By | Description |
|-------|------------|-------------|
| ABC-2 | ABC-1 | Update Header for dark mode |
| ABC-3 | ABC-1 | Update Footer for dark mode |
| ABC-4 | ABC-1 | Add theme persistence |

### Wave 3 (After Wave 2)
| Issue | Blocked By | Description |
|-------|------------|-------------|
| ABC-5 | ABC-2, ABC-3 | System preference detection |

### File Overlap Notes
- ABC-2 and ABC-3 both touch styles.css - sequenced via dependency
```

## Decomposition Patterns

### Feature Breakdown
1. Core infrastructure (contexts, state, schemas)
2. Main implementation (components, logic)
3. Edge cases and polish
4. Tests and documentation

### Refactor Breakdown
1. Create new pattern alongside old
2. Migrate components one by one
3. Remove old pattern
4. Update tests

### Bug Fix Breakdown
1. Investigate root cause
2. Implement fix
3. Add regression test
4. Update documentation if needed

## Task Sizing Guidelines

| Size | Guideline |
|------|-----------|
| Too small | "Add import statement" - combine with related work |
| Right size | "Add theme context with toggle hook" - 1-2 files, clear scope |
| Too large | "Implement full dark mode" - break into subtasks |

## Notes

- Create backlog status issues - prompt-writer will prepare them
- Set realistic priorities (don't make everything P1)
- Identify file conflicts early - save merge headaches
- Keep tasks independent where possible for parallelization
